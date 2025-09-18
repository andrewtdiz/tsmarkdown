import { test, expect, describe } from 'bun:test';
import { parseMDX } from '../../src/parser';
import { compile } from '../../src/compiler';
import { render } from '../../src/renderer';

describe('Expanded Features', () => {
    describe('Template Interpolation', () => {
        test('should parse simple interpolations', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-interpolation.mdx').text();

            const result = parseMDX(mdx);

            expect(result.interpolations).toHaveLength(1);
            expect(result.interpolations[0].expression).toBe('name');
            expect(result.markdown).toContain('__INTERPOLATION_0__');
        });

        test('should parse complex interpolations', async () => {
            const mdx = await Bun.file(import.meta.dir + '/complex-interpolation.mdx').text();

            const result = parseMDX(mdx);

            expect(result.interpolations).toHaveLength(2);
            expect(result.interpolations[0].expression).toBe('items.join(\', \')');
            expect(result.interpolations[1].expression).toBe('user.name.toUpperCase()');
        });

        test('should execute interpolations correctly', async () => {
            const mdx = await Bun.file(import.meta.dir + '/interpolation-execution.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content.trim()).toBe('Hello World!');
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Conditional Rendering', () => {
        test('should parse conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/simple-conditional.mdx').text();

            const result = parseMDX(mdx);

            expect(result.conditionalBlocks).toHaveLength(1);
            expect(result.conditionalBlocks[0].condition).toBe('showMessage');
            expect(result.conditionalBlocks[0].content).toBe('This message is shown!');
        });

        test('should parse nested conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/nested-conditional.mdx').text();

            const result = parseMDX(mdx);

            expect(result.conditionalBlocks).toHaveLength(2);
            expect(result.conditionalBlocks[0].condition).toBe('isLoggedIn');
            expect(result.conditionalBlocks[1].condition).toBe('hasPermission');
        });

        test('should execute conditional blocks correctly', async () => {
            const mdx = await Bun.file(import.meta.dir + '/conditional-execution.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content).toContain('Hello there!');
            expect(result.content).not.toContain('Warning message');
            expect(result.errors).toHaveLength(0);
        });

        test('should handle complex conditions', async () => {
            const mdx = await Bun.file(import.meta.dir + '/complex-conditions.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content).toContain('Admin panel access');
            expect(result.content).not.toContain('Account is inactive');
        });
    });

    describe('Combined Interpolation and Conditionals', () => {
        test('should handle interpolations within conditional blocks', async () => {
            const mdx = await Bun.file(import.meta.dir + '/combined-interpolation-conditional.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content.trim()).toBe('Welcome VIP member Alice!');
            expect(result.errors).toHaveLength(0);
        });

        test('should handle multiple interpolations and conditionals', async () => {
            const mdx = await Bun.file(import.meta.dir + '/multiple-interpolations-conditionals.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content).toContain('Name: Bob');
            expect(result.content).toContain('Points: 1200');
            expect(result.content).toContain('🎉 Congratulations Bob!');
            expect(result.content).toContain("You've reached gold level!");
        });
    });

    describe('Error Handling', () => {
        test('should handle undefined variable interpolations gracefully', async () => {
            const mdx = await Bun.file(import.meta.dir + '/undefined-variable-interpolation.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content).toContain('Hello Alice!');
            expect(result.content).toContain('Age:'); // Should be empty for undefined age
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle invalid condition expressions', async () => {
            const mdx = await Bun.file(import.meta.dir + '/invalid-condition-expression.mdx').text();

            const parsed = parseMDX(mdx);
            const compiled = compile(parsed);
            const result = await render(compiled);

            expect(result.content).toContain('Valid content here');
            expect(result.content).not.toContain('This should not show');
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});