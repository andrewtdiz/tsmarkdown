/**
 * End-to-end test demonstrating jscodeshift integration for AST transformations
 * 
 * This file shows how to use jscodeshift to make structural changes to TypeScript
 * code declaratively and testably, instead of using manual string parsing or regex.
 * 
 * Key benefits demonstrated:
 * - Declarative AST manipulation
 * - Testable transformations
 * - No manual string/regex parsing
 * - Reusable codemods
 */

import { compile, compileAllExportedFunctions, compileAllFunctions } from "./src/compiler";
import type { ParsedMDX } from "./src/parser";
import { parseWithTypeScript, extractParametersFromAST, extractFunctions } from "./src/parser/parser-utils";
import { generatePropsInterface, parseParameters } from "./src/parser/parameters";
import { parseContent } from "./src/parser/pipeline";
import { protectCodeBlocks, restoreCodeBlocks } from "./src/parser/code-protection";
import { render } from "./src/renderer";
import { normalizeIndentation } from "./src/renderer/string-helpers";
import * as ts from 'typescript';
import { validateComponentStructure } from "./src/parser/component-scanner";
import jscodeshift, { Transform } from 'jscodeshift';

/**
 * Apply a jscodeshift transformation to TypeScript code
 */
async function applyJSCodeshiftTransform(typescriptCode: string, transform: Transform): Promise<string> {

    try {
        const result = await transform(
            { source: typescriptCode, path: 'test.ts' },
            { j: jscodeshift, jscodeshift, stats: () => { }, report: () => { } },
            { parser: 'babel' }
        );
        return result || typescriptCode;
    } catch (error) {
        console.warn('JSCodeshift transformation failed:', error);
        return typescriptCode;
    }
}

/**
 * Simple jscodeshift transformation that demonstrates AST manipulation
 * This codemod adds a console.log statement at the beginning of function bodies
 * 
 * This is a proof-of-concept showing how to use jscodeshift for declarative
 * AST transformations instead of manual string parsing or regex manipulation.
 */
const addConsoleLogTransform: Transform = (fileInfo, api) => {
    const j = api.jscodeshift;
    const source = j(fileInfo.source);

    // Find all function declarations
    source.find(j.FunctionDeclaration).forEach(path => {
        const functionBody = path.value.body;

        // Only process if the function has a block statement body
        if (j.BlockStatement.check(functionBody)) {
            // Create a console.log statement
            const consoleLog = j.expressionStatement(
                j.callExpression(
                    j.memberExpression(
                        j.identifier('console'),
                        j.identifier('log')
                    ),
                    [j.literal(`Function ${path.value.id?.name || 'anonymous'} called`)]
                )
            );

            // Add the console.log as the first statement in the function body
            functionBody.body.unshift(consoleLog);
        }
    });

    return source.toSource({
        quote: 'single',
        trailingComma: true,
    });
};

function findMainFunctionInAST(ast: any): any {
    if (!ast) {
        return null;
    }

    // Look for the first function declaration using TypeScript AST traversal
    let mainFunction: any = null;

    function visit(node: any): void {
        if (node.kind === 263 && !mainFunction) { // TypeScript SyntaxKind.FunctionDeclaration = 263
            mainFunction = node;
            return;
        }
        if (node.getChildren) {
            node.getChildren().forEach(visit);
        }
    }

    visit(ast);
    return mainFunction;
}

