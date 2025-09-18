import { parseMDX } from '../parser';
import { compile } from '../compiler';
import { render } from '../renderer';

const mdxContent = `import { processData } from './fixtures/helper.ts';

function RelativeTsImport() {
  const result = processData('Hello World');
  
  return (
    # TypeScript Helper Result
    
    Processed data: {{ result }}
  );
}`;

console.log('=== Debug Full Render Pipeline ===\n');

const parsed = parseMDX(mdxContent);
console.log('1. Parsed markdown:');
console.log(JSON.stringify(parsed.markdown));

const compiled = compile(parsed);
console.log('\n2. Compiled template:');
console.log(JSON.stringify(compiled.template));

// Test with basePath
const basePath = '/Users/andrewdizenzo/better-mdx/test/ts-import-features';
const result = await render(compiled, {}, {}, basePath);

console.log('\n3. Final rendered content:');
console.log(JSON.stringify(result.content));

console.log('\n4. Rendered content lines:');
result.content.split('\n').forEach((line, i) => {
    console.log(`${i + 1}: ${JSON.stringify(line)}`);
});

console.log('\n5. Errors:');
console.log(result.errors);
