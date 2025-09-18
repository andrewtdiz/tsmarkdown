import { resolve, join } from 'path';
import { parseMDX } from './parser';
import { compile } from './compiler';
import { render } from './renderer';
import { ClientRenderer } from './client-renderer';

/**
 * Generate clickable file links for different IDEs and terminals
 */
function generateFileLink(filePath: string, lineNumber: number): string {
    if (!filePath) return '';

    const absolutePath = resolve(filePath);

    // Check if terminal supports hyperlinks (OSC 8)
    const supportsHyperlinks = process.env.TERM_PROGRAM === 'vscode' ||
        process.env.TERM_PROGRAM === 'iTerm.app' ||
        process.env.TERM_PROGRAM === 'Hyper' ||
        process.env.TERM_PROGRAM === 'Terminal.app' ||
        process.env.COLORTERM === 'truecolor';

    // Detect IDE based on environment variables
    const vscode = process.env.VSCODE_PID || process.env.VSCODE_INJECTION;
    const webstorm = process.env.WEBSTORM_PID || process.env.JETBRAINS_IDE;

    let linkUrl: string;
    if (vscode) {
        // VS Code format: vscode://file/path/to/file:line:column
        linkUrl = `vscode://file${absolutePath}:${lineNumber}:1`;
    } else if (webstorm) {
        // WebStorm/IntelliJ format: webstorm://open?file=path&line=line
        linkUrl = `webstorm://open?file=${absolutePath}&line=${lineNumber}`;
    } else {
        // Fallback: file:// URL
        linkUrl = `file://${absolutePath}:${lineNumber}`;
    }

    if (supportsHyperlinks) {
        // Generate hyperlink using OSC 8 escape sequence
        return `\x1b]8;;${linkUrl}\x1b\\${filePath}:${lineNumber}\x1b]8;;\x1b\\`;
    } else {
        // Fallback: just show the file path and line
        return `${filePath}:${lineNumber}`;
    }
}

export interface ExactMDXTestCase {
    name: string;
    input: string;
    context?: Record<string, any>;
    expected?: {
        exactContent?: string;
        exactLines?: string[];
        errors?: string[];
        metadata?: any;
    };
    options?: {
        timeout?: number;
        skipExecution?: boolean;
        skipCompilation?: boolean;
        normalizeWhitespace?: boolean;
    };
    sourceFile?: string; // Path to the source file for clickable links
}

export interface ExactMDXTestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: {
        parsed?: any;
        compiled?: any;
        executed?: any;
        rendered?: any;
        expectedContent?: string;
        actualContent?: string;
        lineDifferences?: Array<{
            lineNumber: number;
            expected: string;
            actual: string;
        }>;
    };
}

export interface ExactMDXTestSuite {
    name: string;
    testCases: ExactMDXTestCase[];
    setup?: () => void | Promise<void>;
    teardown?: () => void | Promise<void>;
}

export class ExactMDXTestRunner {
    private renderer = new ClientRenderer();
    private results: ExactMDXTestResult[] = [];

