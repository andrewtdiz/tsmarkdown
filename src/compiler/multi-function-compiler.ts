/**
 * Multi-Function Compiler
 * 
 * This module provides functionality to compile multiple exported functions
 * from a TypeScript source file, instead of just the first function.
 */

import * as ts from 'typescript';
import { ParsedMDX } from '../parser';
import { compile } from '../compiler';
import { extractFunctions } from '../parser/typescript-parser';
import { parseContent } from '../parser/pipeline';
import { protectCodeBlocks, restoreCodeBlocks } from '../parser/code-protection';
import { normalizeIndentation } from '../renderer/string-helpers';
import type { TSMComponentAttribute } from '../parser/tsm-ast';

/**
 * Preprocesses MDX syntax within functions to make them parseable by TypeScript
 */
function preprocessMDXInFunctions(source: string): string {
    // Find all return statements with MDX syntax and convert them to template literals
    // This handles patterns like: return (content with {{ interpolation }})

    let processedSource = source;

    // Find return statements with parentheses that contain MDX syntax
    const returnWithParensRegex = /return\s*\(\s*([^)]*\{\{[^}]+\}\}[^)]*)\s*\)/g;

    processedSource = processedSource.replace(returnWithParensRegex, (match, content) => {
        // Convert MDX interpolations to template literal syntax
        let templateContent = content
            .replace(/\{\{([^}]+)\}\}/g, '${$1}')  // Convert {{ var }} to ${var}
            .replace(/#\s+/g, '# ')  // Ensure proper spacing for headers
            .trim();

        return `return \`${templateContent}\``;
    });

    // Also handle return statements with hash syntax (like # Hello)
    const returnWithHashRegex = /return\s*\(\s*(#[^)]*)\s*\)/g;

    processedSource = processedSource.replace(returnWithHashRegex, (match, content) => {
        // Convert MDX interpolations to template literal syntax
        let templateContent = content
            .replace(/\{\{([^}]+)\}\}/g, '${$1}')  // Convert {{ var }} to ${var}
            .trim();

        return `return \`${templateContent}\``;
    });

    return processedSource;
}

/**
 * Extracts return statements from function source using regex
 */
