// Ternary expression parsing and processing
import type { ParseContext } from './types';


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
