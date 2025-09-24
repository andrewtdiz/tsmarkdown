import { test, expect, describe } from 'bun:test';
import { createTSmdTest, ExactTSMDTestRunner } from '../../src/testing';

describe('Expanded Features', () => {
    const runner = new ExactTSMDTestRunner();
    describe('Template Interpolation', () => {
        test('should parse simple interpolations', async () => {
            const contents = await Bun.file(import.meta.dir + '/simple-interpolation.tsmd').text();

            const testCase = createTSmdTest(
                'Simple interpolation parsing',
                contents
            )
                .expectExactLines(
                    'Hello World!'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseTSmd } = await import('../../src/parser');
            const result = parseTSmd(contents);
            expect(result.interpolations).toHaveLength(1);
            expect(result.interpolations[0].expression).toBe('name');
            expect(result.markdown).toContain('__INTERPOLATION_0__');
        });

        test('should parse complex interpolations', async () => {
            const contents = await Bun.file(import.meta.dir + '/complex-interpolation.tsmd').text();

            const testCase = createTSmdTest(
                'Complex interpolation parsing',
                contents
            )
                .expectExactLines(
                    'Items: apple, banana, cherry',
                    'User: JOHN DOE'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseTSmd } = await import('../../src/parser');
            const result = parseTSmd(contents);
            expect(result.interpolations).toHaveLength(2);
            expect(result.interpolations[0].expression).toBe('items.join(\', \')');
            expect(result.interpolations[1].expression).toBe('user.name.toUpperCase()');
        });

        test('should execute interpolations correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/interpolation-execution.tsmd').text();

            const testCase = createTSmdTest(
                'Interpolation execution',
                contents
            )
                .expectExactLines(
                    'Hello World!'
                )
                .build();

            // Run the exact test
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Conditional Rendering', () => {
        test('should parse conditional blocks', async () => {
            const contents = await Bun.file(import.meta.dir + '/simple-conditional.tsmd').text();

            const testCase = createTSmdTest(
                'Simple conditional parsing',
                contents
            )
                .expectExactLines(
                    'This message is shown!'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseTSmd } = await import('../../src/parser');
            const result = parseTSmd(contents);
            expect(result.conditionalBlocks).toHaveLength(1);
            expect(result.conditionalBlocks[0].condition).toBe('showMessage');
            expect(result.conditionalBlocks[0].content).toBe('This message is shown!');
        });

        test('should parse nested conditional blocks', async () => {
            const contents = await Bun.file(import.meta.dir + '/nested-conditional.tsmd').text();

            const testCase = createTSmdTest(
                'Nested conditional parsing',
                contents
            )
                .expectExactLines(
                    'Welcome back!',
                    'You have admin access.'
                )
                .build();

            // For parsing tests, we'll just verify the structure exists
            const { parseTSmd } = await import('../../src/parser');
            const result = parseTSmd(contents);
            expect(result.conditionalBlocks).toHaveLength(2);
            expect(result.conditionalBlocks[0].condition).toBe('isLoggedIn');
            expect(result.conditionalBlocks[1].condition).toBe('hasPermission');
        });

        test('should execute conditional blocks correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/conditional-execution.tsmd').text();

            const testCase = createTSmdTest(
                'Conditional execution',
                contents
            )
                .expectExactLines(
                    'Hello there!'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle complex conditions', async () => {
            const contents = await Bun.file(import.meta.dir + '/complex-conditions.tsmd').text();

            const testCase = createTSmdTest(
                'Complex conditions',
                contents
            )
                .expectExactLines(
                    'Admin panel access'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Combined Interpolation and Conditionals', () => {
        test('should handle interpolations within conditional blocks', async () => {
            const contents = await Bun.file(import.meta.dir + '/combined-interpolation-conditional.tsmd').text();

            const testCase = createTSmdTest(
                'Combined interpolation and conditional',
                contents
            )
                .expectExactLines(
                    'Welcome VIP member Alice!'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle multiple interpolations and conditionals', async () => {
            const contents = await Bun.file(import.meta.dir + '/multiple-interpolations-conditionals.tsmd').text();

            const testCase = createTSmdTest(
                'Multiple interpolations and conditionals',
                contents
            )
                .expectExactLines(
                    '# User Profile',
                    'Name: Bob',
                    'Points: 1200',
                    '',
                    '🎉 Congratulations Bob! You\'ve reached gold level!'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('List Rendering', () => {
        test('should render unordered lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/list-rendering.tsmd').text();

            const testCase = createTSmdTest(
                'Unordered list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: ["Apple", "Banana", "Cherry"]
                })
                .expectExactLines(
                    '## Technologies Used',
                    '- Apple',
                    '- Banana',
                    '- Cherry'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should render empty lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/list-rendering.tsmd').text();

            const testCase = createTSmdTest(
                'Empty list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: []
                })
                .expectExactLines(
                    '## Technologies Used',
                    'Empty'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should render comma lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/comma-list-rendering.tsmd').text();

            const testCase = createTSmdTest(
                'Comma list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: ["First", "Second", "Third"]
                })
                .expectExactLines(
                    '## Technologies Used',
                    'First, Second, Third'
                )
                .build();

            // Run the exact test
            const runner = new ExactTSMDTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should render empty comma lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/comma-list-rendering.tsmd').text();

            const testCase = createTSmdTest(
                'Empty comma list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: []
                })
                .expectExactLines(
                    '## Technologies Used',
                    'Empty'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should render single item comma lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/comma-list-rendering.tsmd').text();

            const testCase = createTSmdTest(
                'Single item comma list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: ["Only Item"]
                })
                .expectExactLines(
                    '## Technologies Used',
                    'Only Item'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should render internal comma list with and', async () => {
            const contents = await Bun.file(import.meta.dir + '/InternalCommaList.tsmd').text();

            const testCase = createTSmdTest(
                'Internal comma list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    withAnd: true,
                    items: ["First", "Second", "Third"]
                })
                .expectExactLines(
                    'First, Second and Third'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle undefined props gracefully', async () => {
            const contents = await Bun.file(import.meta.dir + '/InternalCommaList.tsmd').text();

            const testCase = createTSmdTest(
                'Internal comma list rendering',
                contents
            )
                .withContext({
                    basePath: import.meta.dir,
                    items: ["First", "Second", "Third"]
                })
                .expectExactLines(
                    'First, Second, Third'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle undefined variable interpolations gracefully', async () => {
            const contents = await Bun.file(import.meta.dir + '/undefined-variable-interpolation.tsmd').text();

            const testCase = createTSmdTest(
                'Undefined variable interpolation',
                contents
            )
                .expectExactLines(
                    'Hello Alice!',
                    'Age:'
                )
                .expectErrors(['ReferenceError: age is not defined'])
                .build();

            // Run the exact test
            const runner = new ExactTSMDTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle invalid condition expressions', async () => {
            const contents = await Bun.file(import.meta.dir + '/invalid-condition-expression.tsmd').text();

            const testCase = createTSmdTest(
                'Invalid condition expression',
                contents
            )
                .expectExactLines(
                    'Valid content here'
                )
                .expectErrors(['invalid'])
                .build();

            // Run the exact test
            const runner = new ExactTSMDTestRunner();
            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });
});