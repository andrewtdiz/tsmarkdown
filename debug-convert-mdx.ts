import { compileFullFile } from './src/compiler.ts';
import { analyzeReturnStatements } from './src/parser/parser-utils.ts';

// Test with basic-multiple-returns.mdx
const mdx = await Bun.file('./test/ts-parser-migration/basic-multiple-returns.mdx').text();

console.log('=== ORIGINAL MDX ===');
console.log(mdx);
console.log('\n=== CONVERTED TYPESCRIPT ===');
const fullFileResult = await compileFullFile(mdx);
console.log(fullFileResult.transpiledFile);


