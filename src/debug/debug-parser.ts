import { parseMDX } from '../parser';

async function debugParser() {
    console.log('=== Debugging MDX Parser ===\n');

    // Read the MDX file
    const mdxContent = await Bun.file('/Users/andrewdizenzo/better-mdx/test/markdown-features/task-lists.mdx').text();
    console.log('MDX Content:');
    console.log(mdxContent);
    console.log('\n' + '='.repeat(50) + '\n');

    // Parse the content
    const parsed = parseMDX(mdxContent);

    console.log('Parsed Result:');
    console.log('Function name:', parsed.functionName);
    console.log('Function params:', parsed.functionParams);
    console.log('TypeScript:', parsed.typescript);
    console.log('Markdown length:', parsed.markdown.length);
    console.log('Markdown content:');
    console.log(parsed.markdown);
    console.log('\n' + '='.repeat(50) + '\n');

    // Let's manually trace through the parsing logic
    console.log('=== Manual Parsing Trace ===');
    const lines = mdxContent.split('\n');
    let inFunction = false;
    let inReturn = false;
    let braceLevel = 0;
    let markdown = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        console.log(`Line ${i + 1}: "${line}"`);
        console.log(`  Trimmed: "${trimmed}"`);
        console.log(`  inFunction: ${inFunction}, inReturn: ${inReturn}, braceLevel: ${braceLevel}`);

        if (trimmed.startsWith('function ')) {
            const match = trimmed.match(/function\s+(\w+)\s*\(([^)]*)\)/);
            if (match) {
                console.log(`  -> Found function: ${match[1]}`);
                inFunction = true;
            }
            continue;
        }

        if (inFunction && !inReturn) {
            if (trimmed === 'return (') {
                console.log(`  -> Found return statement`);
                inReturn = true;
                continue;
            }
            if (trimmed !== '{') {
                console.log(`  -> Adding to typescript`);
            }
            continue;
        }

        if (inReturn) {
            console.log(`  -> Processing return content`);
            console.log(`  -> trimmed: "${trimmed}"`);
            console.log(`  -> trimmed === ')': ${trimmed === ')'}`);
            console.log(`  -> trimmed.endsWith(')'): ${trimmed.endsWith(')')}`);
            console.log(`  -> braceLevel === 0: ${braceLevel === 0}`);

            // Check if this line contains the closing parenthesis of the return statement
            if (trimmed === ')' && braceLevel === 0) {
                console.log(`  -> Found end of return statement`);
                break;
            }

            // Count braces
            for (const char of line) {
                if (char === '{') braceLevel++;
                if (char === '}') braceLevel--;
            }

            if (braceLevel < 0) {
                console.log(`  -> Brace level < 0, breaking`);
                break;
            }

            markdown += line + '\n';
            console.log(`  -> Added to markdown: "${line}"`);
        }
    }

    console.log('\n=== Final Markdown ===');
    console.log('Length:', markdown.length);
    console.log('Content:');
    console.log(markdown);
}

// Run the debug function
debugParser().catch(console.error);
