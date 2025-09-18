// String manipulation and AST traversal utilities

export function findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 0;

    // Use regular string indexing for consistency with the rest of the code
    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];

        // Count braces - no need to skip double braces since interpolations are already processed
        // No need to handle string literals since we're just matching braces
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return i;
            }
        }
    }

    return -1; // No matching brace found
}

export function findMatchingParen(content: string, startIndex: number): number {
    let parenCount = 0;

    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];

        // Count parentheses - no need to handle string literals since we're just matching parentheses
        if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
            if (parenCount === 0) {
                return i;
            }
        }
    }

    return -1; // No matching parenthesis found
}

export function findMatchingDoubleBrace(content: string, startIndex: number): number {
    let braceCount = 0;
    let i = startIndex + 2; // Start after the opening {{

    while (i < content.length - 1) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '{' && nextChar === '{') {
            // Found nested {{
            braceCount++;
            i += 2;
        } else if (char === '}' && nextChar === '}') {
            // Found }}
            if (braceCount === 0) {
                // This is the matching closing }}
                return i;
            } else {
                // This is a nested closing }}, decrement count
                braceCount--;
                i += 2;
            }
        } else {
            i++;
        }
    }

    return -1; // No matching }} found
}

export function normalizeIndentation(content: string): string {
    const lines = content.split("\n");
    if (lines.length === 0) return content;

    // Find the first non-empty line's indentation as the base
    let baseIndent = 0;
    for (const line of lines) {
        if (line.trim() === "") continue;
        baseIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        break;
    }

    // Remove the base indentation from all lines
    return lines
        .map((line) => {
            if (line.trim() === "") return "";
            const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
            if (currentIndent >= baseIndent) {
                return line.slice(baseIndent);
            }
            return line;
        })
        .join("\n");
}
