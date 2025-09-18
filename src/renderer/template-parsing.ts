import { findMatchingBrace } from './string-helpers';

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
