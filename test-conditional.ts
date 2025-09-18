import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with different contexts
const testFile = "./mdx/ConditionalExample.mdx";
const content = await Bun.file(testFile).text();

console.log("=== PARSING PHASE ===");
const parsed = parse(content);
console.log("Parsed AST:", JSON.stringify(parsed, null, 2));

console.log("\n=== COMPILATION PHASE ===");
const compiled = compile(parsed);
console.log("Compiled code:", compiled);

console.log("\n=== RENDERING TESTS ===");

// Test 1: Default scenario (user logged in, showWelcome true)
console.log("\n--- Test 1: Default scenario (logged in, showWelcome true) ---");
const result1 = await render(compiled, {}, {}, "./mdx");
console.log(result1.content);

// Test 2: Test with different user context (simulate not logged in)
console.log("\n--- Test 2: Simulate user not logged in ---");
// We'll modify the component to test the !isLoggedIn condition
const modifiedContent = content.replace(
  'const isLoggedIn = user !== null;',
  'const isLoggedIn = false;'
);
const parsed2 = parse(modifiedContent);
const compiled2 = compile(parsed2);
const result2 = await render(compiled2, {}, {}, "./mdx");
console.log(result2.content);

// Test 3: Test with showWelcome false
console.log("\n--- Test 3: User logged in but showWelcome false ---");
const modifiedContent3 = content.replace(
  'const showWelcome = true;',
  'const showWelcome = false;'
);
const parsed3 = parse(modifiedContent3);
const compiled3 = compile(parsed3);
const result3 = await render(compiled3, {}, {}, "./mdx");
console.log(result3.content);

// Test 4: Test with different user data
console.log("\n--- Test 4: Different user data ---");
const modifiedContent4 = content.replace(
  'name: "Alice Johnson",',
  'name: "Bob Smith",'
).replace(
  "items: ['Apple', 'Banana', 'Orange']",
  "items: ['Grape', 'Strawberry', 'Blueberry']"
);
const parsed4 = parse(modifiedContent4);
const compiled4 = compile(parsed4);
const result4 = await render(compiled4, {}, {}, "./mdx");
console.log(result4.content);

// Test 5: Test timing (measure async execution)
console.log("\n--- Test 5: Timing test ---");
const startTime = Date.now();
const result5 = await render(compiled, {}, {}, "./mdx");
const endTime = Date.now();
console.log(`Execution time: ${endTime - startTime}ms`);
console.log(result5.content);

// Test 6: Test with empty items array
console.log("\n--- Test 6: Empty items array ---");
const modifiedContent6 = content.replace(
  "items: ['Apple', 'Banana', 'Orange']",
  "items: []"
);
const parsed6 = parse(modifiedContent6);
const compiled6 = compile(parsed6);
const result6 = await render(compiled6, {}, {}, "./mdx");
console.log(result6.content);

console.log("\n=== ALL TESTS COMPLETED ===");
