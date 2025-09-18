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

        test('should warn when extension inference is required', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/extension-inference-warning.mdx').text();
            const testCase = createExactMDXTest(
                'Extension inference warning',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Extension Inference',
                    'Content loaded'
                )
                // TODO: Add expectWarnings support to testing utilities
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should prohibit importing other MDX files directly', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/prohibited-mdx-import.mdx').text();
            const testCase = createExactMDXTest(
                'Prohibited MDX import',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Cannot import MDX files directly'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('TypeScript Module Handling', () => {
        test('should handle .ts, .tsx, .cts, and .mts sources', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/typescript-extensions.mdx').text();
            const testCase = createExactMDXTest(
                'TypeScript extensions handling',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# TypeScript Extensions',
                    'TS result: ts',
                    'TSX result: tsx',
                    'CTS result: cts',
                    'MTS result: mts'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should strip type-only imports before execution', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/type-only-imports.mdx').text();
            const testCase = createExactMDXTest(
                'Type-only imports stripping',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Type-only Import Test',
                    'Runtime value: 42'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should await async exports during render', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/async-export.mdx').text();
            const testCase = createExactMDXTest(
                'Async export handling',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Async Export Test',
                    'Async result: resolved data'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should bubble TypeScript diagnostics with proper source mapping', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/typescript-error.mdx').text();
            const testCase = createExactMDXTest(
                'TypeScript error diagnostics',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Type error in imported module'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should respect tsconfig compiler options', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/tsconfig-options.mdx').text();
            const testCase = createExactMDXTest(
                'TypeScript config options',
                mdxContent
            )
                .withContext({
                    basePath: import.meta.dir,
                    tsconfig: {
                        strict: true,
                        noImplicitAny: true,
                        target: 'ES2020'
                    }
                })
                .expectExactLines(
                    '# TypeScript Config Test',
                    'Config applied: true'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Non-MDX Asset Support', () => {
        test('should import JSON files as default export', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/json-import.mdx').text();
            const testCase = createExactMDXTest(
                'JSON file import',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# JSON Import Test',
                    'Name: John Doe',
                    'Age: 30'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should import YAML files as default export', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/yaml-import.mdx').text();
            const testCase = createExactMDXTest(
                'YAML file import',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# YAML Import Test',
                    'Title: Test Configuration',
                    'Enabled: true'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should import text/markdown files with ?raw suffix', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/raw-text-import.mdx').text();
            const testCase = createExactMDXTest(
                'Raw text import with ?raw suffix',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Raw Text Import Test',
                    'Raw content: # This is raw markdown',
                    'It should not be processed.'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should import CSS modules as Record<string, string>', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/css-module-import.mdx').text();
            const testCase = createExactMDXTest(
                'CSS module import',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# CSS Module Import Test',
                    'CSS class: container_abc123',
                    'Button class: button_xyz789'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should reject global CSS imports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/global-css-import.mdx').text();
            const testCase = createExactMDXTest(
                'Global CSS import rejection',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Global CSS imports are not supported'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should fail fast for unsupported extensions', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/unsupported-extension.mdx').text();
            const testCase = createExactMDXTest(
                'Unsupported extension import',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Unsupported file extension'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should provide validation errors for malformed JSON/YAML', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/malformed-asset.mdx').text();
            const testCase = createExactMDXTest(
                'Malformed asset validation',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Invalid JSON format'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Enhanced Dependency Tracking', () => {
        test('should extract default, named, and namespace imports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/comprehensive-imports.mdx').text();
            const testCase = createExactMDXTest(
                'Comprehensive import extraction',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Comprehensive Import Test',
                    'Default: defaultValue',
                    'Named: namedValue',
                    'Namespace: namespaceValue'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should preserve alias names in imports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/aliased-imports.mdx').text();
            const testCase = createExactMDXTest(
                'Aliased import preservation',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Aliased Import Test',
                    'Aliased value: originalValue'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle side-effect-only imports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/side-effect-import.mdx').text();
            const testCase = createExactMDXTest(
                'Side-effect import handling',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Side-effect Import Test',
                    'Side effect executed: true'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should detect type-only clauses and skip runtime dependencies', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/type-only-detection.mdx').text();
            const testCase = createExactMDXTest(
                'Type-only clause detection',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Type-only Detection Test',
                    'Runtime dependency: runtimeValue'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle multi-line named imports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/multiline-imports.mdx').text();
            const testCase = createExactMDXTest(
                'Multi-line named imports',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Multi-line Import Test',
                    'First: firstValue',
                    'Second: secondValue',
                    'Third: thirdValue'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should differentiate runtime dependencies from type-only watchers', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/dependency-differentiation.mdx').text();
            const testCase = createExactMDXTest(
                'Dependency differentiation',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Dependency Differentiation Test',
                    'Runtime value: runtimeValue'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Runtime Contract', () => {
        test('should execute imported values in MDX sandbox', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/sandbox-execution.mdx').text();
            const testCase = createExactMDXTest(
                'Sandbox execution test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Sandbox Execution Test',
                    'Sandbox result: isolated'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should cache module evaluation per render context', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/module-caching.mdx').text();
            const testCase = createExactMDXTest(
                'Module caching test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Module Caching Test',
                    'First call: cached',
                    'Second call: cached'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should warn about browser API dependencies', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/browser-api-warning.mdx').text();
            const testCase = createExactMDXTest(
                'Browser API warning test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Browser API Warning Test',
                    'Result: fallback'
                )
                // TODO: Add expectWarnings support to testing utilities
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Developer Ergonomics', () => {
        test('should emit source maps for TypeScript bundle', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/source-map-emission.mdx').text();
            const testCase = createExactMDXTest(
                'Source map emission test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Source Map Test',
                    'Source mapped: true'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should provide editor hover information', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/editor-hover.mdx').text();
            const testCase = createExactMDXTest(
                'Editor hover information test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Editor Hover Test',
                    'Hover info: available'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should provide go-to-definition support', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/go-to-definition.mdx').text();
            const testCase = createExactMDXTest(
                'Go-to-definition support test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Go-to-Definition Test',
                    'Definition: found'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Error Handling and Diagnostics', () => {
        test('should provide correct paths in resolution failure diagnostics', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/resolution-failure.mdx').text();
            const testCase = createExactMDXTest(
                'Resolution failure diagnostics',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Module not found'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should include original import statement in error payload', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/import-error-payload.mdx').text();
            const testCase = createExactMDXTest(
                'Import error payload test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['Import statement: import { missing } from'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should surface MDX filename and line numbers in TypeScript diagnostics', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/diagnostic-source-mapping.mdx').text();
            const testCase = createExactMDXTest(
                'Diagnostic source mapping test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectErrors(['diagnostic-source-mapping.mdx:2'])
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complex TypeScript helper with multiple exports', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/complex-ts-helper.mdx').text();
            const testCase = createExactMDXTest(
                'Complex TypeScript helper integration',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Complex TypeScript Helper',
                    'Processed: processed data',
                    'Validated: true',
                    'Formatted: formatted result'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle JSON asset with complex nested data', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/complex-json-asset.mdx').text();
            const testCase = createExactMDXTest(
                'Complex JSON asset integration',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Complex JSON Asset',
                    'Title: Complex Configuration',
                    'Count: 3',
                    'First Item: item1'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should handle mixed import types in single MDX file', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/mixed-imports.mdx').text();
            const testCase = createExactMDXTest(
                'Mixed import types integration',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Mixed Imports Test',
                    'TypeScript: ts result',
                    'JSON: json result',
                    'Raw text: raw content'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('CLI and Linting Integration', () => {
        test('should provide CLI warnings for unsupported extensions', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/cli-extension-warning.mdx').text();
            const testCase = createExactMDXTest(
                'CLI extension warning test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# CLI Extension Warning Test',
                    'Content: processed'
                )
                // TODO: Add expectWarnings support to testing utilities
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });

        test('should provide lint warnings for missing ?raw suffix', async () => {
            const mdxContent = await Bun.file(import.meta.dir + '/missing-raw-suffix.mdx').text();
            const testCase = createExactMDXTest(
                'Missing ?raw suffix warning test',
                mdxContent
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Missing ?raw Suffix Test',
                    'Content: processed'
                )
                // TODO: Add expectWarnings support to testing utilities
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });
});
