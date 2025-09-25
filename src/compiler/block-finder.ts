import * as ts from 'typescript';

/**
 * Traverses a TypeScript AST to find and extract TSM block expressions.
 *
 * A TSM block is defined as a return statement with a parenthesized expression,
 * e.g., `return (...)`.
 *
 * @param sourceFile The TypeScript source file AST node.
 * @returns An array of ParenthesizedExpression nodes that represent TSM blocks.
 */
export function findTsmBlocks(sourceFile: ts.SourceFile): ts.ParenthesizedExpression[] {
    const tsmBlocks: ts.ParenthesizedExpression[] = [];

    function visit(node: ts.Node) {
        // Check if the node is a return statement with a parenthesized expression.
        if (ts.isReturnStatement(node) && node.expression && ts.isParenthesizedExpression(node.expression)) {
            // This is a TSM block, e.g., `return (...)`
            tsmBlocks.push(node.expression);
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return tsmBlocks;
}

/**
 * Extracts the raw string content from within a TSM block node.
 * It uses the AST node's position to slice the text from the original source file
 * and performs a basic de-indentation of the extracted block.
 *
 * @param block The ParenthesizedExpression node of the TSM block.
 * @param sourceFile The source file containing the block.
 * @returns The raw, de-indented string content of the block.
 */
export function extractBlockContent(block: ts.ParenthesizedExpression, sourceFile: ts.SourceFile): string {
    // Get the content within the parentheses using precise start and end positions from the AST.
    const rawContent = sourceFile.text.substring(block.getStart() + 1, block.getEnd() - 1);

    const lines = rawContent.split('\n');

    // Find the minimum indentation of all non-empty lines.
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length > 0) {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            minIndent = Math.min(minIndent, indent);
        }
    }

    // If all lines are blank or there's no common indentation, just trim and return.
    if (minIndent === Infinity) {
        return lines.join('\n').trim();
    }

    // Remove the common indentation from each line.
    const deindentedLines = lines.map(line => {
        return line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line;
    });

    // Join the lines and trim any leading/trailing whitespace or newlines.
    return deindentedLines.join('\n').trim();
}
