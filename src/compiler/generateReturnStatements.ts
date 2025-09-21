import { ParsedMDX } from "../parser";
import { propsToObjectString } from "../renderer/string-helpers";
import { Chunk } from "../runtime/tsm-runtime";

// Helper function to detect ternary expression patterns in arrays
function isTernaryArray(arr: any[]): boolean {
    // Pattern: [condition, " ? ", trueValue, " : ", falseValue]
    return arr.length >= 5 &&
        arr[1] === ' ? ' &&
        arr[3] === ' : ' &&
        typeof arr[0] === 'string' && // condition
        typeof arr[2] === 'string' && // true value (can be quoted string)
        typeof arr[4] === 'string';   // false value (can be quoted string)
}

// Helper function to unquote strings if they're wrapped in quotes
function unquoteIfQuoted(str: string): string {
    // Remove surrounding quotes if present
    const match = str.match(/^"(.*)"$/);
    return match ? match[1] : str;
}

// Helper function to reconstruct ternary expressions from arrays
function reconstructTernary(arr: any[]): string {
    if (!isTernaryArray(arr)) {
        return arr.join('');
    }

    const condition = arr[0];
    const rawTrueValue = arr[2];
    const rawFalseValue = arr[4];

    // Handle quoted strings and __tsm calls
    let trueValue = rawTrueValue;
    let falseValue = rawFalseValue;

    // Remove quotes if present
    if (typeof trueValue === 'string' && trueValue.startsWith('"') && trueValue.endsWith('"')) {
        trueValue = trueValue.slice(1, -1);
    }
    if (typeof falseValue === 'string' && falseValue.startsWith('"') && falseValue.endsWith('"')) {
        falseValue = falseValue.slice(1, -1);
    }

    // Check if true/false values are __tsm calls that need recursive processing
    if (typeof trueValue === 'string' && trueValue.startsWith('__tsm([') && trueValue.endsWith('])')) {
        // Extract the array content from __tsm([...])
        const arrayContent = trueValue.slice(7, -2); // Remove "__tsm([" and "])"
        // Create a temporary array to recursively process
        try {
            // This is a simplified approach - in a real implementation you'd parse the JavaScript array
            // For now, we'll handle this specific case by checking if it's a ternary pattern
            const nestedArray = arrayContent.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            if (isTernaryArray(nestedArray)) {
                trueValue = reconstructTernary(nestedArray);
            } else {
                trueValue = arrayContent;
            }
        } catch (e) {
            // If parsing fails, keep as-is
            trueValue = arrayContent;
        }
    }
    if (typeof falseValue === 'string' && falseValue.startsWith('__tsm([') && falseValue.endsWith('])')) {
        const arrayContent = falseValue.slice(7, -2);
        try {
            const nestedArray = arrayContent.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            if (isTernaryArray(nestedArray)) {
                falseValue = reconstructTernary(nestedArray);
            } else {
                falseValue = arrayContent;
            }
        } catch (e) {
            falseValue = arrayContent;
        }
    }

    // Recursively process nested ternary expressions
    const processedTrueValue = typeof trueValue === 'string' ? trueValue : reconstructTernary(trueValue);
    const processedFalseValue = typeof falseValue === 'string' ? falseValue : reconstructTernary(falseValue);

    // Add quotes back if the original values were quoted
    const finalTrueValue = rawTrueValue.startsWith('"') && rawTrueValue.endsWith('"') ? `"${processedTrueValue}"` : processedTrueValue;
    const finalFalseValue = rawFalseValue.startsWith('"') && rawFalseValue.endsWith('"') ? `"${processedFalseValue}"` : processedFalseValue;

    return `${condition} ? ${finalTrueValue} : ${finalFalseValue}`;
}

function processNestedArrays(chunk: any[]): string {
    console.log("PROCESSING NESTED: ", chunk);

    // First, check if this is a ternary expression pattern
    if (isTernaryArray(chunk)) {
        console.log("DETECTED TERNARY PATTERN: ", chunk);
        return reconstructTernary(chunk);
    }

    // Check if any element is an array (nested)
    const hasNestedArrays = chunk.some(c => Array.isArray(c));
    console.log("HAS NESTED ARRAYS: ", hasNestedArrays);

    if (!hasNestedArrays) {
        // No nested arrays, just join with empty string
        return chunk.join('');
    }

    // Process each element, recursively handling nested arrays
    const processedElements: string[] = [];
    let hasTernaryElements = false;

    for (const element of chunk) {
        if (Array.isArray(element)) {
            // Check if this nested array is a ternary expression
            if (isTernaryArray(element)) {
                processedElements.push(reconstructTernary(element));
                hasTernaryElements = true;
            } else {
                // Recursively process nested array
                const processed = processNestedArrays(element);
                processedElements.push(processed);
                // If the nested array resulted in a __tsm call, we need to wrap this in __tsm too
                if (processed.startsWith('__tsm(')) {
                    hasTernaryElements = true;
                }
            }
        } else {
            processedElements.push(element);
        }
    }

    // Join all processed elements
    const joinedExpression = processedElements.join('');
    console.log("JOINED EXPRESSION: ", joinedExpression);

    // Only wrap in __tsm() if we have complex nested content that isn't just ternary expressions
    if (hasTernaryElements && joinedExpression.includes('__tsm(')) {
        return `__tsm([${joinedExpression}])`;
    }

    return joinedExpression;
}