function extractReturnStatementsFromSource(functionSource: string, originalSource: string, functionStart: number): Array<{ condition?: string; content: string; startIndex: number }> {
    const returns: Array<{ condition?: string; content: string; startIndex: number }> = [];

    // Find all return statements in the function
    const returnRegex = /return\s+\(/g;
    let match;

    while ((match = returnRegex.exec(functionSource)) !== null) {
        const returnStart = match.index + match[0].length - 1; // Position of the opening parenthesis

        // Find the matching closing parenthesis
        let parenCount = 0;
        let endPos = returnStart;
        let foundStart = false;

        for (let i = returnStart; i < functionSource.length; i++) {
            if (functionSource[i] === '(') {
                parenCount++;
                foundStart = true;
            } else if (functionSource[i] === ')') {
                parenCount--;
                if (parenCount === 0 && foundStart) {
                    endPos = i;
                    break;
                }
            }
        }

        if (foundStart) {
            const content = functionSource.slice(returnStart + 1, endPos).trim();

            // Check if there's an if statement before this return
            const beforeReturn = functionSource.slice(0, match.index);
            const condition = extractConditionBeforeReturn(beforeReturn, match.index);

            returns.push({
                condition,
                content,
                startIndex: functionStart + match.index
            });
        }
    }

    return returns;
}

/**
 * Parses extracted return content using the MDX pipeline
 */
function parseExtractedReturnContent(content: string): { content: string; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    // Clean up the content
    let rawContent = content.trim();

    // Remove leading whitespace from each line (dedent)
    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        // Find the minimum indentation (excluding empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) { // Skip empty lines
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        // Remove the minimum indentation from all lines
        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    // Now parse the markdown content using the MDX parsing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

export interface MultiFunctionCompilationResult {
    functions: Array<{
        functionInfo: {
            name: string;
            isExported: boolean;
            isDefaultExport: boolean;
            parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
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
export async function compileAllFunctions(source: string): Promise<MultiFunctionCompilationResult> {
    const errors: string[] = [];
    const functions: Array<{ functionInfo: any; compiled: any }> = [];

    try {
        // Preprocess the source to handle MDX syntax within functions
        const processedSource = preprocessMDXInFunctions(source);

        // Use TypeScript compiler API with the processed source
        const sourceFile = ts.createSourceFile(
            'input.ts',
            processedSource,
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
                const { typescript, returnStatements, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractFunctionContentWithOriginalSource(sourceFile, functionInfo.name, processedSource);

                // Create ParsedMDX for each function
                const markdownContent = returnStatements.length > 0 ? returnStatements[0].content : `# ${functionInfo.name} Content`;

                const parsed: ParsedMDX = {
                    imports: [],
                    functionName: functionInfo.name,
                    functionParams: functionInfo.parameters.map(p => p.name),
                    isAsync: functionInfo.isAsync,
                    typescript: typescript,
                    markdown: markdownContent,
                    interpolations: interpolations,
                    conditionalBlocks: conditionalBlocks,
                    ternaryExpressions: ternaryExpressions,
                    jsxExpressions: jsxExpressions,
                    returnStatements: returnStatements,
                    propsInterface: functionInfo.parameters.length > 0 ?
                        `interface ${functionInfo.name}Props {\n  ${functionInfo.parameters.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(';\n  ')}\n}` : '',
                    parameterTypes: functionInfo.parameters
                };

                const compiled = compile(parsed);
                functions.push({ functionInfo, compiled });
            } catch (error: any) {
                errors.push(`Failed to compile function ${functionInfo.name}: ${error.message}`);
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
export async function compileAllExportedFunctions(source: string): Promise<MultiFunctionCompilationResult> {
    const result = await compileAllFunctions(source);

    // Filter to only include exported functions
    const exportedFunctions = result.functions.filter(({ functionInfo }) => functionInfo.isExported);

    return {
        functions: exportedFunctions,
        errors: result.errors
    };
}

/**
 * Helper function to check if a node is function-like
 */
function isFunctionLike(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);
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
    if (!fn.body) return '';

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

    return statementsToKeep.join('\n');
}

/**
 * Extracts the condition from an if statement that precedes a return statement using AST
 */
function extractConditionFromAST(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): string | undefined {
    // Walk up the AST to find the parent if statement
    let parent = returnNode.parent;

    while (parent) {
        if (ts.isIfStatement(parent)) {
            // Found an if statement that contains this return
            const conditionText = parent.expression.getText(sourceFile);
            return conditionText;
        }

        // Stop if we hit a function boundary (don't look outside the current function)
        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
            break;
        }

        parent = parent.parent;
    }

    return undefined;
}

/**
 * Extracts the condition from an if statement that precedes a return statement
 */
function extractConditionBeforeReturn(source: string, returnIndex: number, functionStart?: number, functionEnd?: number): string | undefined {
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
    const ifMatchWithNewline = beforeReturn.match(/if\s*\(([^)]+)\)\s+return\s*\(\s*$/);
    if (ifMatchWithNewline) {
        return ifMatchWithNewline[1].trim();
    }

    // Check for patterns like "if (condition) " at the end (without return)
    const ifMatchAtEnd = beforeReturn.match(/if\s*\(([^)]+)\)\s*$/);
    if (ifMatchAtEnd) {
        return ifMatchAtEnd[1].trim();
    }

    // Also check for if statements that might be on the same line or previous lines
    const lines = beforeReturn.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.includes('return')) {
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
    const returnLine = source.slice(returnIndex).split('\n')[0];
    const returnLineIfMatch = returnLine.match(/if\s*\(([^)]+)\)\s+return\s*\(?/);
    if (returnLineIfMatch) {
        return returnLineIfMatch[1].trim();
    }

    return undefined;
}

/**
 * Extracts markdown content from a return statement using AST analysis
 */
/**
 * Extracts markdown content from a return statement using original source text
 */
function extractMarkdownFromReturnStatementWithOriginalSource(returnNode: ts.ReturnStatement, originalSource: string): { content: string; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: '', interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    let rawContent = '';

    // Handle different types of return expressions using original source
    if (ts.isParenthesizedExpression(returnNode.expression)) {
        const start = returnNode.expression.getStart();

        // Find the matching closing parenthesis manually since TypeScript parser fails on MDX syntax
        let parenCount = 0;
        let endPos = start;
        let foundStart = false;

        for (let i = start; i < originalSource.length; i++) {
            if (originalSource[i] === '(') {
                parenCount++;
                foundStart = true;
            } else if (originalSource[i] === ')') {
                parenCount--;
                if (parenCount === 0 && foundStart) {
                    endPos = i;
                    break;
                }
            }
        }

        const fullText = originalSource.slice(start, endPos + 1);

        // Extract content between the parentheses
        if (fullText.startsWith('(') && fullText.endsWith(')')) {
            rawContent = fullText.slice(1, -1).trim();
        } else {
            rawContent = fullText.trim();
        }
    } else if (ts.isStringLiteral(returnNode.expression)) {
        // Handle return "content" format
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // Handle return `content` format
        rawContent = originalSource.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    } else {
        // Fallback: get the raw text from original source
        rawContent = originalSource.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    }

    // Clean up the content
    rawContent = rawContent.trim();

    // Remove leading whitespace from each line (dedent)
    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        // Find the minimum indentation (excluding empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) { // Skip empty lines
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        // Remove the minimum indentation from all lines
        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    // Now parse the markdown content using the MDX parsing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

function extractMarkdownFromReturnStatement(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): { content: string; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: '', interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    const sourceText = sourceFile.getFullText();
    let rawContent = '';


    // Handle different types of return expressions
    if (ts.isParenthesizedExpression(returnNode.expression)) {
        // For parenthesized expressions, we need to manually extract the content
        // because the TypeScript parser can't handle MDX syntax inside parentheses
        const start = returnNode.expression.getStart();

        // Find the matching closing parenthesis manually since TypeScript parser fails on MDX syntax
        let parenCount = 0;
        let endPos = start;
        let foundStart = false;

        for (let i = start; i < sourceText.length; i++) {
            if (sourceText[i] === '(') {
                parenCount++;
                foundStart = true;
            } else if (sourceText[i] === ')') {
                parenCount--;
                if (parenCount === 0 && foundStart) {
                    endPos = i;
                    break;
                }
            }
        }

        const fullText = sourceText.slice(start, endPos + 1);


        // Extract content between the parentheses
        if (fullText.startsWith('(') && fullText.endsWith(')')) {
            rawContent = fullText.slice(1, -1).trim();
        } else {
            rawContent = fullText.trim();
        }
    } else if (ts.isStringLiteral(returnNode.expression)) {
        // Handle return "content" format
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // Handle return `content` format
        rawContent = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    } else {
        // Fallback: get the raw text
        rawContent = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    }

    // Clean up the content
    rawContent = rawContent.trim();

    // Remove leading whitespace from each line (dedent)
    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        // Find the minimum indentation (excluding empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) { // Skip empty lines
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        // Remove the minimum indentation from all lines
        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    // Now parse the markdown content using the MDX parsing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

/**
 * Extracts function body and return statements from AST
 */
/**
 * Extracts function content using the original source text for accurate MDX parsing
 */
function extractFunctionContentWithOriginalSource(ast: ts.SourceFile, functionName: string, originalSource: string): { typescript: string; returnStatements: any[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    let functionNode: ts.Node | null = null;
    let typescript = '';
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
                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatementWithOriginalSource(returnStmt, originalSource);

                    // Check if this return statement has a condition (if statement before it)
                    const condition = extractConditionFromAST(returnStmt, ast);

                    returnStatements.push({
                        condition: condition,
                        content: content,
                        isTemplate: true
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
                if (ts.isIdentifier(declaration.name) && declaration.name.text === functionName && declaration.initializer) {
                    if (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer)) {
                        functionNode = declaration.initializer;

                        if (declaration.initializer.body) {
                            // Use AST-based approach to extract non-return statements
                            typescript = extractNonReturnStatements(ast, declaration.initializer);

                            if (ts.isArrowFunction(declaration.initializer)) {
                                if (ts.isParenthesizedExpression(declaration.initializer.body)) {
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatementWithOriginalSource({
                                        expression: declaration.initializer.body
                                    } as unknown as ts.ReturnStatement, originalSource);

                                    returnStatements.push({
                                        condition: undefined,
                                        content: content,
                                        isTemplate: true
                                    });

                                    // Collect all interpolations, conditionals, etc. from this return statement
                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                } else {
                                    const returns = getRootLevelReturnsOfFunction(ast, declaration.initializer);

                                    for (const returnStmt of returns) {
                                        // Extract the actual content from the return statement using original source
                                        const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatementWithOriginalSource(returnStmt, originalSource);

                                        // Check if this return statement has a condition (if statement before it)
                                        const condition = extractConditionFromAST(returnStmt, ast);

                                        returnStatements.push({
                                            condition: condition,
                                            content: content,
                                            isTemplate: true
                                        });

                                        // Collect all interpolations, conditionals, etc. from this return statement
                                        allInterpolations.push(...interpolations);
                                        allConditionalBlocks.push(...conditionalBlocks);
                                        allTernaryExpressions.push(...ternaryExpressions);
                                        allJsxExpressions.push(...jsxExpressions);
                                    }
                                }
                            } else {
                                const returns = getRootLevelReturnsOfFunction(ast, declaration.initializer);

                                for (const returnStmt of returns) {
                                    // Extract the actual content from the return statement using original source
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatementWithOriginalSource(returnStmt, originalSource);

                                    // Check if this return statement has a condition (if statement before it)
                                    const condition = extractConditionFromAST(returnStmt, ast);

                                    returnStatements.push({
                                        condition: condition,
                                        content: content,
                                        isTemplate: true
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
        jsxExpressions: allJsxExpressions
    };
}

function extractFunctionContent(ast: ts.SourceFile, functionName: string): { typescript: string; returnStatements: any[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    let functionNode: ts.Node | null = null;
    let typescript = '';
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
                console.log(`Found ${returns.length} return statements in function ${functionName}`);

                for (const returnStmt of returns) {
                    // Extract the actual content from the return statement using AST
                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);

                    // Check if this return statement has a condition (if statement before it)
                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                    returnStatements.push({
                        condition: condition,
                        content: content,
                        isTemplate: true
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
                if (ts.isIdentifier(declaration.name) && declaration.name.text === functionName && declaration.initializer) {
                    if (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer)) {
                        functionNode = declaration.initializer;

                        if (declaration.initializer.body) {
                            const sourceFile = node.getSourceFile();

                            // Use AST-based approach to extract non-return statements
                            typescript = extractNonReturnStatements(sourceFile, declaration.initializer);

                            // Handle arrow functions with implicit returns differently
                            if (ts.isArrowFunction(declaration.initializer)) {
                                // For arrow functions, check if the body is an expression (implicit return)
                                if (ts.isParenthesizedExpression(declaration.initializer.body)) {
                                    // This is an implicit return like () => (content)
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement({
                                        expression: declaration.initializer.body
                                    } as unknown as ts.ReturnStatement, sourceFile);

                                    returnStatements.push({
                                        condition: undefined,
                                        content: content,
                                        isTemplate: true
                                    });

                                    // Collect all interpolations, conditionals, etc. from this return statement
                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                } else {
                                    // For arrow functions with block bodies, look for explicit return statements
                                    const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                    for (const returnStmt of returns) {
                                        // Extract the actual content from the return statement using AST
                                        const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);

                                        // Check if this return statement has a condition (if statement before it)
                                        const condition = extractConditionFromAST(returnStmt, sourceFile);

                                        returnStatements.push({
                                            condition: condition,
                                            content: content,
                                            isTemplate: true
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
                                const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                for (const returnStmt of returns) {
                                    // Extract the actual content from the return statement using AST
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);

                                    // Check if this return statement has a condition (if statement before it)
                                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                                    returnStatements.push({
                                        condition: condition,
                                        content: content,
                                        isTemplate: true
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
        jsxExpressions: allJsxExpressions
    };
}
