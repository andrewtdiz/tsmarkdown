import { test, expect, describe } from 'bun:test';
import {
    ExactMDXTestRunner,
    createExactMDXTest,
    createExactMDXTestSuite
} from '../../src/exact-testing-utilities';

describe('Better-MDX Exact Core Features', () => {
    const runner = new ExactMDXTestRunner();

    test('Basic interpolation - exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/basic-interpolation.mdx').text();
        const testCase = createExactMDXTest(
            'Basic interpolation - exact match',
            mdxContent
        )
            .expectExactContent('# Hello World!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Conditional rendering - truthy exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/conditional-truthy.mdx').text();
        const testCase = createExactMDXTest(
            'Conditional rendering - truthy exact match',
            mdxContent
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
        const mdxContent = await Bun.file(import.meta.dir + '/conditional-falsy.mdx').text();
        const testCase = createExactMDXTest(
            'Conditional rendering - falsy exact match',
            mdxContent
        )
            .expectExactContent('# Test')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Complex expressions - exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/complex-expressions.mdx').text();
        const testCase = createExactMDXTest(
            'Complex expressions - exact match',
            mdxContent
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
        const mdxContent = await Bun.file(import.meta.dir + '/context-integration.mdx').text();
        const testCase = createExactMDXTest(
            'Context integration - exact match',
            mdxContent
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
        const mdxContent = await Bun.file(import.meta.dir + '/error-handling.mdx').text();
        const testCase = createExactMDXTest(
            'Error handling - exact match',
            mdxContent
        )
            .expectErrors(['Interpolation error'])
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });
});

describe('Better-MDX Complex Nested Conditionals - Exact Tests', () => {
    const runner = new ExactMDXTestRunner();

    test('Complex nested conditionals - exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/complex-nested-conditionals.mdx').text();
        const testCase = createExactMDXTest(
            'Complex nested conditionals - exact match',
            mdxContent
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

    test('Simple conditional - exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/simple-conditional.mdx').text();
        const testCase = createExactMDXTest(
            'Simple conditional - exact match',
            mdxContent
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
        const mdxContent = await Bun.file(import.meta.dir + '/two-level-nested.mdx').text();
        const testCase = createExactMDXTest(
            'Nested conditional - two levels - exact match',
            mdxContent
        )
            .expectExactContent('# Nested Content')
            .build();

        const result = await runner.runTestCase(testCase);

        expect(result.passed).toBe(true);
    });
});

describe('Better-MDX Exact Test Suite Integration', () => {
    const runner = new ExactMDXTestRunner();

    test('Run exact test suite', async () => {
        const suite = createExactMDXTestSuite('Exact Features Suite')
            .addTest(
                createExactMDXTest(
                    'Simple text exact',
                    await Bun.file(import.meta.dir + '/simple-text.mdx').text()
                )
                    .expectExactContent('# Hello World')
                    .build()
            )
            .addTest(
                createExactMDXTest(
                    'With variable exact',
                    await Bun.file(import.meta.dir + '/with-variable.mdx').text()
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
