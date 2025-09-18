// Using Bun.file() for file operations instead of fs
import { parseMDX } from '../../../parser';
import { compileMDX } from '../../../compiler';

const content = await Bun.file('./mdx/List.mdx').text();

const parsed = parseMDX(content);
console.log('Parsed List component:');
console.log(JSON.stringify(parsed, null, 2));

const compiled = compileMDX(parsed);
console.log('Compiled List component:');
console.log(JSON.stringify(compiled, null, 2));
