// Component Scanner - identifies TypeScript prelude and markdown body in TSmd components

import { findMatchingBrace, findMatchingParen } from './string-helpers';
import * as ts from 'typescript';

export interface ReturnStatement {
    returnIndex: number;
    contentStartIndex: number;
    contentEndIndex: number;
    condition?: string;
    isConditional: boolean;
}

export interface ComponentSplit {
    tsPrelude: string;
    markdownBody: string;
    returnStartIndex: number;
    returnEndIndex: number;
    hasValidStructure: boolean;
    diagnostics: string[];
    returnStatements: ReturnStatement[];
}

export interface ComponentLocation {
    startIndex: number;
    endIndex: number;
    functionName?: string;
    isDefaultExport: boolean;
}

/**
 * Scans the source code to locate the component function
 * Supports both exported and non-exported functions
 * Returns the entire file as the component if it contains a component function
 */
export function locateComponent(source: string): ComponentLocation | null {
    const lines = source.split('\n');
    let componentFunctionLine = -1;
    let functionName = '';
    let isDefaultExport = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for various export patterns
        if (line.startsWith('export default function ')) {
            const match = line.match(/export default function\s+(\w+)\s*\(/);
            functionName = match?.[1] || '';
            componentFunctionLine = i;
            isDefaultExport = true;
            break;
        }

        if (line.startsWith('export const ') && line.includes(' = () =>')) {
            const match = line.match(/export const\s+(\w+)\s*=\s*\(\)\s*=>/);
            functionName = match?.[1] || '';
            componentFunctionLine = i;
            isDefaultExport = true;
            break;
        }

        if (line.startsWith('export default () =>')) {
            componentFunctionLine = i;
            isDefaultExport = true;
            break;
        }

        // Check for non-exported function patterns (current codebase pattern)
        if (line.startsWith('async function ') || line.startsWith('function ')) {
            const match = line.match(/(?:async\s+)?function\s+(\w+)\s*\(/);
            functionName = match?.[1] || '';
            componentFunctionLine = i;
            isDefaultExport = false;
            break;
        }

        // Check for arrow function patterns (with or without parameters)
        if (line.includes(' = ') && line.includes(' =>')) {
            const match = line.match(/(?:export\s+)?(?:const\s+)?(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
            if (match) {
                functionName = match[1];
                componentFunctionLine = i;
                isDefaultExport = line.startsWith('export');
                break;
            }
        }
    }

    if (componentFunctionLine === -1) {
        return null;
    }

    // Return the entire file as the component location
    // This allows us to capture interfaces, types, and other declarations before the function
    return {
        startIndex: 0,
        endIndex: source.length,
        functionName: functionName || undefined,
        isDefaultExport
    };
}

/**
 * Finds the end of a component function by tracking braces
 */
function findComponentEnd(source: string, startIndex: number): number {
    let braceLevel = 0;
    let inFunction = false;

    for (let i = startIndex; i < source.length; i++) {
        const char = source[i];

        if (char === '{') {
            braceLevel++;
            inFunction = true;
        } else if (char === '}') {
            braceLevel--;
            if (inFunction && braceLevel === 0) {
                return i + 1;
            }
        }
    }

    return source.length;
}

/**
 * Splits a component into TypeScript prelude and markdown body
 */
export function splitComponent(source: string): ComponentSplit {
    const diagnostics: string[] = [];

    // First, locate the component
    const component = locateComponent(source);
    if (!component) {
        return {
            tsPrelude: '',
            markdownBody: '',
            returnStartIndex: -1,
            returnEndIndex: -1,
            hasValidStructure: false,
            diagnostics: ['No component function found'],
            returnStatements: []
        };
    }

    // Find all return statements that are not nested in child functions
    const returnStatements = findAllReturns(source);
    if (returnStatements.length === 0) {
        return {
            tsPrelude: source,
            markdownBody: '',
            returnStartIndex: -1,
            returnEndIndex: -1,
            hasValidStructure: false,
            diagnostics: ['No return statement found in component'],
            returnStatements: []
        };
    }

    // Use the first return statement for backward compatibility
    const firstReturn = returnStatements[0];

    // Find the opening parenthesis after 'return'
    const afterReturn = source.slice(firstReturn.returnIndex + 6); // +6 for 'return'
    const openParenIndex = afterReturn.indexOf('(');

    if (openParenIndex !== -1) {
        // Include the 'return (' part in the TypeScript prelude
        const tsPrelude = source.slice(0, firstReturn.returnIndex + 6 + openParenIndex + 1);
        const markdownBody = source.slice(firstReturn.contentStartIndex, firstReturn.contentEndIndex);

        return {
            tsPrelude: tsPrelude.trim(),
            markdownBody: markdownBody.trim(),
            returnStartIndex: firstReturn.returnIndex,
            returnEndIndex: firstReturn.contentEndIndex,
            hasValidStructure: true,
            diagnostics,
            returnStatements
        };
    } else {
        // Fallback to original behavior
        const tsPrelude = source.slice(0, firstReturn.returnIndex);
        const markdownBody = source.slice(firstReturn.contentStartIndex, firstReturn.contentEndIndex);

        return {
            tsPrelude: tsPrelude.trim(),
            markdownBody: markdownBody.trim(),
            returnStartIndex: firstReturn.returnIndex,
            returnEndIndex: firstReturn.contentEndIndex,
            hasValidStructure: false,
            diagnostics: ['Invalid return statement format'],
            returnStatements
        };
    }
}

/**
 * Checks if content contains TSmd tokens
 */
function containsTSmdTokens(content: string): boolean {
    // Check for common TSmd patterns: {{ interpolation }}, <@ component />, ** markdown **
    return /\{\{.*?\}\}/s.test(content) ||
        /<\@.*?>.*?<\/@>/s.test(content) ||
        /\*\*.*?\*\*/s.test(content) ||
        /^#+\s/s.test(content) ||  // Headers
        /^[-*+]\s/s.test(content) || // Lists
        /^\d+\.\s/s.test(content);   // Ordered lists
}

/**
 * Checks if content contains parentheses that might indicate markdown regions
 * This is particularly important for ternary expressions like: data.isAuthorized ? (Authorized) : (Not Authorized)
 */
function containsParenthesesWithContent(content: string): boolean {
    // Look for patterns like: ? (content) : (content)
    const ternaryPattern = /\?\s*\([^)]+\)\s*:\s*\([^)]+\)/s;
    if (ternaryPattern.test(content)) {
        return true;
    }

    // Look for content that starts with ( followed by newline - clear markdown indicator
    if (content.startsWith('(\n') || content.startsWith('(\r\n')) {
        return true;
    }

    // Look for standalone parentheses that might contain markdown
    const standaloneParenPattern = /\(\s*[^)]+\s*\)/s;
    if (standaloneParenPattern.test(content)) {
        return true;
    }

    return false;
}

