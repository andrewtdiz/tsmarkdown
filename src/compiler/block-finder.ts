import * as ts from 'typescript';
import { TSMBlockMatch } from '../parser/types';
import { normalizeIndentation } from '../utils/string-helpers';

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
        if (ts.isReturnStatement(node) && node.getFullText().includes('(\n')) {
            const returnStart = node.getStart();

            const textBeforeReturn = node.getSourceFile().text.substring(0, returnStart);
            const linesBeforeReturn = textBeforeReturn.split('\n');
            const returnLine = linesBeforeReturn[linesBeforeReturn.length - 1];

            const leadingSpaces = returnLine.match(/^(\s*)/)?.[1]?.length || 0;

            const sourceText = node.getSourceFile().text;
            const returnText = sourceText.substring(returnStart);
            const openParenIndex = returnText.indexOf('(');
            if (openParenIndex === -1) return;

            // Find matching closing parenthesis
            let parenCount = 1;
            let closeParenIndex = -1;
            for (let i = openParenIndex + 1; i < returnText.length; i++) {
                if (returnText[i] === '(') {
                    parenCount++;
                } else if (returnText[i] === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        closeParenIndex = i;
                        break;
                    }
                }
            }

            if (closeParenIndex !== -1) {
                const fullReturnStatement = returnText.substring(0, closeParenIndex + 1);
                let content = returnText.substring(openParenIndex + 1, closeParenIndex);

                const leadingMatch = content.match(/^(\s*\n+)/);
                const trailingMatch = content.match(/(\n+\s*)$/);

                const leadingNewlines = leadingMatch ? (leadingMatch[1].match(/\n/g) || []).length : 0;
                const trailingNewlines = trailingMatch ? (trailingMatch[1].match(/\n/g) || []).length : 0;

                // Normalize indentation and trim, but preserve (n-1) newlines
                const normalized = normalizeIndentation(content);
                const trimmed = normalized.trim();
                const leadingNewlineString = '\n'.repeat(Math.max(0, leadingNewlines - 1));
                const trailingNewlineString = '\n'.repeat(Math.max(0, trailingNewlines - 1));

                content = leadingNewlineString + trimmed + trailingNewlineString;

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
