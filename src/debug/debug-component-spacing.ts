import { parseMDX } from '../parser';
import { compile } from '../compiler';
import { render } from '../renderer';
import { readFileSync } from 'fs';

async function debugComponentSpacing() {
    console.log('🔍 Debugging component spacing issue...\n');

    // Read the actual test file
    const mdxContent = readFileSync('./test/component-features/multiple-components-no-spacing.mdx', 'utf8');
    console.log('📄 Test file content:');
    console.log(mdxContent);
    console.log('\n' + '='.repeat(50) + '\n');

    // Parse, compile, and render
    const parsed = parseMDX(mdxContent);
    console.log('📄 Parsed result:');
    console.log('Conditional blocks:', parsed.conditionalBlocks);
    console.log('JSX expressions:', parsed.jsxExpressions);
    console.log('Markdown:', JSON.stringify(parsed.markdown));
    console.log('\n' + '='.repeat(50) + '\n');

    const compiled = compile(parsed);
    console.log('📄 Compiled result:');
    console.log('Template:', JSON.stringify(compiled.template));
    console.log('Conditional blocks:', compiled.conditionalBlocks);
    console.log('JSX expressions:', compiled.jsxExpressions);
    console.log('\n' + '='.repeat(50) + '\n');

    // Let's trace through the conditional processing step by step
    console.log('📄 Step-by-step conditional processing:');

    // Simulate the conditional processing
    let template = compiled.template;
    console.log('Initial template:', JSON.stringify(template));

    // Process conditional blocks in reverse order
    for (let i = compiled.conditionalBlocks.length - 1; i >= 0; i--) {
        const block = compiled.conditionalBlocks[i];
        const placeholder = `__CONDITIONAL_${i}__`;

        console.log(`\nProcessing conditional block ${i}:`);
        console.log(`  Condition: ${block.condition}`);
        console.log(`  Content: ${JSON.stringify(block.content)}`);
        console.log(`  Placeholder: ${placeholder}`);

        // Evaluate the condition
        const shouldRender = block.condition === 'someTrueCondition' ? true : false;
        console.log(`  Should render: ${shouldRender}`);

        let blockContent = shouldRender ? block.content : '';
        console.log(`  Block content: ${JSON.stringify(blockContent)}`);

        // Replace the placeholder
        const beforeReplace = template;
        template = template.replace(placeholder, blockContent);
        console.log(`  Before replace: ${JSON.stringify(beforeReplace)}`);
        console.log(`  After replace: ${JSON.stringify(template)}`);
    }

    console.log('\nFinal template after conditional processing:', JSON.stringify(template));
    console.log('\n' + '='.repeat(50) + '\n');

    const result = await render(compiled, {}, {}, './test/component-features');
    console.log('📄 Final rendered result:');
    console.log('Content (JSON):', JSON.stringify(result.content));
    console.log('Content (formatted):');
    console.log(result.content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Check what the test expects
    const expectedLines = [
        '# Component Header',
        'This is rendered by a component',
        'This is the main content area.',
        'It contains multiple lines of text.',
        '## Footer Component',
        'End of content'
    ];

    const actualLines = result.content.split('\n');

    console.log('📄 Line-by-line comparison:');
    console.log('Expected lines:', expectedLines.length);
    console.log('Actual lines:', actualLines.length);

    for (let i = 0; i < Math.max(expectedLines.length, actualLines.length); i++) {
        const expected = expectedLines[i] || '[MISSING]';
        const actual = actualLines[i] || '[MISSING]';
        const match = expected === actual ? '✅' : '❌';
        console.log(`${match} Line ${i + 1}: Expected "${expected}", Got "${actual}"`);
    }
}

debugComponentSpacing().catch(console.error);
