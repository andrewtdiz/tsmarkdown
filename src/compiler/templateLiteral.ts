
/**
 * Converts processed content to a template literal with proper substitutions
 */
// Helper function to convert chunks to TSM runtime calls
function chunksToTemplateLiteral(chunks: any[]): string {
    if (!Array.isArray(chunks)) {
        return String(chunks);
    }

    if (chunks.length === 0) {
        return '__tsm([])';
    }

    if (chunks.length === 1) {
        const chunk = chunks[0];
        if (typeof chunk === 'string') {
            // Single string - return simple string
            return `"${chunk}"`;
        }
        if (Array.isArray(chunk)) {
            // Check if this is a runtime interpolation array [ "variable.name" ]
            if (chunk.length === 1 && typeof chunk[0] === 'string') {
                // This is a runtime interpolation, return the variable reference
                return chunk[0];
            }
            // Otherwise, recursively process nested chunks
            return chunksToTemplateLiteral(chunk);
        }
        return String(chunk);
    }

    // Multiple chunks - collect them for __tsm call
    const tsmChunks: string[] = [];
    for (const chunk of chunks) {
        if (typeof chunk === 'string') {
            tsmChunks.push(`"${chunk}"`);
        } else if (Array.isArray(chunk)) {
            // Check if this is a ternary condition array [ "condition", " ? ", ... ]
            if (chunk.length >= 3 && chunk[1] === ' ? ') {
                // This is a ternary expression, convert it to a proper ternary that returns __tsm calls
                const condition = chunk[0];
                const trueValue = chunk[2];
                const falseValue = chunk[4];

                // Convert true and false values to __tsm calls
                const trueTsm = typeof trueValue === 'string' ? `__tsm(["${trueValue}"])` : chunksToTemplateLiteral(trueValue);
                const falseTsm = typeof falseValue === 'string' ? `__tsm(["${falseValue}"])` : chunksToTemplateLiteral(falseValue);

                // Create a ternary expression that returns __tsm calls
                tsmChunks.push(`${condition} ? ${trueTsm} : ${falseTsm}`);
            } else if (chunk.length === 1 && typeof chunk[0] === 'string') {
                // This is a runtime interpolation, return the variable reference
                tsmChunks.push(chunk[0]);
            } else {
                // Otherwise, recursively process nested chunks
                const nestedResult = chunksToTemplateLiteral(chunk);
                // If the nested result is already a __tsm call, don't wrap it again
                if (nestedResult.startsWith('__tsm([') && nestedResult.endsWith('])')) {
                    // Extract the inner content without the __tsm wrapper
                    const innerContent = nestedResult.slice(7, -2); // Remove '__tsm([' and '])'
                    tsmChunks.push(innerContent);
                } else {
                    tsmChunks.push(nestedResult);
                }
            }
        } else {
            tsmChunks.push(String(chunk));
        }
    }

    return `__tsm([${tsmChunks.join(', ')}])`;
}



/**
 * Converts TSMComponent to function call string
 */
function convertTSMComponentToFunctionCall(name: string, props: Array<{ name: string; value: { type: string; value: string } }>): string {
    // Build props object
    const propsObj: Record<string, any> = {};

    props.forEach(prop => {
        if (prop.value.type === 'string') {
            // Remove quotes from string values
            propsObj[prop.name] = prop.value.value.replace(/^"(.*)"$/, '$1');
        } else if (prop.value.type === 'expression') {
            propsObj[prop.name] = prop.value.value;
        }
    });

    // Convert props object to string
    const propsString = Object.keys(propsObj).length > 0
        ? `{ ${Object.entries(propsObj).map(([key, value]) => `${key}: ${value}`).join(', ')} }`
        : '';

    return `${name}(${propsString})`;
}

function convertToTemplateLiteral(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: any }>,
    ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }>,
    jsxExpressions: Array<{ name: string; props: Array<{ name: string; value: { type: string; value: string } }> }>
): string {
    let result = content;

    // Replace interpolations with template literal syntax
    interpolations.forEach(({ placeholder, expression }) => {
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
    });

    // Replace conditional blocks
    conditionalBlocks.forEach(({ condition, content: blockContent }, index) => {
        const placeholder = `__CONDITIONAL_${index}__`;
        const templateContent = chunksToTemplateLiteral(blockContent);
        const conditionalExpression = `\${${condition} && ${templateContent}}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'g'), conditionalExpression);
    });

    // Replace ternary expressions
    ternaryExpressions.forEach(({ condition, trueValue, falseValue }, index) => {
        const placeholder = `__TERNARY_${index}__`;
        const trueContent = chunksToTemplateLiteral(trueValue);
        const falseContent = chunksToTemplateLiteral(falseValue);
        const ternaryExpression = `\${${condition} ? ${trueContent} : ${falseContent}}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'g'), ternaryExpression);
    });

    // Replace JSX expressions
    jsxExpressions.forEach(({ name, props }) => {
        const functionCall = convertTSMComponentToFunctionCall(name, props);
        result = result.replace(new RegExp(`__JSX_EXPRESSION_\\d+__`, 'g'), `\${${functionCall}}`);
    });

    return `${result}`;
}