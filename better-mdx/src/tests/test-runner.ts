/**
 * Test runner for Better MDX syntax highlighting tests
 * This module provides the main test execution framework
 */

import { TestCase, TestResult, validateScopes, formatTestResults } from './scope-validator';

export interface TestSuite {
    name: string;
    tests: TestCase[];
}

export interface TestSuiteResult {
    suiteName: string;
    results: TestResult[];
    passed: number;
    total: number;
    duration: number;
}

/**
 * Mock grammar parser for testing purposes
 * In a real implementation, this would use the actual grammar parser
 */
export class MockGrammarParser {
    private grammar: any;

    constructor(grammar: any) {
        this.grammar = grammar;
    }

    /**
     * Parses input text and returns scope matches
     * This is a simplified mock implementation
     */
    parse(input: string): any[] {
        // This is a mock implementation that would be replaced with actual grammar parsing
        const scopes: any[] = [];
        const usedRanges: Array<{ start: number, end: number }> = [];

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
            const overlaps = usedRanges.some(range =>
                (start >= range.start && start < range.end) ||
                (end > range.start && end <= range.end) ||
                (start <= range.start && end >= range.end)
            );

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

/**
 * Runs a single test case
 */
export function runTestCase(
    testCase: TestCase,
    parser: MockGrammarParser
): TestResult {
    const actualScopes = parser.parse(testCase.input);
    return validateScopes(testCase, actualScopes);
}

/**
 * Runs a test suite
 */
export function runTestSuite(
    testSuite: TestSuite,
    parser: MockGrammarParser
): TestSuiteResult {
    const startTime = Date.now();
    const results: TestResult[] = [];

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
export function runTestSuites(
    testSuites: TestSuite[],
    parser: MockGrammarParser
): void {
    const startTime = Date.now();
    const suiteResults: TestSuiteResult[] = [];

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
    } else {
        console.log('❌ Some tests failed. Please review the output above.');
        process.exit(1);
    }
}

/**
 * Creates a mock grammar parser for testing
 */
export function createMockParser(): MockGrammarParser {
    // In a real implementation, this would load the actual grammar
    const mockGrammar = {};
    return new MockGrammarParser(mockGrammar);
}
