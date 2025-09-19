import { test, expect, describe } from 'bun:test';
import {
    ExactMDXTestRunner,
    createExactMDXTest,
    createExactMDXTestSuite
} from '../../src/exact-testing-utilities';

describe('TypeScript and External Asset Import Features', () => {
    const runner = new ExactMDXTestRunner();

    describe('Module Resolution', () => {
        test('should resolve relative TypeScript imports with explicit extension', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/relative-ts-import.mdx').text();
            const testCase = createExactMDXTest(
                'Relative TypeScript import with explicit extension',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# TypeScript Helper Result',
                    '',
                    'Processed data: HELLO WORLD'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should resolve relative imports without extension (default search order)', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/relative-no-extension.mdx').text();
            const testCase = createExactMDXTest(
                'Relative import without extension',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Auto-resolved TypeScript',
                    '',
                    'Function result: 42'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should honor alias maps before falling back to Node resolution', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/alias-import.mdx').text();
            const testCase = createExactMDXTest(
                'Alias import resolution',
                mdxContent
            )
                .withContext({
                    basePath: import.meta.dir,
                    aliasMap: {
                        '@utils': './fixtures/utils',
                        '@components': './fixtures/components'
                    }
                })
                .expectExactLines(
                    '# Alias Resolution',
                    '',
                    'Utility result: processed'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

    });
});