export function generateReturnStatements(parsed: ParsedMDX): string {
    const conditionalReturns: string[] = [];
    let defaultReturn: string | null = null;

    // Process return statements in order
    for (let i = 0; i < parsed.returnStatements.length; i++) {
        const returnStmt = parsed.returnStatements[i];
        if (returnStmt.isTemplate) {
            // Generate chunk-based code for this return statement
            const chunks: string[] = [];

            // Add the markdown content as chunks
            if (returnStmt.content) {
                if (Array.isArray(returnStmt.content)) {
                    // Content is already chunks - convert them to JavaScript literals
                    for (const chunk of returnStmt.content) {
                        if (chunk === null || chunk === undefined || chunk === false) {
                            chunks.push(String(chunk));
                        } else if (chunk === '\n') {
                            chunks.push("'\\n'");
                        } else if (typeof chunk === 'string') {
                            let includeQuotes = true;
                            // Replace JSX expression placeholders with actual expressions
                            let processedChunk = chunk;
                            if (chunk.includes('__JSX_EXPRESSION_')) {
                                parsed.jsxExpressions.filter(expr => expr.placeholder === chunk).forEach(({ name, props }) => {
                                    // Remove braces from expression and replace placeholder
                                    // const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    // processedChunk = processedChunk.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                    processedChunk = `${name}(${propsToObjectString(props)})`
                                });
                                includeQuotes = false;
                            }
                            chunks.push(includeQuotes ? `"${processedChunk}"` : processedChunk);
                        } else if (Array.isArray(chunk)) {
                            // TSMInterpolations should be evaluated by TypeScript as expressions
                            // Process nested arrays with proper ternary handling
                            const expression = processNestedArrays(chunk);
                            chunks.push(expression);
                        } else {
                            chunks.push(String(chunk));
                        }
                    }
                } else {
                    // Content is a string, split by newlines
                    const lines = returnStmt.content.split('\n');
                    for (let j = 0; j < lines.length; j++) {
                        if (lines[j].trim()) {
                            // Replace JSX expression placeholders with actual expressions
                            let processedLine = lines[j];
                            if (parsed.jsxExpressions) {
                                parsed.jsxExpressions.forEach(({ placeholder, expression }) => {
                                    // Remove braces from expression and replace placeholder
                                    const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    processedLine = processedLine.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                });
                            }
                            chunks.push(`"${processedLine}"`);
                        }
                        if (j < lines.length - 1) {
                            chunks.push("'\\n'");
                        }
                    }
                }
            }

            // Generate the return statement
            const processedChunks: Chunk[][] = [];
            let currentChunk: Chunk[] = [];
            for (const chunk of chunks) {
                if (chunk === "'\\n'") {
                    currentChunk.push(chunk);
                    processedChunks.push(currentChunk);
                    currentChunk = [];
                } else {
                    currentChunk.push(chunk);
                }
            }
            if (currentChunk.length > 0) {
                processedChunks.push(currentChunk);
            }
            const chunksString = processedChunks.map(chunk => chunk.join(', ')).join(',\n    ');
            const returnStatement = `return __tsm([\n    ${chunksString}\n]);`;

            // Determine if this should be a conditional or default return
            const isLastReturn = i === parsed.returnStatements.length - 1;
            const hasCondition = returnStmt.condition && returnStmt.condition !== 'undefined';

            if (hasCondition && !isLastReturn) {
                // Conditional return statement (not the last one)
                conditionalReturns.push(`if (${returnStmt.condition}) ${returnStatement}`);
            } else {
                // Default return statement (last one or no condition)
                defaultReturn = returnStatement;
            }
        }
    }

    // Combine conditional returns and default return
    const allReturns = [...conditionalReturns];
    if (defaultReturn) {
        allReturns.push(defaultReturn);
    }

    return allReturns.join('\n  ');
}