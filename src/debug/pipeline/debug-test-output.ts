import { parseMDX } from '../../parser';
import { compile } from '../../compiler';
import { render } from '../../renderer';
import { readFileSync } from 'fs';

async function debugTestOutput() {
    console.log('🔍 Debugging test output...\n');

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
    console.log('\n' + '='.repeat(50) + '\n');

    const compiled = compile(parsed);
    console.log('📄 Compiled result:');
    console.log('Template:', JSON.stringify(compiled.template));
    console.log('Conditional blocks:', compiled.conditionalBlocks);
    console.log('JSX expressions:', compiled.jsxExpressions);
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
        '',
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

debugTestOutput().catch(console.error);
