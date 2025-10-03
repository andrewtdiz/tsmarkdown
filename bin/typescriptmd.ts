#!/usr/bin/env node

import { watch } from "../src/index.js";

const args = process.argv.slice(2);
const firstArg = args[0];
const directory = firstArg ? `/${firstArg}` : undefined;

if (directory) {
    await watch({ directory });
} else {
    await watch();
}