/**
 * Determines if a return statement contains markdown/TSmd content
 * Uses TypeScript AST parsing to make a more accurate determination
 */
function isMarkdownReturn(content: string): boolean {
    const trimmed = content.trim();

    // Empty content is not markdown
    if (trimmed.length === 0) {
        return false;
    }

    // First, check for obvious non-markdown patterns (pure expressions, literals)
    const nonMarkdownPatterns = [
        /^true$/s,      // boolean literal
        /^false$/s,     // boolean literal
        /^null$/s,      // null literal
        /^undefined$/s, // undefined literal
        /^["'].*["']$/s, // string literal
        /^[\d.]+$/s,    // number literal
        /^\w+$/s,       // single identifier
        /^\w+\([^)]*\)$/s, // function call
        /^\w+\s*[\+\-\*\/]\s*\w+$/s, // simple arithmetic
        /^\w+\s*===?\s*\w+$/s, // comparison
        /^\w+\s*&&\s*\w+$/s, // logical and
        /^\w+\s*\|\|\s*\w+$/s, // logical or
        /^!\w+$/s       // negation
    ];

    // If it matches any non-markdown pattern, it's likely a TypeScript expression
    for (const pattern of nonMarkdownPatterns) {
        if (pattern.test(trimmed)) {
            return false;
        }
    }

    // Check for TSmd tokens that indicate markdown content
    if (containsTSmdTokens(trimmed)) {
        return true;
    }

    // Check for parentheses that might contain markdown (especially in ternary expressions)
    if (containsParenthesesWithContent(trimmed)) {
        return true;
    }

    // Use TypeScript AST parsing to determine if content is valid TypeScript
    // If it fails to parse as TypeScript, it's likely markdown
    if (!isValidTypeScriptExpression(trimmed)) {
        return true;
    }

    // Check for common markdown patterns
    const markdownPatterns = [
        /^#+\s+/s,      // Headers
        /^[-*+]\s+/s,   // Unordered lists
        /^\d+\.\s+/s,   // Ordered lists
        /^>\s+/s,       // Blockquotes
        /^```/s,        // Code blocks
        /^\|/s,         // Tables
        /^\[.*\]\(.*\)/s, // Links
        /^!\[.*\]\(.*\)/s // Images
    ];

    for (const pattern of markdownPatterns) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }

    // If content has newlines and some structure, likely markdown
    if (trimmed.includes('\n') && trimmed.length > 10) {
        return true;
    }

    // Default to TypeScript expression for short, simple content
    return false;
}

/**
 * Uses TypeScript AST parsing to determine if content is valid TypeScript
 * If parsing fails, it's likely markdown content
 */
function isValidTypeScriptExpression(content: string): boolean {
    try {
        // Create a minimal TypeScript source file to test the content
        const testSource = `const test: any = ${content};`;

        // Use TypeScript compiler to parse the expression
        const sourceFile = ts.createSourceFile(
            'test.ts',
            testSource,
            ts.ScriptTarget.Latest,
            true // setParentNodes
        );

        // Check for syntax errors
        //@ts-ignore
        const diagnostics = ts.getSyntacticDiagnostics(sourceFile);

        // If there are no syntax errors, it's likely valid TypeScript
        return diagnostics.length === 0;
    } catch (error) {
        // If parsing throws an error, it's likely not valid TypeScript
        return false;
    }
}

/**
 * Finds all return statements that are not nested in child functions
 */
function findAllReturns(componentBody: string): ReturnStatement[] {
    const returnStatements: ReturnStatement[] = [];
    let braceLevel = 0;
    let inFunction = false;

    for (let i = 0; i < componentBody.length; i++) {
        const char = componentBody[i];
        const nextChars = componentBody.slice(i, i + 6);

        // Track brace levels to know when we're in the main function body
        if (char === '{') {
            braceLevel++;
            if (braceLevel === 1) {
                inFunction = true;
            }
        } else if (char === '}') {
            braceLevel--;
            if (braceLevel === 0) {
                inFunction = false;
            }
        }

        // Look for return statement
        if (inFunction && nextChars === 'return') {
            // Check if this is a return statement (followed by whitespace or parenthesis)
            const afterReturn = componentBody.slice(i + 6);
            const trimmedAfterReturn = afterReturn.trim();

            if (trimmedAfterReturn.startsWith('(')) {
                // Find the opening parenthesis - account for the original whitespace
                const openParenIndex = i + 6 + afterReturn.indexOf('(');

                // Find the matching closing parenthesis
                const closeParenIndex = findMatchingParen(componentBody, openParenIndex);
                if (closeParenIndex === -1) {
                    continue; // Invalid syntax, keep looking
                }

                // Check if this return statement has a condition (if statement before it)
                const condition = extractConditionBeforeReturn(componentBody, i);
                const isConditional = condition !== undefined;

                // Extract content and clean it up
                let contentStartIndex = openParenIndex + 1;
                let contentEndIndex = closeParenIndex;

                // Find the actual start of content (skip leading whitespace, newlines, and opening parenthesis)
                const rawContent = componentBody.slice(contentStartIndex, contentEndIndex);
                const trimmedContent = rawContent.trim();

                // Find the start of the trimmed content
                const leadingWhitespace = rawContent.length - rawContent.trimStart().length;
                contentStartIndex = contentStartIndex + leadingWhitespace;

                // Find the end of the trimmed content
                const trailingWhitespace = rawContent.trimStart().length - trimmedContent.length;
                contentEndIndex = contentStartIndex + trimmedContent.length;

                // Only include this return statement if it contains markdown content
                const finalContent = componentBody.slice(contentStartIndex, contentEndIndex);
                if (isMarkdownReturn(finalContent)) {
                    const returnStmt = {
                        returnIndex: i,
                        contentStartIndex,
                        contentEndIndex,
                        condition,
                        isConditional
                    };

                    returnStatements.push(returnStmt);
                }
            } else {
                // Handle one-line returns like return (**API Error**)
                const nextNonWhitespaceIndex = i + 6 + afterReturn.indexOf('(');
                if (componentBody[nextNonWhitespaceIndex] === '(') {
                    const closeParenIndex = findMatchingParen(componentBody, nextNonWhitespaceIndex);
                    if (closeParenIndex !== -1) {
                        // Extract content between parentheses
                        const contentStartIndex = nextNonWhitespaceIndex + 1;
                        const contentEndIndex = closeParenIndex;
                        const finalContent = componentBody.slice(contentStartIndex, contentEndIndex);

                        if (isMarkdownReturn(finalContent)) {
                            const returnStmt = {
                                returnIndex: i,
                                contentStartIndex,
                                contentEndIndex,
                                condition: undefined,
                                isConditional: false
                            };

                            returnStatements.push(returnStmt);
                        }
                    }
                }
            }
        }
    }

    return returnStatements;
}


/**
 * Extracts the condition from an if statement that precedes a return statement
 */
function extractConditionBeforeReturn(source: string, returnIndex: number): string | undefined {
    // Look backwards from the return statement to find a preceding if statement
    const beforeReturn = source.slice(0, returnIndex);

    // Find the last if statement before the return
    const ifMatch = beforeReturn.match(/if\s*\(\s*([^)]+)\s*\)\s*$/m);
    if (ifMatch) {
        return ifMatch[1].trim();
    }

    return undefined;
}

/**
 * Extracts content from multiple return statements
 */
export function extractMultipleReturnContent(source: string, returnStatements: ReturnStatement[]): Array<{
    condition?: string;
    content: string;
    isConditional: boolean;
}> {
    return returnStatements.map(returnStmt => ({
        condition: returnStmt.condition,
        content: source.slice(returnStmt.contentStartIndex, returnStmt.contentEndIndex).trim(),
        isConditional: returnStmt.isConditional
    }));
}

/**
 * Validates that a component has the expected structure for ESLint processing
 */
export function validateComponentStructure(source: string): {
    isValid: boolean;
    diagnostics: string[];
    component?: ComponentLocation;
    split?: ComponentSplit;
} {
    const diagnostics: string[] = [];

    const component = locateComponent(source);
    if (!component) {
        diagnostics.push('No component function found');
        return { isValid: false, diagnostics };
    }

    const split = splitComponent(source);
    if (!split.hasValidStructure) {
        diagnostics.push(...split.diagnostics);
        return { isValid: false, diagnostics, component };
    }

    // Additional validations
    if (split.tsPrelude.length === 0) {
        diagnostics.push('TypeScript prelude is empty');
    }

    // For components with multiple return statements, empty markdown body is valid
    // since content is inside the return statements
    if (split.markdownBody.length === 0 && split.returnStatements.length <= 1) {
        diagnostics.push('Markdown body is empty');
    }

    return {
        isValid: diagnostics.length === 0,
        diagnostics,
        component,
        split
    };
}
