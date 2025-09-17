import { resolve, join } from 'path';
import { parseMDX } from './parser';
import { compile } from './compiler';
import { render } from './renderer';
import { ClientRenderer } from './client-renderer';

export interface MDXTestCase {
  name: string;
  input: string;
  context?: Record<string, any>;
  expected?: {
    content?: string;
    errors?: string[];
    metadata?: any;
    containsText?: string[];
    excludesText?: string[];
  };
  options?: {
    timeout?: number;
    skipExecution?: boolean;
    skipCompilation?: boolean;
  };
}

export interface MDXTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: {
    parsed?: any;
    compiled?: any;
    executed?: any;
    rendered?: any;
  };
}

export interface MDXTestSuite {
  name: string;
  testCases: MDXTestCase[];
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
}

export class MDXTestRunner {
  private renderer = new ClientRenderer();
  private results: MDXTestResult[] = [];

  /**
   * Run a single test case
   */
  async runTestCase(testCase: MDXTestCase): Promise<MDXTestResult> {
    const startTime = Date.now();
    const result: MDXTestResult = {
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
          // Execute phase
          const executed = await render(compiled, testCase.context || {});
          result.details!.executed = executed;

          // Render phase
          const rendered = this.renderer.render(compiled, testCase.context || {});
          result.details!.rendered = rendered;

          // Validate results if expected values are provided
          if (testCase.expected) {
            const validationResult = this.validateResults(testCase.expected, executed, rendered, compiled);
            result.passed = validationResult.passed;
            result.error = validationResult.error;
          } else {
            // If no expectations, just check for no errors
            result.passed = executed.errors.length === 0;
            if (!result.passed) {
              result.error = `Execution errors: ${executed.errors.join(', ')}`;
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
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite: MDXTestSuite): Promise<MDXTestResult[]> {
    console.log(`\n🧪 Running test suite: ${suite.name}`);

    // Setup
    if (suite.setup) {
      await suite.setup();
    }

    const suiteResults: MDXTestResult[] = [];

    try {
      // Run test cases
      for (const testCase of suite.testCases) {
        console.log(`  🔄 Running: ${testCase.name}`);

        const result = await this.runTestCase(testCase);
        suiteResults.push(result);

        if (result.passed) {
          console.log(`  ✅ ${testCase.name} (${result.duration}ms)`);
        } else {
          console.log(`  ❌ ${testCase.name} (${result.duration}ms): ${result.error}`);
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
  async runTestSuites(suites: MDXTestSuite[]): Promise<MDXTestResult[]> {
    console.log(`🚀 Running ${suites.length} test suites...\n`);

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

  /**
   * Load test cases from JSON file
   */
  async loadTestCasesFromFile(filePath: string): Promise<MDXTestCase[]> {
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      throw new Error(`Test file not found: ${filePath}`);
    }

    const content = await file.text();
    return JSON.parse(content);
  }

  /**
   * Save test results to file
   */
  async saveResults(filePath: string, results: MDXTestResult[] = this.results): Promise<void> {
    const outputDir = resolve(filePath, '..');
    const outputDirFile = Bun.file(outputDir);

    if (!(await outputDirFile.exists())) {
      await Bun.write(outputDir, '');
      // Note: Bun doesn't have a direct mkdir equivalent, so we use the node:fs module for directory creation
      const { mkdirSync } = await import('node:fs');
      mkdirSync(outputDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
      },
      results
    };

    await Bun.write(filePath, JSON.stringify(report, null, 2));
    console.log(`📝 Test results saved to: ${filePath}`);
  }

  /**
   * Generate HTML test report
   */
  async generateHTMLReport(outputPath: string, results: MDXTestResult[] = this.results): Promise<void> {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better-MDX Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-results {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-item {
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .test-name {
            font-weight: 500;
        }
        .test-status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .duration {
            font-size: 12px;
            color: #6c757d;
        }
        .error-details {
            color: #dc3545;
            font-size: 14px;
            margin-top: 8px;
            font-family: monospace;
            background: #f8d7da;
            padding: 8px;
            border-radius: 4px;
        }
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        .details {
            display: none;
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            max-height: 300px;
            overflow: auto;
        }
        .details.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Better-MDX Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <div class="stat-value">${results.length}</div>
            <div>Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value passed">${passed}</div>
            <div>Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value failed">${failed}</div>
            <div>Failed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalTime}ms</div>
            <div>Total Time</div>
        </div>
    </div>

    <div class="test-results">
        ${results.map((result, index) => `
        <div class="test-item">
            <div>
                <div class="test-name collapsible" onclick="toggleDetails(${index})">${result.name}</div>
                ${result.error ? `<div class="error-details">${result.error}</div>` : ''}
                <div class="details" id="details-${index}">
                    <strong>Details:</strong><br>
                    <pre>${JSON.stringify(result.details, null, 2)}</pre>
                </div>
            </div>
            <div class="test-status">
                <span class="duration">${result.duration}ms</span>
                <span class="status-badge status-${result.passed ? 'passed' : 'failed'}">
                    ${result.passed ? 'PASSED' : 'FAILED'}
                </span>
            </div>
        </div>
        `).join('')}
    </div>

    <script>
        function toggleDetails(index) {
            const details = document.getElementById('details-' + index);
            details.classList.toggle('show');
        }
    </script>
</body>
</html>
    `;

    const outputDir = resolve(outputPath, '..');
    const outputDirFile = Bun.file(outputDir);

    if (!(await outputDirFile.exists())) {
      // Note: Bun doesn't have a direct mkdir equivalent, so we use the node:fs module for directory creation
      const { mkdirSync } = await import('node:fs');
      mkdirSync(outputDir, { recursive: true });
    }

    await Bun.write(outputPath, html);
    console.log(`📊 HTML report generated: ${outputPath}`);
  }

  private validateResults(
    expected: NonNullable<MDXTestCase['expected']>,
    executed: any,
    rendered: any,
    compiled: any
  ): { passed: boolean; error?: string } {
    // Check content match
    if (expected.content && executed.content !== expected.content) {
      return {
        passed: false,
        error: `Content mismatch. Expected: "${expected.content}", Got: "${executed.content}"`
      };
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

    // Check contains text
    if (expected.containsText) {
      for (const text of expected.containsText) {
        if (!executed.content.includes(text)) {
          return {
            passed: false,
            error: `Expected content to contain: "${text}"`
          };
        }
      }
    }

    // Check excludes text
    if (expected.excludesText) {
      for (const text of expected.excludesText) {
        if (executed.content.includes(text)) {
          return {
            passed: false,
            error: `Expected content to NOT contain: "${text}"`
          };
        }
      }
    }

    return { passed: true };
  }
}

/**
 * Utility functions for creating test cases
 */
export class MDXTestBuilder {
  private testCase: MDXTestCase;

  constructor(name: string, input: string) {
    this.testCase = {
      name,
      input,
      expected: {}
    };
  }

  withContext(context: Record<string, any>): MDXTestBuilder {
    this.testCase.context = context;
    return this;
  }

  expectContent(content: string): MDXTestBuilder {
    this.testCase.expected = this.testCase.expected || {};
    this.testCase.expected.content = content;
    return this;
  }

  expectErrors(errors: string[]): MDXTestBuilder {
    this.testCase.expected = this.testCase.expected || {};
    this.testCase.expected.errors = errors;
    return this;
  }

  expectContains(...texts: string[]): MDXTestBuilder {
    this.testCase.expected = this.testCase.expected || {};
    this.testCase.expected.containsText = texts;
    return this;
  }

  expectExcludes(...texts: string[]): MDXTestBuilder {
    this.testCase.expected = this.testCase.expected || {};
    this.testCase.expected.excludesText = texts;
    return this;
  }

  skipExecution(): MDXTestBuilder {
    this.testCase.options = this.testCase.options || {};
    this.testCase.options.skipExecution = true;
    return this;
  }

  skipCompilation(): MDXTestBuilder {
    this.testCase.options = this.testCase.options || {};
    this.testCase.options.skipCompilation = true;
    return this;
  }

  withTimeout(timeout: number): MDXTestBuilder {
    this.testCase.options = this.testCase.options || {};
    this.testCase.options.timeout = timeout;
    return this;
  }

  build(): MDXTestCase {
    return { ...this.testCase };
  }
}

/**
 * Factory function for creating test builders
 */
export function createMDXTest(name: string, input: string): MDXTestBuilder {
  return new MDXTestBuilder(name, input);
}

/**
 * Create a test suite builder
 */
export class MDXTestSuiteBuilder {
  private suite: MDXTestSuite;

  constructor(name: string) {
    this.suite = {
      name,
      testCases: []
    };
  }

  addTest(testCase: MDXTestCase): MDXTestSuiteBuilder {
    this.suite.testCases.push(testCase);
    return this;
  }

  addTests(...testCases: MDXTestCase[]): MDXTestSuiteBuilder {
    this.suite.testCases.push(...testCases);
    return this;
  }

  withSetup(setup: () => void | Promise<void>): MDXTestSuiteBuilder {
    this.suite.setup = setup;
    return this;
  }

  withTeardown(teardown: () => void | Promise<void>): MDXTestSuiteBuilder {
    this.suite.teardown = teardown;
    return this;
  }

  build(): MDXTestSuite {
    return { ...this.suite };
  }
}

/**
 * Factory function for creating test suite builders
 */
export function createMDXTestSuite(name: string): MDXTestSuiteBuilder {
  return new MDXTestSuiteBuilder(name);
}

/**
 * Snapshot testing utility for MDX
 */
export class MDXSnapshotTester {
  private snapshotsDir: string;

  constructor(snapshotsDir: string = './test/__snapshots__') {
    this.snapshotsDir = snapshotsDir;
  }

  /**
   * Test MDX output against saved snapshot
   */
  async matchSnapshot(name: string, input: string, context: Record<string, any> = {}): Promise<boolean> {
    // Generate current output
    const parsed = parseMDX(input);
    const compiled = compile(parsed);
    const executed = await render(compiled, context);

    const current = {
      content: executed.content,
      errors: executed.errors,
      metadata: {
        ...compiled.metadata,
        lastModified: 'TIMESTAMP_PLACEHOLDER' // Normalize timestamp for comparison
      }
    };

    const snapshotPath = join(this.snapshotsDir, `${name}.snapshot.json`);

    // Create snapshots directory if it doesn't exist
    const snapshotsDirFile = Bun.file(this.snapshotsDir);
    if (!(await snapshotsDirFile.exists())) {
      // Note: Bun doesn't have a direct mkdir equivalent, so we use the node:fs module for directory creation
      const { mkdirSync } = await import('node:fs');
      mkdirSync(this.snapshotsDir, { recursive: true });
    }

    // If snapshot doesn't exist, create it
    const snapshotFile = Bun.file(snapshotPath);
    if (!(await snapshotFile.exists())) {
      await Bun.write(snapshotPath, JSON.stringify(current, null, 2));
      console.log(`📸 Created snapshot: ${name}`);
      return true;
    }

    // Compare with existing snapshot
    const snapshot = JSON.parse(await snapshotFile.text());
    const matches = JSON.stringify(current) === JSON.stringify(snapshot);

    if (!matches) {
      console.log(`❌ Snapshot mismatch: ${name}`);
      console.log('Expected:', snapshot);
      console.log('Received:', current);
    }

    return matches;
  }

  /**
   * Update all snapshots
   */
  async updateSnapshot(name: string, input: string, context: Record<string, any> = {}): Promise<void> {
    const parsed = parseMDX(input);
    const compiled = compile(parsed);
    const executed = await render(compiled, context);

    const current = {
      content: executed.content,
      errors: executed.errors,
      metadata: compiled.metadata
    };

    const snapshotPath = join(this.snapshotsDir, `${name}.snapshot.json`);

    const snapshotsDirFile = Bun.file(this.snapshotsDir);
    if (!(await snapshotsDirFile.exists())) {
      // Note: Bun doesn't have a direct mkdir equivalent, so we use the node:fs module for directory creation
      const { mkdirSync } = await import('node:fs');
      mkdirSync(this.snapshotsDir, { recursive: true });
    }

    await Bun.write(snapshotPath, JSON.stringify(current, null, 2));
    console.log(`📸 Updated snapshot: ${name}`);
  }
}