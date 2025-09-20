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

import { compile, compileAllExportedFunctions, compileAllFunctions, compileFullFile } from "./src/compiler";
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


const completeTypeScriptSource = `
import { Dashboard } from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";
const inlineVersion = (*Version: {{ VERSION_NUMBER }}!*);

async function TestComponent() {
  const { data, error, timedout } = await getData();

  if (error) return false;
  if (timedout) return (**API Error**)
  if (!data) {
    return (
      **Error**: No data available

      {{ null }}
    )
  }

  return (
    # Admin panel
    {{ data.isAuthorized ? (Authorized) : (Not Authorized) }}
    {{ !data.active && (Account is inactive) }}
    - Name: {{ data.name }}
    - Description: {{ data.description }}
      Access your information here

    <content>
      <@Dashboard />
    </content>
    
    {{ inlineVersion }}
  )
}
`;

// Test the new full-file compiler that processes template syntax outside of functions
console.log("\n=== Testing Full-File Compilation ===");
const fullFileResult = await compileFullFile(completeTypeScriptSource);
console.log("Full-file compilation errors:", fullFileResult.errors);
console.log("Global templates found:", fullFileResult.globalTemplates.length);

if (fullFileResult.globalTemplates.length > 0) {
    console.log("\n--- Global Templates ---");
    fullFileResult.globalTemplates.forEach(template => {
        console.log(`Variable: ${template.variableName} (${template.isExported ? 'exported' : 'internal'})`);
        console.log(`Original: ${template.originalValue}`);
        console.log(`Transpiled: ${template.transpiledValue}`);
        console.log(`Interpolations: ${template.interpolations.length}`);
        console.log("");
    });
}

console.log("\n=== Complete Transpiled File (Full-File) ===");
console.log(fullFileResult.transpiledFile);
