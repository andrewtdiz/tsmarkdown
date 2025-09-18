import {
  parseParameters,
  parseParameterTypes,
  generatePropsInterface,
  normalizeIndentation,
  processTemplateContent,
  processConditionalBlocks,
  processTernaryExpressions,
  processJSXElements,
  processJSXExpressions,
  findMatchingBrace
} from './parser/parser-utils';

export interface ParsedMDX {
  imports: string[];
  functionName: string;
  functionParams: string[];
  typescript: string;
  markdown: string;
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string; expression: string }>;
  returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>;
  propsInterface?: string;
  parameterTypes: Array<{ name: string; type: string; required: boolean }>;
}

export function parseMDX(content: string): ParsedMDX {
  const lines = content.split("\n");
  const imports: string[] = [];
  const interpolations: Array<{ placeholder: string; expression: string }> =
    [];
  const conditionalBlocks: Array<{ condition: string; content: string }> = [];
  const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
  const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];
  const returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }> = [];

  let functionName = "";
  let functionParams: string[] = [];
  let typescript = "";
  let markdown = "";
  let inFunction = false;
  let inReturn = false;
  let braceLevel = 0;
  let parameterTypes: Array<{ name: string; type: string; required: boolean }> = [];
  let rawParams = "";

  // First pass: extract imports and function metadata
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
      // Check if this line contains the closing parenthesis of the return statement
      const trimmedLine = line.trim();
      if (
        trimmedLine === ")" ||
        (trimmedLine.endsWith(")") && braceLevel === 0)
      ) {
        break; // This is the end of the return statement
      }

      for (const char of line) {
        if (char === "{") braceLevel++;
        if (char === "}") braceLevel--;
      }

      if (braceLevel < 0) {
        break;
      }

      markdown += line + "\n";
    }
  }

  // Second pass: process markdown for interpolations, conditionals, ternary expressions, and JSX expressions
  const normalizedMarkdown = normalizeIndentation(markdown).trim();

  // Process JSX expressions first to populate the jsxExpressions array
  processJSXExpressions(normalizedMarkdown, jsxExpressions);

  markdown = processTemplateContent(
    normalizedMarkdown,
    interpolations,
    conditionalBlocks,
    ternaryExpressions,
    jsxExpressions,
  );

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