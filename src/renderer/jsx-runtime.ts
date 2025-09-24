// Using Bun.file() for file operations instead of fs
import { CompiledTSmd, compile } from '../compiler';
import { parseTSmd } from '../parser';
import { componentRegistry, mergePropsWithDefaults, resolveComponentPath } from './render-context';
import { processEscapeSequences, normalizeIndentation, valueToString } from './string-helpers';
import { parseInterpolations } from '../parser/interpolations';

export function processInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
): string {
    let processedContent = content;

    for (const interpolation of interpolations) {
        try {
            const value = evaluateExpression(interpolation.expression, context);
            const stringValue = valueToString(value);
            processedContent = processedContent.replace(
                interpolation.placeholder,
                stringValue
            );
        } catch (error) {
            errors.push(`Interpolation error in "${interpolation.expression}": ${error}`);
            processedContent = processedContent.replace(interpolation.placeholder, '');
        }
    }

    return processedContent;
}

export async function processConditionalBlocks(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    interpolations: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[],
    jsxExpressions: Array<{ placeholder: string; expression: string }> = []
): Promise<string> {
    let processedContent = content;

    // Process conditionals in forward order to handle nested conditionals correctly
    // Outer conditionals (lower indices) need to be resolved before inner ones (higher indices)
    for (let i = 0; i < conditionalBlocks.length; i++) {
        const block = conditionalBlocks[i];
        const placeholder = `__CONDITIONAL_${i}__`;

        try {
            const shouldRender = evaluateExpression(block.condition, context);
            let blockContent = shouldRender ? block.content : '';

            // Process any interpolations and JSX expressions within the conditional block content
            if (blockContent && shouldRender) {
                // Process escape sequences first (convert \n to actual newlines)
                blockContent = processEscapeSequences(blockContent);

                // Normalize indentation within the conditional block
                blockContent = normalizeIndentation(blockContent.trim());

                // The block content already contains processed placeholders (like __CONDITIONAL_1__)
                // We don't need to re-parse it, just process any remaining interpolations, ternary expressions, and JSX

                // Process interpolations
                blockContent = processInterpolations(blockContent, interpolations, context, errors);

                // Process ternary expressions
                blockContent = await processTernaryExpressions(
                    blockContent,
                    [],
                    context,
                    errors,
                    interpolations
                );

                // Process JSX expressions
                blockContent = await processJSXExpressions(blockContent, jsxExpressions, context, errors);

                // Process JSX elements
                blockContent = await processJSXElements(blockContent, jsxExpressions, context, errors, {});
            }

            // Replace placeholder with more intelligent handling of empty lines
            if (!blockContent.trim()) {
                // False condition - remove the placeholder and clean up any extra newlines
                // Check if the placeholder is on its own line and remove the entire line
                const lines = processedContent.split('\n');
                const updatedLines = lines.filter(line => !line.includes(placeholder));
                processedContent = updatedLines.join('\n');
            } else {
                // True condition - trim trailing newlines from block content to prevent extra spacing
                const trimmedBlockContent = blockContent.replace(/\n+$/, '');
                processedContent = processedContent.replace(placeholder, trimmedBlockContent);
            }
        } catch (error) {
            errors.push(`Condition error in "${block.condition}": ${error}`);
            processedContent = processedContent.replace(placeholder, '');
        }
    }

    return processedContent;
}

