import { parseMDX } from '../parser';
import { compile } from '../compiler';
import { extractDependencies } from '../compiler/compiler-utils';

const mdxContent1 = `import { processData } from './fixtures/helper.ts';

function RelativeTsImport() {
  const result = processData('Hello World');
  
  return (
    # TypeScript Helper Result
    
    Processed data: {{ result }}
  );
}`;

const mdxContent2 = `import { calculateValue } from './fixtures/calculator';

function RelativeNoExtension() {
  const result = calculateValue();
  
  return (
    # Auto-resolved TypeScript
    
    Function result: {{ result }}
  );
}`;

console.log('=== Debug Dependency Extraction ===\n');

console.log('Test 1: Import with extension');
const parsed1 = parseMDX(mdxContent1);
console.log('Imports:', parsed1.imports);
const dependencies1 = extractDependencies(parsed1.imports);
console.log('Extracted dependencies:', dependencies1);

console.log('\nTest 2: Import without extension');
const parsed2 = parseMDX(mdxContent2);
console.log('Imports:', parsed2.imports);
const dependencies2 = extractDependencies(parsed2.imports);
console.log('Extracted dependencies:', dependencies2);

console.log('\nTest 3: Compiled dependencies');
const compiled1 = compile(parsed1);
console.log('Compiled 1 dependencies:', compiled1.dependencies);

const compiled2 = compile(parsed2);
console.log('Compiled 2 dependencies:', compiled2.dependencies);

