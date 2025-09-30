import * as ts from 'typescript';
import { TSMBlockMatch } from '../parser/types';

/**
 * Represents a nested TSM block found within an expression
 */
export interface NestedTSMBlock {
    outerExpression: string;
    nestedContent: string;
    variableScope: Map<string, string>;
    nestingLevel: number;
    parentBlock?: NestedTSMBlock;
    startIndex: number;
    endIndex: number;
    expressionType: 'arrow' | 'ternary' | 'conditional' | 'map' | 'other';
}

/**
 * Traverses a TypeScript AST to find and extract TSM block expressions.
 *
 * A TSM block is defined as a return statement with a parenthesized expression,
 * e.g., `return (...)`.
 *
 * @param sourceFile The TypeScript source file AST node.
 * @returns An array of ParenthesizedExpression nodes that represent TSM blocks.
 */
export function findRootLevelTsmBlocks(node: ts.Node): Array<{ match: TSMBlockMatch, content: string }> {
    const blocks: Array<{ match: TSMBlockMatch, content: string }> = [];


    function visit(node: ts.Node) {
        if (ts.isReturnStatement(node)) {
            const returnStart = node.getStart();

            const textBeforeReturn = node.getSourceFile().text.substring(0, returnStart);
            const linesBeforeReturn = textBeforeReturn.split('\n');
            const returnLine = linesBeforeReturn[linesBeforeReturn.length - 1];

            const leadingSpaces = returnLine.match(/^(\s*)/)?.[1]?.length || 0;

            const closingParen = node.getSourceFile().text.substring(returnStart + 1);
            const lines = closingParen.split(/(?<!\\)\n/);

            const closingParenLine = lines.findIndex(line => line.startsWith(" ".repeat(leadingSpaces) + ")"));
            if (closingParenLine !== -1) {
                const insideLines = lines.slice(1, closingParenLine);
                const minWhiteSpace = insideLines.reduce((min, line) => Math.min(min, line.match(/^(\s*)/)?.[1]?.length || 0), leadingSpaces * 2);
                const removeLeadingIndent = insideLines.map(line => line.slice(minWhiteSpace));

                const content = removeLeadingIndent.join('\n');

                // Find the complete return statement by looking for the closing parenthesis
                const sourceText = node.getSourceFile().text;
                const returnText = sourceText.substring(returnStart);
                const openParen = returnText.indexOf('(');
                if (openParen === -1) return;

                // Find matching closing parenthesis
                let parenCount = 0;
                let endPos = openParen;
                for (let i = openParen; i < returnText.length; i++) {
                    if (returnText[i] === '(') parenCount++;
                    else if (returnText[i] === ')') {
                        parenCount--;
                        if (parenCount === 0) {
                            endPos = i + 1;
                            break;
                        }
                    }
                }

                const fullReturnStatement = returnText.substring(0, endPos);

                const match: TSMBlockMatch = {
                    index: returnStart,
                    [0]: fullReturnStatement,
                    [1]: content
                };

                blocks.push({ match, content });
            } else {
                console.log('DEBUG: Closing parenthesis not found');
            }

        }
        ts.forEachChild(node, visit);
    }

    visit(node);
    return blocks;
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
    console.log('DEBUG: block:', block.getFullText());
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

    if (minIndent === Infinity) {
        return lines.join('\n')
    }

    // Remove the common indentation from each line.
    const deindentedLines = lines.map(line => {
        return line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line;
    });

    // Join the lines and trim any leading/trailing whitespace or newlines.
    return deindentedLines.join('\n')
}