export async function processTernaryExpressions(
    content: string,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
    context: any,
    errors: string[],
    interpolations: Array<{ placeholder: string; expression: string }> = []
): Promise<string> {
    let processedContent = content;

    for (let i = 0; i < ternaryExpressions.length; i++) {
        const ternary = ternaryExpressions[i];
        const placeholder = `__TERNARY_${i}__`;

        try {
            // Evaluate the condition
            const conditionResult = evaluateExpression(ternary.condition, context);

            // Choose the appropriate value based on the condition
            const selectedValue = conditionResult ? ternary.trueValue : ternary.falseValue;

            // Process any interpolations within the selected value
            let processedValue = selectedValue;
            if (processedValue && typeof processedValue === 'string') {
                // Remove wrapping parentheses if they exist
                processedValue = processedValue.trim();
                if (processedValue.startsWith('(') && processedValue.endsWith(')')) {
                    processedValue = processedValue.slice(1, -1).trim();
                }

                // Check if this is a nested ternary expression
                // But first check if it's a map expression or other complex expression that contains ternary
                if (processedValue.includes('?') && processedValue.includes(':')) {
                    // Check if this is a map expression or other complex expression
                    if (processedValue.includes('.map(') || processedValue.includes('{{') || processedValue.includes('<')) {
                        // This is a complex expression containing ternary, not a standalone ternary
                        // Process it as a regular expression
                        try {
                            // For expressions wrapped in double braces, extract and evaluate
                            if (processedValue.startsWith('{{') && processedValue.endsWith('}}')) {
                                const innerExpression = processedValue.slice(2, -2).trim();
                                const evaluatedResult = await evaluateJSXExpression(innerExpression, context);
                                processedValue = String(evaluatedResult);
                            } else {
                                // For other complex expressions, evaluate directly
                                const func = new Function(...Object.keys(context), `return (${processedValue})`);
                                const evaluatedResult = func(...Object.values(context));
                                processedValue = String(evaluatedResult);
                            }
                        } catch (error) {
                            errors.push(`Complex expression error: ${error}`);
                        }
                    } else {
                        // This is a standalone ternary expression
                        try {
                            // Evaluate the nested ternary expression
                            const evaluatedResult = await evaluateTernaryExpression(processedValue, context);
                            processedValue = String(evaluatedResult);
                        } catch (error) {
                            errors.push(`Nested ternary expression error: ${error}`);
                        }
                    }
                } else {
                    // Process escape sequences first (convert \n to actual newlines)
                    processedValue = processEscapeSequences(processedValue);

                    // Normalize indentation within the ternary value
                    processedValue = normalizeIndentation(processedValue);

                    // Process interpolations using the main interpolations array
                    processedValue = processInterpolations(processedValue, interpolations, context, errors);

                    // Recursively process any remaining interpolations in the ternary value
                    // This handles cases where ternary values contain {{ variable }} syntax
                    if (processedValue.includes('{{') && processedValue.includes('}}')) {
                        // Create a temporary context for processing nested interpolations
                        const tempInterpolations: Array<{ placeholder: string; expression: string }> = [];
                        const tempContext = { interpolations: tempInterpolations, conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };

                        // Parse any remaining interpolations in the ternary value
                        const parsedValue = parseInterpolations(processedValue, tempContext);

                        // Process the newly found interpolations
                        processedValue = processInterpolations(parsedValue, tempInterpolations, context, errors);
                    }
                }
            }

            // Replace placeholder and normalize line spacing
            const lines = processedContent.split('\n');
            const updatedLines = lines.map(line => {
                if (line.includes(placeholder)) {
                    // Replace the placeholder and remove any excess leading whitespace
                    return line.replace(placeholder, processedValue).replace(/^\s{8}/, '');
                }
                return line;
            });
            processedContent = updatedLines.join('\n');
        } catch (error) {
            errors.push(`Ternary expression error in "${ternary.condition}": ${error}`);
            processedContent = processedContent.replace(placeholder, '');
        }
    }

    return processedContent;
}

export function evaluateExpression(expression: string, context: any): any {
    try {
        // Check if this is a map expression with JSX-like syntax
        if (expression.includes('.map(') && expression.includes('{{')) {
            return evaluateMapExpressionWithJSX(expression, context);
        }

        // Create function with safe context
        const func = new Function(...Object.keys(context), `return (${expression})`);
        return func(...Object.values(context));
    } catch (error) {
        throw new Error(`Expression evaluation failed: ${error}`);
    }
}

export function evaluateMapExpressionWithJSX(expression: string, context: any): string {
    // Parse the map expression: items.map((item, index) => (\n    - {{ item }}\n))
    const mapMatch = expression.match(/(\w+)\.map\(\(([^)]+)\)\s*=>\s*\(([^)]+)\)\)/);
    if (!mapMatch) {
        throw new Error(`Invalid map expression: ${expression}`);
    }

    const [, arrayName, params, elementExpr] = mapMatch;
    const array = context[arrayName];

    if (!Array.isArray(array)) {
        throw new Error(`Expected array but got ${typeof array}`);
    }

    // Parse parameters (e.g., "item, index")
    const paramNames = params.split(',').map(p => p.trim());

    // Map over the array
    const results = array.map((item, index) => {
        // Create context for this iteration
        const iterationContext = { ...context };
        paramNames.forEach((paramName, paramIndex) => {
            if (paramIndex === 0) iterationContext[paramName] = item;
            if (paramIndex === 1) iterationContext[paramName] = index;
        });

        // Process the element expression which contains JSX-like syntax
        // Replace {{ variable }} with actual values
        let processedExpr = elementExpr;

        // Find all {{ variable }} patterns and replace them
        const interpolationRegex = /\{\{\s*([^}]+)\s*\}\}/g;
        processedExpr = processedExpr.replace(interpolationRegex, (match, varName) => {
            const trimmedVarName = varName.trim();
            if (trimmedVarName in iterationContext) {
                return iterationContext[trimmedVarName];
            }
            return match; // Keep original if variable not found
        });

        // Clean up the expression (remove extra whitespace, newlines)
        processedExpr = processedExpr.trim().replace(/\n\s*/g, ' ');

        return processedExpr;
    });

    return results.join('\n');
}

// Helper function to get the indentation of a JSX element in the template
function getJSXElementIndentation(content: string, jsxMatch: string): string {
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.includes(jsxMatch)) {
            const indentMatch = line.match(/^(\s*)/);
            return indentMatch ? indentMatch[1] : '';
        }
    }

    return '';
}

