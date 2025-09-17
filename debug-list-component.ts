import { readFileSync } from "fs";
import { parseMDX } from "./src/parser";
import { compile } from "./src/compiler";

const content = readFileSync('./mdx/List.mdx', 'utf-8');

const parsed = parseMDX(content);
console.log('List parsed:', JSON.stringify(parsed, null, 2));
const compiled = compile(parsed);
console.log('List compiled:', JSON.stringify(compiled, null, 2));
