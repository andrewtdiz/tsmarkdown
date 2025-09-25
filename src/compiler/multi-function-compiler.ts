/**
 * Multi-Function Compiler
 *
 * This module provides functionality to compile multiple exported functions
 * from a TypeScript source file, instead of just the first function.
 */

import * as ts from "typescript";
import { ParsedTSmd } from "../parser";
import { compile } from "../compiler";
import { extractFunctions } from "../parser/typescript-parser";
import { parseContent } from "../parser/pipeline";
import {
  protectCodeBlocks,
  restoreCodeBlocks,
} from "../parser/code-protection";
import { normalizeIndentation } from "../utils/string-helpers";
import type { TSMComponentAttribute } from "../parser/tsm-ast";
import { Chunk } from "../runtime/tsm-runtime";

export interface MultiFunctionCompilationResult {
  functions: Array<{
    functionInfo: {
      name: string;
      isExported: boolean;
      isDefaultExport: boolean;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        defaultValue?: string;
      }>;
      returnType?: string;
      line: number;
      column: number;
    };
    compiled: any;
  }>;
  errors: string[];
}

/**
 * Compiles all functions (exported and non-exported) from a TypeScript source string
 */
export async function compileAllFunctions(
  source: string
): Promise<MultiFunctionCompilationResult> {
  const errors: string[] = [];
  const functions: Array<{ functionInfo: any; compiled: any }> = [];

  try {
    // Use TypeScript compiler API with the processed source
    const sourceFile = ts.createSourceFile(
      "input.ts",
      source,
      ts.ScriptTarget.Latest,
      true
    );

    const allFunctions = extractFunctions(sourceFile);

    if (allFunctions.length === 0) {
      errors.push("No functions found in source");
      return { functions, errors };
    }

    for (const functionInfo of allFunctions) {
      try {
        // Extract the actual function content from the AST using the processed source
        const {
          typescript,
          returnStatements,
          interpolations,
          conditionalBlocks,
          ternaryExpressions,
          jsxExpressions,
        } = extractFunctionContentWithOriginalSource(
          sourceFile,
          functionInfo.name
        );

        // Create ParsedTSmd for each function
        const markdownContent =
          returnStatements.length > 0
            ? returnStatements[0].content
            : `# ${functionInfo.name} Content`;

        const parsed: ParsedTSmd = {
          imports: [],
          functionName: functionInfo.name,
          functionInfo: functionInfo,
          functionParams: functionInfo.parameters.map((p) => p.name),
          isAsync: functionInfo.isAsync,
          typescript: typescript,
          markdown: markdownContent,
          interpolations: interpolations,
          conditionalBlocks: conditionalBlocks,
          ternaryExpressions: ternaryExpressions,
          jsxExpressions: jsxExpressions,
          returnStatements: returnStatements,
          propsInterface:
            functionInfo.parameters.length > 0
              ? `interface ${
                  functionInfo.name
                }Props {\n  ${functionInfo.parameters
                  .map((p) => `${p.name}: ${p.type}${p.required ? "" : "?"}`)
                  .join(";\n  ")}\n}`
              : "",
          parameterTypes: functionInfo.parameters,
        };

        const compiled = compile(parsed);
        functions.push({ functionInfo, compiled });
      } catch (error: any) {
        errors.push(
          `Failed to compile function ${functionInfo.name}: ${error.message}`
        );
      }
    }
  } catch (error: any) {
    errors.push(`Failed to parse TypeScript source: ${error.message}`);
  }

  return { functions, errors };
}

/**
 * Compiles only exported functions from a TypeScript source string
 * This is a backward-compatible wrapper around compileAllFunctions
 */
export async function compileAllExportedFunctions(
  source: string
): Promise<MultiFunctionCompilationResult> {
  const result = await compileAllFunctions(source);

  // Filter to only include exported functions
  const exportedFunctions = result.functions.filter(
    ({ functionInfo }) => functionInfo.isExported
  );

  return {
    functions: exportedFunctions,
    errors: result.errors,
  };
}

