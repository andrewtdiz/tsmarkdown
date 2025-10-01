/**
 * Phase 1 Test: TSM Runtime Module
 *
 * This test file validates the core TSM runtime primitives implemented in Phase 1.
 * It tests the fundamental runtime functions that will be used by the transpiler.
 *
 * Based on test-end-to-end.ts but focused on runtime functionality.
 */

import { describe, it, expect } from 'bun:test';
import {
    __tsm,
    __tsmJoin,
    __erasePrevLine,
    __ERASE_PREV_LINE,
    type Chunk
} from "../../src/runtime/tsm-runtime";

// Test data that mimics what the transpiler would generate
const testChunks: Array<Chunk> = [
    "# Admin Panel", "\n",
    "Welcome to the dashboard", "\n",
    null, // Should be ignored AND erase previous "\n" or " "
    "User: John Doe", "\n",
    false, // Should be ignored
    "Status: Active", "\n",
    undefined, // Should be ignored
    "Last login: 2024-01-15", "\n"
];

const testChunksWithErase: Array<Chunk> = [
    "Line 1", "\n",
    "Line 2", "\n",
    __ERASE_PREV_LINE, // Should erase "Line 2"
    "Line 3", "\n"
];

const testNestedChunks: Array<Chunk> = [
    "Header", "\n",
    ["Nested content", "\n"],
    null,
    ["More nested content"], "\n"
];

const testFalsyChunks: Array<Chunk> = [
    "Before", "\n",
    null,
    undefined,
    false,
    "After", "\n"
];

const testWhitespaceChunks: Array<Chunk> = [
    "  \t  Line with leading whitespace", "\n",
    "Line with trailing spaces   \t\n",
    "\n", "\n", "\n", "Multiple newlines", "\n", "\n", "\n",
    "Normal line", "\n"
];

describe('Phase 1: TSM Runtime Module', () => {
    it('should process basic chunks correctly', () => {
        const result = __tsm(testChunks);
        const expected = "# Admin Panel\nWelcome to the dashboardUser: John Doe\nStatus: Active\nLast login: 2024-01-15\n";
        expect(result).toBe(expected);
    });

    it('should handle line erasure functionality', () => {
        const result = __tsm(testChunksWithErase);
        const expected = "Line 1\nLine 2Line 3\n";
        expect(result).toBe(expected);
    });

    it('should flatten nested chunks', () => {
        const result = __tsm(testNestedChunks);
        const expected = "Header\nNested contentMore nested content\n";
        expect(result).toBe(expected);
    });

    it('should compact falsy values', () => {
        const result = __tsm(testFalsyChunks);
        const expected = "BeforeAfter\n";
        expect(result).toBe(expected);
    });

    it('should normalize whitespace', () => {
        const result = __tsm(testWhitespaceChunks);
        const expected = "  \t  Line with leading whitespace\nLine with trailing spaces   \t\n\n\n\nMultiple newlines\n\n\nNormal line\n";
        expect(result).toBe(expected);
    });

    it('should flatten chunks with __tsmJoin', () => {
        const result = __tsmJoin(testNestedChunks);
        const expected: Chunk[] = ["Header", "\n", "Nested content", "\n", __ERASE_PREV_LINE, "More nested content", "\n"];
        expect(result).toEqual(expected);
    });

    it('should erase previous line with __erasePrevLine', () => {
        const testBuffer = ["Line 1\n", "Line 2\n", "Line 3\n"];
        const expectedBuffer = ["Line 1\n", "Line 2\n", "Line 3"];
        __erasePrevLine(testBuffer);
        expect(testBuffer).toEqual(expectedBuffer);
    });

    it('should handle complex scenarios with all features', () => {
        const complexChunks: Array<Chunk> = [
            "# Dashboard\n",
            "Welcome\n",
            null,
            ["User: ", "John", " ", "Doe\n"],
            false,
            "Status: Active\n",
            __ERASE_PREV_LINE, // Should erase "Status: Active"
            "Last login: 2024-01-15\n",
            undefined,
            "  \t  Line with whitespace\n"
        ];
        const result = __tsm(complexChunks);
        const expected = "# Dashboard\nWelcomeUser: John Doe\nStatus: ActiveLast login: 2024-01-15\n  \t  Line with whitespace\n";
        expect(result).toBe(expected);
    });

    it('should handle edge cases', () => {
        const edgeCases: Array<Chunk> = [
            "", // Empty string
            null,
            undefined,
            false,
            __ERASE_PREV_LINE, // Erase on empty buffer
            "Only valid line\n"
        ];
        const result = __tsm(edgeCases);
        const expected = "Only valid line\n";
        expect(result).toBe(expected);
    });
});
