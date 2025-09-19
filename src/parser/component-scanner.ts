// Component Scanner - identifies TypeScript prelude and markdown body in Better MDX components

import { findMatchingBrace, findMatchingParen } from './string-helpers';

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

        // Check for arrow function patterns
        if (line.includes(' = () =>') || line.includes(' = async () =>')) {
            const match = line.match(/(?:export\s+)?(?:const\s+)?(\w+)\s*=\s*(?:async\s+)?\(\)\s*=>/);
            functionName = match?.[1] || '';
            componentFunctionLine = i;
            isDefaultExport = line.startsWith('export');
            break;
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

                const returnStmt = {
                    returnIndex: i,
                    contentStartIndex,
                    contentEndIndex,
                    condition,
                    isConditional
                };

                // Debug: Check what content is being extracted (can be removed in production)
                // const extractedContent = componentBody.slice(returnStmt.contentStartIndex, returnStmt.contentEndIndex);
                // console.log('Raw content between parens:', JSON.stringify(componentBody.slice(openParenIndex + 1, closeParenIndex)));
                // console.log('Trimmed content:', JSON.stringify(trimmedContent));
                // console.log('Final extracted content:', JSON.stringify(extractedContent));
                // console.log('Content start index:', contentStartIndex, 'Content end index:', contentEndIndex);

                returnStatements.push(returnStmt);
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

    if (split.markdownBody.length === 0) {
        diagnostics.push('Markdown body is empty');
    }

    return {
        isValid: diagnostics.length === 0,
        diagnostics,
        component,
        split
    };
}