/**
 * Helper function to check if a node is function-like
 */
function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

/**
 * Gets root-level return statements from a function using AST traversal
 * This properly handles nested functions and only returns statements from the target function
 */
function getRootLevelReturnsOfFunction(
  sourceFile: ts.SourceFile,
  fn: ts.FunctionLikeDeclarationBase
): ts.ReturnStatement[] {
  const returns: ts.ReturnStatement[] = [];
  let functionDepth = 0; // we'll start visiting *inside* the target fn with depth=1

  function visit(n: ts.Node) {
    // Enter nested function-like nodes
    if (isFunctionLike(n)) {
      functionDepth++;
      ts.forEachChild(n, visit);
      functionDepth--;
      return;
    }

    // Collect return statements that belong to the outer function only
    if (ts.isReturnStatement(n) && functionDepth === 1) {
      returns.push(n);
    }

    ts.forEachChild(n, visit);
  }

  if (fn.body) {
    // Initialize at depth=1 because we're starting inside the target function
    functionDepth = 1;
    ts.forEachChild(fn.body, visit);
  }
  return returns;
}

/**
 * Extracts non-return statements from a function body using AST
 * This preserves variable declarations, expressions, and other essential code
 */
function extractNonReturnStatements(
  sourceFile: ts.SourceFile,
  fn: ts.FunctionLikeDeclarationBase
): string {
  if (!fn.body) return "";

  // For now, just extract variable declarations
  // Since return statements are processed separately, we can be more conservative
  const statementsToKeep: string[] = [];

  function collectStatements(node: ts.Node): void {
    // Only collect top-level variable declarations
    if (node.parent === fn.body && ts.isVariableStatement(node)) {
      // Keep variable declarations
      const statementText = node.getText(sourceFile);
      statementsToKeep.push(statementText);
      return;
    }

    // Continue visiting children
    ts.forEachChild(node, collectStatements);
  }

  collectStatements(fn.body);

  return statementsToKeep.join("\n");
}

/**
 * Extracts the condition from an if statement that precedes a return statement using AST
 */
function extractConditionFromAST(
  returnNode: ts.ReturnStatement,
  sourceFile: ts.SourceFile
): string | undefined {
  // Walk up the AST to find the parent if statement
  let parent = returnNode.parent;

  while (parent) {
    if (ts.isIfStatement(parent)) {
      // Found an if statement that contains this return
      const conditionText = parent.expression.getText(sourceFile);
      return conditionText;
    }

    // Stop if we hit a function boundary (don't look outside the current function)
    if (
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent)
    ) {
      break;
    }

    parent = parent.parent;
  }

  return undefined;
}

/**
 * Extracts the condition from an if statement that precedes a return statement
 */
function extractConditionBeforeReturn(
  source: string,
  returnIndex: number,
  functionStart?: number,
  functionEnd?: number
): string | undefined {
  // Look backwards from the return statement to find a preceding if statement
  // Only look within the function scope if provided
  const searchStart = functionStart ? Math.max(functionStart, 0) : 0;
  const beforeReturn = source.slice(searchStart, returnIndex);

  // Find the last if statement before this return
  // Look for patterns like "if (condition) return" on the same line
  const ifMatch = beforeReturn.match(/if\s*\(([^)]+)\)\s+return\s*\(?\s*$/);
  if (ifMatch) {
    return ifMatch[1].trim();
  }

  // Also check for patterns like "if (condition) return (" with newline after
  const ifMatchWithNewline = beforeReturn.match(
    /if\s*\(([^)]+)\)\s+return\s*\(\s*$/
  );
  if (ifMatchWithNewline) {
    return ifMatchWithNewline[1].trim();
  }

  // Check for patterns like "if (condition) " at the end (without return)
  const ifMatchAtEnd = beforeReturn.match(/if\s*\(([^)]+)\)\s*$/);
  if (ifMatchAtEnd) {
    return ifMatchAtEnd[1].trim();
  }

  // Also check for if statements that might be on the same line or previous lines
  const lines = beforeReturn.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes("return")) {
      // Check if this line has an if statement
      const ifMatch = line.match(/if\s*\(([^)]+)\)\s+return\s*\(?/);
      if (ifMatch) {
        return ifMatch[1].trim();
      }

      // Look for if statement in previous lines, but only within a reasonable distance
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        const ifMatch = prevLine.match(/if\s*\(([^)]+)\)/);
        if (ifMatch) {
          return ifMatch[1].trim();
        }
      }
      break;
    }
  }

  // Additional check: look for if statements that might be on the same line as the return
  // but with different formatting
  const returnLine = source.slice(returnIndex).split("\n")[0];
  const returnLineIfMatch = returnLine.match(/if\s*\(([^)]+)\)\s+return\s*\(?/);
  if (returnLineIfMatch) {
    return returnLineIfMatch[1].trim();
  }

  return undefined;
}

