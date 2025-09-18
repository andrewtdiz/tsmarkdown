import { parseMDX } from '../parser';
import { compile } from '../compiler';

const mdxContent = `import { processData } from './fixtures/helper.ts';

function RelativeTsImport() {
  const result = processData('Hello World');
  
  return (
    # TypeScript Helper Result
    
    Processed data: {{ result }}
  );
}`;

console.log('=== Debug Template Parsing ===\n');

const parsed = parseMDX(mdxContent);
console.log('Parsed MDX:');
console.log('- Function name:', parsed.functionName);
console.log('- Function params:', parsed.functionParams);
console.log('- Imports:', parsed.imports);
console.log('- TypeScript:', parsed.typescript);
console.log('- Markdown content:');
console.log(JSON.stringify(parsed.markdown));
console.log('\nMarkdown lines:');
parsed.markdown.split('\n').forEach((line, i) => {
    console.log(`${i + 1}: ${JSON.stringify(line)}`);
});

console.log('\n=== Compilation ===\n');
const compiled = compile(parsed);
console.log('Compiled template:');
console.log(JSON.stringify(compiled.template));
console.log('\nCompiled template lines:');
compiled.template.split('\n').forEach((line, i) => {
    console.log(`${i + 1}: ${JSON.stringify(line)}`);
});

console.log('\n=== Interpolations ===\n');
compiled.interpolations.forEach((interp, i) => {
    console.log(`Interpolation ${i + 1}:`);
    console.log(`  Placeholder: ${JSON.stringify(interp.placeholder)}`);
    console.log(`  Expression: ${JSON.stringify(interp.expression)}`);
});
