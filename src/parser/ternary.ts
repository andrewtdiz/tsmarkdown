// Ternary expression parsing and processing
import type { ParseContext } from './types';

// Recursive ternary parser
export function parseTernary(content: string, context: ParseContext): string {
    // Match ternary expressions - {condition ? trueValue : falseValue}
    const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}<>]*)*)\}/g;

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

            // Note: Recursive parsing would be handled by the main pipeline
            const parsedTrueValue = trimmedTrueValue;
            const parsedFalseValue = trimmedFalseValue;

            const placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
            context.ternaryExpressions.push({
                condition: trimmedCondition,
                trueValue: parsedTrueValue,
                falseValue: parsedFalseValue,
            });
            return placeholder;
        },
    );
}

export function processTernaryExpressions(
    content: string,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
): string {
    // Match ternary expressions - {condition ? trueValue : falseValue}
    // This regex handles nested parentheses and braces within each part
    // But excludes JSX expressions (those containing < and >)
    const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}<>]*)*)\}/g;

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
