/**
 * Test runner for Better MDX syntax highlighting tests
 * This module provides the main test execution framework
 */
import { TestCase, TestResult } from './scope-validator';
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
export declare class MockGrammarParser {
    private grammar;
    constructor(grammar: any);
    /**
     * Parses input text and returns scope matches
     * This is a simplified mock implementation
     */
    parse(input: string): any[];
}
/**
 * Runs a single test case
 */
export declare function runTestCase(testCase: TestCase, parser: MockGrammarParser): TestResult;
/**
 * Runs a test suite
 */
export declare function runTestSuite(testSuite: TestSuite, parser: MockGrammarParser): TestSuiteResult;
/**
 * Runs multiple test suites
 */
export declare function runTestSuites(testSuites: TestSuite[], parser: MockGrammarParser): void;
/**
 * Creates a mock grammar parser for testing
 */
export declare function createMockParser(): MockGrammarParser;
//# sourceMappingURL=test-runner.d.ts.map