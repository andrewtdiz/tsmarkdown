import { generatePropsInterface, parseParameters, parseParameterTypes } from "./parser/parameters";
import { processJSXExpressions } from "./renderer/jsx-runtime";
import { normalizeIndentation } from "./renderer/string-helpers";
import { parseContent } from "./parser/pipeline";
import { protectCodeBlocks, restoreCodeBlocks } from "./parser/code-protection";
import type { Chunk } from "./runtime/tsm-runtime";
import { TSMComponentAttribute } from "./parser/tsm-ast";


export interface ParsedMDX {
  imports: string[];
  functionName: string;
  functionParams: string[];
  typescript: string;
  markdown: Chunk[];
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>;
  returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>;
  propsInterface?: string;
  parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
}

export function parseMDX(content: string): ParsedMDX {
  const imports: string[] = [];
  const interpolations: Array<{ placeholder: string; expression: string }> =
    [];
  const conditionalBlocks: Array<{ condition: string; content: string }> = [];
  const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
  const jsxExpressions: Array<{ name: string; props: TSMComponentAttribute[] }> = [];
  const returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }> = [];

  let functionName = "";
  let functionParams: string[] = [];
  let typescript = "";
  let markdownString = "";
  let inFunction = false;
  let inReturn = false;
  let braceLevel = 0;
  let parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }> = [];
  let rawParams = "";

  // First, protect code blocks in the entire content to avoid brace level issues
  const { protectedContent: protectedContent, codeBlocks: allCodeBlocks } = protectCodeBlocks(content);
  const protectedLines = protectedContent.split("\n");

  // First pass: extract imports and function metadata
  for (let i = 0; i < protectedLines.length; i++) {
    const line = protectedLines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("import ")) {
      imports.push(trimmed);
      continue;
    }

    if (trimmed.startsWith("function ") || trimmed.startsWith("async function ") || trimmed.startsWith("await function ")) {
      const match = trimmed.match(/(?:async\s+|await\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        functionName = match[1];
        rawParams = match[2].trim();
        if (rawParams) {
          // Parse parameters - handle destructured objects like { items }
          functionParams = parseParameters(rawParams);
          parameterTypes = parseParameterTypes(rawParams);
        }
        inFunction = true;
      }
      continue;
    }

    if (inFunction && !inReturn) {
      if (trimmed === "return (") {
        inReturn = true;
        continue;
      }
      if (trimmed !== "{") {
        typescript += line + "\n";
      }
      continue;
    }

    if (inReturn) {
      // Count braces first to get accurate brace level
      for (const char of line) {
        if (char === "{") braceLevel++;
        if (char === "}") braceLevel--;
      }

      // Check if this line contains the closing parenthesis of the return statement
      const trimmedLine = line.trim();
      if ((trimmedLine === ")" || trimmedLine === ");") && braceLevel === 0) {
        break; // This is the end of the return statement
      }

      if (braceLevel < 0) {
        break;
      }

      markdownString += line + "\n";
    }
  }

  // Second pass: process markdown for interpolations, conditionals, ternary expressions, and JSX expressions
  const normalizedMarkdown = normalizeIndentation(markdownString).trim();

  // Use the new parsing pipeline with code protection
  const context = {
    interpolations,
    conditionalBlocks,
    ternaryExpressions,
    jsxExpressions
  };

  let markdown = parseContent(normalizedMarkdown, context);

  // Restore the protected code blocks in the final markdown
  markdown = restoreCodeBlocks(markdown, allCodeBlocks);

  // Generate props interface
  const propsInterface = generatePropsInterface(functionName, parameterTypes);

  return {
    imports: imports.filter(Boolean),
    functionName,
    functionParams,
    typescript: typescript.trim(),
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