    /**
     * Run a single test case with exact string matching
     */
    async runTestCase(testCase: ExactMDXTestCase): Promise<ExactMDXTestResult> {
        const startTime = Date.now();
        const result: ExactMDXTestResult = {
            name: testCase.name,
            passed: false,
            duration: 0,
            details: {}
        };

        try {
            // Parse phase
            const parsed = parseMDX(testCase.input);
            result.details!.parsed = parsed;

            if (!testCase.options?.skipCompilation) {
                // Compile phase
                const compiled = compile(parsed);
                result.details!.compiled = compiled;

                if (!testCase.options?.skipExecution) {
                    // Execute phase - pass basePath from context if available
                    const context = testCase.context || {};
                    const basePath = context.basePath;
                    const executed = await render(compiled, context, {}, basePath);
                    result.details!.executed = executed;

                    // Render phase
                    const rendered = await this.renderer.render(compiled, testCase.context || {});
                    result.details!.rendered = rendered;

                    // Validate results with exact matching
                    if (testCase.expected) {
                        const validationResult = this.validateExactResults(testCase.expected, executed, rendered, compiled, testCase.options);
                        result.passed = validationResult.passed;
                        result.error = validationResult.error;
                        result.details!.expectedContent = testCase.expected.exactContent;
                        result.details!.actualContent = executed.content;
                        result.details!.lineDifferences = validationResult.lineDifferences;

                        // Log detailed error information when test fails
                        if (!result.passed) {
                            console.log(`\n❌ Test "${testCase.name}" failed:`);
                            if (testCase.sourceFile) {
                                const sourceLink = generateFileLink(testCase.sourceFile, 1);
                                console.log(`   Source: ${sourceLink}`);
                            }
                            console.log(`   Error: ${result.error}`);
                            if (result.details?.expectedContent !== undefined) {
                                console.log(`   Expected content: "${result.details.expectedContent}"`);
                            }
                            if (result.details?.actualContent !== undefined) {
                                console.log(`   Actual content: \n\n${result.details.actualContent}\n`);
                            }
                            if (result.details?.lineDifferences && result.details.lineDifferences.length > 0) {
                                console.log(`   Line differences:`);
                                result.details.lineDifferences.forEach(diff => {
                                    const fileLink = testCase.sourceFile ? generateFileLink(testCase.sourceFile, diff.lineNumber) : '';
                                    const linkText = fileLink ? ` (${fileLink})` : '';
                                    console.log(`     Line ${diff.lineNumber}${linkText}: Expected "${diff.expected}", Got "${diff.actual}"`);
                                });
                            }
                            console.log(`   Executed errors: ${executed.errors.join(', ') || 'none'}`);
                            console.log(`   Rendered: ${rendered}`);
                        }
                    } else {
                        // If no expectations, just check for no errors
                        result.passed = executed.errors.length === 0;
                        if (!result.passed) {
                            result.error = `Execution errors: ${executed.errors.join(', ')}`;
                            console.log(`\n❌ Test "${testCase.name}" failed with execution errors:`);
                            console.log(`   Errors: ${executed.errors.join(', ')}`);
                        }
                    }
                } else {
                    result.passed = true; // Skip execution means just check compilation
                }
            } else {
                result.passed = true; // Skip compilation means just check parsing
            }

        } catch (error) {
            result.passed = false;
            result.error = error instanceof Error ? error.message : String(error);
            console.log(`\n❌ Test "${testCase.name}" failed with exception:`);
            console.log(`   Error: ${result.error}`);
            if (error instanceof Error && error.stack) {
                console.log(`   Stack: ${error.stack}`);
            }
        } finally {
            result.duration = Date.now() - startTime;
        }

        return result;
    }

    /**
     * Run a test suite
     */
    async runTestSuite(suite: ExactMDXTestSuite): Promise<ExactMDXTestResult[]> {
        console.log(`\n🧪 Running exact test suite: ${suite.name}`);

        // Setup
        if (suite.setup) {
            await suite.setup();
        }

        const suiteResults: ExactMDXTestResult[] = [];

        try {
            // Run test cases
            for (const testCase of suite.testCases) {
                const result = await this.runTestCase(testCase);
                suiteResults.push(result);

                if (result.passed) {
                    console.log(`  ✅ ${testCase.name} (${result.duration}ms)`);
                } else {
                    console.log(`  ❌ ${testCase.name} (${result.duration}ms): ${result.error}`);
                    if (result.details?.lineDifferences && result.details.lineDifferences.length > 0) {
                        console.log(`     Line differences:`);
                        result.details.lineDifferences.forEach(diff => {
                            const fileLink = testCase.sourceFile ? generateFileLink(testCase.sourceFile, diff.lineNumber) : '';
                            const linkText = fileLink ? ` (${fileLink})` : '';
                            console.log(`     Line ${diff.lineNumber}${linkText}: Expected "${diff.expected}", Got "${diff.actual}"`);
                        });
                    }
                }
            }

        } finally {
            // Teardown
            if (suite.teardown) {
                await suite.teardown();
            }
        }

        // Summary
        const passed = suiteResults.filter(r => r.passed).length;
        const total = suiteResults.length;
        const totalTime = suiteResults.reduce((sum, r) => sum + r.duration, 0);

        console.log(`\n📊 Suite "${suite.name}" completed: ${passed}/${total} passed (${totalTime}ms)`);

        this.results.push(...suiteResults);
        return suiteResults;
    }

