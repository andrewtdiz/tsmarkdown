// Interpolation parsing and processing
import type { ParseContext } from './types';

// Recursive interpolation parser
export function parseInterpolations(content: string, context: ParseContext): string {
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
            const placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
            context.interpolations.push({ placeholder, expression });

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
