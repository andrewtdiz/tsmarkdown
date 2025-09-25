import { findMatchingBrace } from './string-helpers';
import { parseJSXProps, propsToObjectString } from './render-utils';

export function processNestedInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next {{ pattern
        const openIndex = processedContent.indexOf('{{', startIndex);
        if (openIndex === -1) break;

        // Find the matching }} by counting nested braces
        let braceCount = 0;
        let closeIndex = openIndex + 2; // Start after {{

        while (closeIndex < processedContent.length) {
            const char = processedContent[closeIndex];
            const nextChar = processedContent[closeIndex + 1];

            if (char === '{' && nextChar === '{') {
                // Found nested {{
                braceCount++;
                closeIndex += 2;
            } else if (char === '}' && nextChar === '}') {
                // Found }}
                if (braceCount === 0) {
                    // This is the matching closing }}
                    break;
                } else {
                    // This is a nested closing }}, decrement count
                    braceCount--;
                    closeIndex += 2;
                }
            } else {
                closeIndex++;
            }
        }

        if (closeIndex >= processedContent.length) {
            // No matching }} found, skip this one
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            const placeholder = `__INTERPOLATION_${interpolations.length}__`;
            interpolations.push({ placeholder, expression });

            // Replace the entire {{ expression }} with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 2);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            // Empty expression, skip
            startIndex = closeIndex + 2;
        }
    }

    return processedContent;
}

export function processConditionalBlocksForParsing(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next { pattern that might be a conditional
        const openBraceIndex = processedContent.indexOf('{', startIndex);
        if (openBraceIndex === -1) break;

        // Skip if it's a double brace {{ }}
        if (processedContent[openBraceIndex + 1] === '{') {
            startIndex = openBraceIndex + 2;
            continue;
        }

        // Find the matching closing brace
        const endIndex = findMatchingBrace(processedContent, openBraceIndex);
        if (endIndex === -1) {
            startIndex = openBraceIndex + 1;
            continue;
        }

        const expression = processedContent.substring(openBraceIndex + 1, endIndex);
        const trimmedExpression = expression.trim();

        // Check if this is a conditional block (contains && and parentheses)
        if (trimmedExpression.includes('&&') && trimmedExpression.includes('(') && trimmedExpression.includes(')')) {
            // Find the last && operator before the opening parenthesis
            let lastAndIndex = -1;
            let parenIndex = -1;

            // Find the opening parenthesis
            for (let i = 0; i < trimmedExpression.length; i++) {
                if (trimmedExpression[i] === '(') {
                    parenIndex = i;
                    break;
                }
            }

            if (parenIndex !== -1) {
                // Find the last && before the opening parenthesis
                for (let i = parenIndex - 1; i >= 0; i--) {
                    if (trimmedExpression.substring(i, i + 2) === '&&') {
                        lastAndIndex = i;
                        break;
                    }
                }

                if (lastAndIndex !== -1) {
                    const condition = trimmedExpression.substring(0, lastAndIndex).trim();
                    const afterAnd = trimmedExpression.substring(lastAndIndex + 2).trim();

                    // Check if there's a matching opening parenthesis after &&
                    if (afterAnd.startsWith('(')) {
                        // Find the matching closing parenthesis
                        let parenCount = 0;
                        let contentStart = -1;
                        let contentEnd = -1;

                        for (let i = 0; i < afterAnd.length; i++) {
                            const char = afterAnd[i];
                            if (char === '(') {
                                if (parenCount === 0) {
                                    contentStart = i + 1;
                                }
                                parenCount++;
                            } else if (char === ')') {
                                parenCount--;
                                if (parenCount === 0) {
                                    contentEnd = i;
                                    break;
                                }
                            }
                        }

                        if (contentStart !== -1 && contentEnd !== -1) {
                            const blockContent = afterAnd.substring(contentStart, contentEnd);

                            const placeholder = `__CONDITIONAL_${conditionalBlocks.length}__`;
                            conditionalBlocks.push({
                                condition: condition,
                                content: blockContent.trim(),
                            });

                            processedContent = processedContent.substring(0, openBraceIndex) +
                                placeholder +
                                processedContent.substring(endIndex + 1);
                            startIndex = openBraceIndex + placeholder.length;
                            continue;
                        }
                    }
                }
            }
        }

        startIndex = openBraceIndex + 1;
    }

    return processedContent;
}

export function processTernaryExpressionsForParsing(
    content: string,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
): string {
    // Match ternary expressions - {condition ? trueValue : falseValue}
    const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\}/g;

    return content.replace(
        ternaryRegex,
        (match, condition, trueValue, falseValue) => {
            const trimmedCondition = condition.trim();
            const trimmedTrueValue = trueValue.trim();
            const trimmedFalseValue = falseValue.trim();

            // Skip if any part is empty
            if (!trimmedCondition || !trimmedTrueValue || !trimmedFalseValue) {
                return match;
            }

            const placeholder = `__TERNARY_${ternaryExpressions.length}__`;
            ternaryExpressions.push({
                condition: trimmedCondition,
                trueValue: trimmedTrueValue,
                falseValue: trimmedFalseValue,
            });
            return placeholder;
        },
    );
}

export function processJSXElementsForParsing(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
    // Find JSX elements like <Component prop={value} /> and <@Component prop={value} />
    const jsxElementRegex = /<@(\w+)([^/>]*)\/>/g;

    return content.replace(jsxElementRegex, (match, componentName, props) => {
        // Use the shared prop parser to handle all prop types correctly
        const parsedProps = parseJSXProps(props, jsxExpressions);

        // Convert JSX element to function call: ComponentName({ prop1: value1, prop2: value2 })
        //@ts-ignore
        const propsString = propsToObjectString(parsedProps);
        const functionCall = `${componentName}(${propsString})`;
        return functionCall;
    });
}

