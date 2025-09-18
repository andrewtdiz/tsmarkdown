// Pipeline Core - orchestrates the parsing pipeline

import { parseConditionals } from './conditionals';
import { parseInterpolations } from './interpolations';
import { parseJSX } from './jsx';
import { parseTernary } from './ternary';
import type { ParseContext } from './types';

// Re-export the shared type
export type { ParseContext } from './types';

// Unified parsing entry point - applies the full parsing pipeline recursively
export function parseContent(content: string, context: ParseContext): string {
    let processed = content;

    // Apply full parsing pipeline recursively
    processed = parseInterpolations(processed, context);
    processed = parseConditionals(processed, context);
    processed = parseTernary(processed, context);
    processed = parseJSX(processed, context);

    return processed;
}
