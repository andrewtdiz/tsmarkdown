import { test, expect, describe } from 'bun:test';
import {
    ExactMDXTestRunner,
    createExactMDXTest,
    createExactMDXTestSuite
} from '../../src/exact-testing-utilities';

describe('Better-MDX Component Import Features', () => {
    const runner = new ExactMDXTestRunner();

    test('Simple component import - exact match', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/simple-import.mdx').text();
        const testCase = createExactMDXTest(
            'Simple component import - exact match',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '# Hello, Bob!',
                'Welcome to markdown!'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Component import - contains check', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/simple-import.mdx').text();
        const testCase = createExactMDXTest(
            'Component import - contains check',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactContent('# Hello, Bob!\nWelcome to markdown!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });
});
