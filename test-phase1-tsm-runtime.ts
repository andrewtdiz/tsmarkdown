/**
 * Phase 1 Test: TSM Runtime Module
 * 
 * This test file validates the core TSM runtime primitives implemented in Phase 1.
 * It tests the fundamental runtime functions that will be used by the transpiler.
 * 
 * Based on test-end-to-end.ts but focused on runtime functionality.
 */

import {
    __tsm,
    __tsmJoin,
    __erasePrevLine,
    __normalizeWhitespace,
    __ERASE_PREV_LINE,
    type Chunk
} from "./src/runtime/tsm-runtime";

// Test data that mimics what the transpiler would generate
const testChunks: Array<Chunk> = [
    "# Admin Panel\n",
    "Welcome to the dashboard\n",
    null, // Should be ignored
    "User: John Doe\n",
    false, // Should be ignored
    "Status: Active\n",
    undefined, // Should be ignored
    "Last login: 2024-01-15\n"
];

const testChunksWithErase: Array<Chunk> = [
    "Line 1\n",
    "Line 2\n",
    __ERASE_PREV_LINE, // Should erase "Line 2"
    "Line 3\n"
];

const testNestedChunks: Array<Chunk> = [
    "Header\n",
    ["Nested", " ", "content\n"],
    null,
    ["More", " ", "nested", " ", "content\n"]
];

const testFalsyChunks: Array<Chunk> = [
    "Before\n",
    null,
    undefined,
    false,
    "After\n"
];

const testWhitespaceChunks: Array<Chunk> = [
    "  \t  Line with leading whitespace\n",
    "Line with trailing spaces   \t\n",
    "\n\n\nMultiple newlines\n\n\n",
    "Normal line\n"
];

console.log("=== Phase 1: TSM Runtime Module Tests ===\n");

// Test 1: Basic chunk processing
console.log("Test 1: Basic chunk processing");
console.log("Input chunks:", testChunks);
const result1 = __tsm(testChunks);
console.log("Result:", result1);
console.log("Expected: Should ignore null, false, undefined values");
console.log("");

// Test 2: Line erasure functionality
console.log("Test 2: Line erasure functionality");
console.log("Input chunks:", testChunksWithErase);
const result2 = __tsm(testChunksWithErase);
console.log("Result:", JSON.stringify(result2));
console.log("Expected: Should erase 'Line 2' and keep 'Line 1' and 'Line 3'");
console.log("");

// Test 3: Nested chunk flattening
console.log("Test 3: Nested chunk flattening");
console.log("Input chunks:", testNestedChunks);
const result3 = __tsm(testNestedChunks);
console.log("Result:", JSON.stringify(result3));
console.log("Expected: Should flatten nested arrays and ignore null values");
console.log("");

// Test 4: Falsy value compaction
console.log("Test 4: Falsy value compaction");
console.log("Input chunks:", testFalsyChunks);
const result4 = __tsm(testFalsyChunks);
console.log("Result:", JSON.stringify(result4));
console.log("Expected: Should only keep 'Before' and 'After' lines");
console.log("");

// Test 5: Whitespace normalization
console.log("Test 5: Whitespace normalization");
console.log("Input chunks:", testWhitespaceChunks);
const result5 = __tsm(testWhitespaceChunks);
console.log("Result:", JSON.stringify(result5));
console.log("Expected: Should normalize whitespace and handle multiple newlines");
console.log("");

// Test 6: __tsmJoin function
console.log("Test 6: __tsmJoin function");
const joinResult = __tsmJoin(testNestedChunks);
console.log("Input chunks:", testNestedChunks);
console.log("Join result:", joinResult);
console.log("Expected: Should flatten and filter falsy values");
console.log("");

// Test 7: __erasePrevLine function
console.log("Test 7: __erasePrevLine function");
const testBuffer = ["Line 1\n", "Line 2\n", "Line 3\n"];
console.log("Buffer before:", testBuffer);
__erasePrevLine(testBuffer);
console.log("Buffer after:", testBuffer);
console.log("Expected: Should remove 'Line 3'");
console.log("");

// Test 8: __normalizeWhitespace function
console.log("Test 8: __normalizeWhitespace function");
const testWhitespace = "  \t  Line with spaces\n\n\nMultiple newlines\n  Trailing spaces   \t\n";
console.log("Input:", JSON.stringify(testWhitespace));
const normalized = __normalizeWhitespace(testWhitespace);
console.log("Normalized:", normalized);
console.log("Expected: Should normalize whitespace and handle multiple newlines");
console.log("");

// Test 9: Complex scenario with all features
console.log("Test 9: Complex scenario with all features");
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

console.log("Complex input chunks:", complexChunks);
const complexResult = __tsm(complexChunks);
console.log("Complex result:", complexResult);
console.log("Expected: Should handle all features together", "\n");

// Test 10: Edge cases
console.log("Test 10: Edge cases");
const edgeCases: Array<Chunk> = [
    "", // Empty string
    null,
    undefined,
    false,
    __ERASE_PREV_LINE, // Erase on empty buffer
    "Only valid line\n"
];

console.log("Edge case chunks:", edgeCases);
const edgeResult = __tsm(edgeCases);
console.log("Edge case result:", edgeResult);
console.log("Expected: Should handle edge cases gracefully\n");

console.log("=== Phase 1 Tests Complete ===");
console.log("All runtime primitives have been tested.");
console.log("Next: Phase 2 - TSM AST Types and Parser");
