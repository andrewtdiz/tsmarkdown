"use strict";
/**
 * Test runner for Better MDX syntax highlighting tests
 * This module provides the main test execution framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockGrammarParser = void 0;
exports.runTestCase = runTestCase;
exports.runTestSuite = runTestSuite;
exports.runTestSuites = runTestSuites;
exports.createMockParser = createMockParser;
const scope_validator_1 = require("./scope-validator");
/**
 * Mock grammar parser for testing purposes
 * In a real implementation, this would use the actual grammar parser
 */
class MockGrammarParser {
    constructor(grammar) {
        this.grammar = grammar;
    }
    /**
     * Parses input text and returns scope matches
     * This is a simplified mock implementation
     */
    parse(input) {
        // This is a mock implementation that would be replaced with actual grammar parsing
        const scopes = [];
        const usedRanges = [];
        // Mock interpolation detection - must come before expression detection
        const interpolationRegex = /\{\{([^}]+)\}\}/g;
        let match;
        while ((match = interpolationRegex.exec(input)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            scopes.push({
                scope: 'source.better-mdx meta.interpolation.better-mdx',
                start: start,
                end: end,
                content: match[0]
            });
            scopes.push({
                scope: 'source.better-mdx variable.other.interpolation.better-mdx',
                start: start + 2,
                end: end - 2,
                content: match[1]
            });
            // Mark this range as used to avoid overlap with expressions
            usedRanges.push({ start, end });
        }
        // Mock expression detection - only match single braces that aren't part of interpolation
        const expressionRegex = /\{(?!\{)([^}]*)\}/g;
        while ((match = expressionRegex.exec(input)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            // Check if this range overlaps with any interpolation
            const overlaps = usedRanges.some(range => (start >= range.start && start < range.end) ||
                (end > range.start && end <= range.end) ||
                (start <= range.start && end >= range.end));
            if (!overlaps) {
                scopes.push({
                    scope: 'source.better-mdx meta.expression.better-mdx',
                    start: start,
                    end: end,
                    content: match[0]
                });
            }
        }
        // Mock function declaration detection
        const functionRegex = /\b(function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g;
        while ((match = functionRegex.exec(input)) !== null) {
            scopes.push({
                scope: 'source.better-mdx meta.function.declaration.better-mdx',
                start: match.index,
                end: match.index + match[0].length,
                content: match[0]
            });
        }
        // Mock import detection
        const importRegex = /\bimport\s+[^;]+;/g;
        while ((match = importRegex.exec(input)) !== null) {
            scopes.push({
                scope: 'source.better-mdx meta.import.better-mdx',
                start: match.index,
                end: match.index + match[0].length - 1, // Don't include the semicolon
                content: match[0].slice(0, -1)
            });
        }
        // Mock markdown header detection
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        while ((match = headerRegex.exec(input)) !== null) {
            scopes.push({
                scope: 'source.better-mdx markup.heading.better-mdx',
                start: match.index,
                end: match.index + match[0].length - 1, // Don't include the newline
                content: match[0].trim()
            });
        }
        // Mock string detection
        const stringRegex = /"([^"\\]|\\.)*"/g;
        while ((match = stringRegex.exec(input)) !== null) {
            scopes.push({
                scope: 'source.better-mdx string.quoted.double.better-mdx',
                start: match.index,
                end: match.index + match[0].length - 1, // Don't include the closing quote
                content: match[0]
            });
        }
        // Mock comment detection
        const commentRegex = /\/\/.*$/gm;
        while ((match = commentRegex.exec(input)) !== null) {
            scopes.push({
                scope: 'source.better-mdx comment.line.double-slash.better-mdx',
                start: match.index,
                end: match.index + match[0].length,
                content: match[0]
            });
        }
        return scopes.sort((a, b) => a.start - b.start);
    }
}
exports.MockGrammarParser = MockGrammarParser;
/**
 * Runs a single test case
 */
function runTestCase(testCase, parser) {
    const actualScopes = parser.parse(testCase.input);
    return (0, scope_validator_1.validateScopes)(testCase, actualScopes);
}
/**
 * Runs a test suite
 */
function runTestSuite(testSuite, parser) {
    const startTime = Date.now();
    const results = [];
    console.log(`\nRunning test suite: ${testSuite.name}`);
    console.log('='.repeat(50));
    testSuite.tests.forEach(testCase => {
        const result = runTestCase(testCase, parser);
        results.push(result);
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${testCase.name}`);
        if (!result.passed) {
            result.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }
    });
    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\nSuite Results: ${passed}/${total} tests passed (${duration}ms)`);
    return {
        suiteName: testSuite.name,
        results,
        passed,
        total,
        duration
    };
}
/**
 * Runs multiple test suites
 */
function runTestSuites(testSuites, parser) {
    const startTime = Date.now();
    const suiteResults = [];
    console.log('Better MDX Syntax Highlighting Tests');
    console.log('====================================');
    testSuites.forEach(suite => {
        const result = runTestSuite(suite, parser);
        suiteResults.push(result);
    });
    const totalDuration = Date.now() - startTime;
    const totalPassed = suiteResults.reduce((sum, r) => sum + r.passed, 0);
    const totalTests = suiteResults.reduce((sum, r) => sum + r.total, 0);
    console.log('\n' + '='.repeat(50));
    console.log(`Overall Results: ${totalPassed}/${totalTests} tests passed (${totalDuration}ms)`);
    if (totalPassed === totalTests) {
        console.log('🎉 All tests passed!');
    }
    else {
        console.log('❌ Some tests failed. Please review the output above.');
        process.exit(1);
    }
}
/**
 * Creates a mock grammar parser for testing
 */
function createMockParser() {
    // In a real implementation, this would load the actual grammar
    const mockGrammar = {};
    return new MockGrammarParser(mockGrammar);
}
//# sourceMappingURL=test-runner.js.map