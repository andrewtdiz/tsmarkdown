import { test, expect, describe } from 'bun:test';
import { parseMDX } from '../src/parser';
import { compile } from '../src/compiler';
import { render } from '../src/renderer';

describe('Phase 2: Template System', () => {
  describe('Template Interpolation', () => {
    test('should parse simple interpolations', () => {
      const mdx = `
function TestComponent() {
    const name = 'World';

    return (
    Hello {{ name }}!
}`;

      const result = parseMDX(mdx);

      expect(result.interpolations).toHaveLength(1);
      expect(result.interpolations[0].expression).toBe('name');
      expect(result.markdown).toContain('__INTERPOLATION_0__');
    });

    test('should parse complex interpolations', () => {
      const mdx = `
function TestComponent() {
    const items = ['a', 'b', 'c'];
    const user = { name: 'Alice' };

    return (
    Items: {{ items.join(', ') }}
    User: {{ user.name.toUpperCase() }}
}`;

      const result = parseMDX(mdx);

      expect(result.interpolations).toHaveLength(2);
      expect(result.interpolations[0].expression).toBe('items.join(\', \')');
      expect(result.interpolations[1].expression).toBe('user.name.toUpperCase()');
    });

    test('should execute interpolations correctly', async () => {

      const mdx = `
function TestComponent() {
    const greeting = 'Hello';
    const name = 'World';

    return (
    {{ greeting }} {{ name }}!
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content.trim()).toBe('Hello World!');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Conditional Rendering', () => {
    test('should parse conditional blocks', () => {
      const mdx = `
function TestComponent() {
    const showMessage = true;

    return (
    {showMessage && (
        This message is shown!
    )}
}`;

      const result = parseMDX(mdx);

      expect(result.conditionalBlocks).toHaveLength(1);
      expect(result.conditionalBlocks[0].condition).toBe('showMessage');
      expect(result.conditionalBlocks[0].content).toBe('This message is shown!');
    });

    test('should parse nested conditional blocks', () => {
      const mdx = `
function TestComponent() {
    const isLoggedIn = true;
    const hasPermission = false;

    return (
    {isLoggedIn && (
        Welcome back!
    )}
    {hasPermission && (
        You have admin access.
    )}
}`;

      const result = parseMDX(mdx);

      expect(result.conditionalBlocks).toHaveLength(2);
      expect(result.conditionalBlocks[0].condition).toBe('isLoggedIn');
      expect(result.conditionalBlocks[1].condition).toBe('hasPermission');
    });

    test('should execute conditional blocks correctly', async () => {

      const mdx = `
function TestComponent() {
    const showGreeting = true;
    const showWarning = false;

    return (
    {showGreeting && (
        Hello there!
    )}
    {showWarning && (
        Warning message
    )}
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content).toContain('Hello there!');
      expect(result.content).not.toContain('Warning message');
      expect(result.errors).toHaveLength(0);
    });

    test('should handle complex conditions', async () => {

      const mdx = `
function TestComponent() {
    const user = { role: 'admin', active: true };

    return (
    {user.role === 'admin' && user.active && (
        Admin panel access
    )}
    {!user.active && (
        Account is inactive
    )}
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content).toContain('Admin panel access');
      expect(result.content).not.toContain('Account is inactive');
    });
  });

  describe('Combined Interpolation and Conditionals', () => {
    test('should handle interpolations within conditional blocks', async () => {

      const mdx = `
function TestComponent() {
    const user = { name: 'Alice', isVip: true };

    return (
    {user.isVip && (
        Welcome VIP member {{ user.name }}!
    )}
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content.trim()).toBe('Welcome VIP member Alice!');
      expect(result.errors).toHaveLength(0);
    });

    test('should handle multiple interpolations and conditionals', async () => {

      const mdx = `
function TestComponent() {
    const user = { name: 'Bob', points: 1200, level: 'gold' };
    const showRewards = user.points > 1000;

    return (
    # User Profile
    Name: {{ user.name }}
    Points: {{ user.points }}

    {showRewards && (
        🎉 Congratulations {{ user.name }}! You've reached {{ user.level }} level!
    )}
}`;

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

      const mdx = `
function TestComponent() {
    const name = 'Alice';

    return (
    Hello {{ name }}!
    Age: {{ age }}
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content).toContain('Hello Alice!');
      expect(result.content).toContain('Age:'); // Should be empty for undefined age
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle invalid condition expressions', async () => {

      const mdx = `
function TestComponent() {
    const user = { name: 'Alice' };

    return (
    {invalidVariable && (
        This should not show
    )}
    Valid content here
}`;

      const parsed = parseMDX(mdx);
      const compiled = compile(parsed);
      const result = await render(compiled);

      expect(result.content).toContain('Valid content here');
      expect(result.content).not.toContain('This should not show');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});