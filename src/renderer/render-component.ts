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
        const propsContext = createPropsContext(compiled.functionParams || [], props, compiled.metadata?.parameterTypes);
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
            processedContent = processTernaryExpressions(
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
        .map(line => line.trimEnd()) // Remove trailing spaces
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
        .trim(); // Remove leading/trailing whitespace

    return {
        content: processedContent,
        errors
    };
}
