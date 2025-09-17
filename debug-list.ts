import { readFileSync } from 'fs';
import { parseMDX } from './src/parser';
import { compileMDX } from './src/compiler';

const content = readFileSync('./mdx/List.mdx', 'utf-8');

const parsed = parseMDX(content);
console.log('Parsed List component:');
console.log(JSON.stringify(parsed, null, 2));

const compiled = compileMDX(parsed);
console.log('Compiled List component:');
console.log(JSON.stringify(compiled, null, 2));