// Helper function to apply indentation to all lines of content
function applyIndentationToAllLines(content: string, indentation: string): string {
    if (!indentation || !content) return content;

    const lines = content.split('\n');
    return lines.map((line, index) => {
        // Don't indent empty lines
        if (line.trim() === '') return line;
        // The first line doesn't need indentation since it replaces the JSX element
        if (index === 0) return line;
        // Apply indentation to subsequent lines
        return indentation + line;
    }).join('\n');
}

// Helper function to detect the indentation of a JSX element relative to its parent XML tag
export function detectParentIndentation(content: string, jsxMatch: string): string {
    const lines = content.split('\n');
    const matchIndex = content.indexOf(jsxMatch);

    if (matchIndex === -1) return '';

    // Find which line contains the JSX element
    let currentIndex = 0;
    let jsxLineIndex = -1;
    let jsxIndentation = '';

    for (let i = 0; i < lines.length; i++) {
        const lineStart = currentIndex;
        const lineEnd = currentIndex + lines[i].length;

        if (matchIndex >= lineStart && matchIndex < lineEnd) {
            // Found the line containing the JSX element
            jsxLineIndex = i;
            const line = lines[i];
            const indentMatch = line.match(/^(\s*)/);
            jsxIndentation = indentMatch ? indentMatch[1] : '';
            break;
        }

        currentIndex = lineEnd + 1; // +1 for the newline character
    }

    if (jsxLineIndex === -1) return '';

    // Find the parent XML tag by looking backwards
    let parentIndentation = '';
    for (let i = jsxLineIndex - 1; i >= 0; i--) {
        const line = lines[i];
        const trimmed = line.trim();

        // Look for XML tag that contains this JSX element
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.includes('/>')) {
            const indentMatch = line.match(/^(\s*)/);
            parentIndentation = indentMatch ? indentMatch[1] : '';
            break;
        }
    }

    // Return the absolute indentation of the JSX element
    return jsxIndentation;
}

export async function processJSXElements(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[],
    originalProps: any = {}
): Promise<string> {
    // Find JSX elements like <Component prop={value} /> and <@Component prop={value} />
    const jsxElementRegex = /<(@?)(\w+)([^/>]*)\/>/g;
    let processedContent = content;

    const jsxElements: Array<{ match: string; componentName: string; props: string; atSymbol: string }> = [];
    let match;

    // First pass: collect all JSX elements
    while ((match = jsxElementRegex.exec(content)) !== null) {
        jsxElements.push({
            match: match[0],
            componentName: match[2], // componentName is now the second capture group
            props: match[3], // props is now the third capture group
            atSymbol: match[1] // atSymbol is the first capture group
        });
    }


    // Second pass: process each JSX element
    for (const jsxElement of jsxElements) {
        try {
            // Don't apply parent indentation since the template replacement will preserve existing indentation
            const rendered = await renderJSXElement(jsxElement, jsxExpressions, context, originalProps, '');

            // Apply template indentation to all lines of the rendered content
            const templateIndentation = getJSXElementIndentation(processedContent, jsxElement.match);
            const indentedRendered = applyIndentationToAllLines(rendered, templateIndentation);

            processedContent = processedContent.replace(jsxElement.match, indentedRendered);
        } catch (error) {
            errors.push(`JSX element error in "${jsxElement.match}": ${error}`);
            processedContent = processedContent.replace(jsxElement.match, `<${jsxElement.componentName}:ERROR>`);
        }
    }
    return processedContent;
}

