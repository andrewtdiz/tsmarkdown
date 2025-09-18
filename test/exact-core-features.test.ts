import { test, expect, describe } from 'bun:test';
import {
    ExactMDXTestRunner,
    createExactMDXTest,
    createExactMDXTestSuite
} from '../src/exact-testing-utilities';

describe('Better-MDX Exact Core Features', () => {
    const runner = new ExactMDXTestRunner();

    test('Basic interpolation - exact match', async () => {
        const testCase = createExactMDXTest(
            'Basic interpolation - exact match',
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
            .expectExactContent('# Hello World!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Conditional rendering - truthy exact match', async () => {
        const testCase = createExactMDXTest(
            'Conditional rendering - truthy exact match',
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
            .expectExactLines(
                '# Test',
                '',
                'This should be visible.'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Conditional rendering - falsy exact match', async () => {
        const testCase = createExactMDXTest(
            'Conditional rendering - falsy exact match',
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
            .expectExactContent('# Test')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Complex expressions - exact match', async () => {
        const testCase = createExactMDXTest(
            'Complex expressions - exact match',
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
            .expectExactLines(
                '# User: Alice',
                '',
                'Age: 30',
                '',
                'Items:',
                '- Apple',
                '- Banana',
                '- Cherry',
                '',
                'Item count: 3'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Context integration - exact match', async () => {
        const testCase = createExactMDXTest(
            'Context integration - exact match',
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
            .expectExactContent('Welcome back, Bob!')
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Error handling - exact match', async () => {
        const testCase = createExactMDXTest(
            'Error handling - exact match',
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
});

describe('Better-MDX Complex Nested Conditionals - Exact Tests', () => {
    const runner = new ExactMDXTestRunner();

    test('Complex nested conditionals - exact match', async () => {
        const testCase = createExactMDXTest(
            'Complex nested conditionals - exact match',
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
            .expectExactLines(
                '# Admin Dashboard',
                '',
                'You have delete permissions.'
            )
            .build();

        const result = await runner.runTestCase(testCase);

        expect(result.passed).toBe(true);
        expect(result.details?.actualContent).toBe("# Admin Dashboard\n\nYou have delete permissions.");
    });

    test('Simple conditional - exact match', async () => {
        const testCase = createExactMDXTest(
            'Simple conditional - exact match',
            `
function SimpleConditionalTest() {
  const showContent = true;

  return (
    # Header

    {showContent && (
      This content should show.
    )}
  )
}
      `.trim()
        )
            .expectExactLines(
                '# Header',
                '',
                'This content should show.'
            )
            .build();

        const result = await runner.runTestCase(testCase);
        expect(result.passed).toBe(true);
    });

    test('Nested conditional - two levels - exact match', async () => {
        const testCase = createExactMDXTest(
            'Nested conditional - two levels - exact match',
            `
function TwoLevelNestedTest() {
  const outer = true;
  const inner = true;

  return (
    {outer && (
      {inner && (
        # Nested Content
      )}
    )}
  )
}
      `.trim()
        )
            .expectExactContent('# Nested Content')
            .build();

        const result = await runner.runTestCase(testCase);

        expect(result.passed).toBe(true);
        expect(result.details?.actualContent).toBe("# Nested Content");
    });
});

describe('Better-MDX Exact Test Suite Integration', () => {
    const runner = new ExactMDXTestRunner();

    test('Run exact test suite', async () => {
        const suite = createExactMDXTestSuite('Exact Features Suite')
            .addTest(
                createExactMDXTest(
                    'Simple text exact',
                    `
function SimpleTest() {
  return (
    # Hello World
  )
}
          `.trim()
                )
                    .expectExactContent('# Hello World')
                    .build()
            )
            .addTest(
                createExactMDXTest(
                    'With variable exact',
                    `
function VarTest() {
  const name = 'Test';
  return (
    # {{ name }}
  )
}
          `.trim()
                )
                    .expectExactContent('# Test')
                    .build()
            )
            .withSetup(() => {
                console.log('Setting up exact test suite');
            })
            .withTeardown(() => {
                console.log('Cleaning up exact test suite');
            })
            .build();

        const results = await runner.runTestSuite(suite);

        expect(results.length).toBe(2);
        expect(results.every(r => r.passed)).toBe(true);
    });
});
