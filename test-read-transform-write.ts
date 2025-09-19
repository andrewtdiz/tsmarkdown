import { compile } from "./src/compiler";
import type { ParsedMDX } from "./src/parser";
import { parseWithTypeScript, extractParametersFromAST } from "./src/parser/parser-utils";
import { generatePropsInterface, parseParameters } from "./src/parser/parameters";
import { parseContent } from "./src/parser/pipeline";
import { protectCodeBlocks, restoreCodeBlocks } from "./src/parser/code-protection";
import { render } from "./src/renderer";
import { normalizeIndentation } from "./src/renderer/string-helpers";
import { validateComponentStructure } from "./src/parser/component-scanner";

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

function buildParsedMDXWithTSParser(source: string): ParsedMDX {
    const tsResult = parseWithTypeScript(source);

    if (!tsResult.success || !tsResult.componentSplit || !tsResult.tsPrelude) {
        const message = tsResult.diagnostics.join(", ") || "Unknown ESLint parser failure";
        throw new Error(`Failed to parse with ESLint parser: ${message}`);
    }

    const { tsPrelude, markdownBody, returnStatements } = tsResult.componentSplit;

    // Extract function information from the AST
    if (!tsResult.ast) {
        throw new Error("No AST available from ESLint parser");
    }

    // Find the main function declaration in the AST
    const mainFunction = findMainFunctionInAST(tsResult.ast);
    if (!mainFunction) {
        throw new Error("Component function not found in AST");
    }

    const functionName = mainFunction.name?.text || "Component";
    const functionParams = mainFunction.parameters?.map((param: any) => {
        if (param.name && param.name.elements) {
            // Object destructuring pattern
            return param.name.elements.map((element: any) => element.name?.text).filter(Boolean);
        } else if (param.name && param.name.text) {
            // Simple identifier
            return param.name.text;
        }
        return null;
    }).flat().filter(Boolean) || [];

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
    const typescript = typescriptLines.join("\n").trim();

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

const mdxSource = /* mdx */ `
function MiniComponent({ name, isLoggedIn = true }: { name: string, isLoggedIn: boolean }) {
  const excited = name.split("").map(letter => letter.toUpperCase()).join("");
  return (
    # Inline Demo
    {{ isLoggedIn ? (
     {{ name === "" ? (
      Nothing to see here.
     ) : (
      This is rendering **{{ excited }}**!
     )}}
    ) : (
      Not logged in
    )}}
  );
}
`;

const parsed = buildParsedMDXWithTSParser(mdxSource);
console.log(parsed);
const compiled = compile(parsed);
console.log(compiled);

console.log("\n=== TypeScript emitted by compile() ===\n");
console.log(compiled.typescript);

const result = await render(compiled, {}, { name: "MDX" }).catch((error) => {
    console.error("Render step failed", error);
});

if (result) {
    console.log("\n=== Render Result ===");
    console.log(result);
}

// Test with a different name to verify it's working
const result2 = await render(compiled, {}, { name: "Better MDX" }).catch((error) => {
    console.error("Render step failed", error);
});

if (result2) {
    console.log("\n=== Render Result 2 (with 'Better MDX') ===");
    console.log(result2.content);
}

// Test with empty name to verify conditional logic
const result3 = await render(compiled, {}, { name: "" }).catch((error) => {
    console.error("Render step failed", error);
});

if (result3) {
    console.log("\n=== Render Result 3 (with empty name) ===");
    console.log(result3.content);
}

