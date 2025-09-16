import { readFileSync } from "fs";
import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";

const content = readFileSync('./mdx/List.mdx', 'utf-8');
const parser = new MDXParser();
const compiler = new MDXCompiler();

const parsed = parser.parse(content);
console.log('List parsed:', JSON.stringify(parsed, null, 2));
const compiled = compiler.compile(parsed);
console.log('List compiled:', JSON.stringify(compiled, null, 2));
