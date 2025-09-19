import { compile } from "./src/compiler";
import type { ParsedMDX } from "./src/parser";
import { parseForESLint } from "./src/parser/eslint-parser";
import { generatePropsInterface, parseParameters, parseParameterTypes } from "./src/parser/parameters";
import { parseContent } from "./src/parser/pipeline";
import { protectCodeBlocks, restoreCodeBlocks } from "./src/parser/code-protection";
import { render } from "./src/renderer";
import { normalizeIndentation } from "./src/renderer/string-helpers";
import { validateComponentStructure } from "./src/parser/component-scanner";

function buildParsedMDXWithESLint(source: string): ParsedMDX {
    const eslintResult = parseForESLint(source);
    console.log(eslintResult);

    if (!eslintResult.success || !eslintResult.componentSplit || !eslintResult.tsPrelude) {
        const message = eslintResult.diagnostics.join(", ") || "Unknown ESLint parser failure";
        throw new Error(`Failed to parse with ESLint parser: ${message}`);
    }

    const { tsPrelude, markdownBody } = eslintResult.componentSplit;

    // Parse the TypeScript prelude to extract function information
    const preludeLines = tsPrelude.split("\n");
    const importLines = preludeLines.filter((line) => line.trim().startsWith("import "));
    const nonImportLines = preludeLines.filter((line) => !line.trim().startsWith("import "));

    const functionLineIndex = nonImportLines.findIndex((line) => line.includes("function "));
    if (functionLineIndex === -1) {
        throw new Error("Component function not found in TypeScript prelude");
    }

    const functionSignatureLine = nonImportLines[functionLineIndex];
    const signatureMatch = functionSignatureLine.match(/(?:export\s+default\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (!signatureMatch) {
        throw new Error("Unable to parse function signature");
    }

    const [, functionName, rawParams] = signatureMatch;
    const functionParams = rawParams ? parseParameters(rawParams) : [];
    const parameterTypes = rawParams ? parseParameterTypes(rawParams) : [];
    const propsInterface = generatePropsInterface(functionName, parameterTypes);

    // Extract the TypeScript body (everything after the function declaration line)
    const typescriptLines = nonImportLines.slice(functionLineIndex + 1);
    const typescript = typescriptLines.join("\n").trim();

    // Process the markdown body from the return statement
    const { protectedContent, codeBlocks } = protectCodeBlocks(markdownBody || "");
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

    // Create a return statement entry for the main function return
    const returnStatements = [{
        condition: undefined,
        content: markdown,
        isTemplate: true
    }];

    return {
        imports: importLines.filter(Boolean),
        functionName,
        functionParams,
        typescript,
        markdown,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
        returnStatements,
        propsInterface,
        parameterTypes,
    };
}

const mdxSource = /* mdx */ `
function MiniComponent({ name }: { name: string }) {
  const excited = name.toUpperCase();
  if (name === "") return (
    Nothing to see here.
  )
  return (
    # Inline Demo
    This is rendering **{{ excited }}**!
  );
}
`;

const parsed = buildParsedMDXWithESLint(mdxSource);
//   console.log(parsed);
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

