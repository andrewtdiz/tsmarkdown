import { parseMDX } from '../parser';
import { compile } from '../compiler';
import { render } from '../renderer';

async function debugConditionalSpacing() {
    console.log('🔍 Debugging conditional spacing issue...\n');

    // Test case 1: Direct components (no conditionals)
    const directComponents = `import { Header } from "./test/component-features/Header"
import { Content } from "./test/component-features/Content"
import { Footer } from "./test/component-features/Footer"

function DirectComponents() {
  return (
    <@Header />
    <@Content />
    <@Footer />
  )
}`;

    console.log('📄 Test 1: Direct components (no conditionals)');
    const parsed1 = parseMDX(directComponents);
    const compiled1 = compile(parsed1);
    const result1 = await render(compiled1, {}, {}, './test/component-features');
    console.log('Output:');
    console.log(JSON.stringify(result1.content));
    console.log('Formatted:');
    console.log(result1.content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 2: Conditional with JSX component
    const conditionalWithJSX = `import { Header } from "./test/component-features/Header"
import { Content } from "./test/component-features/Content"
import { Footer } from "./test/component-features/Footer"

function ConditionalWithJSX() {
  const someTrueCondition = true;
  return (
    <@Header />
    { someTrueCondition && (
      <@Content />
    )}
    <@Footer />
  )
}`;

    console.log('📄 Test 2: Conditional with JSX component');
    const parsed2 = parseMDX(conditionalWithJSX);
    const compiled2 = compile(parsed2);
    const result2 = await render(compiled2, {}, {}, './test/component-features');
    console.log('Output:');
    console.log(JSON.stringify(result2.content));
    console.log('Formatted:');
    console.log(result2.content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 3: Conditional with text content
    const conditionalWithText = `import { Header } from "./test/component-features/Header"
import { Footer } from "./test/component-features/Footer"

function ConditionalWithText() {
  const someTrueCondition = true;
  return (
    <@Header />
    { someTrueCondition && (
      This is text content
    )}
    <@Footer />
  )
}`;

    console.log('📄 Test 3: Conditional with text content');
    const parsed3 = parseMDX(conditionalWithText);
    const compiled3 = compile(parsed3);
    const result3 = await render(compiled3, {}, {}, './test/component-features');
    console.log('Output:');
    console.log(JSON.stringify(result3.content));
    console.log('Formatted:');
    console.log(result3.content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 4: Conditional with inline JSX (no parentheses)
    const conditionalInline = `import { Header } from "./test/component-features/Header"
import { Content } from "./test/component-features/Content"
import { Footer } from "./test/component-features/Footer"

function ConditionalInline() {
  const someTrueCondition = true;
  return (
    <@Header />
    { someTrueCondition && <@Content />}
    <@Footer />
  )
}`;

    console.log('📄 Test 4: Conditional with inline JSX (no parentheses)');
    const parsed4 = parseMDX(conditionalInline);
    const compiled4 = compile(parsed4);
    const result4 = await render(compiled4, {}, {}, './test/component-features');
    console.log('Output:');
    console.log(JSON.stringify(result4.content));
    console.log('Formatted:');
    console.log(result4.content);
    console.log('\n' + '='.repeat(50) + '\n');
}

debugConditionalSpacing().catch(console.error);
