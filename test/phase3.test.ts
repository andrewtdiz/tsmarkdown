import { test, expect, describe, beforeEach } from 'bun:test';
import { ClientRenderer, createClientRenderer } from '../src/client-renderer';
import { MDXAPIServer, createAPIServer } from '../src/api-server';
import { MDXCache, MDXCompilationCache, createCacheKey } from '../src/cache';
import { MDXParser } from '../src/parser';
import { MDXCompiler } from '../src/compiler';

describe('Phase 3: Runtime and API', () => {
  describe('Client Renderer', () => {
    test('should render compiled MDX to markdown', async () => {
      const renderer = new ClientRenderer();
      const compiled = {
        id: 'test-component',
        typescript: 'const name = "World";',
        template: 'Hello __INTERPOLATION_0__!',
        dependencies: [],
        functionParams: [],
        interpolations: [{ placeholder: '__INTERPOLATION_0__', expression: 'name' }],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: [],
        metadata: {
          functionName: 'TestComponent',
          lastModified: new Date().toISOString(),
          parameterTypes: []
        }
      };

      const result = await renderer.render(compiled, { name: 'Alice' });

      expect(result.content).toContain('Hello World!'); // TypeScript variable takes precedence
      expect(result.errors).toHaveLength(0);
    });

    test('should register and use React components', () => {
      const CustomComponent = ({ children }: { children: React.ReactNode }) => children;
      const renderer = new ClientRenderer();

      renderer.registerComponent('CustomComponent', CustomComponent);

      expect(renderer['componentRegistry']['CustomComponent']).toBe(CustomComponent);
    });

    test('should extract metadata from content', async () => {
      const renderer = new ClientRenderer();
      const compiled = {
        id: 'test-component',
        typescript: '',
        template: '# My Title\nThis is a description\n#tag1 #tag2',
        dependencies: [],
        functionParams: [],
        interpolations: [],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: [],
        metadata: {
          functionName: 'TestComponent',
          lastModified: new Date().toISOString(),
          parameterTypes: []
        }
      };

      const result = await renderer.render(compiled);

      expect(result.metadata.title).toBe('My Title');
      expect(result.metadata.description).toBe('This is a description');
      expect(result.metadata.tags).toEqual(['tag1', 'tag2']);
    });

    test('should handle rendering errors gracefully', async () => {
      const renderer = new ClientRenderer();
      const compiled = {
        id: 'test-component',
        typescript: 'throw new Error("Test error");',
        template: 'Content',
        dependencies: [],
        functionParams: [],
        interpolations: [],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: [],
        metadata: {
          functionName: 'TestComponent',
          lastModified: new Date().toISOString(),
          parameterTypes: []
        }
      };

      const result = await renderer.render(compiled);

      // Even with errors, content may still render with error information
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('API Server', () => {
    let server: MDXAPIServer;

    beforeEach(() => {
      server = createAPIServer({
        mdxDirectory: './test-mdx',
        cacheEnabled: false // Disable for testing
      });
    });

    test('should compile MDX source', async () => {
      const request = {
        source: `
function TestComponent() {
  const greeting = 'Hello';

  return (
    {{ greeting }} World!
  )}`,
        filename: 'test.mdx'
      };

      const result = await server.compile(request);

      expect(result.success).toBe(true);
      expect(result.data.compiled.template).toContain('__INTERPOLATION_0__ World!');
      expect(result.data.compiled.interpolations).toHaveLength(1);
      expect(result.data.filename).toBe('test.mdx');
    });

    test('should execute MDX with template engine', async () => {
      const request = {
        source: `
function TestComponent() {
  const items = ['a', 'b', 'c'];

  return (
    Items: {{ items.join(', ') }}
  )}`,
      };

      const result = await server.execute(request);

      expect(result.success).toBe(true);
      expect(result.data.content.trim()).toBe('Items: a, b, c');
      expect(result.data.errors).toHaveLength(0);
    });

    test('should handle compilation errors', async () => {
      const request = {
        source: 'Invalid {{ syntax }',
        filename: 'invalid.mdx'
      };

      const result = await server.compile(request);

      // Our compiler treats content without function as empty template
      expect(result.success).toBe(true);
      expect(result.data.compiled.template).toBe('');
      expect(result.data.compiled.id).toBe('unnamed-component');
    });

    test('should provide cache statistics', () => {
      const stats = server.getCacheStats();

      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    test('should clear cache', () => {
      server.clearCache();
      const stats = server.getCacheStats();

      expect(stats.size).toBe(0);
    });
  });

  describe('Caching System', () => {
    test('should cache and retrieve values', () => {
      const cache = new MDXCache<string>();

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('should handle TTL expiration', async () => {
      const cache = new MDXCache<string>();

      cache.set('key1', 'value1', 50); // 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    test('should track cache statistics', () => {
      const cache = new MDXCache<string>();

      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });

    test('should evict LRU entries when full', () => {
      const cache = new MDXCache<string>({ maxSize: 2 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // Access key1 to make it more recent
      cache.set('key3', 'value3'); // Should evict key2

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    test('should cleanup expired entries', async () => {
      const cache = new MDXCache<string>();

      cache.set('key1', 'value1', 50); // 50ms TTL
      cache.set('key2', 'value2', 1000); // 1000ms TTL

      expect(cache.keys()).toHaveLength(2);

      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const removedCount = cache.cleanup();

      expect(removedCount).toBe(1);
      expect(cache.keys()).toHaveLength(1);
      expect(cache.has('key2')).toBe(true);
    });

    test('should create consistent cache keys', () => {
      const key1 = createCacheKey('test', { a: 1 });
      const key2 = createCacheKey('test', { a: 1 });
      const key3 = createCacheKey('test', { a: 2 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('MDX Compilation Cache', () => {
    test('should cache compilation results', () => {
      const cache = new MDXCompilationCache();
      const source = 'Hello {{ name }}!';
      const compiled = { test: 'result' };

      cache.setCompiled(source, compiled);
      expect(cache.getCompiled(source)).toEqual(compiled);
    });

    test('should cache with context', () => {
      const cache = new MDXCompilationCache();
      const source = 'Hello {{ name }}!';
      const context = { name: 'World' };
      const compiled = { test: 'result' };

      cache.setCompiled(source, compiled, context);
      expect(cache.getCompiled(source, context)).toEqual(compiled);
      expect(cache.getCompiled(source, { name: 'Alice' })).toBeUndefined();
    });

    test('should cache rendered results', () => {
      const cache = new MDXCompilationCache();
      const source = '# Hello World';
      const html = '<h1>Hello World</h1>';

      cache.setRendered(source, html);
      expect(cache.getRendered(source)).toBe(html);
    });

    test('should cache execution results', () => {
      const cache = new MDXCompilationCache();
      const source = 'Content: {{ value }}';
      const context = { value: 42 };
      const result = { content: 'Content: 42', errors: [] };

      cache.setExecuted(source, result, context);
      expect(cache.getExecuted(source, context)).toEqual(result);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete compile-render-execute flow', async () => {
      const server = createAPIServer({ cacheEnabled: true });

      const source = `
function TestComponent() {
  const user = { name: 'Alice', isVip: true };

  return (
    # User Profile
    Name: {{ user.name }}

    {user.isVip && (
      🌟 VIP Member!
    )}
  )}`;

      // Test compilation
      const compileResult = await server.compile({ source });
      expect(compileResult.success).toBe(true);

      // Test rendering with TypeScript variables (should use Alice)
      const renderResult = await server.render({
        compiled: compileResult.data.compiled
      });
      expect(renderResult.success).toBe(true);
      expect(renderResult.data.content).toContain('Name: Alice');
      expect(renderResult.data.content).toContain('🌟 VIP Member!');

      // Test execution with TypeScript variables
      const executeResult = await server.execute({
        compiled: compileResult.data.compiled
      });
      expect(executeResult.success).toBe(true);
      expect(executeResult.data.content).toContain('Name: Alice');
      expect(executeResult.data.content).toContain('🌟 VIP Member!');
    });

    test('should handle caching across requests', async () => {
      const server = createAPIServer({ cacheEnabled: true });

      const source = 'Simple content: {{ value }}';
      const context = { value: 'test' };

      // First request
      const result1 = await server.render({ source, context });
      expect(result1.success).toBe(true);

      // Second request should use cache
      const result2 = await server.render({ source, context });
      expect(result2.success).toBe(true);
      expect(result2.data.content).toBe(result1.data.content);
    });

    test('should handle simple nested content', async () => {
      const server = createAPIServer();

      const source = `
function SimpleComponent() {
  const title = 'User Directory';
  const user1 = 'Alice';
  const user2 = 'Bob';

  return (
    # {{ title }}

    User 1: {{ user1 }}
    User 2: {{ user2 }}
  )}`;

      const result = await server.execute({ source });

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('User Directory');
      expect(result.data.content).toContain('User 1: Alice');
      expect(result.data.content).toContain('User 2: Bob');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed MDX gracefully', async () => {
      const server = createAPIServer();

      const result = await server.compile({
        source: 'Invalid {{ unclosed interpolation'
      });

      // Compilation succeeds but returns empty template since no function is found
      expect(result.success).toBe(true);
      expect(result.data.compiled.template).toBe('');
      expect(result.data.compiled.id).toBe('unnamed-component');
    });

    test('should handle undefined context variables', async () => {
      const renderer = new ClientRenderer();
      const compiled = {
        id: 'test-component',
        typescript: '',
        template: 'Value: __INTERPOLATION_0__',
        dependencies: [],
        functionParams: [],
        interpolations: [{ placeholder: '__INTERPOLATION_0__', expression: 'unknownVar' }],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: [],
        metadata: {
          functionName: 'TestComponent',
          lastModified: new Date().toISOString(),
          parameterTypes: []
        }
      };

      const result = await renderer.render(compiled, {});

      expect(result.content).toContain('Value:');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle TypeScript execution errors', async () => {
      const server = createAPIServer();

      const source = `
function BuggyComponent() {
  throw new Error('Intentional error');

  return (
    This should not render
  )}`;

      const result = await server.execute({ source });

      expect(result.success).toBe(true); // API call succeeds
      expect(result.data.errors.length).toBeGreaterThan(0); // But execution has errors
    });
  });
});