/**
 * Extracts function body and return statements from AST
 */
/**
 * Extracts function content using the original source text for accurate TSmd parsing
 */
function extractFunctionContentWithOriginalSource(
  ast: ts.SourceFile,
  functionName: string,
  originalSource: string
): {
  typescript: string;
  returnStatements: any[];
  interpolations: any[];
  conditionalBlocks: any[];
  ternaryExpressions: any[];
  jsxExpressions: any[];
} {
  let functionNode: ts.Node | null = null;
  let typescript = "";
  let returnStatements: any[] = [];
  let allInterpolations: any[] = [];
  let allConditionalBlocks: any[] = [];
  let allTernaryExpressions: any[] = [];
  let allJsxExpressions: any[] = [];

  function visit(node: ts.Node): void {
    // Find the function declaration with the matching name
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      functionNode = node;

      if (node.body) {
        // Use AST-based approach to extract non-return statements
        typescript = extractNonReturnStatements(ast, node);

        // Use AST-based approach to extract return statements (same as full-file compiler)
        const returns = getRootLevelReturnsOfFunction(ast, node);

        for (const returnStmt of returns) {
          // Extract the actual content from the return statement using original source
          const {
            content,
            interpolations,
            conditionalBlocks,
            ternaryExpressions,
            jsxExpressions,
          } = extractMarkdownFromReturnStatementWithOriginalSource(
            returnStmt,
            originalSource
          );

          // Check if this return statement has a condition (if statement before it)
          const condition = extractConditionFromAST(returnStmt, ast);

          returnStatements.push({
            condition: condition,
            content: content,
            isTemplate: true,
          });

          // Collect all interpolations, conditionals, etc. from this return statement
          allInterpolations.push(...interpolations);
          allConditionalBlocks.push(...conditionalBlocks);
          allTernaryExpressions.push(...ternaryExpressions);
          allJsxExpressions.push(...jsxExpressions);
        }
      }
    }

    // Check for variable declarations with function expressions
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === functionName &&
          declaration.initializer
        ) {
          if (
            ts.isFunctionExpression(declaration.initializer) ||
            ts.isArrowFunction(declaration.initializer)
          ) {
            functionNode = declaration.initializer;

            if (declaration.initializer.body) {
              // Use AST-based approach to extract non-return statements
              typescript = extractNonReturnStatements(
                ast,
                declaration.initializer
              );

              if (ts.isArrowFunction(declaration.initializer)) {
                if (
                  ts.isParenthesizedExpression(declaration.initializer.body)
                ) {
                  const {
                    content,
                    interpolations,
                    conditionalBlocks,
                    ternaryExpressions,
                    jsxExpressions,
                  } = extractMarkdownFromReturnStatementWithOriginalSource(
                    {
                      expression: declaration.initializer.body,
                    } as unknown as ts.ReturnStatement,
                    originalSource
                  );

                  returnStatements.push({
                    condition: undefined,
                    content: content,
                    isTemplate: true,
                  });

                  // Collect all interpolations, conditionals, etc. from this return statement
                  allInterpolations.push(...interpolations);
                  allConditionalBlocks.push(...conditionalBlocks);
                  allTernaryExpressions.push(...ternaryExpressions);
                  allJsxExpressions.push(...jsxExpressions);
                } else {
                  const returns = getRootLevelReturnsOfFunction(
                    ast,
                    declaration.initializer
                  );

                  for (const returnStmt of returns) {
                    // Extract the actual content from the return statement using original source
                    const {
                      content,
                      interpolations,
                      conditionalBlocks,
                      ternaryExpressions,
                      jsxExpressions,
                    } = extractMarkdownFromReturnStatementWithOriginalSource(
                      returnStmt,
                      originalSource
                    );

                    // Check if this return statement has a condition (if statement before it)
                    const condition = extractConditionFromAST(returnStmt, ast);

                    returnStatements.push({
                      condition: condition,
                      content: content,
                      isTemplate: true,
                    });

                    // Collect all interpolations, conditionals, etc. from this return statement
                    allInterpolations.push(...interpolations);
                    allConditionalBlocks.push(...conditionalBlocks);
                    allTernaryExpressions.push(...ternaryExpressions);
                    allJsxExpressions.push(...jsxExpressions);
                  }
                }
              } else {
                const returns = getRootLevelReturnsOfFunction(
                  ast,
                  declaration.initializer
                );

                for (const returnStmt of returns) {
                  // Extract the actual content from the return statement using original source
                  const {
                    content,
                    interpolations,
                    conditionalBlocks,
                    ternaryExpressions,
                    jsxExpressions,
                  } = extractMarkdownFromReturnStatementWithOriginalSource(
                    returnStmt,
                    originalSource
                  );

                  // Check if this return statement has a condition (if statement before it)
                  const condition = extractConditionFromAST(returnStmt, ast);

                  returnStatements.push({
                    condition: condition,
                    content: content,
                    isTemplate: true,
                  });

                  // Collect all interpolations, conditionals, etc. from this return statement
                  allInterpolations.push(...interpolations);
                  allConditionalBlocks.push(...conditionalBlocks);
                  allTernaryExpressions.push(...ternaryExpressions);
                  allJsxExpressions.push(...jsxExpressions);
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(ast);

  return {
    typescript,
    returnStatements,
    interpolations: allInterpolations,
    conditionalBlocks: allConditionalBlocks,
    ternaryExpressions: allTernaryExpressions,
    jsxExpressions: allJsxExpressions,
  };
}

function extractFunctionContent(
  ast: ts.SourceFile,
  functionName: string
): {
  typescript: string;
  returnStatements: any[];
  interpolations: any[];
  conditionalBlocks: any[];
  ternaryExpressions: any[];
  jsxExpressions: any[];
} {
  let functionNode: ts.Node | null = null;
  let typescript = "";
  let returnStatements: any[] = [];
  let allInterpolations: any[] = [];
  let allConditionalBlocks: any[] = [];
  let allTernaryExpressions: any[] = [];
  let allJsxExpressions: any[] = [];

  function visit(node: ts.Node): void {
    // Find the function declaration with the matching name
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      functionNode = node;

      // Extract the function body using AST-based cleaning
      if (node.body) {
        const sourceFile = node.getSourceFile();

        // Use AST-based approach to extract non-return statements
        typescript = extractNonReturnStatements(sourceFile, node);

        // Find return statements within this function using the new AST approach
        const returns = getRootLevelReturnsOfFunction(sourceFile, node);
        console.log(
          `Found ${returns.length} return statements in function ${functionName}`
        );

        for (const returnStmt of returns) {
          // Extract the actual content from the return statement using AST
          const {
            content,
            interpolations,
            conditionalBlocks,
            ternaryExpressions,
            jsxExpressions,
          } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);

          // Check if this return statement has a condition (if statement before it)
          const condition = extractConditionFromAST(returnStmt, sourceFile);

          returnStatements.push({
            condition: condition,
            content: content,
            isTemplate: true,
          });

          // Collect all interpolations, conditionals, etc. from this return statement
          allInterpolations.push(...interpolations);
          allConditionalBlocks.push(...conditionalBlocks);
          allTernaryExpressions.push(...ternaryExpressions);
          allJsxExpressions.push(...jsxExpressions);
        }
      }
    }

    // Check for variable declarations with function expressions
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === functionName &&
          declaration.initializer
        ) {
          if (
            ts.isFunctionExpression(declaration.initializer) ||
            ts.isArrowFunction(declaration.initializer)
          ) {
            functionNode = declaration.initializer;

            if (declaration.initializer.body) {
              const sourceFile = node.getSourceFile();

              // Use AST-based approach to extract non-return statements
              typescript = extractNonReturnStatements(
                sourceFile,
                declaration.initializer
              );

              // Handle arrow functions with implicit returns differently
              if (ts.isArrowFunction(declaration.initializer)) {
                // For arrow functions, check if the body is an expression (implicit return)
                if (
                  ts.isParenthesizedExpression(declaration.initializer.body)
                ) {
                  // This is an implicit return like () => (content)
                  const {
                    content,
                    interpolations,
                    conditionalBlocks,
                    ternaryExpressions,
                    jsxExpressions,
                  } = extractMarkdownFromReturnStatement(
                    {
                      expression: declaration.initializer.body,
                    } as unknown as ts.ReturnStatement,
                    sourceFile
                  );

                  returnStatements.push({
                    condition: undefined,
                    content: content,
                    isTemplate: true,
                  });

                  // Collect all interpolations, conditionals, etc. from this return statement
                  allInterpolations.push(...interpolations);
                  allConditionalBlocks.push(...conditionalBlocks);
                  allTernaryExpressions.push(...ternaryExpressions);
                  allJsxExpressions.push(...jsxExpressions);
                } else {
                  // For arrow functions with block bodies, look for explicit return statements
                  const returns = getRootLevelReturnsOfFunction(
                    sourceFile,
                    declaration.initializer
                  );

                  for (const returnStmt of returns) {
                    // Extract the actual content from the return statement using AST
                    const {
                      content,
                      interpolations,
                      conditionalBlocks,
                      ternaryExpressions,
                      jsxExpressions,
                    } = extractMarkdownFromReturnStatement(
                      returnStmt,
                      sourceFile
                    );

                    // Check if this return statement has a condition (if statement before it)
                    const condition = extractConditionFromAST(
                      returnStmt,
                      sourceFile
                    );

                    returnStatements.push({
                      condition: condition,
                      content: content,
                      isTemplate: true,
                    });

                    // Collect all interpolations, conditionals, etc. from this return statement
                    allInterpolations.push(...interpolations);
                    allConditionalBlocks.push(...conditionalBlocks);
                    allTernaryExpressions.push(...ternaryExpressions);
                    allJsxExpressions.push(...jsxExpressions);
                  }
                }
              } else {
                // For function expressions, look for explicit return statements
                const returns = getRootLevelReturnsOfFunction(
                  sourceFile,
                  declaration.initializer
                );

                for (const returnStmt of returns) {
                  // Extract the actual content from the return statement using AST
                  const {
                    content,
                    interpolations,
                    conditionalBlocks,
                    ternaryExpressions,
                    jsxExpressions,
                  } = extractMarkdownFromReturnStatement(
                    returnStmt,
                    sourceFile
                  );

                  // Check if this return statement has a condition (if statement before it)
                  const condition = extractConditionFromAST(
                    returnStmt,
                    sourceFile
                  );

                  returnStatements.push({
                    condition: condition,
                    content: content,
                    isTemplate: true,
                  });

                  // Collect all interpolations, conditionals, etc. from this return statement
                  allInterpolations.push(...interpolations);
                  allConditionalBlocks.push(...conditionalBlocks);
                  allTernaryExpressions.push(...ternaryExpressions);
                  allJsxExpressions.push(...jsxExpressions);
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(ast);

  return {
    typescript,
    returnStatements,
    interpolations: allInterpolations,
    conditionalBlocks: allConditionalBlocks,
    ternaryExpressions: allTernaryExpressions,
    jsxExpressions: allJsxExpressions,
  };
}
