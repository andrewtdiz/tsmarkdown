export async function processMultipleReturnStatements(
    returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>,
    context: any,
    errors: string[]
): Promise<string> {
    // Find the first return statement that should be executed
    for (const returnStmt of returnStatements) {
        if (returnStmt.isTemplate) {
            // Check if this return statement has a condition
            if (returnStmt.condition) {
                try {
                    // Evaluate the condition
                    const conditionResult = evaluateExpression(returnStmt.condition, context);
                    if (conditionResult) {
                        // This condition is true, use this template
                        return await processTemplate(returnStmt.content, context, errors);
                    }
                    // Continue to next return statement
                    continue;
                } catch (error) {
                    errors.push(`Condition evaluation error in "${returnStmt.condition}": ${error}`);
                    continue;
                }
            } else {
                // No condition, this is the default/fallback template
                return await processTemplate(returnStmt.content, context, errors);
            }
        }
    }

    // If no template return statement matched, return empty string
    return '';
}

export async function processTemplate(
    templateContent: string,
    context: any,
    errors: string[]
): Promise<string> {
    // Extract interpolations, conditionals, ternary expressions, and JSX expressions from the template content
    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    // Process the template content to extract all the different types of expressions
    let processedContent = processTemplateContent(
        templateContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    );

    // Process conditional blocks first (they may contain interpolations)
    processedContent = await processConditionalBlocks(
        processedContent,
        conditionalBlocks,
        interpolations,
        context,
        errors
    );

    // Process any remaining interpolations
    processedContent = processInterpolations(
        processedContent,
        interpolations,
        context,
        errors
    );

    // Process ternary expressions
    processedContent = processTernaryExpressions(
        processedContent,
        ternaryExpressions,
        context,
        errors,
        interpolations
    );

    // Process JSX expressions
    processedContent = await processJSXExpressions(
        processedContent,
        jsxExpressions,
        context,
        errors
    );

    return processedContent;
}

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

export function processConditionalBlocksForParsing(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
): string {
    // Match conditional blocks with proper nesting
    const conditionalRegex = /\{([^{}]+?)\s*&&\s*\(\s*([\s\S]*?)\s*\)\s*\}/g;

    return content.replace(
        conditionalRegex,
        (match, condition, blockContent) => {
            const placeholder = `__CONDITIONAL_${conditionalBlocks.length}__`;
            conditionalBlocks.push({
                condition: condition.trim(),
                content: blockContent.trim(),
            });
            return placeholder;
        },
    );
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
    const jsxElementRegex = /<(@?)(\w+)([^/>]*)\/>/g;

    return content.replace(jsxElementRegex, (match, atSymbol, componentName, props) => {
        // Parse props to extract JSX expressions within them
        const propMatches = props.match(/(\w+)=\{([^}]+)\}/g) || [];
        const processedProps: string[] = [];

        // Handle props with ={} syntax
        for (const propMatch of propMatches) {
            const [, propName, propExpr] = propMatch.match(/(\w+)=\{([^}]+)\}/) || [];
            if (propName && propExpr) {
                // Create a JSX expression placeholder for the prop value
                const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
                jsxExpressions.push({ placeholder, expression: propExpr.trim() });
                processedProps.push(`${propName}=${placeholder}`);
            }
        }

        // Handle props without ={} syntax (default to true)
        const booleanProps = props.match(/\b(\w+)(?=\s|$)/g) || [];
        for (const booleanProp of booleanProps) {
            // Skip if this prop is already handled by the ={} syntax
            const isAlreadyHandled = propMatches.some((propMatch: string) =>
                propMatch.includes(`${booleanProp}=`)
            );
            if (!isAlreadyHandled) {
                processedProps.push(booleanProp);
            }
        }

        // Convert the entire JSX element to a placeholder
        const processedPropsString = processedProps.length > 0 ? ' ' + processedProps.join(' ') : '';
        const jsxElementPlaceholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
        const fullJsxElement = `<${atSymbol}${componentName}${processedPropsString} />`;
        jsxExpressions.push({ placeholder: jsxElementPlaceholder, expression: fullJsxElement });
        return jsxElementPlaceholder;
    });
}

export function processJSXExpressionsForParsing(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
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
        if (lastOpenAngle > lastCloseAngle && lastOpenAngle > lastSlashAngle) {
            startIndex = openBraceIndex + 1;
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

        // Skip if it's a conditional block (contains &&)
        if (trimmedExpression.includes('&&')) {
            startIndex = endIndex + 1;
            continue;
        }

        // Skip if it's a ternary expression (contains ? and :) and doesn't contain JSX
        if (trimmedExpression.includes('?') && trimmedExpression.includes(':') && !trimmedExpression.includes('<')) {
            startIndex = endIndex + 1;
            continue;
        }

        // Skip if it's empty
        if (!trimmedExpression) {
            startIndex = endIndex + 1;
            continue;
        }

        const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
        jsxExpressions.push({ placeholder, expression: trimmedExpression });
        processedContent = processedContent.substring(0, openBraceIndex) + placeholder + processedContent.substring(endIndex + 1);
        startIndex = openBraceIndex + placeholder.length;
    }

    return processedContent;
}

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

// Import the functions that will be moved to other modules
import { processConditionalBlocks, processInterpolations, processTernaryExpressions, processJSXExpressions, evaluateExpression } from '../renderer/jsx-runtime';
