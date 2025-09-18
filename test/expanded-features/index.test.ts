import { test, expect, describe } from 'bun:test';
import { createExactMDXTest } from '../../src/exact-testing-utilities';

describe('Expanded Features', () => {
    describe('Template Interpolation', () => {
        test('should parse simple interpolations', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-interpolation.mdx').text();

            const testCase = createExactMDXTest(
                'Simple interpolation parsing',
                mdx
            )
                .expectExactLines(
                    'Hello World!'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseMDX } = await import('../../src/parser');
            const result = parseMDX(mdx);
            expect(result.interpolations).toHaveLength(1);
            expect(result.interpolations[0].expression).toBe('name');
            expect(result.markdown).toContain('__INTERPOLATION_0__');
        });

        test('should parse complex interpolations', async () => {
            const mdx = await Bun.file(import.meta.dir + '/complex-interpolation.mdx').text();

            const testCase = createExactMDXTest(
                'Complex interpolation parsing',
                mdx
            )
                .expectExactLines(
                    'Items: apple, banana, cherry',
                    'User: JOHN DOE'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseMDX } = await import('../../src/parser');
            const result = parseMDX(mdx);
            expect(result.interpolations).toHaveLength(2);
            expect(result.interpolations[0].expression).toBe('items.join(\', \')');
            expect(result.interpolations[1].expression).toBe('user.name.toUpperCase()');
        });

        test('should execute interpolations correctly', async () => {
            const mdx = await Bun.file(import.meta.dir + '/interpolation-execution.mdx').text();

            const testCase = createExactMDXTest(
                'Interpolation execution',
                mdx
            )
                .expectExactLines(
                    'Hello World!'
                )
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Conditional Rendering', () => {
        test('should parse conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-conditional.mdx').text();

            const testCase = createExactMDXTest(
                'Simple conditional parsing',
                mdx
            )
                .expectExactLines(
                    'This message is shown!'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseMDX } = await import('../../src/parser');
            const result = parseMDX(mdx);
            expect(result.conditionalBlocks).toHaveLength(1);
            expect(result.conditionalBlocks[0].condition).toBe('showMessage');
            expect(result.conditionalBlocks[0].content).toBe('This message is shown!');
        });

        test('should parse nested conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/nested-conditional.mdx').text();

            const testCase = createExactMDXTest(
                'Nested conditional parsing',
                mdx
            )
                .expectExactLines(
                    'Welcome back!',
                    'You have admin access.'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseMDX } = await import('../../src/parser');
            const result = parseMDX(mdx);
            expect(result.conditionalBlocks).toHaveLength(2);
            expect(result.conditionalBlocks[0].condition).toBe('isLoggedIn');
            expect(result.conditionalBlocks[1].condition).toBe('hasPermission');
        });

        test('should execute conditional blocks correctly', async () => {
            const mdx = await Bun.file(import.meta.dir + '/conditional-execution.mdx').text();

            const testCase = createExactMDXTest(
                'Conditional execution',
                mdx
            )
                .expectExactLines(
                    'Hello there!'
                )
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle complex conditions', async () => {
            const mdx = await Bun.file(import.meta.dir + '/complex-conditions.mdx').text();

            const testCase = createExactMDXTest(
                'Complex conditions',
                mdx
            )
                .expectExactLines(
                    'Admin panel access'
                )
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Combined Interpolation and Conditionals', () => {
        test('should handle interpolations within conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/combined-interpolation-conditional.mdx').text();

            const testCase = createExactMDXTest(
                'Combined interpolation and conditional',
                mdx
            )
                .expectExactLines(
                    'Welcome VIP member Alice!'
                )
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle multiple interpolations and conditionals', async () => {
            const mdx = await Bun.file(import.meta.dir + '/multiple-interpolations-conditionals.mdx').text();

            const testCase = createExactMDXTest(
                'Multiple interpolations and conditionals',
                mdx
            )
                .expectExactLines(
                    '# User Profile',
                    'Name: Bob',
                    'Points: 1200',
                    '',
                    '🎉 Congratulations Bob! You\'ve reached gold level!'
                )
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle undefined variable interpolations gracefully', async () => {
            const mdx = await Bun.file(import.meta.dir + '/undefined-variable-interpolation.mdx').text();

            const testCase = createExactMDXTest(
                'Undefined variable interpolation',
                mdx
            )
                .expectExactLines(
                    'Hello Alice!',
                    'Age:'
                )
                .expectErrors(['ReferenceError: age is not defined'])
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle invalid condition expressions', async () => {
            const mdx = await Bun.file(import.meta.dir + '/invalid-condition-expression.mdx').text();

            const testCase = createExactMDXTest(
                'Invalid condition expression',
                mdx
            )
                .expectExactLines(
                    'Valid content here'
                )
                .expectErrors(['invalid'])
                .build();

            // Run the exact test
            const { ExactMDXTestRunner } = await import('../../src/exact-testing-utilities');
            const runner = new ExactMDXTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });
});