import { TSMComponentAttribute } from "../parser/tsm-ast";
import { FunctionInfo } from "../parser.js";

export function findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 0;
    let parenCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        const prevChar = i > 0 ? content[i - 1] : '';

        // Handle string literals
        if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
            continue;
        }

        if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
            continue;
        }

        if (inString) continue;

        // Count braces and parentheses
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return i;
            }
        } else if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
        }
    }

    return -1; // No matching brace found
}

export function processEscapeSequences(content: string): string {
    // Convert literal escape sequences to actual characters
    return content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
}

export function normalizeIndentation(content: string): string {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    // Find all non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length === 0) return content;

    // Get indentation levels
    const indentLevels = nonEmptyLines.map(line => line.match(/^(\s*)/)?.[1].length ?? 0);

    // If there are multiple indentation levels, find the most common non-zero one
    const indentCounts = indentLevels.reduce((acc, level) => {
        if (level > 0) {
            acc[level] = (acc[level] || 0) + 1;
        }
        return acc;
    }, {} as Record<number, number>);

    let targetIndent = 0;
    if (Object.keys(indentCounts).length > 0) {
        // Find the most common non-zero indentation
        targetIndent = parseInt(Object.keys(indentCounts).reduce((a, b) =>
            indentCounts[parseInt(a)] > indentCounts[parseInt(b)] ? a : b
        ));
    }

    // If no common indentation found or it's 0, return as-is
    if (targetIndent === 0) return content;

    // Remove the target indentation from lines that have it
    return lines
        .map(line => {
            if (line.trim() === '') {
                return ''; // Empty lines become truly empty
            }
            // Only remove indentation if the line starts with the target indent level
            if (line.startsWith(' '.repeat(targetIndent))) {
                return line.slice(targetIndent);
            }
            return line; // Keep other lines as-is (like headers)
        })
        .join('\n');
}

export function valueToString(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return '[object Object]';
        }
    }
    return String(value);
}

export interface ParsedProp {
    name: string;
    value: string;
    isExpression: boolean;
    isBoolean: boolean;
    isString: boolean;
}

export interface JSXExpressionInfo {
    placeholder: string;
    expression: string;
}

/**
 * Parses JSX element props from a props string like 'title="My Title" showHeader={user.isAdmin} visible'
 * Supports string literals, expressions, and boolean props.
 */
export function parseJSXProps(
    propsString: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }> = [],
    createPlaceholdersForExpressions: boolean = true
): ParsedProp[] {
    const props: ParsedProp[] = [];

    // Remove leading/trailing whitespace
    const trimmed = propsString.trim();
    if (!trimmed) return props;

    let currentPos = 0;

    while (currentPos < trimmed.length) {
        // Skip whitespace
        while (currentPos < trimmed.length && /\s/.test(trimmed[currentPos])) {
            currentPos++;
        }

        if (currentPos >= trimmed.length) break;

        // Match prop name
        const propNameMatch = trimmed.slice(currentPos).match(/^\w+/);
        if (!propNameMatch) break;

        const propName = propNameMatch[0];
        currentPos += propName.length;

        // Skip whitespace after prop name
        while (currentPos < trimmed.length && /\s/.test(trimmed[currentPos])) {
            currentPos++;
        }

        let propValue = '';
        let isExpression = false;
        let isString = false;
        let isBoolean = false;

        if (currentPos < trimmed.length && trimmed[currentPos] === '=') {
            // Has equals sign - either string or expression prop
            currentPos++; // Skip =

            // Skip whitespace after =
            while (currentPos < trimmed.length && /\s/.test(trimmed[currentPos])) {
                currentPos++;
            }

            if (currentPos < trimmed.length) {
                if (trimmed[currentPos] === '"' || trimmed[currentPos] === "'") {
                    // String literal prop
                    const quoteChar = trimmed[currentPos];
                    currentPos++; // Skip opening quote

                    const stringStart = currentPos;
                    // Find closing quote (not escaped)
                    while (currentPos < trimmed.length) {
                        if (trimmed[currentPos] === quoteChar && trimmed[currentPos - 1] !== '\\') {
                            break;
                        }
                        currentPos++;
                    }

                    propValue = `${trimmed.slice(stringStart, currentPos)}`;
                    isString = true;
                    currentPos++; // Skip closing quote
                } else if (trimmed[currentPos] === '{') {
                    // Expression prop
                    const braceStart = currentPos;
                    const closingBrace = findMatchingBrace(trimmed, currentPos);
                    if (closingBrace !== -1) {
                        currentPos = closingBrace + 1; // Skip closing brace
                        const expression = trimmed.slice(braceStart, closingBrace + 1);

                        if (createPlaceholdersForExpressions && expression.includes('<@')) {
                            // Create placeholder for JSX expression processing
                            const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
                            jsxExpressions.push({ placeholder, expression });
                            propValue = placeholder;
                        } else {
                            // Use the expression directly (no placeholder needed)
                            const parsedExpression = expression.replace("{", "").replace("}", "");
                            propValue = parsedExpression;
                        }
                        isExpression = true;
                    } else {
                        // Malformed expression, treat as text
                        propValue = trimmed.slice(braceStart);
                        isExpression = false;
                    }
                } else {
                    // Malformed prop, skip it
                    break;
                }
            }
        } else {
            // No equals sign - boolean prop
            propValue = 'true';
            isBoolean = true;
        }

        props.push({
            name: propName,
            value: propValue,
            isExpression,
            isBoolean,
            isString
        });

        // Skip whitespace before next prop
        while (currentPos < trimmed.length && /\s/.test(trimmed[currentPos])) {
            currentPos++;
        }
    }

    return props;
}

/**
 * Converts parsed props back to a props object string
 */
export function propsToObjectString(props: TSMComponentAttribute[]): string {
    const propStrings = props.map(prop => {
        const propValue = prop.value.value;

        if (prop.value.type === 'string') {
            // For string props, quote the value unless it's a boolean string
            if (propValue === 'true' || propValue === 'false') {
                return `${prop.name}: ${propValue}`;
            } else {
                return `${prop.name}: "${propValue}"`;
            }
        } else if (prop.value.type === 'expression') {
            return `${prop.name}: ${propValue}`;
        } else {
            // Fallback for any other types
            return `${prop.name}: ${propValue}`;
        }
    });

    return propStrings.length > 0 ? `{ ${propStrings.join(', ')} }` : '';
}

export function generatePropsInterface(functionInfo: FunctionInfo): string {
    if (functionInfo.parameters.length === 0) {
        return '';
    }

    const interfaceName = `${functionInfo.name}Props`;
    const properties = functionInfo.parameters.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(';\n  ');

    return `
interface ${interfaceName} {
  ${properties}
}`.slice(1);
}