export async function processJSXExpressions(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
): Promise<string> {
    let processedContent = content;

    // Process JSX expressions in multiple passes to resolve nested placeholders
    let maxPasses = 10; // Prevent infinite loops
    let passCount = 0;

    while (passCount < maxPasses) {
        let hasChanges = false;

        for (const jsxExpr of jsxExpressions) {
            try {
                // Skip if placeholder is not in content
                if (!processedContent.includes(jsxExpr.placeholder)) {
                    continue;
                }

                // First, resolve any nested placeholder references in the expression
                let resolvedExpression = jsxExpr.expression;
                let nestedResolved = false;

                // Find and replace placeholder references with their actual values
                for (const otherExpr of jsxExpressions) {
                    if (otherExpr.placeholder !== jsxExpr.placeholder &&
                        resolvedExpression.includes(otherExpr.placeholder)) {

                        // Check if the referenced expression is a simple variable in context
                        const isSimpleVariable = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(otherExpr.expression);
                        if (isSimpleVariable && otherExpr.expression in context) {
                            // Direct variable reference - use the actual value
                            resolvedExpression = resolvedExpression.replace(otherExpr.placeholder, otherExpr.expression);
                            nestedResolved = true;
                        } else if (isSimpleVariable && !(otherExpr.expression in context)) {
                            // This is likely a map function parameter, keep the placeholder for now
                            continue;
                        } else if (otherExpr.expression.startsWith('__JSX_EXPRESSION_') && otherExpr.expression.endsWith('__')) {
                            // This is a reference to another placeholder - resolve it recursively
                            const referencedPlaceholder = otherExpr.expression;
                            const referencedExpr = jsxExpressions.find(expr => expr.placeholder === referencedPlaceholder);
                            if (referencedExpr) {
                                // Replace with the referenced expression
                                resolvedExpression = resolvedExpression.replace(otherExpr.placeholder, referencedExpr.expression);
                                nestedResolved = true;
                            }
                        } else {
                            // Complex expression - evaluate it
                            const referencedValue = await evaluateJSXExpression(otherExpr.expression, context, jsxExpressions);

                            // For JSX component props, we need to preserve the original value type
                            // Don't convert arrays to strings with newlines
                            let stringValue;
                            if (Array.isArray(referencedValue)) {
                                // For arrays, use JSON.stringify to preserve the array structure
                                stringValue = JSON.stringify(referencedValue);
                            } else {
                                stringValue = await jsxResultToString(referencedValue);
                            }

                            resolvedExpression = resolvedExpression.replace(otherExpr.placeholder, stringValue);
                            nestedResolved = true;
                        }
                    }
                }

                // Skip JSX expressions that are simple variable names not in context
                // These are typically map function parameters that are only valid within map context
                const isSimpleVariable = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(resolvedExpression);
                if (isSimpleVariable && !(resolvedExpression in context)) {
                    // Skip this expression - it's likely a map function parameter
                    continue;
                }

                // If it's a simple variable that IS in context, we should process it
                if (isSimpleVariable && (resolvedExpression in context)) {
                    // This is a simple variable reference, evaluate it
                    const result = await evaluateJSXExpression(resolvedExpression, context, jsxExpressions);
                    const stringValue = await jsxResultToString(result);

                    processedContent = processedContent.replace(
                        jsxExpr.placeholder,
                        stringValue
                    );
                    hasChanges = true;
                    continue;
                }

                // Check if this JSX expression contains component calls
                if (resolvedExpression.includes('<') && resolvedExpression.includes('>')) {
                    // This is a JSX expression with component calls
                    // First, check if it's a ternary expression that contains JSX
                    if (resolvedExpression.includes('?')) {
                        // This is a ternary expression with JSX components, evaluate it as a ternary expression
                        const result = await evaluateTernaryExpression(resolvedExpression, context);
                        const stringValue = await jsxResultToString(result);

                        processedContent = processedContent.replace(
                            jsxExpr.placeholder,
                            stringValue
                        );
                        hasChanges = true;
                    } else {
                        // This is a direct JSX component call, render it as a component
                        const result = await renderJSXComponent(resolvedExpression, context, jsxExpressions);
                        processedContent = processedContent.replace(
                            jsxExpr.placeholder,
                            result
                        );
                        hasChanges = true;
                    }
                } else {
                    // This is a regular JSX expression, evaluate it normally
                    const result = await evaluateJSXExpression(resolvedExpression, context, jsxExpressions);
                    const stringValue = await jsxResultToString(result);

                    // Replace the placeholder with the result
                    processedContent = processedContent.replace(
                        jsxExpr.placeholder,
                        stringValue
                    );
                    hasChanges = true;
                }
            } catch (error) {
                errors.push(`JSX expression error in "${jsxExpr.expression}": ${error}`);
                processedContent = processedContent.replace(jsxExpr.placeholder, '');
                hasChanges = true;
            }
        }

        // If no changes were made in this pass, we're done
        if (!hasChanges) {
            break;
        }

        passCount++;
    }

    return processedContent;
}

export async function evaluateJSXExpression(expression: string, context: any, jsxExpressions?: Array<{ placeholder: string; expression: string }>): Promise<any> {
    try {
        // Strip double braces if present ({{expression}} -> expression)
        let cleanExpression = expression;
        if (expression.startsWith('{{') && expression.endsWith('}}')) {
            cleanExpression = expression.slice(2, -2).trim();
        }

        // Check if this is a .map() expression for arrays first
        // This takes priority over ternary expressions because map expressions can contain ternary operators
        if (cleanExpression.includes('.map(')) {
            return await evaluateMapExpression(cleanExpression, context, jsxExpressions);
        }

        // Check if this is a ternary expression
        if (cleanExpression.includes('?')) {
            return await evaluateTernaryExpression(cleanExpression, context);
        }

        // Check if this is a placeholder reference
        if (cleanExpression.startsWith('__JSX_EXPRESSION_') && cleanExpression.endsWith('__')) {
            // This is a placeholder reference, return it as-is for now
            // It will be resolved in the processing pipeline
            return cleanExpression;
        }

        // For other JSX expressions, evaluate normally
        try {
            const func = new Function(...Object.keys(context), `return (${cleanExpression})`);
            return func(...Object.values(context));
        } catch (evalError) {
            // If evaluation fails, it might be because the expression contains JSX syntax
            // that wasn't caught by the previous checks
            console.warn(`Failed to evaluate JSX expression: ${cleanExpression}`, evalError);
            return cleanExpression; // Return the expression as-is
        }
    } catch (error) {
        throw new Error(`JSX expression evaluation failed: ${error}`);
    }
}

