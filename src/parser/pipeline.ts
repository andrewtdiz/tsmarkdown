// Pipeline Core - orchestrates the parsing pipeline

import { parseConditionals } from './conditionals';
import { parseInterpolations } from './interpolations';
import { parseJSX } from './jsx';
import { parseTernary } from './ternary';
import { protectCodeBlocks, restoreCodeBlocks } from './code-protection';
import type { ParseContext } from './types';

// Re-export the shared type
export type { ParseContext } from './types';

// Unified parsing entry point - applies the full parsing pipeline recursively
export function parseContent(content: string, context: ParseContext): string {
    // First, protect code blocks and inline code from parsing
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);

    let processed = protectedContent;

    // Apply full parsing pipeline recursively
    processed = parseInterpolations(processed, context);
    processed = parseConditionals(processed, context);
    processed = parseTernary(processed, context);
    processed = parseJSX(processed, context);

    // Finally, restore the protected code blocks
    processed = restoreCodeBlocks(processed, codeBlocks);

    return processed;
}
