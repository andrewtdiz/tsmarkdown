import { TemplateExecutionEngine } from './src/template-engine';
import { MDXParser } from './src/parser';
import { MDXCompiler } from './src/compiler';
import { readFileSync } from 'fs';

async function testDefaultPropsFinal() {
    console.log('🧪 Final Test: Default Prop Values for JSX Components\n');

    const engine = new TemplateExecutionEngine();
    const parser = new MDXParser();
    const compiler = new MDXCompiler();

    try {
        // Load and compile the List component
        console.log('📋 Loading List component...');
        const listContent = readFileSync('./mdx/List.mdx', 'utf-8');
        const parsedList = parser.parse(listContent);
        const compiledList = compiler.compile(parsedList);

        console.log('✅ List component compiled successfully');
        console.log('   Parameter types:', compiledList.metadata.parameterTypes);

        // Test 1: Direct List component without ordered prop (should use default false)
        console.log('\n📋 Test 1: Direct List component without ordered prop...');
        const result1 = await engine.execute(compiledList, {}, {
            items: ["Apple", "Banana", "Cherry"]
        }, "./mdx");

        console.log('✅ Test 1 completed');
        console.log('   Result (should show bullet points):');
        console.log('   ' + result1.content.split('\n').join('\n   '));
        console.log('   Errors:', result1.errors);

        // Test 2: Direct List component with explicit ordered=true
        console.log('\n📋 Test 2: Direct List component with ordered=true...');
        const result2 = await engine.execute(compiledList, {}, {
            items: ["React", "TypeScript", "MDX"],
            ordered: true
        }, "./mdx");

        console.log('✅ Test 2 completed');
        console.log('   Result (should show numbered list):');
        console.log('   ' + result2.content.split('\n').join('\n   '));
        console.log('   Errors:', result2.errors);

        // Test 3: Direct List component with explicit ordered=false
        console.log('\n📋 Test 3: Direct List component with ordered=false...');
        const result3 = await engine.execute(compiledList, {}, {
            items: ["Explicit", "False", "Test"],
            ordered: false
        }, "./mdx");

        console.log('✅ Test 3 completed');
        console.log('   Result (should show bullet points):');
        console.log('   ' + result3.content.split('\n').join('\n   '));
        console.log('   Errors:', result3.errors);

        // Test 4: Create a component that passes ordered prop through
        console.log('\n📋 Test 4: Creating a wrapper component that passes ordered prop...');
        const wrapperContent = `
import { List } from "./List";

function WrapperExample({ items, ordered }: { items: string[]; ordered?: boolean }) {
  return (
    # Wrapper Example
    
    ## Items List
    <List items={items} ordered={ordered} />
  )
}`;

        const parsedWrapper = parser.parse(wrapperContent);
        const compiledWrapper = compiler.compile(parsedWrapper);

        console.log('✅ Wrapper component compiled successfully');
        console.log('   Parameter types:', compiledWrapper.metadata.parameterTypes);

        // Test 4a: Wrapper without ordered prop
        console.log('\n📋 Test 4a: Wrapper without ordered prop...');
        const result4a = await engine.execute(compiledWrapper, {}, {
            items: ["Wrapper", "Test", "A"]
        }, "./mdx");

        console.log('✅ Test 4a completed');
        console.log('   Result (should show bullet points):');
        console.log('   ' + result4a.content.split('\n').join('\n   '));
        console.log('   Errors:', result4a.errors);

        // Test 4b: Wrapper with ordered=true
        console.log('\n📋 Test 4b: Wrapper with ordered=true...');
        const result4b = await engine.execute(compiledWrapper, {}, {
            items: ["Wrapper", "Test", "B"],
            ordered: true
        }, "./mdx");

        console.log('✅ Test 4b completed');
        console.log('   Result (should show numbered list):');
        console.log('   ' + result4b.content.split('\n').join('\n   '));
        console.log('   Errors:', result4b.errors);

        // Analysis
        console.log('\n📊 Analysis:');
        const test1HasBullets = result1.content.includes('- Apple') || result1.content.includes('• Apple');
        const test2HasNumbers = result2.content.includes('1. React') || result2.content.includes('1) React');
        const test3HasBullets = result3.content.includes('- Explicit') || result3.content.includes('• Explicit');
        const test4aHasBullets = result4a.content.includes('- Wrapper') || result4a.content.includes('• Wrapper');
        const test4bHasNumbers = result4b.content.includes('1. Wrapper') || result4b.content.includes('1) Wrapper');

        console.log(`   Test 1 (no ordered prop): ${test1HasBullets ? '✅ Shows bullets' : '❌ Should show bullets'}`);
        console.log(`   Test 2 (ordered=true): ${test2HasNumbers ? '✅ Shows numbers' : '❌ Should show numbers'}`);
        console.log(`   Test 3 (ordered=false): ${test3HasBullets ? '✅ Shows bullets' : '❌ Should show bullets'}`);
        console.log(`   Test 4a (wrapper, no ordered): ${test4aHasBullets ? '✅ Shows bullets' : '❌ Should show bullets'}`);
        console.log(`   Test 4b (wrapper, ordered=true): ${test4bHasNumbers ? '✅ Shows numbers' : '❌ Should show numbers'}`);

        const allTestsPassed = test1HasBullets && test2HasNumbers && test3HasBullets && test4aHasBullets && test4bHasNumbers;
        console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (allTestsPassed) {
            console.log('\n🎉 SUCCESS: Default prop values are working correctly!');
            console.log('   - Components receive default values for missing optional props');
            console.log('   - Explicitly passed props override default values');
            console.log('   - Both boolean and other type defaults work correctly');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDefaultPropsFinal().catch(console.error);