export async function evaluateTernaryExpression(expression: string, context: any): Promise<any> {
    // Parse ternary expressions like: items.length === 0 ? "Empty" : items.map(...)
    // We need to find the outermost ternary operator, not nested ones
    let parenCount = 0;
    let questionIndex = -1;
    let colonIndex = -1;

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '?' && parenCount === 0) {
            questionIndex = i;
            break;
        }
    }

    if (questionIndex === -1) {
        throw new Error(`No ternary operator found in expression: ${expression}`);
    }

    // Find the matching colon
    for (let i = questionIndex + 1; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === ':' && parenCount === 0) {
            colonIndex = i;
            break;
        }
    }

    if (colonIndex === -1) {
        throw new Error(`No matching colon found in ternary expression: ${expression}`);
    }

    const condition = expression.substring(0, questionIndex).trim();
    const trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
    const falseValue = expression.substring(colonIndex + 1).trim();

    // Evaluate the condition
    const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
    const conditionResult = conditionFunc(...Object.values(context));

    // Choose the appropriate value based on the condition
    let selectedExpression = conditionResult ? trueValue : falseValue;

    // Remove wrapping parentheses if they exist
    if (selectedExpression.startsWith('(') && selectedExpression.endsWith(')')) {
        selectedExpression = selectedExpression.slice(1, -1).trim();
    }

    // Check if this is a JSX expression wrapped in double braces {{expression}}
    if (selectedExpression.startsWith('{{') && selectedExpression.endsWith('}}')) {
        // Extract the inner expression
        const innerExpression = selectedExpression.slice(2, -2).trim();

        // Process the inner expression
        if (innerExpression.includes('.map(')) {
            return await evaluateMapExpression(innerExpression, context);
        } else if (innerExpression.includes('<') && innerExpression.includes('>')) {
            return await evaluateTernaryJSXExpression(innerExpression, context);
        } else {
            // Regular JSX expression
            return await evaluateJSXExpression(innerExpression, context);
        }
    }

    // Check if this is a JSX expression wrapped in single braces {expression}
    if (selectedExpression.startsWith('{') && selectedExpression.endsWith('}')) {
        // Extract the inner expression
        const innerExpression = selectedExpression.slice(1, -1).trim();

        // Process the inner expression
        if (innerExpression.includes('.map(')) {
            return await evaluateMapExpression(innerExpression, context);
        } else if (innerExpression.includes('<') && innerExpression.includes('>')) {
            return await evaluateTernaryJSXExpression(innerExpression, context);
        } else {
            // Regular JSX expression
            return await evaluateJSXExpression(innerExpression, context);
        }
    }

    // If the selected expression contains JSX or map, evaluate it appropriately
    if (selectedExpression.includes('.map(')) {
        return await evaluateMapExpression(selectedExpression, context);
    } else if (selectedExpression.includes('<') && selectedExpression.includes('>')) {
        return await evaluateTernaryJSXExpression(selectedExpression, context);
    } else if (selectedExpression.includes('?') && selectedExpression.includes(':')) {
        // Check if this is a standalone ternary expression or a complex expression containing ternary
        // A standalone ternary should have the pattern: condition ? trueValue : falseValue
        // We can detect this by checking if the first ? is at the top level (not inside parentheses)
        let parenCount = 0;
        let firstQuestionIndex = -1;

        for (let i = 0; i < selectedExpression.length; i++) {
            const char = selectedExpression[i];
            if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            else if (char === '?' && parenCount === 0) {
                firstQuestionIndex = i;
                break;
            }
        }

        if (firstQuestionIndex > 0) {
            // This looks like a standalone ternary expression (starts with a condition)
            return await evaluateTernaryExpression(selectedExpression, context);
        } else {
            // This is a complex expression containing ternary operators within parentheses
            // Evaluate it as a regular JavaScript expression
            try {
                const func = new Function(...Object.keys(context), `return (${selectedExpression})`);
                return func(...Object.values(context));
            } catch (error) {
                // If evaluation fails, return as-is
                return selectedExpression;
            }
        }
    } else {
        // Check if this is a quoted string literal
        if ((selectedExpression.startsWith('"') && selectedExpression.endsWith('"')) ||
            (selectedExpression.startsWith("'") && selectedExpression.endsWith("'"))) {
            // Simple string literal - remove quotes
            return selectedExpression.slice(1, -1);
        } else {
            // This might be a variable reference or expression that needs evaluation
            try {
                const func = new Function(...Object.keys(context), `return (${selectedExpression})`);
                return func(...Object.values(context));
            } catch (error) {
                // If evaluation fails, return as-is (might be a literal value)
                return selectedExpression;
            }
        }
    }
}

