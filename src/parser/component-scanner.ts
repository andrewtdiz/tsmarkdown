// Component Scanner - identifies TypeScript prelude and markdown body in Better MDX components

import { findMatchingBrace, findMatchingParen } from './string-helpers';

export interface ComponentSplit {
    tsPrelude: string;
    markdownBody: string;
    returnStartIndex: number;
    returnEndIndex: number;
    hasValidStructure: boolean;
    diagnostics: string[];
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
            diagnostics: ['No component function found']
        };
    }

    // Find the first return statement that's not nested in child functions
    const returnMatch = findFirstReturn(source);
    if (!returnMatch) {
        return {
            tsPrelude: source,
            markdownBody: '',
            returnStartIndex: -1,
            returnEndIndex: -1,
            hasValidStructure: false,
            diagnostics: ['No return statement found in component']
        };
    }

    // Split the component
    const tsPrelude = source.slice(0, returnMatch.returnIndex);
    const markdownBody = source.slice(returnMatch.contentStartIndex, returnMatch.contentEndIndex);

    // Validate structure
    const hasValidStructure = returnMatch.returnIndex > 0 && markdownBody.length > 0;

    return {
        tsPrelude: tsPrelude.trim(),
        markdownBody: markdownBody.trim(),
        returnStartIndex: returnMatch.returnIndex,
        returnEndIndex: returnMatch.contentEndIndex,
        hasValidStructure,
        diagnostics
    };
}

/**
 * Finds the first return statement that's not nested in child functions
 */
function findFirstReturn(componentBody: string): {
    returnIndex: number;
    contentStartIndex: number;
    contentEndIndex: number;
} | null {
    let braceLevel = 0;
    let parenLevel = 0;
    let inFunction = false;
    let returnFound = false;

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
        if (inFunction && !returnFound && nextChars === 'return') {
            // Check if this is a return statement (followed by whitespace or parenthesis)
            const afterReturn = componentBody.slice(i + 6).trim();
            if (afterReturn.startsWith('(')) {
                returnFound = true;

                // Find the opening parenthesis
                const openParenIndex = i + 6 + afterReturn.indexOf('(');

                // Find the matching closing parenthesis
                const closeParenIndex = findMatchingParen(componentBody, openParenIndex);
                if (closeParenIndex === -1) {
                    continue; // Invalid syntax, keep looking
                }

                return {
                    returnIndex: i,
                    contentStartIndex: openParenIndex + 1,
                    contentEndIndex: closeParenIndex
                };
            }
        }
    }

    return null;
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
