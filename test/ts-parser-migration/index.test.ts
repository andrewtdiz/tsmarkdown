import { test, expect, describe } from 'bun:test';
import { createExactMDXTest, ExactMDXTestRunner } from '../../src/exact-testing-utilities';
import { parseWithTypeScript, validateComponentStructure, extractTypeInfo, analyzeReturnStatements } from '../../src/parser/parser-utils';

// Cache file contents to avoid repeated disk reads
const testFiles = [
    'multiple-returns.mdx',
    'basic-multiple-returns.mdx',
    'conditional-returns.mdx',
    'error-handling.mdx',
    'edge-cases.mdx',
    'simple-component.mdx',
    'typed-component.mdx',
    'typed-props.mdx',
    'simple-single-return.mdx',
    'simple-multiple-returns.mdx'
];

const fileCache = new Map<string, string>();

async function getCachedFile(fileName: string): Promise<string> {
    // Temporarily disable caching to debug the issue
    return await Bun.file(import.meta.dir + '/' + fileName).text();
}

describe('TypeScript Parser integration', () => {
    const runner = new ExactMDXTestRunner();

    describe('Should do simple type checking', () => {
        test('should validate component structure for TypeScript parser', async () => {
            const mdx = await getCachedFile('simple-component.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TestComponent');
            expect(validation.split?.tsPrelude).toContain('const isTrue = true');
            expect(validation.split?.markdownBody).toContain('Admin panel access');
        });

        test('should parse component for TypeScript AST', async () => {
            const mdx = await getCachedFile('simple-component.mdx');

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'simple-component.mdx'
            });

            expect(parseResult.success).toBe(true);
            expect(parseResult.ast).toBeDefined();
            expect(parseResult.ast?.kind).toBe(308); // TypeScript SyntaxKind.SourceFile = 308
            expect(parseResult.ast?.statements?.length).toBe(1);
            expect(parseResult.ast?.statements?.[0]?.kind).toBe(263); // TypeScript SyntaxKind.FunctionDeclaration = 263
            expect((parseResult.ast?.statements?.[0] as any)?.name?.text).toBe('TestComponent');
        });

        test('should extract type information', async () => {
            const mdx = await getCachedFile('simple-component.mdx');

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.types).toEqual([]);
            expect(typeInfo.interfaces).toEqual([]);
        });

        test('should run existing MDX test with TypeScript parser validation', async () => {
            const mdx = await getCachedFile('simple-component.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const testCase = createExactMDXTest(
                'Simple component with ESLint validation',
                mdx
            )
                .expectExactLines(
                    'Admin panel access',
                    'Account is inactive'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Should handle TypeScript types and interfaces', () => {
        test('should extract TypeScript types and interfaces', async () => {
            const mdx = await getCachedFile('typed-component.mdx');

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.interfaces).toContain('User');
            expect(typeInfo.types).toContain('UserRole');
        });

        test('should validate typed component structure', async () => {
            const mdx = await getCachedFile('typed-component.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TypedComponent');
            expect(validation.split?.tsPrelude).toContain('interface User');
            expect(validation.split?.tsPrelude).toContain('type UserRole');
            expect(validation.split?.tsPrelude).toContain('const user: User');
        });

        test('should parse typed component for TypeScript parser', async () => {
            const mdx = await getCachedFile('typed-component.mdx');

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'typed-component.mdx'
            });

            expect(parseResult.success).toBe(true);
            expect(parseResult.ast).toBeDefined();
        });

        test('should demonstrate TypeScript parser integration', async () => {
            const mdx = await getCachedFile('typed-component.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            expect(validation.split?.tsPrelude).toContain('interface User');
            expect(validation.split?.tsPrelude).toContain('type UserRole');
            expect(validation.split?.tsPrelude).toContain('const user: User');

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'typed-component.mdx'
            });
            expect(parseResult.success).toBe(true);

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.interfaces).toContain('User');
            expect(typeInfo.types).toContain('UserRole');

        });
    });

    describe('Should handle multiple returns', () => {

        test('should validate component structure for TypeScript parser', async () => {
            const mdx = await getCachedFile('multiple-returns.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
        });

        test('analyzes return statements in basic conditional component with 2 returns', async () => {
            const mdx = await getCachedFile('multiple-returns.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 2;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('analyzes return statements in complex component with loading, error, and success states', async () => {
            const mdx = await getCachedFile('basic-multiple-returns.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 3;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('analyzes return statements in role-based conditional rendering component', async () => {
            const mdx = await getCachedFile('conditional-returns.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 4;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('analyzes return statements in error handling component with early returns', async () => {
            const mdx = await getCachedFile('error-handling.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 4;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('analyzes return statements in edge cases component with boundary conditions', async () => {
            const mdx = await getCachedFile('edge-cases.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 6;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        // Temporarily commenting out the consolidated test to debug individual tests
        /*
        test('comprehensive validation of all multiple return statement components', async () => {
            const testCases = [
                {
                    file: 'multiple-returns.mdx',
                    expectedReturns: 2,
                    expectedConditions: ['!name'],
                    description: 'Basic conditional with 2 returns'
                },
                {
                    file: 'basic-multiple-returns.mdx',
                    expectedReturns: 3,
                    expectedConditions: ['isLoading', '!user.isActive'],
                    description: 'Loading, error, and success states'
                },
                {
                    file: 'conditional-returns.mdx',
                    expectedReturns: 4,
                    expectedConditions: ['!isLoggedIn', 'userRole === "admin"', 'userRole === "moderator"'],
                    description: 'Role-based conditional rendering'
                },
                {
                    file: 'error-handling.mdx',
                    expectedReturns: 4,
                    expectedConditions: ['error', '!user', 'user.isBlocked'],
                    description: 'Error handling with early returns'
                },
                {
                    file: 'edge-cases.mdx',
                    expectedReturns: 6,
                    expectedConditions: ['value === null', 'items.length === 0', 'config.debug'],
                    description: 'Edge cases and boundary conditions'
                }
            ];

            for (const testCase of testCases) {
                const mdx = await getCachedFile(testCase.file);

                // Validate component structure
                const validation = validateComponentStructure(mdx);
                expect(validation.isValid).toBe(true);

                // Analyze return statements using TypeScript AST
                const returnAnalysis = analyzeReturnStatements(mdx);
                expect(returnAnalysis.success).toBe(true);
                expect(returnAnalysis.returnCount).toBe(testCase.expectedReturns);

                // Validate conditional patterns exist
                for (const condition of testCase.expectedConditions) {
                    expect(mdx).toContain(condition);
                }

                // Test TypeScript parser integration
                const parseResult = parseWithTypeScript(mdx, {
                    includeMarkdownStub: true,
                    fileName: testCase.file
                });

                if (!parseResult.success) {
                    // Some files may fail to parse due to complex MDX syntax
                    // This is expected behavior for the current implementation
                    expect(parseResult.diagnostics.length).toBeGreaterThan(0);
                } else {
                    expect(parseResult.ast).toBeDefined();
                    expect(parseResult.ast?.kind).toBe(308); // TypeScript SyntaxKind.SourceFile = 308
                }
            }
        });
        */

        test('renders simple single return component with user context', async () => {
            const mdx = await getCachedFile('simple-single-return.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 1;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);

            // Test actual rendering
            const testCase = createExactMDXTest(
                'Simple single return component',
                mdx
            )
                .withContext({ name: 'John' })
                .expectExactLines(
                    '# User Dashboard',
                    'Welcome back, John!',
                    '',
                    '## Your Account',
                    'Status: "Active"',
                    'Last login: Today'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('demonstrates multiple return statements component behavior with empty name', async () => {
            const mdx = await getCachedFile('simple-multiple-returns.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const testCase = createExactMDXTest(
                'Multiple return statements component (should fail)',
                mdx
            )
                .withContext({ name: '' })
                .expectExactLines(
                    'Invalid name.'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Should handle typed props and interfaces', () => {
        test('renders typed props component with valid user data', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const testCase = createExactMDXTest(
                'Typed props with valid user',
                mdx
            )
                .withContext({ user: { name: 'John Doe', age: 30, isActive: true } })
                .expectExactLines(
                    '# User Profile',
                    'Name: John Doe',
                    'Age: 30',
                    'Admin panel access',
                    'Account is active'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('renders typed props component with undefined user data', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const testCase = createExactMDXTest(
                'Typed props with undefined user',
                mdx
            )
                .withContext({ user: undefined })
                .expectExactLines(
                    'No User'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('renders typed props component with null user data', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const testCase = createExactMDXTest(
                'Typed props with null user',
                mdx
            )
                .withContext({ user: null })
                .expectExactLines(
                    'No User'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('validates typed props component structure and TypeScript interfaces', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TypedProps');
            expect(validation.split?.tsPrelude).toContain('interface User');
            expect(validation.split?.tsPrelude).toContain('type UserRole');
        });

        test('extracts TypeScript type information from typed props component', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.interfaces).toContain('User');
            expect(typeInfo.types).toContain('UserRole');
        });

        test('parses typed props component using TypeScript parser with JSX support', async () => {
            const mdx = await getCachedFile('typed-props.mdx');

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'typed-props.mdx'
            });

            expect(parseResult.success).toBe(true);
            expect(parseResult.ast).toBeDefined();
        });
    });
});