export async function evaluateMapExpression(expression: string, context: any, jsxExpressions?: Array<{ placeholder: string; expression: string }>): Promise<string> {
    // Parse expressions like: items.map((item, index) => <ListItem item={item} />)
    // We need to handle nested parentheses in the callback expression
    const mapStartMatch = expression.match(/(.+)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*/);

    if (!mapStartMatch) {
        // Fall back to regular evaluation
        const func = new Function(...Object.keys(context), `return (${expression})`);
        return func(...Object.values(context));
    }

    // Extract the array expression and parameters
    const arrayExpr = mapStartMatch[1];
    const params = mapStartMatch[2];

    // Find the callback expression by counting parentheses
    const callbackStart = mapStartMatch[0].length;
    let parenCount = 0;
    let callbackEnd = -1;

    for (let i = callbackStart; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') {
            parenCount--;
            if (parenCount < 0) {
                callbackEnd = i;
                break;
            }
        }
    }

    if (callbackEnd === -1) {
        // Fall back to regular evaluation
        const func = new Function(...Object.keys(context), `return (${expression})`);
        return func(...Object.values(context));
    }

    const elementExpr = expression.substring(callbackStart, callbackEnd).trim();

    // Get the array
    const arrayFunc = new Function(...Object.keys(context), `return (${arrayExpr})`);
    const array = arrayFunc(...Object.values(context));

    if (!Array.isArray(array)) {
        throw new Error(`Expected array but got ${typeof array}`);
    }

    // Parse parameters (e.g., "item, index")
    const paramNames = params.split(',').map(p => p.trim());

    // Map over the array (now using Promise.all for async operations)
    const results = await Promise.all(array.map(async (item, index) => {
        // Create context for this iteration
        const iterationContext = { ...context };
        paramNames.forEach((paramName, paramIndex) => {
            if (paramIndex === 0) iterationContext[paramName] = item;
            if (paramIndex === 1) iterationContext[paramName] = index;
        });

        // For JSX components, we need special handling
        if (elementExpr.includes('<') && elementExpr.includes('>')) {
            // Check if this is a ternary expression with JSX components
            if (elementExpr.includes('?')) {
                // Handle ternary expressions like: ordered ? <OlItem item={item} index={index} /> : <UlItem item={item} />
                // Parse the ternary expression manually
                const questionIndex = elementExpr.indexOf('?');
                const colonIndex = elementExpr.lastIndexOf(':');

                if (questionIndex !== -1 && colonIndex !== -1) {
                    const condition = elementExpr.substring(0, questionIndex).trim();
                    let trueValue = elementExpr.substring(questionIndex + 1, colonIndex).trim();
                    let falseValue = elementExpr.substring(colonIndex + 1).trim();

                    // Remove wrapping parentheses if they exist
                    if (trueValue.startsWith('(') && trueValue.endsWith(')')) {
                        trueValue = trueValue.slice(1, -1).trim();
                    }
                    if (falseValue.startsWith('(') && falseValue.endsWith(')')) {
                        falseValue = falseValue.slice(1, -1).trim();
                    }

                    // Evaluate the condition
                    const conditionFunc = new Function(...Object.keys(iterationContext), `return (${condition})`);
                    const conditionResult = conditionFunc(...Object.values(iterationContext));

                    // Choose the appropriate JSX component and render it
                    const selectedExpression = conditionResult ? trueValue : falseValue;
                    return await renderJSXComponent(selectedExpression, iterationContext, jsxExpressions);
                } else {
                    // Fall back to the original function
                    return await evaluateTernaryJSXExpression(elementExpr, iterationContext);
                }
            } else {
                // Handle direct JSX components
                return await renderJSXComponent(elementExpr, iterationContext, jsxExpressions);
            }
        }

        // For regular expressions, evaluate them
        try {
            // If we have JSX expressions, try to resolve placeholders first
            let resolvedElementExpr = elementExpr;
            if (jsxExpressions) {
                for (const jsxExpr of jsxExpressions) {
                    if (resolvedElementExpr.includes(jsxExpr.placeholder)) {
                        // Check if this is a simple variable reference
                        if (jsxExpr.expression in iterationContext) {
                            resolvedElementExpr = resolvedElementExpr.replace(jsxExpr.placeholder, jsxExpr.expression);
                        } else {
                            // Check if this is a JSX component
                            if (jsxExpr.expression.includes('<') && jsxExpr.expression.includes('>')) {
                                // This is a JSX component, render it directly
                                const rendered = await renderJSXComponent(jsxExpr.expression, iterationContext, jsxExpressions);
                                resolvedElementExpr = resolvedElementExpr.replace(jsxExpr.placeholder, rendered);
                            } else {
                                // This is a complex expression, evaluate it
                                const evaluated = await evaluateJSXExpression(jsxExpr.expression, iterationContext, jsxExpressions);
                                const stringValue = await jsxResultToString(evaluated);
                                resolvedElementExpr = resolvedElementExpr.replace(jsxExpr.placeholder, stringValue);
                            }
                        }
                    }
                }
            }

            // If the resolved expression is now a JSX component, render it
            if (resolvedElementExpr.includes('<') && resolvedElementExpr.includes('>')) {
                return await renderJSXComponent(resolvedElementExpr, iterationContext, jsxExpressions);
            }

            // If the resolved expression is a ternary expression, handle it
            if (resolvedElementExpr.includes('?') && resolvedElementExpr.includes(':')) {
                return await evaluateTernaryExpression(resolvedElementExpr, iterationContext);
            }

            const elemFunc = new Function(...Object.keys(iterationContext), `return (${resolvedElementExpr})`);
            return elemFunc(...Object.values(iterationContext));
        } catch (error) {
            // If evaluation fails, it might be because the expression contains JSX syntax
            // that wasn't caught by the previous checks
            console.warn(`Failed to evaluate element expression: ${elementExpr}`, error);
            return elementExpr; // Return the expression as-is
        }
    }));

    return results.join('\n');
}

