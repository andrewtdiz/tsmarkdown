import { processTemplateContent } from './template-parsing';
import { processConditionalBlocks, processInterpolations, processTernaryExpressions, processJSXExpressions, evaluateExpression } from './jsx-runtime';

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
    processedContent = await processTernaryExpressions(
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
