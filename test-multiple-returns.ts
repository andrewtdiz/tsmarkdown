#!/usr/bin/env bun

import { parseMDX } from './src/parser';
import { compile } from './src/compiler';
import { render } from './src/renderer';
import { parseWithTypeScript } from './src/parser/typescript-parser';

async function testMultipleReturns() {
  console.log('🧪 Testing Multiple Return Statements Implementation\n');


  // Test case 1: Empty array handling
  console.log('📋 Test 1: Empty array handling');
  const emptyArrayComponent = `function CommaList({ items }: { items: string[] }) {
  if (items.length === 0) return (
    Empty
  );
  
  return (
    Items: {{ items.join(', ') }}
  );
}`;

  try {
    const tsResult = parseWithTypeScript(emptyArrayComponent);
    if (!tsResult.success || !tsResult.componentSplit) {
      throw new Error(`Parsing failed: ${tsResult.diagnostics.join(', ')}`);
    }
    const parsed = parseMDX(emptyArrayComponent); // Keep old parser for backward compatibility
    console.log('✅ Parsed successfully');
    console.log('Return statements from component scanner:', tsResult.componentSplit.returnStatements.length);
    console.log('TypeScript:', parsed.typescript);
    console.log('Component split return statements:', JSON.stringify(tsResult.componentSplit.returnStatements, null, 2));

    const compiled = compile(parsed);
    console.log('✅ Compiled successfully');

    // Test with empty array
    const result1 = await render(compiled, {}, { items: [] });
    console.log('Empty array result:', result1.content);
    console.log('Expected: "Empty"');
    console.log('Match:', result1.content.trim() === 'Empty' ? '✅' : '❌');

    // Test with items
    const result2 = await render(compiled, {}, { items: ['apple', 'banana'] });
    console.log('Items array result:', result2.content);
    console.log('Expected: "Items: apple, banana"');
    console.log('Match:', result2.content.trim() === 'Items: apple, banana' ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Single item handling
  console.log('📋 Test 2: Single item handling');
  const singleItemComponent = `function CommaList({ items }: { items: string[] }) {
  if (items.length === 0) return (
    Empty
  );
  
  if (items.length === 1) return (
    Single item: {{ items[0] }}
  );
  
  return (
    Multiple items: {{ items.join(', ') }}
  );
}`;

  try {
    const parsed = parseMDX(singleItemComponent);
    console.log('✅ Parsed successfully');
    console.log('Return statements:', parsed.returnStatements.length);

    const compiled = compile(parsed);
    console.log('✅ Compiled successfully');

    // Test with single item
    const result = await render(compiled, {}, { items: ['apple'] });
    console.log('Single item result:', result.content);
    console.log('Expected: "Single item: apple"');
    console.log('Match:', result.content.trim() === 'Single item: apple' ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 3: Complex conditional logic
  console.log('📋 Test 3: Complex conditional logic');
  const complexComponent = `function ConditionalComponent({ data, type }: { data: any; type: string }) {
  const processed = data;
  
  if (!processed) return (
    Error: Unable to process data
  );
  
  if (type === 'simple') return (
    Simple view: {{ processed.name }}
  );
  
  return (
    Complex view: {{ processed.name }}
    
    Details:
    {{ processed.items.map(item => \`- \${item}\`).join('\\n') }}
  );
}`;

  try {
    const parsed = parseMDX(complexComponent);
    console.log('✅ Parsed successfully');
    console.log('Return statements:', parsed.returnStatements.length);

    const compiled = compile(parsed);
    console.log('✅ Compiled successfully');

    // Test with null data
    const result1 = await render(compiled, {}, { data: null, type: 'simple' });
    console.log('Null data result:', result1.content);
    console.log('Expected: "Error: Unable to process data"');
    console.log('Match:', result1.content.trim() === 'Error: Unable to process data' ? '✅' : '❌');

    // Test with simple type
    const result2 = await render(compiled, {}, {
      data: { name: 'Test Item' },
      type: 'simple'
    });
    console.log('Simple type result:', result2.content);
    console.log('Expected: "Simple view: Test Item"');
    console.log('Match:', result2.content.trim() === 'Simple view: Test Item' ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 4: Backward compatibility with single return
  console.log('📋 Test 4: Backward compatibility with single return');
  const singleReturnComponent = `function SimpleComponent({ name }: { name: string }) {
  return (
    Hello {{ name }}!
  );
}`;

  try {
    const parsed = parseMDX(singleReturnComponent);
    console.log('✅ Parsed successfully');
    console.log('Return statements:', parsed.returnStatements.length);

    const compiled = compile(parsed);
    console.log('✅ Compiled successfully');

    const result = await render(compiled, {}, { name: 'World' });
    console.log('Single return result:', result.content);
    console.log('Expected: "Hello World!"');
    console.log('Match:', result.content.trim() === 'Hello World!' ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }

  console.log('\n🎉 Multiple return statements testing completed!');
}

// Run the tests
testMultipleReturns().catch(console.error);
