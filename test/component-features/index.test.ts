import { test, expect, describe } from 'bun:test';
import {
    ExactTSMDTestRunner,
    createTSmdTest,
    createTSmdTestSuite
} from '../../src/testing';

describe('TSmd Component Import Features', () => {
    const runner = new ExactTSMDTestRunner();

    test('Simple component import - exact match', async () => {
        const contents = await Bun.file(import.meta.dir + '/simple-import.tsmd').text();
        const testCase = createTSmdTest(
            'Simple component import - exact match',
            contents
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
        const contents = await Bun.file(import.meta.dir + '/simple-import.tsmd').text();
        const testCase = createTSmdTest(
            'Component import - contains check',
            contents
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactContent('# Hello, Bob!\nWelcome to markdown!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Component vs string interpolation', async () => {
        const contents = await Bun.file(import.meta.dir + '/component-vs-string.tsmd').text();
        const testCase = createTSmdTest(
            'Component vs string interpolation',
            contents
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
        const contents = await Bun.file(import.meta.dir + '/multiple-components-no-spacing.tsmd').text();
        const testCase = createTSmdTest(
            'Multiple components without spacing',
            contents
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
        const contents = await Bun.file(import.meta.dir + '/multiple-components-with-spacing.tsmd').text();
        const testCase = createTSmdTest(
            'Multiple components with spacing',
            contents
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
        const contents = await Bun.file(import.meta.dir + '/wrapped-components.tsmd').text();
        const testCase = createTSmdTest(
            'Components wrapped in XML tags',
            contents
        )
            .withContext({ basePath: import.meta.dir })
            .expectExactLines(
                '<description>',
                '# Component Header',
                'This is rendered by a component',
                '<content>',
                '  This is the main content area.',
                '  It contains multiple lines of text.',
                '</content>',
                '</description>'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Single line XML tags', async () => {
        const contents = await Bun.file(import.meta.dir + '/single-line-xml.tsmd').text();
        const testCase = createTSmdTest(
            'Single line XML tags',
            contents
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
        const contents = await Bun.file(import.meta.dir + '/single-line-xml-component.tsmd').text();
        const testCase = createTSmdTest(
            'Single line XML tags with component',
            contents
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
