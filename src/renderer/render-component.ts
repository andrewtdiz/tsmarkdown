import { CompiledMDX } from '../compiler';
import { RenderContext, RenderResult, createPropsContext } from './render-context';
import { executeTypeScript } from './typescript-runtime';
import { processMultipleReturnStatements } from './template-processing';
import { processConditionalBlocks, processInterpolations, processTernaryExpressions, processJSXExpressions, processJSXElements } from './jsx-runtime';

export async function renderComponent(compiled: CompiledMDX, context: RenderContext = {}, props: any = {}): Promise<RenderResult> {
    const errors: string[] = [];
    let processedContent = compiled.template;

    try {
        // Merge props into context for function parameters
        // First, extract props from the context (for test framework compatibility)
        const contextProps = {};
        if (compiled.functionParams && compiled.functionParams.length > 0) {
            for (const param of compiled.functionParams) {
                if (context.hasOwnProperty(param)) {
                    contextProps[param] = context[param];
                }
            }
        }

        // Merge props from both the props parameter and the context
        const allProps = { ...contextProps, ...props };
        const propsContext = createPropsContext(compiled.functionParams || [], allProps, compiled.metadata?.parameterTypes);
        const mergedContext = { ...context, ...propsContext };

        // Execute TypeScript to get runtime values (now supports async)
        const runtimeContext = await executeTypeScript(compiled.typescript, mergedContext);
        const fullContext = { ...mergedContext, ...runtimeContext };

        // Handle multiple return statements if they exist
        if (compiled.returnStatements && compiled.returnStatements.length > 0) {
            processedContent = await processMultipleReturnStatements(
                compiled.returnStatements,
                fullContext,
                errors
            );
        } else {
            // Fall back to single template processing for backward compatibility
            // Process conditional blocks first (they may contain interpolations)
            processedContent = await processConditionalBlocks(
                processedContent,
                compiled.conditionalBlocks,
                compiled.interpolations,
                fullContext,
                errors,
                compiled.jsxExpressions || []
            );

            // Process any remaining interpolations
            processedContent = processInterpolations(
                processedContent,
                compiled.interpolations,
                fullContext,
                errors
            );

            // Process ternary expressions
            processedContent = await processTernaryExpressions(
                processedContent,
                compiled.ternaryExpressions || [],
                fullContext,
                errors,
                compiled.interpolations || []
            );

            // Process JSX expressions first (like array.map()) before elements
            processedContent = await processJSXExpressions(
                processedContent,
                compiled.jsxExpressions || [],
                fullContext,
                errors
            );

            // Process JSX elements (like <Component prop={value} />) after expressions
            processedContent = await processJSXElements(
                processedContent,
                compiled.jsxExpressions || [],
                fullContext,
                errors,
                props
            );
        }

    } catch (error) {
        errors.push(`Rendering error: ${error}`);
    }

    // Clean up extra whitespace and normalize spacing
    processedContent = processedContent
        .split('\n')
        .map(line => {
            // Preserve trailing spaces for block quote lines (lines that start with >)
            if (line.match(/^\s*>\s*$/)) {
                return line; // Keep block quote lines with trailing spaces as-is
            }
            return line.trimEnd(); // Remove trailing spaces for other lines
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
        .replace(/^\s+/, '') // Remove leading whitespace
        .replace(/\n+$/, ''); // Remove all trailing newlines
    // Note: Removed .trim() to preserve indentation structure for components

    return {
        content: processedContent,
        errors
    };
}
