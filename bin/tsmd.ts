#!/usr/bin/env node
import { Command } from "commander";
import { watch } from "../src/index.js";

const program = new Command();

program
    .name("typescriptmd")
    .description("A type-safe, component-based markdown engine for TypeScript")
    .option("-t, --target <directory>", "Target directory to watch for .tsmd files (relative to pwd)", "tsmd")
    .option("-o, --out <directory>", "Output directory for generated .ts files (relative to pwd)", "tsmd-out")
    .parse(process.argv);

const options = program.opts();

const targetDir = options.target || "tsmd";
const outDir = options.out || "tsmd-out";

await watch({
    directory: targetDir,
    outputDirectory: outDir
});