    /**
     * Run multiple test suites
     */
    async runTestSuites(suites: ExactMDXTestSuite[]): Promise<ExactMDXTestResult[]> {
        console.log(`🚀 Running ${suites.length} exact test suites...\n`);

        for (const suite of suites) {
            await this.runTestSuite(suite);
        }

        // Overall summary
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

        console.log(`\n🎯 Overall Results: ${passed}/${total} tests passed (${totalTime}ms)`);

        if (passed === total) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`❌ ${total - passed} tests failed`);
        }

        return this.results;
    }

    private validateExactResults(
        expected: NonNullable<ExactMDXTestCase['expected']>,
        executed: any,
        rendered: any,
        compiled: any,
        options?: ExactMDXTestCase['options']
    ): { passed: boolean; error?: string; lineDifferences?: Array<{ lineNumber: number; expected: string; actual: string }> } {

        // Check exact content match
        if (expected.exactContent !== undefined) {
            let expectedContent = expected.exactContent;
            let actualContent = executed.content;

            // Normalize whitespace if requested
            if (options?.normalizeWhitespace) {
                expectedContent = this.normalizeWhitespace(expectedContent);
                actualContent = this.normalizeWhitespace(actualContent);
            }

            if (expectedContent !== actualContent) {
                const lineDifferences = this.compareLines(expectedContent, actualContent);
                return {
                    passed: false,
                    error: `Exact content mismatch. Expected ${expectedContent.length} chars, Got ${actualContent.length} chars`,
                    lineDifferences
                };
            }
        }

        // Check exact lines match
        if (expected.exactLines !== undefined) {
            const actualLines = executed.content.split('\n');
            const expectedLines = expected.exactLines;

            if (actualLines.length !== expectedLines.length) {
                return {
                    passed: false,
                    error: `Line count mismatch. Expected ${expectedLines.length} lines, Got ${actualLines.length} lines`
                };
            }

            const lineDifferences: Array<{ lineNumber: number; expected: string; actual: string }> = [];

            for (let i = 0; i < expectedLines.length; i++) {
                let expectedLine = expectedLines[i];
                let actualLine = actualLines[i];

                // Normalize whitespace if requested
                if (options?.normalizeWhitespace) {
                    expectedLine = this.normalizeWhitespace(expectedLine);
                    actualLine = this.normalizeWhitespace(actualLine);
                }

                if (expectedLine !== actualLine) {
                    lineDifferences.push({
                        lineNumber: i + 1,
                        expected: expectedLine,
                        actual: actualLine
                    });
                }
            }

            if (lineDifferences.length > 0) {
                return {
                    passed: false,
                    error: `${lineDifferences.length} line(s) don't match exactly`,
                    lineDifferences
                };
            }
        }

        // Check error count
        if (expected.errors && executed.errors.length !== expected.errors.length) {
            return {
                passed: false,
                error: `Error count mismatch. Expected: ${expected.errors.length}, Got: ${executed.errors.length}`
            };
        }

        // Check error messages
        if (expected.errors) {
            for (let i = 0; i < expected.errors.length; i++) {
                if (!executed.errors[i].includes(expected.errors[i])) {
                    return {
                        passed: false,
                        error: `Error message mismatch at index ${i}. Expected: "${expected.errors[i]}", Got: "${executed.errors[i]}"`
                    };
                }
            }
        }

        return { passed: true };
    }

    private normalizeWhitespace(content: string): string {
        return content
            .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
            .replace(/\n\s*/g, '\n')  // Remove leading spaces from lines
            .trim();
    }

    private compareLines(expected: string, actual: string): Array<{ lineNumber: number; expected: string; actual: string }> {
        const expectedLines = expected.split('\n');
        const actualLines = actual.split('\n');
        const differences: Array<{ lineNumber: number; expected: string; actual: string }> = [];

        const maxLines = Math.max(expectedLines.length, actualLines.length);

        for (let i = 0; i < maxLines; i++) {
            const expectedLine = expectedLines[i] || '';
            const actualLine = actualLines[i] || '';

            if (expectedLine !== actualLine) {
                differences.push({
                    lineNumber: i + 1,
                    expected: expectedLine,
                    actual: actualLine
                });
            }
        }

        return differences;
    }
}

