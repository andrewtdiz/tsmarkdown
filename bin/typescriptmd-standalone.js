#!/usr/bin/env node

// Standalone TypeScript Markdown watcher
// This script provides a simple interface for users to run the watch command

import { readdir } from "fs/promises";
import { readFileSync, unlinkSync, watch as fsWatch, writeFileSync, mkdirSync, existsSync } from "fs";
import { transpile } from "../dist/src/compiler/full-file-compiler.js";

/**
 * Options for the file watcher
 */
const watchOptions = {
    /** Directory to watch (relative to cwd) */
    directory: process.argv[2] || "/tsmd"
};

async function watch() {
    const directory = watchOptions.directory;
    const cwd = process.cwd();
    const listenDir = directory;
    const dir = `${cwd}${listenDir}`;

    async function processTsmdFile(fileName) {
        const inputFileName = `${dir}/${fileName}`;
        const fileTitle = fileName.split(".")[0];
        const outputFileName = `${dir}/_generated/${fileTitle}.ts`;

        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const generatedDir = `${dir}/_generated`;
        if (!existsSync(generatedDir)) {
            mkdirSync(generatedDir, { recursive: true });
        }

        try {
            const file = readFileSync(inputFileName, "utf8");
            const fullFileResult = await transpile(file);

            writeFileSync(outputFileName, `import { __tsm } from "typescriptmd";\n\n${fullFileResult}`);

        } catch (error) {
            console.error(`❌ Error transpiling ${fileName}:`, error);
        }
    }

    const files = await readdir(dir);
    for (const file of files) {
        if (!file.endsWith(".tsmd")) {
            continue;
        }
        await processTsmdFile(file);
    }

    const watcher = fsWatch(dir, async (event, fullFileName) => {
        console.log(`Detected ${event} in ${fullFileName}`);
        if (!fullFileName) {
            return;
        }
        if (!fullFileName.endsWith(".tsmd")) {
            return;
        }
        const inputFileName = `${dir}/${fullFileName}`;
        const fileTitle = fullFileName.split(".")[0];
        const outputFileName = `${dir}/_generated/${fileTitle}.ts`;
        try {
            const file = readFileSync(inputFileName, "utf8");
        } catch (error) {
            try {
                console.log(`Removing ${outputFileName}`);
                const file = readFileSync(outputFileName, "utf8");
                if (file) {
                    unlinkSync(outputFileName);
                    console.log(`Removed ${outputFileName}`);
                }
            } catch (error) { }
            return;
        }
        await processTsmdFile(fullFileName);
        console.log(`Updated: ${fileTitle}.ts`);
        console.log(`Listening for changes in ${listenDir}...`);
    });

    console.clear();
    console.log(`Starting TypeScript Markdown watcher...`);
    console.log(`Watching directory: ${listenDir}`);
    console.log(`Listening for changes in ${listenDir}...`);

    process.on("SIGINT", () => {
        console.log("SIGINT received, closing watcher");
        watcher.close();
        process.exit(0);
    });

    return watcher;
}

// Parse command line arguments
const args = process.argv.slice(2);
const directory = args[0] || "/tsmd"; // Default to /tsmd if no argument provided

console.log(`Starting TypeScript Markdown watcher...`);
console.log(`Watching directory: ${directory}`);

await watch();
