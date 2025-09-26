#!/usr/bin/env node

import { watch } from "../src/utils/watch.js";

// Parse command line arguments
const args = process.argv.slice(2);
const directory = args[0] || "/tsmd"; // Default to /tsmd if no argument provided

console.log(`Starting TypeScript Markdown watcher...`);
console.log(`Watching directory: ${directory}`);

await watch({ directory });
