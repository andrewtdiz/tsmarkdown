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
export type Chunk = string | null | undefined | false | Iterable<Chunk> | typeof __ERASE_PREV_LINE | '\n';

/**
 * Main TSM runtime function that processes an array of chunks and returns a string
 * 
 * @param chunks Array of chunks to process
 * @returns Processed string with proper whitespace handling
 */
export function __tsm(chunks: Array<Chunk>): string {
    console.log("TSM CHUNKS: ", chunks);
    const buffer: string[] = [];
    const flattenedChunks = __tsmJoin(chunks);

    for (const chunk of flattenedChunks) {
        if (chunk === __ERASE_PREV_LINE || chunk === null) {
            // Both __ERASE_PREV_LINE and null should erase the previous line
            __erasePrevLine(buffer);
        } else if (chunk === undefined || chunk === false) {
            // undefined and false don't emit text or whitespace
            continue;
        } else if (chunk === '\n') {
            // Handle newline chunks by adding actual newline
            buffer.push('\n');
        } else if (typeof chunk === 'string') {
            buffer.push(chunk);
        } else if (chunk && typeof chunk[Symbol.iterator] === 'function') {
            // Check if this is a runtime interpolation array [ "expression" ]
            const chunkArray = Array.from(chunk);
            if (chunkArray.length === 1 && typeof chunkArray[0] === 'string') {
                // This is a runtime interpolation - it should be evaluated as a TypeScript expression
                const expression = chunkArray[0].trim();

                // Check if this is a function call (e.g., "Dashboard()")
                if (expression.match(/^\w+\(.*\)$/)) {
                    // This is a function call - return it as-is for runtime execution
                    // The actual execution will happen in the TypeScript runtime context
                    buffer.push(expression);
                } else {
                    // This is a variable reference - leave it as a placeholder
                    buffer.push(expression);
                }
            } else {
                // Handle regular iterable chunks (arrays, etc.)
                for (const item of chunk) {
                    if (item === __ERASE_PREV_LINE || item === null) {
                        // Both __ERASE_PREV_LINE and null should erase the previous line
                        __erasePrevLine(buffer);
                    } else if (item === undefined || item === false) {
                        // undefined and false don't emit text or whitespace
                        continue;
                    } else if (item === '\n') {
                        // Handle newline chunks by adding actual newline
                        buffer.push('\n');
                    } else if (typeof item === 'string') {
                        buffer.push(item);
                    } else if (item && typeof item[Symbol.iterator] === 'function') {
                        // Handle nested iterables recursively
                        for (const nestedItem of item) {
                            if (nestedItem === __ERASE_PREV_LINE || nestedItem === null) {
                                __erasePrevLine(buffer);
                            } else if (nestedItem === undefined || nestedItem === false) {
                                continue;
                            } else if (nestedItem === '\n') {
                                buffer.push('\n');
                            } else if (typeof nestedItem === 'string') {
                                buffer.push(nestedItem);
                            } else {
                                buffer.push(String(nestedItem));
                            }
                        }
                    } else if (typeof item === 'object' && item !== null) {
                        // Handle nested objects
                        buffer.push(String(item));
                    }
                }
            }
        } else {
            // Handle objects by converting to string
            buffer.push(String(chunk));
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
        } else if (part === '\n') {
            // Handle newline chunks
            result.push(part);
        } else if (typeof part === 'string') {
            // Split strings on newlines and create separate chunks
            const stringParts = part.split('\n');
            for (let i = 0; i < stringParts.length; i++) {
                // Always push the string part, even if it's empty (to preserve empty lines)
                result.push(stringParts[i]);
                // Add newline chunk after each part except the last one
                if (i < stringParts.length - 1) {
                    result.push('\n');
                }
            }
        } else if (part === __ERASE_PREV_LINE) {
            result.push(part);
        } else if (part && typeof part[Symbol.iterator] === 'function') {
            // Recursively flatten iterable chunks
            const flattened = __tsmJoin(Array.from(part));
            result.push(...flattened);
        } else if (typeof part === 'object' && part !== null) {
            // Handle objects by converting to string
            result.push(String(part));
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

    // Find the last newline in the buffer
    let lastNewlineIndex = -1;
    let lastNewlineBufferIndex = -1;

    // Search backwards through the buffer to find the last newline
    for (let i = buf.length - 1; i >= 0; i--) {
        const item = buf[i];
        if (typeof item === 'string') {
            const newlineIndex = item.lastIndexOf('\n');
            if (newlineIndex !== -1) {
                lastNewlineIndex = newlineIndex;
                lastNewlineBufferIndex = i;
                break;
            }
        }
    }

    if (lastNewlineBufferIndex !== -1) {
        const item = buf[lastNewlineBufferIndex];
        if (typeof item === 'string') {
            // Remove everything after the last newline in that item
            buf[lastNewlineBufferIndex] = item.substring(0, lastNewlineIndex);
            // Remove any empty items that come after
            while (buf.length > lastNewlineBufferIndex + 1) {
                const nextItem = buf[lastNewlineBufferIndex + 1];
                if (typeof nextItem === 'string' && nextItem === '') {
                    buf.splice(lastNewlineBufferIndex + 1, 1);
                } else {
                    break;
                }
            }
        }
    } else {
        // If no newline found, remove the last item
        buf.pop();
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