export async function evaluateTernaryJSXExpression(expression: string, context: any): Promise<string> {
    // Parse ternary expressions like: ordered ? ( <OlItem item={item} index={index} /> ) : ( <UlItem item={item} /> )
    // We need to find the outermost ternary operator, accounting for parentheses
    let parenCount = 0;
    let questionIndex = -1;
    let colonIndex = -1;

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '?' && parenCount === 0) {
            questionIndex = i;
            break;
        }
    }

    if (questionIndex === -1) {
        throw new Error(`No ternary operator found in expression: ${expression}`);
    }

    // Find the matching colon
    for (let i = questionIndex + 1; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === ':' && parenCount === 0) {
            colonIndex = i;
            break;
        }
    }

    if (colonIndex === -1) {
        throw new Error(`No matching colon found in ternary expression: ${expression}`);
    }

    const condition = expression.substring(0, questionIndex).trim();
    let trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
    let falseValue = expression.substring(colonIndex + 1).trim();

    // Remove wrapping parentheses if they exist
    if (trueValue.startsWith('(') && trueValue.endsWith(')')) {
        trueValue = trueValue.slice(1, -1).trim();
    }
    if (falseValue.startsWith('(') && falseValue.endsWith(')')) {
        falseValue = falseValue.slice(1, -1).trim();
    }

    // Evaluate the condition
    const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
    const conditionResult = conditionFunc(...Object.values(context));

    // Choose the appropriate JSX component based on the condition
    const selectedExpression = conditionResult ? trueValue : falseValue;

    // Process the selected JSX expression through the JSX processing pipeline
    // This handles JSX elements with proper prop evaluation
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];
    const processedContent = processJSXElementsForParsing(selectedExpression, jsxExpressions);

    // If we have JSX expressions to process, handle them
    if (jsxExpressions.length > 0) {
        // Process the JSX expressions
        let result = processedContent;
        for (const jsxExpr of jsxExpressions) {
            try {
                // Check if this is a placeholder reference
                if (jsxExpr.expression.startsWith('__JSX_EXPRESSION_') && jsxExpr.expression.endsWith('__')) {
                    // This is a placeholder reference, evaluate it from context
                    const propFunc = new Function(...Object.keys(context), `return (${jsxExpr.expression})`);
                    const propValue = propFunc(...Object.values(context));
                    result = result.replace(jsxExpr.placeholder, propValue);
                } else {
                    // Check if this is a JSX component
                    if (jsxExpr.expression.includes('<') && jsxExpr.expression.includes('>')) {
                        // This is a JSX component, render it directly
                        const rendered = await renderJSXComponent(jsxExpr.expression, context);
                        result = result.replace(jsxExpr.placeholder, rendered);
                    } else {
                        // Regular expression evaluation
                        const evaluated = await evaluateJSXExpression(jsxExpr.expression, context);
                        const stringValue = await jsxResultToString(evaluated);
                        result = result.replace(jsxExpr.placeholder, stringValue);
                    }
                }
            } catch (error) {
                // If evaluation fails, try to render as a JSX component
                try {
                    const rendered = await renderJSXComponent(jsxExpr.expression, context);
                    result = result.replace(jsxExpr.placeholder, rendered);
                } catch (renderError) {
                    result = result.replace(jsxExpr.placeholder, `<JSX_ERROR:${jsxExpr.expression}>`);
                }
            }
        }
        return result;
    } else {
        // No JSX expressions found, try to render as a JSX component directly
        return await renderJSXComponent(selectedExpression, context);
    }
}

