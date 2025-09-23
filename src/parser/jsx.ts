// JSX parsing and processing
import { findMatchingBrace } from './string-helpers';

// Recursive JSX parser
export function parseJSX(content: string, context: { jsxExpressions: Array<{ placeholder: string; expression: string }> }): string {
    // Process JSX elements first (like <@Component />)
    let processed = processJSXElements(content, context.jsxExpressions);

    // Then process JSX expressions (like {expression})
    processed = processJSXExpressions(processed, context.jsxExpressions);

    return processed;
}

export function processJSXElements(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
    // First, process individual JSX elements to handle props correctly
    let processedContent = content;
    const jsxElementRegex = /<(@?)(\w+)([^/>]*)\/>/g;

    console.log('DEBUG: processedContent:', processedContent);
    processedContent = processedContent.replace(jsxElementRegex, (match, atSymbol, componentName, props) => {
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

    // Then, find JSX expressions that contain JSX elements (like ternary expressions)
    // This regex matches {expression} where expression contains JSX elements
    const jsxExpressionRegex = /\{([^{}]*(?:<[^>]*>[^{}]*)*)\}/g;

    processedContent = processedContent.replace(jsxExpressionRegex, (match, expression) => {
        const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
        jsxExpressions.push({ placeholder, expression: expression.trim() });
        return placeholder;
    });

    return processedContent;
}

export function processJSXExpressions(
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
