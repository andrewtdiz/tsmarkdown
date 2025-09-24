import { test, expect, describe } from 'bun:test';
import {
    ExactTSMDTestRunner,
    createTSmdTest,
} from '../../src/testing';

describe('TypeScript and External Asset Import Features', () => {
    describe('Module Resolution', () => {
        test('should resolve relative TypeScript imports with explicit extension', async () => {
            const contents = await Bun.file(import.meta.dir + '/relative-ts-import.tsmd').text();
            const testCase = createTSmdTest(
                'Relative TypeScript import with explicit extension',
                contents
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
            const contents = await Bun.file(import.meta.dir + '/relative-no-extension.tsmd').text();
            const testCase = createTSmdTest(
                'Relative import without extension',
                contents
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
            const contents = await Bun.file(import.meta.dir + '/alias-import.tsmd').text();
            const testCase = createTSmdTest(
                'Alias import resolution',
                contents
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
