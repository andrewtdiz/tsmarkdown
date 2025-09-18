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

    test('Component vs string interpolation', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/component-vs-string.mdx').text();
        const testCase = createExactMDXTest(
            'Component vs string interpolation',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '# Raw String Interpolation',
                'This is raw markdown text that gets interpolated directly.',
                '',
                '# Component Header',
                'This is rendered by a component',
                '',
                '# More Raw Text',
                'This demonstrates the difference between component rendering and raw string interpolation.'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Multiple components without spacing', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/multiple-components-no-spacing.mdx').text();
        const testCase = createExactMDXTest(
            'Multiple components without spacing',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '# Component Header',
                'This is rendered by a component',
                'This is the main content area.',
                'It contains multiple lines of text.',
                '## Footer Component',
                'End of content'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Multiple components with spacing', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/multiple-components-with-spacing.mdx').text();
        const testCase = createExactMDXTest(
            'Multiple components with spacing',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '# Component Header',
                'This is rendered by a component',
                '',
                'This is the main content area.',
                'It contains multiple lines of text.',
                '',
                '## Footer Component',
                'End of content'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Components wrapped in XML tags', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/wrapped-components.mdx').text();
        const testCase = createExactMDXTest(
            'Components wrapped in XML tags',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '<description>',
                '# Component Header',
                'This is rendered by a component',
                '<content>',
                '    This is the main content area.',
                'It contains multiple lines of text.',
                '</content>',
                '</description>'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Single line XML tags', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/single-line-xml.mdx').text();
        const testCase = createExactMDXTest(
            'Single line XML tags',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '<content> Here I am </content>'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Single line XML tags with component', async () => {
        const mdxContent = await Bun.file(import.meta.dir + '/single-line-xml-component.mdx').text();
        const testCase = createExactMDXTest(
            'Single line XML tags with component',
            mdxContent
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '<content> Content: This is the main content area.',
                'It contains multiple lines of text. </content>'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });
});
