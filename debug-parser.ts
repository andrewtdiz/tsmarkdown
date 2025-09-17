#!/usr/bin/env bun

import { MDXParser } from './src/parser';

function debugParser() {
  console.log('🔍 Debugging Parser Logic\n');

  const parser = new MDXParser();

  // Simple test case
  const simpleComponent = `function TestComponent({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      Empty
    );
  }
  
  return (
    Items: {{ items.join(', ') }}
  );
}`;

  console.log('Input component:');
  console.log(simpleComponent);
  console.log('\n' + '='.repeat(50) + '\n');

  try {
    const parsed = parser.parse(simpleComponent);
    console.log('✅ Parsed successfully');
    console.log('Function name:', parsed.functionName);
    console.log('Function params:', parsed.functionParams);
    console.log('TypeScript:', parsed.typescript);
    console.log('Markdown:', parsed.markdown);
    console.log('Return statements count:', parsed.returnStatements.length);
    console.log('Return statements:', JSON.stringify(parsed.returnStatements, null, 2));
  } catch (error) {
    console.error('❌ Parse failed:', error);
  }
}

debugParser();
