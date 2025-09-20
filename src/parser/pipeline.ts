// Pipeline Core - orchestrates the parsing pipeline

import { parseInterpolationsToAST, renderASTToChunks } from './interpolations';
import { protectCodeBlocks, restoreCodeBlocks } from './code-protection';
import type { ParseContext } from './types';
import type { Chunk } from '../runtime/tsm-runtime';

// Re-export the shared type
export type { ParseContext } from './types';

// Unified parsing entry point - uses the new TSM AST system
export function parseContent(content: string, context: ParseContext): Chunk[] {
    // First, protect code blocks and inline code from parsing
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);

    // Parse to TSM AST
    const ast = parseInterpolationsToAST(protectedContent, context);

    // Render AST to chunks
    let chunks = renderASTToChunks(ast, context);

    // Restore code blocks
    chunks = restoreCodeBlocks(chunks, codeBlocks);

    return chunks;
}
