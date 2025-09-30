import { execFileSync } from "child_process";


export interface TSMDTestResult {
  passed: boolean;
  output?: string;
  error?: string;
}

export interface TSMDTestCase {
  name: string;
  source: string;
  props?: Record<string, any>;
  context?: string;
  expectedOutput?: string;
  expectedLines?: string[];
  expectedErrors?: string[];
}

export class ExactTSMDTestRunner {
  async runTestCase(testCase: TSMDTestCase): Promise<TSMDTestResult> {
    try {
      // Use the new compiler architecture
      const { compileFullFile } = await import('./compiler');
      const fullFileResult = await compileFullFile(testCase.source);

      if (fullFileResult.errors.length > 0) {
        return {
          passed: false,
          error: fullFileResult.errors.join('\n')
        };
      }

      const props = testCase.props || {};
      const context = testCase?.context || "";

      const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${context}
    
${fullFileResult.transpiledFile}

(async () => {
  try {
    const props = ${JSON.stringify(props)};
    
    const out = await Test(props);
    Bun.write("compiled-test.md", out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
`;
      Bun.write("compiled-test.ts", fileToRun);

      execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });
      const output = await Bun.file("compiled-test.md").text();

      // Check expectations
      if (testCase.expectedOutput) {
        if (output.trim() !== testCase.expectedOutput.trim()) {
          return {
            passed: false,
            output,
            error: `Expected: "${testCase.expectedOutput}"\nGot: "${output}"`
          };
        }
      }

      if (testCase.expectedLines) {
        const lines = output.split('\n');
        for (let i = 0; i < testCase.expectedLines.length; i++) {
          if (lines[i] !== testCase.expectedLines[i]) {
            return {
              passed: false,
              output,
              error: `Line ${i + 1}: Expected "${testCase.expectedLines[i]}"\nGot: "${lines[i]}"`
            };
          }
        }
      }

      return {
        passed: true,
        output
      };

    } catch (error: any) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async runTestSuite(testSuite: TSMDTestSuite): Promise<TSMDTestResult[]> {
    const results: TSMDTestResult[] = [];
    for (const testCase of testSuite.testCases) {
      const result = await this.runTestCase(testCase);
      results.push(result);
    }
    return results;
  }
}

export interface TSMDTestSuite {
  name: string;
  testCases: TSMDTestCase[];
}

export class TSMDTestSuiteBuilder {
  private testCases: TSMDTestCase[] = [];

  constructor(private name: string) { }

  addTest(testCase: TSMDTestCase): this {
    this.testCases.push(testCase);
    return this;
  }

  build(): TSMDTestSuite {
    return {
      name: this.name,
      testCases: this.testCases
    };
  }
}

export function createTSmdTestSuite(name: string): TSMDTestSuiteBuilder {
  return new TSMDTestSuiteBuilder(name);
}

export function createTSmdTest(name: string, source: string): TSMDTestCaseBuilder {
  return new TSMDTestCaseBuilder(name, source);
}

export class TSMDTestCaseBuilder {
  private testCase: TSMDTestCase;

  constructor(name: string, source: string) {
    this.testCase = {
      name,
      source,
      props: {},
      context: ""
    };
  }

  withProps(props: Record<string, any>): this {
    this.testCase.props = { ...this.testCase.props, ...props };
    return this;
  }

  withContext(context: string): this {
    this.testCase.context = context;
    return this;
  }

  expectExactContent(expectedOutput: string): this {
    this.testCase.expectedOutput = expectedOutput;
    return this;
  }

  expectExactLines(...lines: string[]): this {
    this.testCase.expectedLines = lines;
    return this;
  }

  expectErrors(errors: string[]): this {
    this.testCase.expectedErrors = errors;
    return this;
  }

  build(): TSMDTestCase {
    return this.testCase;
  }
}