export function processJSXExpressionsForParsing(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
    console.log('DEBUG: processJSXExpressionsForParsing called with content:', content);
    // Find all {expression} patterns and process them
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        const openBraceIndex = processedContent.indexOf('{', startIndex);
        if (openBraceIndex === -1) break;

        // Skip if it's a double brace {{ }}
        if (processedContent[openBraceIndex + 1] === '{') {
            startIndex = openBraceIndex + 2;
            continue;
        }

        // Skip if we're inside a JSX element (between < and />)
        const beforeBrace = processedContent.substring(0, openBraceIndex);
        const lastOpenAngle = beforeBrace.lastIndexOf('<');
        const lastCloseAngle = beforeBrace.lastIndexOf('>');
        const lastSlashAngle = beforeBrace.lastIndexOf('/>');

        // If we have an unclosed JSX element (last < is after last >), skip this brace
        // Temporarily disabled to debug
        // if (lastOpenAngle > lastCloseAngle && lastOpenAngle > lastSlashAngle) {
        //     startIndex = openBraceIndex + 1;
        //     continue;
        // }

        // Find the matching closing brace
        const endIndex = findMatchingBrace(processedContent, openBraceIndex);
        if (endIndex === -1) {
            startIndex = openBraceIndex + 1;
            continue;
        }

        const expression = processedContent.substring(openBraceIndex + 1, endIndex);
        const trimmedExpression = expression.trim();

        console.log('DEBUG: Found JSX expression:', trimmedExpression);

        // Skip if it's a conditional block (contains &&)
        if (trimmedExpression.includes('&&')) {
            startIndex = endIndex + 1;
            continue;
        }

        // Skip if it's a ternary expression (contains ? and :) and doesn't contain JSX or map
        if (trimmedExpression.includes('?') && trimmedExpression.includes(':') &&
            !trimmedExpression.includes('<') && !trimmedExpression.includes('.map(')) {
            startIndex = endIndex + 1;
            continue;
        }

        // Skip if it's empty
        if (!trimmedExpression) {
            startIndex = endIndex + 1;
            continue;
        }

        // Only process expressions that contain JSX components (start with <@)
        if (trimmedExpression.includes('<@')) {
            // Check if this expression contains nested JSX expressions that need to be processed first
            if (trimmedExpression.includes('{') && trimmedExpression.includes('}')) {
                // Process nested JSX expressions recursively
                const nestedExpressions: Array<{ placeholder: string; expression: string }> = [];
                const processedNestedExpression = processJSXExpressionsForParsing(trimmedExpression, nestedExpressions);

                // Add nested expressions to the main array
                jsxExpressions.push(...nestedExpressions);

                // Use the processed expression
                const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
                jsxExpressions.push({ placeholder, expression: processedNestedExpression });
                processedContent = processedContent.substring(0, openBraceIndex) + placeholder + processedContent.substring(endIndex + 1);
                startIndex = openBraceIndex + placeholder.length;
            } else {
                const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
                jsxExpressions.push({ placeholder, expression: processedContent.substring(openBraceIndex, endIndex + 1) });
                processedContent = processedContent.substring(0, openBraceIndex) + placeholder + processedContent.substring(endIndex + 1);
                startIndex = openBraceIndex + placeholder.length;
            }
        } else {
            // This is a regular JavaScript expression, leave it as-is
            startIndex = endIndex + 1;
            continue;
        }
    }

    return processedContent;
}

/**
 * Converts JSX expressions containing <@Component /> syntax to function calls
 */
export function convertJSXToFunctionCalls(
    jsxExpression: string,
    jsxExpressions?: Array<{ placeholder: string; expression: string }>
): string {
    // Match <@ComponentName props /> syntax
    const jsxElementRegex = /<@(\w+)([^/>]*)\/>/g;
    let convertedExpression = jsxExpression;

    convertedExpression = convertedExpression.replace(jsxElementRegex, (match, componentName, props) => {
        // Use the shared prop parser to handle all prop types correctly
        // We pass the jsxExpressions array so that expressions within props can be tracked
        const parsedProps = parseJSXProps(props, jsxExpressions || [], true);

        //@ts-ignore
        const propsString = propsToObjectString(parsedProps);
        return `${componentName}(${propsString})`;
    });

    return convertedExpression;
}

export function processTemplateContent(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
    // Process interpolations first with support for nested interpolations
    let processedContent = processNestedInterpolations(content, interpolations);

    // Process conditional blocks - handle multiline {condition && (content)}
    processedContent = processConditionalBlocksForParsing(
        processedContent,
        conditionalBlocks,
    );

    // Process JSX expressions first - handle {expression} that are not interpolations, conditionals, or ternary expressions
    // This needs to happen before ternary expressions to properly handle nested JSX
    processedContent = processJSXExpressionsForParsing(
        processedContent,
        jsxExpressions,
    );

    // Process ternary expressions - handle {condition ? trueValue : falseValue}
    processedContent = processTernaryExpressionsForParsing(
        processedContent,
        ternaryExpressions,
    );

    // Process JSX elements (like <Component prop={value} />)
    processedContent = processJSXElementsForParsing(
        processedContent,
        jsxExpressions,
    );

    return processedContent;
}
