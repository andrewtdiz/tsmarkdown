// Code Protection - protects code blocks and inline code from Better MDX parsing

import { Chunk } from "../runtime/tsm-runtime";

export interface CodeProtection {
    placeholder: string;
    content: string;
}

/**
 * Protects code blocks and inline code from Better MDX parsing
 * This prevents { } syntax inside code from being treated as JavaScript expressions
 */
export function protectCodeBlocks(content: string): { protectedContent: string; codeBlocks: CodeProtection[] } {
    const codeBlocks: CodeProtection[] = [];
    let protectedContent = content;

    // First, protect code blocks (```...```)
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    protectedContent = protectedContent.replace(codeBlockRegex, (match, language, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({
            placeholder,
            content: match // Store the entire match including ``` markers
        });
        return placeholder;
    });

    // Then, protect inline code (`...`)
    const inlineCodeRegex = /`([^`\n]+)`/g;
    protectedContent = protectedContent.replace(inlineCodeRegex, (match, code) => {
        const placeholder = `__INLINE_CODE_${codeBlocks.length}__`;
        codeBlocks.push({
            placeholder,
            content: match // Store the entire match including backticks
        });
        return placeholder;
    });

    return { protectedContent, codeBlocks };
}

/**
 * Restores code blocks and inline code after Better MDX parsing
 */
export function restoreCodeBlocks(content: Chunk[], codeBlocks: CodeProtection[]): Chunk[] {
    // If there are no code blocks to restore, return the content as-is
    if (codeBlocks.length === 0) {
        return content;
    }

    // Handle chunks
    const restoredChunks: Chunk[] = [];
    let currentString = '';

    for (const chunk of content) {
        if (typeof chunk === 'string') {
            currentString += chunk;
        } else if (Array.isArray(chunk)) {
            // If there's accumulated string content, add it first
            if (currentString) {
                restoredChunks.push(currentString);
                currentString = '';
            }
            // Add the array chunk as-is
            restoredChunks.push(chunk as Chunk);
        } else {
            // Handle other chunk types
            if (currentString) {
                restoredChunks.push(currentString);
                currentString = '';
            }
            restoredChunks.push(chunk);
        }
    }

    // Add any remaining string content
    if (currentString) {
        restoredChunks.push(currentString);
    }

    // Now restore code blocks in the chunks
    return restoreCodeBlocksInChunks(restoredChunks, codeBlocks);
}

/**
 * Restores code blocks in chunk arrays
 */
function restoreCodeBlocksInChunks(chunks: Chunk[], codeBlocks: CodeProtection[]): Chunk[] {
    const restoredChunks: Chunk[] = [];

    for (const chunk of chunks) {
        if (typeof chunk === 'string') {
            // Replace placeholders in string chunks
            let restoredString = chunk;
            for (const codeBlock of codeBlocks) {
                if (codeBlock.placeholder.startsWith('__CODE_BLOCK_')) {
                    const normalizedContent = normalizeCodeBlockIndentation(codeBlock.content);
                    restoredString = restoredString.replace(codeBlock.placeholder, normalizedContent);
                } else {
                    restoredString = restoredString.replace(codeBlock.placeholder, codeBlock.content);
                }
            }
            restoredChunks.push(restoredString);
        } else {
            // Pass non-string chunks through unchanged
            restoredChunks.push(chunk);
        }
    }

    return restoredChunks;
}

/**
 * Normalizes indentation in code blocks by removing common leading whitespace
 */
function normalizeCodeBlockIndentation(codeBlock: string): string {
    const lines = codeBlock.split('\n');

    // Find the minimum indentation (excluding empty lines and the first/last lines with ```)
    let minIndent = Infinity;
    for (let i = 1; i < lines.length - 1; i++) { // Skip first and last lines (```)
        const line = lines[i];
        if (line.trim() === '') continue; // Skip empty lines
        if (line.trim() === '```') continue; // Skip closing ``` markers

        const indent = line.length - line.trimStart().length;
        if (indent < minIndent) {
            minIndent = indent;
        }
    }

    // If we found a common indentation, remove it from all content lines
    if (minIndent > 0 && minIndent < Infinity) {
        const normalizedLines = lines.map((line, index) => {
            // Don't modify the first line (opening ```)
            if (index === 0) {
                return line;
            }

            // Don't modify closing ``` markers (they might have indentation)
            if (line.trim() === '```') {
                return '```'; // Always return without indentation
            }

            // Remove the common indentation from content lines
            if (line.length >= minIndent) {
                return line.substring(minIndent);
            }
            return line;
        });

        return normalizedLines.join('\n');
    }

    return codeBlock;
}
