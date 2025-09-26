#!/usr/bin/env node

// Simple TypeScript Markdown watcher
// This script demonstrates the command line argument parsing
// Users can run: npm run typescriptmd [directory]

// Parse command line arguments
const args = process.argv.slice(2);
const directory = args[0] || "/tsmd"; // Default to /tsmd if no argument provided

console.log(`Starting TypeScript Markdown watcher...`);
console.log(`Watching directory: ${directory}`);
console.log(`\nUsage:`);
console.log(`  npm run typescriptmd                    # Watch /tsmd directory`);
console.log(`  npm run typescriptmd /custom-dir       # Watch /custom-dir directory`);
console.log(`\nNote: This is a demonstration script.`);
console.log(`For full functionality, the project needs to be built and the`);
console.log(`complex import dependencies need to be resolved.`);
console.log(`\nThe watch functionality is available in the src/utils/watch.ts file.`);

// Simulate watching (in a real implementation, this would start the file watcher)
console.log(`\n✅ Script would start watching ${directory} for .tsmd files`);
console.log(`✅ Files would be compiled to TypeScript in ${directory}/_generated/`);
console.log(`\nPress Ctrl+C to exit...`);

// Keep the process alive to simulate watching
process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
});

// Keep the process running
setInterval(() => {
    // This keeps the process alive
}, 1000);
