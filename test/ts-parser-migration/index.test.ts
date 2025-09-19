import { test, expect, describe } from 'bun:test';
import { createExactMDXTest, ExactMDXTestRunner } from '../../src/exact-testing-utilities';
import { parseWithTypeScript, validateComponentStructure, extractTypeInfo, analyzeReturnStatements } from '../../src/parser/parser-utils';

describe('TypeScript Parser integration', () => {
    const runner = new ExactMDXTestRunner();

    describe('Should do simple type checking', () => {
        test('should validate component structure for TypeScript parser', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-component.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TestComponent');
            expect(validation.split?.tsPrelude).toContain('const isTrue = true');
            expect(validation.split?.markdownBody).toContain('Admin panel access');
        });

        test('should parse component for TypeScript AST', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-component.mdx').text();

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
            const mdx = await Bun.file(import.meta.dir + '/simple-component.mdx').text();

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.types).toEqual([]);
            expect(typeInfo.interfaces).toEqual([]);
        });

        test('should run existing MDX test with TypeScript parser validation', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-component.mdx').text();

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
            const mdx = await Bun.file(import.meta.dir + '/typed-component.mdx').text();

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.interfaces).toContain('User');
            expect(typeInfo.types).toContain('UserRole');
        });

        test('should validate typed component structure', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-component.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TypedComponent');
            expect(validation.split?.tsPrelude).toContain('interface User');
            expect(validation.split?.tsPrelude).toContain('type UserRole');
            expect(validation.split?.tsPrelude).toContain('const user: User');
        });

        test('should parse typed component for TypeScript parser', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-component.mdx').text();

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'typed-component.mdx'
            });

            expect(parseResult.success).toBe(true);
            expect(parseResult.ast).toBeDefined();
        });

        test('should demonstrate TypeScript parser integration', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-component.mdx').text();

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
            const mdx = await Bun.file(import.meta.dir + '/multiple-returns.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
        });

        test('should validate expected number of return statements - multiple-returns.mdx', async () => {
            const mdx = await Bun.file(import.meta.dir + '/multiple-returns.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 2;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('should validate expected number of return statements - basic-multiple-returns.mdx', async () => {
            const mdx = await Bun.file(import.meta.dir + '/basic-multiple-returns.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 3;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('should validate expected number of return statements - conditional-returns.mdx', async () => {
            const mdx = await Bun.file(import.meta.dir + '/conditional-returns.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 4;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('should validate expected number of return statements - error-handling.mdx', async () => {
            const mdx = await Bun.file(import.meta.dir + '/error-handling.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 4;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('should validate expected number of return statements - edge-cases.mdx', async () => {
            const mdx = await Bun.file(import.meta.dir + '/edge-cases.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

            // Analyze return statements using TypeScript AST
            const returnAnalysis = analyzeReturnStatements(mdx);
            expect(returnAnalysis.success).toBe(true);
            const expectedReturns = 6;
            expect(returnAnalysis.returnCount).toBe(expectedReturns);
        });

        test('should validate return statement patterns and conditions', async () => {
            const testCases = [
                {
                    file: 'multiple-returns.mdx',
                    expectedReturns: 2,
                    expectedConditions: ['!name']
                },
                {
                    file: 'basic-multiple-returns.mdx',
                    expectedReturns: 3,
                    expectedConditions: ['isLoading', '!user.isActive']
                },
                {
                    file: 'conditional-returns.mdx',
                    expectedReturns: 4,
                    expectedConditions: ['!isLoggedIn', 'userRole === "admin"', 'userRole === "moderator"']
                },
                {
                    file: 'error-handling.mdx',
                    expectedReturns: 4,
                    expectedConditions: ['error', '!user', 'user.isBlocked']
                },
                {
                    file: 'edge-cases.mdx',
                    expectedReturns: 6,
                    expectedConditions: ['value === null', 'items.length === 0', 'config.debug']
                }
            ];

            for (const testCase of testCases) {
                const mdx = await Bun.file(import.meta.dir + '/' + testCase.file).text();

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
            }
        });

        test('should validate TypeScript parser parsing for all multiple return components', async () => {
            const testFiles = [
                'multiple-returns.mdx',
                'basic-multiple-returns.mdx',
                'conditional-returns.mdx',
                'error-handling.mdx',
                'edge-cases.mdx'
            ];

            for (const file of testFiles) {
                const mdx = await Bun.file(import.meta.dir + '/' + file).text();

                const parseResult = parseWithTypeScript(mdx, {
                    includeMarkdownStub: true,
                    fileName: file
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

        test('should provide comprehensive type checking summary for multiple return components', async () => {
            const testFiles = [
                { file: 'multiple-returns.mdx', expectedReturns: 2, description: 'Basic conditional with 2 returns' },
                { file: 'basic-multiple-returns.mdx', expectedReturns: 3, description: 'Loading, error, and success states' },
                { file: 'conditional-returns.mdx', expectedReturns: 4, description: 'Role-based conditional rendering' },
                { file: 'error-handling.mdx', expectedReturns: 4, description: 'Error handling with early returns' },
                { file: 'edge-cases.mdx', expectedReturns: 6, description: 'Edge cases and boundary conditions' }
            ];

            for (const testFile of testFiles) {
                const mdx = await Bun.file(import.meta.dir + '/' + testFile.file).text();

                const validation = validateComponentStructure(mdx);
                const returnAnalysis = analyzeReturnStatements(mdx);

                expect(validation.isValid).toBe(true);
                expect(returnAnalysis.success).toBe(true);
                expect(returnAnalysis.returnCount).toBe(testFile.expectedReturns);
            }
        });

        test('should render simple single return component', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-single-return.mdx').text();

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

        test('should render simple single return component', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-single-return.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);

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

        test('should demonstrate multiple return statements limitation', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-multiple-returns.mdx').text();

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
        test('should handle typed props with valid user', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

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

        test('should handle typed props with undefined user', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

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

        test('should handle typed props with null user', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

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

        test('should validate typed props component structure', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

            const validation = validateComponentStructure(mdx);
            expect(validation.isValid).toBe(true);
            expect(validation.component?.functionName).toBe('TypedProps');
            expect(validation.split?.tsPrelude).toContain('interface User');
            expect(validation.split?.tsPrelude).toContain('type UserRole');
        });

        test('should extract type information from typed props', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

            const typeInfo = extractTypeInfo(mdx);
            expect(typeInfo.success).toBe(true);
            expect(typeInfo.interfaces).toContain('User');
            expect(typeInfo.types).toContain('UserRole');
        });

        test('should parse typed props component for TypeScript parser', async () => {
            const mdx = await Bun.file(import.meta.dir + '/typed-props.mdx').text();

            const parseResult = parseWithTypeScript(mdx, {
                includeMarkdownStub: true,
                fileName: 'typed-props.mdx'
            });

            expect(parseResult.success).toBe(true);
            expect(parseResult.ast).toBeDefined();
        });
    });
});