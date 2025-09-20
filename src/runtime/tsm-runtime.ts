/**
 * TSM (TypeScript-Markdown) Runtime Module
 * 
 * This module provides the core runtime primitives for the TSM transpiler.
 * It handles the execution of transpiled TSM code, including:
 * - Chunk processing and flattening
 * - Falsy value compaction
 * - Whitespace normalization
 * - Line erasure functionality
 */

// Sentinel value for line erasure functionality
export const __ERASE_PREV_LINE = Symbol('__ERASE_PREV_LINE');

// Core chunk type that can be processed by the TSM runtime
export type Chunk = string | null | undefined | false | Iterable<Chunk> | typeof __ERASE_PREV_LINE;

/**
 * Main TSM runtime function that processes an array of chunks and returns a string
 * 
 * @param chunks Array of chunks to process
 * @returns Processed string with proper whitespace handling
 */
export function __tsm(chunks: Array<Chunk>): string {
    const buffer: string[] = [];
    const flattenedChunks = __tsmJoin(chunks);

    for (const chunk of flattenedChunks) {
        if (chunk === __ERASE_PREV_LINE || chunk === null) {
            // Both __ERASE_PREV_LINE and null should erase the previous line
            __erasePrevLine(buffer);
        } else if (chunk === undefined || chunk === false) {
            // undefined and false don't emit text or whitespace
            continue;
        } else if (typeof chunk === 'string') {
            buffer.push(chunk);
        } else if (chunk && typeof chunk[Symbol.iterator] === 'function') {
            // Handle iterable chunks (arrays, etc.)
            for (const item of chunk) {
                if (item === __ERASE_PREV_LINE || item === null) {
                    // Both __ERASE_PREV_LINE and null should erase the previous line
                    __erasePrevLine(buffer);
                } else if (item === undefined || item === false) {
                    // undefined and false don't emit text or whitespace
                    continue;
                } else if (typeof item === 'string') {
                    buffer.push(item);
                }
            }
        }
    }

    return buffer.join('');
}

/**
 * Flatten helper that processes nested chunks and handles falsy compaction
 * 
 * @param parts Array of chunks to flatten
 * @returns Flattened array of chunks
 */
export function __tsmJoin(parts: Array<Chunk>): Array<Chunk> {
    const result: Array<Chunk> = [];

    for (const part of parts) {
        if (part === null) {
            // null should erase the previous line
            result.push(__ERASE_PREV_LINE);
        } else if (part === undefined || part === false) {
            // undefined and false don't emit text or whitespace
            continue;
        } else if (typeof part === 'string') {
            result.push(part);
        } else if (part === __ERASE_PREV_LINE) {
            result.push(part);
        } else if (part && typeof part[Symbol.iterator] === 'function') {
            // Recursively flatten iterable chunks
            const flattened = __tsmJoin(Array.from(part));
            result.push(...flattened);
        }
    }

    return result;
}

/**
 * Line erase functionality - removes the last line from the buffer
 * Used for implementing {{ null }} functionality
 * 
 * @param buf String buffer to modify
 */
export function __erasePrevLine(buf: string[]): void {
    if (buf.length === 0) return;

    const lastItem = buf[buf.length - 1];
    if (typeof lastItem === 'string') {
        // Find the last newline in the last item
        const lastNewlineIndex = lastItem.lastIndexOf('\n');
        if (lastNewlineIndex !== -1) {
            // Remove everything after the last newline
            buf[buf.length - 1] = lastItem.substring(0, lastNewlineIndex);
        } else {
            // If no newline found, remove the entire last item
            buf.pop();
        }
    }
}

/**
 * Normalize whitespace in a string, handling newlines and indentation
 * 
 * @param str String to normalize
 * @returns Normalized string
 */
export function __normalizeWhitespace(str: string): string {
    // Handle multiple consecutive newlines
    let normalized = str.replace(/\n{3,}/g, '\n\n');

    // Handle trailing whitespace on lines
    normalized = normalized.replace(/[ \t]+$/gm, '');

    // Handle leading whitespace normalization
    normalized = normalized.replace(/^[ \t]+/gm, (match) => {
        // Convert tabs to spaces for consistent indentation
        return match.replace(/\t/g, '  ');
    });

    return normalized;
}

/**
 * Process a single chunk with whitespace normalization
 * 
 * @param chunk Chunk to process
 * @returns Processed chunk
 */
export function __processChunk(chunk: Chunk): Chunk {
    if (typeof chunk === 'string') {
        return __normalizeWhitespace(chunk);
    }
    return chunk;
}
