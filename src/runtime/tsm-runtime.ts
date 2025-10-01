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
export const __SYSTEM__ = "__TSM_SYSTEM__";
export const __USER__ = "__TSM_USER__";
export const __ASSISTANT__ = "__TSM_ASSISTANT__";

// Core chunk type that can be processed by the TSM runtime
export type Chunk = string | number | null | undefined | false | Iterable<Chunk> | typeof __ERASE_PREV_LINE | '\n';

/**
 * Main TSM runtime function that processes an array of chunks and returns a string
 * 
 * @param chunks Array of chunks to process
 * @returns Processed string with proper whitespace handling
 */
export function __tsm(chunks: Array<Chunk>): string {
    const buffer: string[] = [];
    const flattenedChunks = __tsmJoin(chunks);

    let prevIsErase = false;

    for (const chunk of flattenedChunks) {
        if (chunk === __ERASE_PREV_LINE || chunk === null) {
            // Both __ERASE_PREV_LINE and null should erase the previous line
            __erasePrevLine(buffer);
            prevIsErase = true;
            continue;
        } else if (chunk === undefined || chunk === false) {
            // undefined and false don't emit text or whitespace
            prevIsErase = true;
            continue;
        } else if (chunk === '\n') {
            if (prevIsErase) {
                prevIsErase = false;
                continue;
            }
            // Handle newline chunks by adding actual newline
            buffer.push('\n');
        } else if (typeof chunk === 'string') {
            buffer.push(chunk);
        } else if (typeof chunk === "number") {
            buffer.push(String(chunk));
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
                    } else if (typeof item === 'number') {

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
    let prevIsErase = false;

    for (const part of parts) {
        if (part === null) {
            // null should erase the previous line
            result.push(__ERASE_PREV_LINE);
            prevIsErase = true;
        } else if (part === undefined || part === false) {
            // undefined and false don't emit text or whitespace
            prevIsErase = true;
            continue;
        } else if (part === '\n') {
            // Handle newline chunks
            if (prevIsErase) {
                prevIsErase = false;
                continue;
            }
            result.push(part);
        } else if (typeof part === 'string') {
            const stringParts = part.split('\n');
            for (let i = 0; i < stringParts.length; i++) {
                result.push(stringParts[i]);
                if (i < stringParts.length - 1) {
                    result.push('\n');
                }
            }
        } else if (part === __ERASE_PREV_LINE) {
            result.push(part);
        } else if (typeof part === 'number') {
            result.push(String(part));
        } else if (part && typeof part[Symbol.iterator] === 'function') {
            // Recursively flatten iterable chunks
            const flattened = __tsmJoin(Array.from(part));
            result.push(...flattened);
        } else if (typeof part === 'object' && part !== null) {
            // Handle objects by converting to string
            result.push(String(part));
        } else if (typeof part === 'number') {
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

    const lastItem = buf[buf.length - 1];
    if (lastItem === '\n') {
        buf.pop();
    }
}

type ChatMessage = {
    type: "input_text";
    text: string;
    role: "system" | "user" | "assistant";
};

export function parseLLMCall(out: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    const delimiterRegex = /__TSM_(SYSTEM|USER|ASSISTANT)__/g;

    const matches = Array.from(out.matchAll(delimiterRegex));

    if (matches.length === 0) {
        return messages;
    }

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const role = match[1].toLowerCase() as "system" | "user" | "assistant";
        const startIdx = match.index! + match[0].length;
        const endIdx = i < matches.length - 1 ? matches[i + 1].index! : out.length;

        const text = out
            .slice(startIdx, endIdx)
            .trim();

        if (text.length > 0) {
            messages.push({
                type: "input_text",
                text,
                role,
            });
        }
    }

    return messages;
}