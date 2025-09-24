import { test, expect, describe } from 'bun:test';
import {
    ExactTSMDTestRunner,
    createTSmdTest,
    createTSmdTestSuite
} from '../../src/testing';

describe('TSmd Exact Core Features', () => {
    const runner = new ExactTSMDTestRunner();

    test('Basic interpolation - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/basic-interpolation.tsmd').text();
        const testCase = createTSmdTest(
            'Basic interpolation - exact match',
            contents
        )
            .expectExactContent('# Hello World!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Conditional rendering - truthy exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/conditional-truthy.tsmd').text();
        const testCase = createTSmdTest(
            'Conditional rendering - truthy exact match',
            contents
        )
            .expectExactLines(
                '# Test',
                '',
                'This should be visible.'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Conditional rendering - falsy exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/conditional-falsy.tsmd').text();
        const testCase = createTSmdTest(
            'Conditional rendering - falsy exact match',
            contents
        )
            .expectExactLines(
                '# Test'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Complex expressions - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/complex-expressions.tsmd').text();
        const testCase = createTSmdTest(
            'Complex expressions - exact match',
            contents
        )
            .expectExactLines(
                '# User: Alice',
                'Age: 30',
                '',
                'Items:',
                '- Apple',
                '- Banana',
                '- Cherry',
                '',
                'Item count: 3'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Context integration - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/context-integration.tsmd').text();
        const testCase = createTSmdTest(
            'Context integration - exact match',
            contents
        )
            .withContext({
                useAuth: () => ({
                    user: { name: 'Bob' },
                    isLoggedIn: true
                })
            })
            .expectExactContent('Welcome back, Bob!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Error handling - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/error-handling.tsmd').text();
        const testCase = createTSmdTest(
            'Error handling - exact match',
            contents
        )
            .expectErrors(['Interpolation error'])
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });
});

describe('TSmd Complex Nested Conditionals - Exact Tests', () => {
    const runner = new ExactTSMDTestRunner();

    test('Complex nested conditionals - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/complex-nested-conditionals.tsmd').text();
        const testCase = createTSmdTest(
            'Complex nested conditionals - exact match',
            contents
        )
            .expectExactLines(
                '# Admin Dashboard',
                '',
                'You have delete permissions.'
            )
            .build();

        const result = await runner.runTestCase(testCase);

        // Nested conditionals are now working correctly
        expect(result.passed).toBe(true);
    });

    test('Simple props', async () => {
        const contents = await Bun.file(import.meta.dir + '/simple-props.tsmd').text();
        const testCase = createTSmdTest(
            'Simple props',
            contents
        )
            .withContext({
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

    test('Simple conditional - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/simple-conditional.tsmd').text();
        const testCase = createTSmdTest(
            'Simple conditional - exact match',
            contents
        )
            .expectExactLines(
                '# Header',
                '',
                'This content should show.'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Nested conditional - two levels - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/two-level-nested.tsmd').text();
        const testCase = createTSmdTest(
            'Nested conditional - two levels - exact match',
            contents
        )
            .expectExactContent('# Nested Content')
            .build();

        const result = await runner.runTestCase(testCase);

        expect(result.passed).toBe(true);
    });
});

describe('TSmd Exact Test Suite Integration', () => {
    const runner = new ExactTSMDTestRunner();

    test('Run exact test suite', async () => {
        const suite = createTSmdTestSuite('Exact Features Suite')
            .addTest(
                createTSmdTest(
                    'Simple text exact',
                    await Bun.file(import.meta.dir + '/simple-text.tsmd').text()
                )
                    .expectExactContent('# Hello World')
                    .build()
            )
            .addTest(
                createTSmdTest(
                    'With variable exact',
                    await Bun.file(import.meta.dir + '/with-variable.tsmd').text()
                )
                    .expectExactContent('# Test')
                    .build()
            )
            .build();

        const results = await runner.runTestSuite(suite);

        expect(results.length).toBe(2);
        expect(results.every(r => r.passed)).toBe(true);
    });
});
