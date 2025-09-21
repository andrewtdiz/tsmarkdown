/**
 * Function Props Adapter
 *
 * This module provides utilities to convert function strings and props
 * into ParsedMDX structures that can be used with the existing parser and compiler.
 */

import { ParsedMDX } from './index';

export interface FunctionWithProps {
    /** The function content as a string */
    functionString: string;
    /** Props to be injected into the function */
    props: Record<string, any>;
    /** Optional function name override */
    functionName?: string;
}

/**
 * Converts a function string and props into a ParsedMDX structure
 */
export function adaptFunctionWithProps(input: FunctionWithProps): ParsedMDX {
    const { functionString, props, functionName } = input;

    // Use the existing parser to parse the function
    const parsed = parseFunctionToMDX(functionString);

    // Override the function name if provided
    if (functionName) {
        parsed.functionName = functionName;
    }

    // Inject props into the parsed structure
    // This will make the props available during rendering
    const propsInterface = generatePropsInterface(parsed.functionName, props);

    return {
        ...parsed,
        propsInterface
    };
}

/**
 * Parses a function string into a ParsedMDX structure
 * This is a wrapper around the existing parser
 */
function parseFunctionToMDX(functionString: string): ParsedMDX {
    // Import and use the existing parser
    const { parseMDX } = require('../parser');
    return parseMDX(functionString);
}

/**
 * Generates a props interface string from props object
 */
function generatePropsInterface(functionName: string, props: Record<string, any>): string {
    if (Object.keys(props).length === 0) {
        return '';
    }

    const propsEntries = Object.entries(props).map(([key, value]) => {
        const type = inferType(value);
        return `  ${key}${type === 'any' ? '' : `: ${type}`}`;
    });

    return `interface ${functionName}Props {
${propsEntries.join(';\n')}
}`;
}

/**
 * Infers the TypeScript type from a JavaScript value
 */
function inferType(value: any): string {
    if (value === null || value === undefined) {
        return 'any';
    }

    if (typeof value === 'string') {
        return 'string';
    }

    if (typeof value === 'number') {
        return 'number';
    }

    if (typeof value === 'boolean') {
        return 'boolean';
    }

    if (Array.isArray(value)) {
        return 'any[]';
    }

    if (typeof value === 'object') {
        return 'Record<string, any>';
    }

    return 'any';
}

/**
 * Creates a complete MDX string from a function and props
 * This can be useful for debugging or when you need the full MDX representation
 */
export function createMDXFromFunctionAndProps(input: FunctionWithProps): string {
    const { functionString, props } = input;

    // Extract the function body from the function string
    const functionBody = extractFunctionBody(functionString);

    // Add props as variables at the top of the function
    const propsVariables = Object.entries(props)
        .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
        .join('\n  ');

    const mdxContent = `${functionBody}
  ${propsVariables}
`;

    return mdxContent;
}

/**
 * Extracts the function body from a function string
 */
function extractFunctionBody(functionString: string): string {
    // Simple regex to extract function body - this could be enhanced
    const match = functionString.match(/function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (match) {
        return match[1];
    }

    // Fallback - return the string as-is if it doesn't match the pattern
    return functionString;
}