export async function renderJSXElement(
    jsxElement: { match: string; componentName: string; props: string; atSymbol: string },
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    originalProps: any = {},
    parentIndentation: string = ''
): Promise<string> {
    const { componentName, props, atSymbol } = jsxElement;

    // Parse props - handle both direct expressions and placeholders
    // Match both {value} and placeholder patterns
    const propMatches = props.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/g) || [];
    const propValues: any = {};

    for (const propMatch of propMatches) {
        // Handle both {value} and placeholder patterns
        const matchResult = propMatch.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/) || [];
        const propName = matchResult[1];
        const propExpr = matchResult[2] || matchResult[3]; // Either from {value} or placeholder

        if (propName && propExpr) {
            try {
                // Check if this is a placeholder (like __JSX_EXPRESSION_0__)
                const placeholderMatch = jsxExpressions.find(expr => expr.placeholder === propExpr);
                if (placeholderMatch) {
                    // Evaluate the original expression
                    const result = await evaluateJSXExpression(placeholderMatch.expression, context);
                    propValues[propName] = result;
                } else {
                    // Direct expression evaluation
                    const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                    propValues[propName] = propFunc(...Object.values(context));
                }
            } catch (error) {
                // Skip invalid prop expressions
            }
        }
    }

    // Handle boolean props without ={} syntax (default to true)
    const booleanProps = props.match(/\b(\w+)(?=\s|$)/g) || [];
    for (const booleanProp of booleanProps) {
        // Skip if this prop is already handled by the ={} syntax
        const isAlreadyHandled = propMatches.some((propMatch: string) =>
            propMatch.includes(`${booleanProp}=`)
        );
        if (!isAlreadyHandled) {
            propValues[booleanProp] = true;
        }
    }

    // Fallback rendering for common components
    if (componentName === 'ListItem' && propValues.item) {
        const content = `- ${propValues.item}`;
        if (parentIndentation) {
            return parentIndentation + content;
        }
        return content;
    }

    // Fallback representation
    const fallbackContent = `<${componentName} ${Object.entries(propValues).map(([k, v]) => `${k}="${v}"`).join(' ')} />`;
    if (parentIndentation) {
        return parentIndentation + fallbackContent;
    }
    return fallbackContent;
}

export async function renderJSXComponent(jsxElement: string, context: any, jsxExpressions?: Array<{ placeholder: string; expression: string }>): Promise<string> {
    // Parse JSX like: <ListItem item={item} /> or <@Component prop={value} /> or <@_Component prop={value} /> or <OlItem item=__JSX_EXPRESSION_0__ index=__JSX_EXPRESSION_1__ />
    const componentMatch = jsxElement.match(/<(@?_?)(\w+)([^/>]*)\/>/);

    if (!componentMatch) {
        return jsxElement; // Return as-is if we can't parse it
    }

    const [, atSymbol, componentName, props] = componentMatch;

    // Parse props - handle both {expression} and placeholder patterns
    const propMatches = props.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/g) || [];
    const propValues: any = {};

    for (const propMatch of propMatches) {
        // Handle both {value} and placeholder patterns
        const matchResult = propMatch.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/) || [];
        const propName = matchResult[1];
        const propExpr = matchResult[2] || matchResult[3]; // Either from {value} or placeholder

        if (propName && propExpr) {
            try {
                // Check if this is a placeholder (like __JSX_EXPRESSION_0__)
                if (propExpr.startsWith('__JSX_EXPRESSION_') && propExpr.endsWith('__')) {
                    // This is a placeholder, resolve it using JSX expressions if available
                    if (jsxExpressions) {
                        const jsxExpr = jsxExpressions.find(expr => expr.placeholder === propExpr);
                        if (jsxExpr) {
                            // The placeholder represents a simple variable reference
                            if (jsxExpr.expression in context) {
                                propValues[propName] = context[jsxExpr.expression];
                            } else {
                                // Try to evaluate the expression
                                try {
                                    const propFunc = new Function(...Object.keys(context), `return (${jsxExpr.expression})`);
                                    propValues[propName] = propFunc(...Object.values(context));
                                } catch (error) {
                                    // Fallback to the expression as-is
                                    propValues[propName] = jsxExpr.expression;
                                }
                            }
                        } else {
                            // Placeholder not found in JSX expressions, try direct evaluation
                            try {
                                const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                                propValues[propName] = propFunc(...Object.values(context));
                            } catch (error) {
                                propValues[propName] = propExpr;
                            }
                        }
                    } else {
                        // No JSX expressions available, try direct evaluation
                        try {
                            const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                            propValues[propName] = propFunc(...Object.values(context));
                        } catch (error) {
                            propValues[propName] = propExpr;
                        }
                    }
                } else {
                    // Direct expression evaluation
                    const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                    propValues[propName] = propFunc(...Object.values(context));
                }
            } catch (error) {
                // Skip invalid prop expressions
            }
        }
    }

    // Fallback rendering for common components
    if (componentName === 'ListItem' && propValues.item) {
        return `- ${propValues.item}`;
    }

    // Fallback representation
    return `<${componentName} ${Object.entries(propValues).map(([k, v]) => `${k}="${v}"`).join(' ')} />`;
}

export async function jsxResultToString(result: any): Promise<string> {
    if (result === null || result === undefined) {
        return '';
    }

    // Handle Promise results from async JSX expressions
    if (result instanceof Promise) {
        const resolvedResult = await result;
        return await jsxResultToString(resolvedResult);
    }

    if (Array.isArray(result)) {
        // Handle arrays that might contain Promises
        const resolvedItems = await Promise.all(result.map(item =>
            item instanceof Promise ? item : Promise.resolve(item)
        ));
        return resolvedItems.map(item => valueToString(item)).join('\n');
    }
    return valueToString(result);
}

// Import the function from template-parsing
import { processJSXElementsForParsing } from './template-parsing';
