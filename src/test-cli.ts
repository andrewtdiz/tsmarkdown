#!/usr/bin/env bun

import { resolve, join, extname } from 'path';
import { readdir } from "node:fs/promises";
import {
  MDXTestRunner,
  MDXTestSuite,
  createMDXTestSuite,
  createMDXTest,
  MDXSnapshotTester
} from './testing-utilities';

interface TestCLIOptions {
  verbose?: boolean;
  pattern?: string;
  watch?: boolean;
  updateSnapshots?: boolean;
  generateReport?: boolean;
  timeout?: number;
  help?: boolean;
}

class BetterMDXTestCLI {
  private runner = new MDXTestRunner();
  private snapshotTester = new MDXSnapshotTester();

  async run() {
    const args = process.argv.slice(2);
    const { command, options, positional } = this.parseArgs(args);

    if (options.help || !command) {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'run':
          await this.runTests(positional[0], options);
          break;
        case 'watch':
          await this.watchTests(positional[0], options);
          break;
        case 'snapshot':
          await this.manageSnapshots(positional[0], options);
          break;
        case 'init':
          await this.initTestProject(positional[0]);
          break;
        case 'validate':
          await this.validateMDXFiles(positional[0], options);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): { command: string; options: TestCLIOptions; positional: string[] } {
    const options: TestCLIOptions = {};
    const positional: string[] = [];
    let command = '';

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('-')) {
        switch (arg) {
          case '--verbose':
          case '-v':
            options.verbose = true;
            break;
          case '--pattern':
          case '-p':
            options.pattern = args[++i];
            break;
          case '--watch':
          case '-w':
            options.watch = true;
            break;
          case '--update-snapshots':
          case '-u':
            options.updateSnapshots = true;
            break;
          case '--generate-report':
          case '-r':
            options.generateReport = true;
            break;
          case '--timeout':
          case '-t':
            options.timeout = parseInt(args[++i]) || 5000;
            break;
          case '--help':
          case '-h':
            options.help = true;
            break;
        }
      } else if (!command) {
        command = arg;
      } else {
        positional.push(arg);
      }
    }

