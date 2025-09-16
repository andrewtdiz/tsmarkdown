import { test, expect, describe } from 'bun:test';
import {
  MDXTestRunner,
  createMDXTest,
  createMDXTestSuite,
  MDXSnapshotTester
} from '../src/testing-utilities';

describe('Better-MDX Core Features', () => {
  const runner = new MDXTestRunner();
  const snapshotTester = new MDXSnapshotTester();

  test('Basic interpolation', async () => {
    const testCase = createMDXTest(
      'Basic interpolation',
      `
function BasicTest() {
  const greeting = 'Hello';
  const name = 'World';

  return (
    # {{ greeting }} {{ name }}!
  )
}
      `.trim()
    )
    .expectContent('# Hello World!')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Conditional rendering - truthy', async () => {
    const testCase = createMDXTest(
      'Conditional rendering - truthy',
      `
function ConditionalTest() {
  const isVisible = true;

  return (
    # Test

    {isVisible && (
      This should be visible.
    )}
  )
}
      `.trim()
    )
    .expectContains('This should be visible.')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Conditional rendering - falsy', async () => {
    const testCase = createMDXTest(
      'Conditional rendering - falsy',
      `
function ConditionalTest() {
  const isVisible = false;

  return (
    # Test

    {isVisible && (
      This should NOT be visible.
    )}
  )
}
      `.trim()
    )
    .expectExcludes('This should NOT be visible.')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Complex expressions', async () => {
    const testCase = createMDXTest(
      'Complex expressions',
      `
function ComplexTest() {
  const items = ['Apple', 'Banana', 'Cherry'];
  const user = { name: 'Alice', age: 30 };

  return (
    # User: {{ user.name }}

    Age: {{ user.age }}

    Items:
    {{ items.map((item, index) => '- ' + item).join('\\n') }}

    Item count: {{ items.length }}
  )
}
      `.trim()
    )
    .expectContains('User: Alice', 'Age: 30', '- Apple', '- Banana', '- Cherry', 'Item count: 3')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Context integration', async () => {
    const testCase = createMDXTest(
      'Context integration',
      `
function ContextTest() {
  const { user, isLoggedIn } = useAuth();

  return (
    {isLoggedIn && (
      Welcome back, {{ user.name }}!
    )}

    {!isLoggedIn && (
      Please log in.
    )}
  )
}
      `.trim()
    )
    .withContext({
      useAuth: () => ({
        user: { name: 'Bob' },
        isLoggedIn: true
      })
    })
    .expectContains('Welcome back, Bob!')
    .expectExcludes('Please log in.')
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Error handling', async () => {
    const testCase = createMDXTest(
      'Error handling',
      `
function ErrorTest() {
  const data = undefined;

  return (
    # Test

    Value: {{ data.nonexistent.property }}
  )
}
      `.trim()
    )
    .expectErrors(['Interpolation error'])
    .build();

    const result = await runner.runTestCase(testCase);
    expect(result.passed).toBe(true);
  });

  test('Snapshot testing', () => {
    const input = `
function SnapshotTest() {
  const title = 'Snapshot Test';
  const items = [1, 2, 3];

  return (
    # {{ title }}

    {{ items.map(n => '- Item ' + n).join('\\n') }}
  )
}
    `.trim();

    const matches = snapshotTester.matchSnapshot('snapshot-test', input);
    expect(matches).toBe(true);
  });
});

describe('Better-MDX Test Suite Integration', () => {
  const runner = new MDXTestRunner();

  test('Run test suite', async () => {
    const suite = createMDXTestSuite('Basic Features Suite')
      .addTest(
        createMDXTest(
          'Simple text',
          `
function SimpleTest() {
  return (
    # Hello World
  )
}
          `.trim()
        )
        .expectContent('# Hello World')
        .build()
      )
      .addTest(
        createMDXTest(
          'With variable',
          `
function VarTest() {
  const name = 'Test';
  return (
    # {{ name }}
  )
}
          `.trim()
        )
        .expectContent('# Test')
        .build()
      )
      .withSetup(() => {
        console.log('Setting up test suite');
      })
      .withTeardown(() => {
        console.log('Cleaning up test suite');
      })
      .build();

    const results = await runner.runTestSuite(suite);

    expect(results.length).toBe(2);
    expect(results.every(r => r.passed)).toBe(true);
  });
});

describe('Better-MDX Performance Tests', () => {
  const runner = new MDXTestRunner();

  test('Large content performance', async () => {
    // Generate large content
    const items = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);

    const testCase = createMDXTest(
      'Large content test',
      `
function LargeTest() {
  const items = ${JSON.stringify(items)};

  return (
    # Large Content Test

    {{ items.map(item => '- ' + item).join('\\n') }}

    Total items: {{ items.length }}
  )
}
      `.trim()
    )
    .withTimeout(5000) // 5 second timeout
    .expectContains('Total items: 1000')
    .build();

    const result = await runner.runTestCase(testCase);

    expect(result.passed).toBe(true);
    expect(result.duration).toBeLessThan(5000);
    console.log(`Large content test completed in ${result.duration}ms`);
  });

  test('Complex nested conditionals', async () => {
    const testCase = createMDXTest(
      'Complex nested conditionals',
      `
function NestedTest() {
  const user = { role: 'admin', permissions: ['read', 'write', 'delete'] };
  const isActive = true;

  return (
    {user && isActive && (
      {user.role === 'admin' && (
        # Admin Dashboard

        {user.permissions.includes('delete') && (
          You have delete permissions.
        )}

        {!user.permissions.includes('delete') && (
          Limited permissions.
        )}
      )}

      {user.role !== 'admin' && (
        # User Dashboard
      )}
    )}
  )
}
      `.trim()
    )
    .expectContains('Admin Dashboard', 'You have delete permissions.')
    .expectExcludes('Limited permissions.', 'User Dashboard')
    .build();

    const result = await runner.runTestCase(testCase);

    expect(result.passed).toBe(true);
    console.log(`Complex nested test completed in ${result.duration}ms`);
  });
});