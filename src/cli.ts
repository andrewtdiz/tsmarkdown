#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { MDXParser } from './parser';
import { MDXCompiler } from './compiler';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'compile') {
  const mdxPath = args[1] || './mdx/SimpleComponent.mdx';

  try {
    const fullPath = resolve(mdxPath);
    const content = readFileSync(fullPath, 'utf-8');

    console.log('📄 Parsing MDX file:', fullPath);

    const parser = new MDXParser();
    const parsed = parser.parse(content);

    console.log('\n🔍 Parsed Result:');
    console.log('Imports:', parsed.imports);
    console.log('Function Name:', parsed.functionName);
    console.log('TypeScript Code:');
    console.log(parsed.typescript);
    console.log('Markdown Content:');
    console.log(parsed.markdown);
    console.log('Interpolations:', parsed.interpolations);
    console.log('Conditional Blocks:', parsed.conditionalBlocks);

    const compiler = new MDXCompiler();
    const compiled = compiler.compile(parsed);

    console.log('\n🎯 Compiled Output:');
    console.log(JSON.stringify(compiled, null, 2));

    // Write to output file
    const outputDir = './dist';
    const fileName = basename(fullPath, '.mdx') + '.json';
    const outputPath = resolve(outputDir, fileName);

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, JSON.stringify(compiled, null, 2));

    console.log(`\n💾 Saved compiled output to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
} else {
  console.log('Better-MDX Compiler');
  console.log('Usage: bun run src/cli.ts compile [path/to/file.mdx]');
}