// Pipeline Core - orchestrates the parsing pipeline

import { parseInterpolations } from './interpolations';
import { protectCodeBlocks, restoreCodeBlocks } from './code-protection';
import type { ParseContext } from './types';

// Re-export the shared type
export type { ParseContext } from './types';

// Unified parsing entry point - uses the new double-brace dispatcher
export function parseContent(content: string, context: ParseContext): string {
    // First, protect code blocks and inline code from parsing
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);

    let processed = protectedContent;

    processed = parseInterpolations(processed, context);

    processed = restoreCodeBlocks(processed, codeBlocks);

    return processed;
}