/**
 * Utility functions for creating exact test cases
 */
export class ExactMDXTestBuilder {
    private testCase: ExactMDXTestCase;

    constructor(name: string, input: string) {
        this.testCase = {
            name,
            input,
            expected: {}
        };
    }

    withContext(context: Record<string, any>): ExactMDXTestBuilder {
        this.testCase.context = context;
        return this;
    }

    expectExactContent(content: string): ExactMDXTestBuilder {
        this.testCase.expected = this.testCase.expected || {};
        this.testCase.expected.exactContent = content;
        return this;
    }

    expectExactLines(...lines: string[]): ExactMDXTestBuilder {
        this.testCase.expected = this.testCase.expected || {};
        this.testCase.expected.exactLines = lines;
        return this;
    }

    expectErrors(errors: string[]): ExactMDXTestBuilder {
        this.testCase.expected = this.testCase.expected || {};
        this.testCase.expected.errors = errors;
        return this;
    }

    skipExecution(): ExactMDXTestBuilder {
        this.testCase.options = this.testCase.options || {};
        this.testCase.options.skipExecution = true;
        return this;
    }

    skipCompilation(): ExactMDXTestBuilder {
        this.testCase.options = this.testCase.options || {};
        this.testCase.options.skipCompilation = true;
        return this;
    }

    withTimeout(timeout: number): ExactMDXTestBuilder {
        this.testCase.options = this.testCase.options || {};
        this.testCase.options.timeout = timeout;
        return this;
    }

    normalizeWhitespace(): ExactMDXTestBuilder {
        this.testCase.options = this.testCase.options || {};
        this.testCase.options.normalizeWhitespace = true;
        return this;
    }

    withSourceFile(sourceFile: string): ExactMDXTestBuilder {
        this.testCase.sourceFile = sourceFile;
        return this;
    }

    build(): ExactMDXTestCase {
        return { ...this.testCase };
    }
}

/**
 * Factory function for creating exact test builders
 */
export function createExactMDXTest(name: string, input: string): ExactMDXTestBuilder {
    return new ExactMDXTestBuilder(name, input);
}

/**
 * Factory function for creating exact test builders with automatic source file detection
 */
export function createExactMDXTestFromFile(name: string, filePath: string): ExactMDXTestBuilder {
    const input = require('fs').readFileSync(filePath, 'utf8');
    return new ExactMDXTestBuilder(name, input).withSourceFile(filePath);
}

/**
 * Create an exact test suite builder
 */
export class ExactMDXTestSuiteBuilder {
    private suite: ExactMDXTestSuite;

    constructor(name: string) {
        this.suite = {
            name,
            testCases: []
        };
    }

    addTest(testCase: ExactMDXTestCase): ExactMDXTestSuiteBuilder {
        this.suite.testCases.push(testCase);
        return this;
    }

    addTests(...testCases: ExactMDXTestCase[]): ExactMDXTestSuiteBuilder {
        this.suite.testCases.push(...testCases);
        return this;
    }

    withSetup(setup: () => void | Promise<void>): ExactMDXTestSuiteBuilder {
        this.suite.setup = setup;
        return this;
    }

    withTeardown(teardown: () => void | Promise<void>): ExactMDXTestSuiteBuilder {
        this.suite.teardown = teardown;
        return this;
    }

    build(): ExactMDXTestSuite {
        return { ...this.suite };
    }
}

/**
 * Factory function for creating exact test suite builders
 */
export function createExactMDXTestSuite(name: string): ExactMDXTestSuiteBuilder {
    return new ExactMDXTestSuiteBuilder(name);
}
