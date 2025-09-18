import { parseMDX } from '../parser';
import { compile } from '../compiler';
import { render } from '../renderer';
import { readFileSync } from 'fs';

async function debugConditionalSpacingIssue() {
    console.log('🔍 Debugging conditional spacing issue...\n');

    // Test case 1: Conditional with intentional empty line (should preserve empty line)
    const conditionalWithEmptyLine = `function ConditionalTest() {
  const isVisible = true;

  return (
    # Test

    {isVisible && (
      This should be visible.
    )}
  )
}`;

    console.log('📄 Test 1: Conditional with intentional empty line');
    console.log('Input:');
    console.log(conditionalWithEmptyLine);
    console.log('\n' + '='.repeat(50) + '\n');

    const parsed1 = parseMDX(conditionalWithEmptyLine);
    console.log('📄 Parsed result:');
    console.log('Conditional blocks:', parsed1.conditionalBlocks);
    console.log('Markdown:', JSON.stringify(parsed1.markdown));
    console.log('\n' + '='.repeat(50) + '\n');

    const compiled1 = compile(parsed1);
    console.log('📄 Compiled result:');
    console.log('Template:', JSON.stringify(compiled1.template));
    console.log('\n' + '='.repeat(50) + '\n');

    const result1 = await render(compiled1, {}, {}, './test/core-features');
    console.log('📄 Final rendered result:');
    console.log('Content (JSON):', JSON.stringify(result1.content));
    console.log('Content (formatted):');
    console.log(result1.content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 2: Component test (should remove empty line from false condition)
    const componentTest = `import { Header } from "./test/component-features/Header"
import { Content } from "./test/component-features/Content"
import { Footer } from "./test/component-features/Footer"

function MultipleComponentsNoSpacing() {
  const someFalseCondition = false
  const someTrueCondition = true

  return (
    <@Header />
    { someTrueCondition && (
      <@Content />
    )}
    { someFalseCondition && (
      Don't render me!
    )}
    <@Footer />
  )
}`;

    console.log('📄 Test 2: Component test with false condition');
    const parsed2 = parseMDX(componentTest);
    const compiled2 = compile(parsed2);
    const result2 = await render(compiled2, {}, {}, './test/component-features');
    console.log('Content (JSON):', JSON.stringify(result2.content));
    console.log('Content (formatted):');
    console.log(result2.content);
    console.log('\n' + '='.repeat(50) + '\n');
}

debugConditionalSpacingIssue().catch(console.error);
