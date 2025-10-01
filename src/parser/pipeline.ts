// Pipeline Core - orchestrates the parsing pipeline

import { parseInterpolationsToAST } from './interpolations';
import { protectCodeBlocks } from './code-protection';
import type { ParseContext } from './types';

export type { ParseContext } from './types';

import { TSMBlock, TSMLine, TSMChunk } from "./tsm-ast";
import { CodeProtection } from "./code-protection";

export function parseContent(content: string, context: ParseContext, isNested: boolean = false): TSMBlock {
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);

    const ast = parseInterpolationsToAST(protectedContent, context, isNested);

    if (codeBlocks.length > 0) {
        return restoreCodeBlocksInAST(ast, codeBlocks);
    }

    return ast;
}

/**
 * Restores code blocks in TSM AST nodes
 */
function restoreCodeBlocksInAST(ast: TSMBlock, codeBlocks: CodeProtection[]): TSMBlock {
    const restoredLines: TSMLine[] = [];

    for (const line of ast.lines) {
        const restoredChunks: TSMChunk[] = [];

        for (const chunk of line.chunks) {
            if (chunk.type === 'TSMTextChunk') {
                // Restore code blocks in text chunks
                let restoredContent = chunk.content;
                for (const codeBlock of codeBlocks) {
                    restoredContent = restoredContent.replace(codeBlock.placeholder, codeBlock.content);
                }
                restoredChunks.push({
                    ...chunk,
                    content: restoredContent
                });
            } else if (chunk.type === 'TSMInterpolation') {
                // Restore code blocks in interpolation expressions
                let restoredExpression = chunk.expression;
                for (const codeBlock of codeBlocks) {
                    restoredExpression = restoredExpression.replace(codeBlock.placeholder, codeBlock.content);
                }
                restoredChunks.push({
                    ...chunk,
                    expression: restoredExpression
                });
            } else {
                // Pass through other chunk types unchanged
                restoredChunks.push(chunk);
            }
        }

        restoredLines.push({
            ...line,
            chunks: restoredChunks
        });
    }

    return {
        ...ast,
        lines: restoredLines
    };
}
