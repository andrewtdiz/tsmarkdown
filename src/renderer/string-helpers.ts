export function findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 0;
    let parenCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        const prevChar = i > 0 ? content[i - 1] : '';

        // Handle string literals
        if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
            continue;
        }

        if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
            continue;
        }

        if (inString) continue;

        // Count braces and parentheses
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return i;
            }
        } else if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
        }
    }

    return -1; // No matching brace found
}

export function processEscapeSequences(content: string): string {
    // Convert literal escape sequences to actual characters
    return content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
}

export function normalizeIndentation(content: string): string {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    // Find all non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length === 0) return content;

    // Get indentation levels
    const indentLevels = nonEmptyLines.map(line => line.match(/^(\s*)/)?.[1].length ?? 0);

    // If there are multiple indentation levels, find the most common non-zero one
    const indentCounts = indentLevels.reduce((acc, level) => {
        if (level > 0) {
            acc[level] = (acc[level] || 0) + 1;
        }
        return acc;
    }, {} as Record<number, number>);

    let targetIndent = 0;
    if (Object.keys(indentCounts).length > 0) {
        // Find the most common non-zero indentation
        targetIndent = parseInt(Object.keys(indentCounts).reduce((a, b) =>
            indentCounts[parseInt(a)] > indentCounts[parseInt(b)] ? a : b
        ));
    }

    // If no common indentation found or it's 0, return as-is
    if (targetIndent === 0) return content;

    // Remove the target indentation from lines that have it
    return lines
        .map(line => {
            if (line.trim() === '') {
                return ''; // Empty lines become truly empty
            }
            // Only remove indentation if the line starts with the target indent level
            if (line.startsWith(' '.repeat(targetIndent))) {
                return line.slice(targetIndent);
            }
            return line; // Keep other lines as-is (like headers)
        })
        .join('\n');
}

export function valueToString(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return '[object Object]';
        }
    }
    return String(value);
}
