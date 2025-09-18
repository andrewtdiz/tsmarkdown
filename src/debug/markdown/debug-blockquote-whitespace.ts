import { parseMDX } from '../../parser';
import { compile } from '../../compiler';
import { renderComponent } from '../../renderer/render-component';

async function debugBlockquoteWhitespace() {
    console.log('=== Debugging Blockquote Whitespace ===\n');

    const mdxContent = `function BlockQuotes() {
  return (
    # Block Quotes

    ## Simple Block Quote

    > This is a simple block quote.
    > 
    > It can span multiple lines.

    ## Block Quote with Attribution

    > The best way to predict the future is to invent it.
    > 
    > — Alan Kay
  )
}`;

    console.log('1. Original MDX Content:');
    console.log('---');
    console.log(mdxContent);
    console.log('---\n');

    // Parse the MDX
    const parsed = parseMDX(mdxContent);
    console.log('2. Parsed MDX:');
    console.log('---');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('---\n');

    // Compile the MDX
    const compiled = compile(parsed);
    console.log('3. Compiled MDX template:');
    console.log('---');
    console.log(compiled.template);
    console.log('---\n');

    // Render the component
    const result = await renderComponent(compiled);
    console.log('4. Rendered Result:');
    console.log('---');
    console.log(result.content);
    console.log('---\n');

    // Show line-by-line comparison
    console.log('5. Line-by-line comparison:');
    const originalLines = mdxContent.split('\n');
    const renderedLines = result.content.split('\n');

    console.log('Original lines with trailing spaces:');
    originalLines.forEach((line, i) => {
        if (line.includes('>') && line.endsWith(' ')) {
            console.log(`  Line ${i + 1}: "${line}" (length: ${line.length})`);
        }
    });

    console.log('\nRendered lines:');
    renderedLines.forEach((line, i) => {
        if (line.includes('>')) {
            console.log(`  Line ${i + 1}: "${line}" (length: ${line.length})`);
        }
    });

    // Test the specific whitespace trimming
    console.log('\n6. Testing whitespace trimming:');
    const testLine = '> ';
    console.log(`Original: "${testLine}" (length: ${testLine.length})`);
    console.log(`After trimEnd(): "${testLine.trimEnd()}" (length: ${testLine.trimEnd().length})`);
}

// Run the debug function
debugBlockquoteWhitespace().catch(console.error);
