// Using Bun.file() for file operations instead of fs
import { parseMDX } from "./src/parser";
import { compileMDX } from "./src/compiler";
import { renderMDX } from "./src/renderer";


async function runTest(name: string, mdxContent: string, context?: any, props?: any, basePath?: string) {
  console.log(`\n=== ${name} ===`);
  console.log("MDX Input:");
  console.log(mdxContent);
  console.log("\nOutput:");

  try {
    const parsed = parseMDX(mdxContent);
    const compiled = compileMDX(parsed);
    const result = await renderMDX(compiled, context || {}, props, basePath);
    console.log(result.content);

    if (result.errors && result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach(error => console.log(`- ${error}`));
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Test 1: Basic interpolation
runTest(
  "Basic Interpolation",
  `
function BasicTest() {
  const greeting = 'Hello';
  const name = 'World';

  return (
    # {{ greeting }} {{ name }}!
  )
}
  `.trim()
);

// Test 2: Conditional rendering - truthy
runTest(
  "Conditional Rendering - Truthy",
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
);

// Test 3: Conditional rendering - falsy
runTest(
  "Conditional Rendering - Falsy",
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
);

// Test 4: Complex expressions
runTest(
  "Complex Expressions",
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
);

// Test 5: Context integration - logged in
runTest(
  "Context Integration - Logged In",
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
  `.trim(),
  {
    useAuth: () => ({
      user: { name: 'Bob' },
      isLoggedIn: true
    })
  }
);

// Test 6: Context integration - not logged in
runTest(
  "Context Integration - Not Logged In",
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
  `.trim(),
  {
    useAuth: () => ({
      user: {},
      isLoggedIn: false
    })
  }
);

// Test 7: Error handling
runTest(
  "Error Handling",
  `
function ErrorTest() {
  const data = undefined;

  return (
    # Test

    Value: {{ data.nonexistent.property }}
  )
}
  `.trim()
);

// Test 8: Complex nested conditionals
runTest(
  "Complex Nested Conditionals",
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
);

// Test 11: Large content performance
const items = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`); // Reduced for readability
runTest(
  "Large Content Performance (100 items)",
  `
function LargeTest() {
  const items = ${JSON.stringify(items)};

  return (
    # Large Content Test
    {{ items.map((item, index) => (
      - {{ item }}
    ))}}

    Total items: {{ items.length }}
  )
}
  `.trim()
);