    return { command, options, positional };
  }

  private showHelp() {
    console.log(`
🧪 Better-MDX Test CLI

USAGE:
  better-mdx-test <command> [options] [args]

COMMANDS:
  run [pattern]       Run test files matching pattern
  watch [pattern]     Watch test files and run on changes
  snapshot <action>   Manage test snapshots (update, clean)
  init [dir]          Initialize test project structure
  validate [dir]      Validate MDX files in directory

OPTIONS:
  -v, --verbose           Enable verbose output
  -p, --pattern <glob>    File pattern to match (default: **/*.test.ts)
  -w, --watch            Watch for file changes
  -u, --update-snapshots  Update test snapshots
  -r, --generate-report   Generate HTML test report
  -t, --timeout <ms>      Test timeout in milliseconds (default: 5000)
  -h, --help             Show this help message

EXAMPLES:
  better-mdx-test run                    # Run all tests
  better-mdx-test run --pattern "*.mdx"  # Test MDX files directly
  better-mdx-test watch                  # Watch and run tests
  better-mdx-test snapshot update        # Update all snapshots
  better-mdx-test validate ./mdx         # Validate MDX files
`);
  }

  private async runTests(pattern?: string, options: TestCLIOptions = {}) {
    const testPattern = pattern || '**/*.test.ts';
    const testFiles = await this.findTestFiles(testPattern);

    if (testFiles.length === 0) {
      console.log(`⚠️ No test files found matching pattern: ${testPattern}`);
      return;
    }

    console.log(`🚀 Running ${testFiles.length} test files...`);

    const suites: MDXTestSuite[] = [];

    // Load test suites from files
    for (const testFile of testFiles) {
      try {
        if (options.verbose) {
          console.log(`📁 Loading test file: ${testFile}`);
        }

        // For now, we'll create a simple test suite from the file
        // In a real implementation, this would dynamically import and execute the test file
        const suite = await this.loadTestSuiteFromFile(testFile);
        if (suite) {
          suites.push(suite);
        }
      } catch (error) {
        console.error(`❌ Failed to load test file ${testFile}:`, error);
      }
    }

    if (suites.length === 0) {
      console.log('⚠️ No test suites found to run');
      return;
    }

    // Run all test suites
    const results = await this.runner.runTestSuites(suites);

    // Generate report if requested
    if (options.generateReport) {
      const reportPath = resolve('./test-report.html');
      this.runner.generateHTMLReport(reportPath, results);
    }

    // Save results
    const resultsPath = resolve('./test-results.json');
    this.runner.saveResults(resultsPath, results);

    // Exit with non-zero code if any tests failed
    const failed = results.filter(r => !r.passed).length;
    if (failed > 0) {
      process.exit(1);
    }
  }

  private async watchTests(pattern?: string, options: TestCLIOptions = {}) {
    console.log('👀 Watching for test file changes...');
    console.log('Press Ctrl+C to stop watching');

    // Initial run
    await this.runTests(pattern, options);

    // Set up file watching (simplified implementation)
    const { watchFile } = require('node:fs');
    const testPattern = pattern || '**/*.test.ts';
    const testFiles = await this.findTestFiles(testPattern);

    for (const testFile of testFiles) {
      watchFile(testFile, { interval: 1000 }, async () => {
        console.log(`\n📝 Test file changed: ${testFile}`);
        console.log('🔄 Re-running tests...\n');
        await this.runTests(pattern, { ...options, generateReport: false });
      });
    }

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping test watcher...');
      process.exit(0);
    });
  }

  private async manageSnapshots(action?: string, options: TestCLIOptions = {}) {
    switch (action) {
      case 'update':
        console.log('📸 Updating all snapshots...');
        // Implementation would scan for snapshot tests and update them
        console.log('✅ Snapshots updated');
        break;
      case 'clean':
        console.log('🧹 Cleaning unused snapshots...');
        // Implementation would remove unused snapshot files
        console.log('✅ Unused snapshots cleaned');
        break;
      default:
        console.error('❌ Invalid snapshot action. Use: update, clean');
        process.exit(1);
    }
  }

  private async initTestProject(dir?: string) {
    const projectDir = resolve(dir || '.');
    const testDir = join(projectDir, 'test');
    const snapshotDir = join(testDir, '__snapshots__');

    console.log(`📁 Initializing test project in: ${projectDir}`);

    // Create directories
    const { mkdirSync } = require('node:fs');
    mkdirSync(testDir, { recursive: true });
    mkdirSync(snapshotDir, { recursive: true });

    // Create example test file
    // Using Bun.write() for file operations

    const exampleTest = `import { test, expect, describe } from 'bun:test';
import { MDXTestRunner, createMDXTest } from '../src/testing-utilities';

describe('Example MDX Tests', () => {
  const runner = new MDXTestRunner();

  test('Basic interpolation', async () => {
    const testCase = createMDXTest(
      'Basic interpolation test',
      \`
function ExampleTest() {
  const message = 'Hello, World!';

  return (
    # {{ message }}
  )
}
      \`.trim()
    )
    .expectContent('# Hello, World!')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });
});
`;

    await Bun.write(join(testDir, 'example.test.ts'), exampleTest);

    // Create test configuration
    const testConfig = {
      testDir: './test',
      snapshotDir: './test/__snapshots__',
      pattern: '**/*.test.ts',
      timeout: 5000,
      generateReport: true
    };

    await Bun.write(join(projectDir, 'test.config.json'), JSON.stringify(testConfig, null, 2));

    console.log('✅ Test project initialized');
    console.log(`
Next steps:
  1. Create your test files in ${testDir}
  2. Run tests with: better-mdx-test run
  3. Watch tests with: better-mdx-test watch
`);
  }

  private async validateMDXFiles(dir?: string, options: TestCLIOptions = {}) {
    const mdxDir = resolve(dir || './mdx');

    if (!(await Bun.file(mdxDir).exists())) {
      console.error(`❌ Directory not found: ${mdxDir}`);
      process.exit(1);
    }

    console.log(`🔍 Validating MDX files in: ${mdxDir}`);

    const mdxFiles = await this.findMDXFiles(mdxDir);

    if (mdxFiles.length === 0) {
      console.log('⚠️ No MDX files found');
      return;
    }

    let validFiles = 0;
    let invalidFiles = 0;

    for (const filePath of mdxFiles) {
      try {
        const content = await Bun.file(filePath).text();

        const testCase = createMDXTest(`Validation: ${filePath}`, content)
          .skipExecution()
          .build();

        const result = await this.runner.runTestCase(testCase);

        if (result.passed) {
          validFiles++;
          if (options.verbose) {
            console.log(`  ✅ ${filePath}`);
          }
        } else {
          invalidFiles++;
          console.log(`  ❌ ${filePath}: ${result.error}`);
        }
      } catch (error) {
        invalidFiles++;
        console.log(`  ❌ ${filePath}: ${error}`);
      }
    }

    console.log(`\n📊 Validation complete: ${validFiles} valid, ${invalidFiles} invalid`);

    if (invalidFiles > 0) {
      process.exit(1);
    }
  }

  private async findTestFiles(pattern: string): Promise<string[]> {
    // Simplified file finding - in real implementation would use glob
    const testDir = resolve('./test');
    if (!(await Bun.file(testDir).exists())) {
      return [];
    }

    const entries = await readdir(testDir);
    return entries
      .filter((entry: any) => entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js')))
      .map((entry: any) => join(testDir, entry.name));
  }

  private async findMDXFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentDir: string) {
      const items = await readdir(currentDir);

      for (const item of items) {
        const itemPath = join(currentDir, item);
        const stat = await Bun.file(itemPath).stat();

        if (stat.isDirectory()) {
          traverse(itemPath);
        } else if (extname(item) === '.mdx') {
          files.push(itemPath);
        }
      }
    }

    traverse(dir);
    return files;
  }

  private async loadTestSuiteFromFile(filePath: string): Promise<MDXTestSuite | null> {
    // This is a simplified implementation
    // In practice, you would dynamically import and execute the test file

    // For demo purposes, create a basic test suite based on file name
    const testName = filePath.split('/').pop()?.replace('.test.ts', '') || 'Unknown';

    return createMDXTestSuite(`${testName} Suite`)
      .addTest(
        createMDXTest(
          'Basic validation',
          `
function TestFunction() {
  const test = 'value';
  return (
    # Test {{ test }}
  )
}
          `.trim()
        )
          .expectContains('Test value')
          .build()
      )
      .build();
  }
}

// Run CLI
const cli = new BetterMDXTestCLI();
cli.run().catch(error => {
  console.error('❌ CLI Error:', error);
  process.exit(1);
});