async function buildParsedMDXWithTSParser(source: string): Promise<ParsedMDX> {
    const tsResult = parseWithTypeScript(source);

    if (!tsResult.success || !tsResult.componentSplit || !tsResult.tsPrelude) {
        const message = tsResult.diagnostics.join(", ") || "Unknown TS parser failure";
        throw new Error(`Failed to parse with TS parser: ${message}`);
    }

    const { tsPrelude, markdownBody, returnStatements } = tsResult.componentSplit;

    // Extract function information from the AST
    if (!tsResult.ast) {
        throw new Error("No AST available from TS parser");
    }

    // Get all exported functions from the AST
    const exportedFunctions = extractFunctions(tsResult.ast);
    if (exportedFunctions.length === 0) {
        throw new Error("No exported functions found in AST");
    }

    // For now, use the first exported function as the main component
    // TODO: In the future, we might want to handle multiple components
    const mainFunctionInfo = exportedFunctions[0];
    const functionName = mainFunctionInfo.name;
    const functionParams = mainFunctionInfo.parameters.map(param => param.name);

    // Find the main function declaration in the AST
    const mainFunction = findMainFunctionInAST(tsResult.ast);
    if (!mainFunction) {
        throw new Error("Component function not found in AST");
    }

    // Extract parameter information from AST
    const parameterTypes = extractParametersFromAST(mainFunction);
    const propsInterface = generatePropsInterface(functionName, parameterTypes);

    // Extract the TypeScript body from the prelude (everything after the function declaration)
    const preludeLines = tsPrelude.split("\n");
    const importLines = preludeLines.filter((line) => line.trim().startsWith("import "));
    const nonImportLines = preludeLines.filter((line) => !line.trim().startsWith("import "));

    const functionLineIndex = nonImportLines.findIndex((line) => line.includes("function "));
    if (functionLineIndex === -1) {
        throw new Error("Component function not found in TypeScript prelude");
    }

    const typescriptLines = nonImportLines.slice(functionLineIndex + 1);
    let typescript = typescriptLines.join("\n").trim();
    // Process multiple return statements
    const processedReturnStatements = returnStatements.map(returnStmt => {
        // Extract content from the source using the return statement indices
        const content = source.slice(returnStmt.contentStartIndex, returnStmt.contentEndIndex);
        const { protectedContent, codeBlocks } = protectCodeBlocks(content || "");
        const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

        const interpolations: Array<{ placeholder: string; expression: string }> = [];
        const conditionalBlocks: Array<{ condition: string; content: string }> = [];
        const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
        const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

        let markdown = parseContent(normalizedMarkdown, {
            interpolations,
            conditionalBlocks,
            ternaryExpressions,
            jsxExpressions,
        });

        markdown = restoreCodeBlocks(markdown, codeBlocks);

        return {
            condition: returnStmt.condition,
            content: markdown,
            isTemplate: true
        };
    });

    // For backward compatibility, use the first return statement's content as the main markdown
    const mainMarkdown = processedReturnStatements.length > 0 ? processedReturnStatements[0].content : markdownBody || "";

    // Collect all interpolations, conditional blocks, etc. from all return statements
    const allInterpolations: Array<{ placeholder: string; expression: string }> = [];
    const allConditionalBlocks: Array<{ condition: string; content: string }> = [];
    const allTernaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const allJsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    // Re-parse each return statement from the original source to collect interpolations
    returnStatements.forEach(returnStmt => {
        // Extract content from the source using the return statement indices
        const content = source.slice(returnStmt.contentStartIndex, returnStmt.contentEndIndex);
        const { protectedContent, codeBlocks } = protectCodeBlocks(content || "");
        const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

        const interpolations: Array<{ placeholder: string; expression: string }> = [];
        const conditionalBlocks: Array<{ condition: string; content: string }> = [];
        const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
        const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

        parseContent(normalizedMarkdown, {
            interpolations,
            conditionalBlocks,
            ternaryExpressions,
            jsxExpressions,
        });

        allInterpolations.push(...interpolations);
        allConditionalBlocks.push(...conditionalBlocks);
        allTernaryExpressions.push(...ternaryExpressions);
        allJsxExpressions.push(...jsxExpressions);
    });

    return {
        imports: importLines.filter(Boolean),
        functionName,
        functionParams,
        typescript,
        markdown: mainMarkdown,
        interpolations: allInterpolations,
        conditionalBlocks: allConditionalBlocks,
        ternaryExpressions: allTernaryExpressions,
        jsxExpressions: allJsxExpressions,
        returnStatements: processedReturnStatements,
        propsInterface,
        parameterTypes,
    };
}

// Test export detection with a complete TypeScript source using direct TypeScript compiler API
const completeTypeScriptSource = `
export function MiniComponent({ name, isLoggedIn = true }: { name: string, isLoggedIn: boolean }) {
  const excited = name.split("").map(letter => {
    return letter.toUpperCase()
  }).join("");

  if (name === "") return (Welcome!)
  return (# Hello {{ excited }}!)
}

function helperFunction() {
  return (
    ### Helper Function
  )
}

export default function DefaultComponent() {
  return (
    default
  )
}

const arrowFunction = () => (# Arrow Function);

export const exportedConst = "constant";
`;

console.log("\n=== Testing Export Detection with Complete TypeScript Source ===");
// Use TypeScript compiler API directly for regular TypeScript code
const sourceFile = ts.createSourceFile(
    'test.ts',
    completeTypeScriptSource,
    ts.ScriptTarget.Latest,
    true
);
const allExportedFunctions = extractFunctions(sourceFile);
console.log("All exported functions:");
console.log(JSON.stringify(allExportedFunctions, null, 2));
// Note: buildParsedMDXWithTSParser is designed for single functions, not multi-function sources
// For multi-function sources, use compileAllExportedFunctions instead

// The compileAllExportedFunctions function is now imported from the main compiler

// Test the new multi-function compilation (all functions, including non-exported)
console.log("\n=== Testing Multi-Function Compilation (All Functions) ===");
const allFunctionsResult = await compileAllFunctions(completeTypeScriptSource);
console.log("Compilation errors:", allFunctionsResult.errors);

// Test the exported-only compilation for comparison
console.log("\n=== Testing Multi-Function Compilation (Exported Only) ===");
const exportedOnlyResult = await compileAllExportedFunctions(completeTypeScriptSource);
console.log("Compilation errors:", exportedOnlyResult.errors);

// Print the complete transpiled file as one unit (all functions)
console.log("\n=== Complete Transpiled File (All Functions) ===");
let completeTranspiledFile = "";
allFunctionsResult.functions.forEach(({ functionInfo, compiled }) => {
    completeTranspiledFile += compiled.typescript + "\n\n";
});

// Print the exported-only transpiled file
console.log("\n=== Complete Transpiled File (Exported Only) ===");
let exportedTranspiledFile = "";
exportedOnlyResult.functions.forEach(({ functionInfo, compiled }) => {
    exportedTranspiledFile += compiled.typescript + "\n\n";
});
console.log(exportedTranspiledFile);

console.log("\n=== Testing Individual Function Rendering (All Functions) ===");
for (const { functionInfo, compiled } of allFunctionsResult.functions) {
    console.log(`\n--- Rendering ${functionInfo.name} (${functionInfo.isExported ? 'exported' : 'internal'}) ---`);
    try {
        const result = await render(compiled, {}, { name: "Test" });
        console.log(result.content);
    } catch (error) {
        console.log("Render Error:", error.message);
    }
}
console.log("\n=== Complete Transpiled File (All Functions) ===");
console.log(completeTranspiledFile);
