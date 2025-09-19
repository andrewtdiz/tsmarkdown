import { processTemplateContent } from './template-parsing';
import { processConditionalBlocks, processInterpolations, processTernaryExpressions, processJSXExpressions, evaluateExpression } from './jsx-runtime';

export function cleanTemplateContent(templateContent: string): string {
    // Clean up the template content - remove leading/trailing whitespace and fix common issues
    let cleaned = templateContent.trim();

    // Remove the opening parenthesis and newline if it starts with "(\n"
    if (cleaned.startsWith('(\n')) {
        cleaned = cleaned.substring(2);
    }

    return cleaned;
}

export async function processMultipleReturnStatements(
    returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>,
    context: any,
    errors: string[],
    interpolations?: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks?: Array<{ condition: string; content: string }>,
    ternaryExpressions?: Array<{ condition: string; trueValue: string; falseValue: string }>,
    jsxExpressions?: Array<{ placeholder: string; expression: string }>
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
                        return await processTemplateWithExtracted(
                            returnStmt.content,
                            context,
                            errors,
                            interpolations,
                            conditionalBlocks,
                            ternaryExpressions,
                            jsxExpressions
                        );
                    }
                    // Continue to next return statement
                    continue;
                } catch (error) {
                    errors.push(`Condition evaluation error in "${returnStmt.condition}": ${error}`);
                    continue;
                }
            } else {
                // No condition, this is the default/fallback template
                return await processTemplateWithExtracted(
                    returnStmt.content,
                    context,
                    errors,
                    interpolations,
                    conditionalBlocks,
                    ternaryExpressions,
                    jsxExpressions
                );
            }
        }
    }

    // If no template return statement matched, return empty string
    return '';
}

export async function processTemplateWithExtracted(
    templateContent: string,
    context: any,
    errors: string[],
    interpolations?: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks?: Array<{ condition: string; content: string }>,
    ternaryExpressions?: Array<{ condition: string; trueValue: string; falseValue: string }>,
    jsxExpressions?: Array<{ placeholder: string; expression: string }>
): Promise<string> {
    let processedContent = cleanTemplateContent(templateContent);

    // Use the already-extracted expressions if provided, otherwise extract them
    const finalInterpolations = interpolations || [];
    const finalConditionalBlocks = conditionalBlocks || [];
    const finalTernaryExpressions = ternaryExpressions || [];
    const finalJSXExpressions = jsxExpressions || [];

    // If no expressions were provided, extract them from the template content
    if (finalInterpolations.length === 0 && finalConditionalBlocks.length === 0 &&
        finalTernaryExpressions.length === 0 && finalJSXExpressions.length === 0) {
        // Extract interpolations, conditionals, ternary expressions, and JSX expressions from the template content
        const extractedInterpolations: Array<{ placeholder: string; expression: string }> = [];
        const extractedConditionalBlocks: Array<{ condition: string; content: string }> = [];
        const extractedTernaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
        const extractedJSXExpressions: Array<{ placeholder: string; expression: string }> = [];

        // Process the template content to extract all the different types of expressions
        processedContent = processTemplateContent(
            templateContent,
            extractedInterpolations,
            extractedConditionalBlocks,
            extractedTernaryExpressions,
            extractedJSXExpressions
        );

        // Use the extracted expressions
        finalInterpolations.push(...extractedInterpolations);
        finalConditionalBlocks.push(...extractedConditionalBlocks);
        finalTernaryExpressions.push(...extractedTernaryExpressions);
        finalJSXExpressions.push(...extractedJSXExpressions);
    }

    // Process conditional blocks first (they may contain interpolations)
    processedContent = await processConditionalBlocks(
        processedContent,
        finalConditionalBlocks,
        finalInterpolations,
        context,
        errors
    );

    // Process any remaining interpolations
    processedContent = processInterpolations(
        processedContent,
        finalInterpolations,
        context,
        errors
    );

    // Process ternary expressions
    processedContent = await processTernaryExpressions(
        processedContent,
        finalTernaryExpressions,
        context,
        errors,
        finalInterpolations
    );

    // Process JSX expressions
    processedContent = await processJSXExpressions(
        processedContent,
        finalJSXExpressions,
        context,
        errors
    );

    return processedContent;
}

export async function processTemplate(
    templateContent: string,
    context: any,
    errors: string[]
): Promise<string> {
    return await processTemplateWithExtracted(templateContent, context, errors);
}
