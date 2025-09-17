#!/usr/bin/env node
"use strict";
/**
 * Main test runner entry point
 * This script runs all Better MDX syntax highlighting tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const test_runner_1 = require("./test-runner");
const baseline_tests_1 = require("./baseline-tests");
/**
 * Main function to run all tests
 */
function main() {
    console.log('Starting Better MDX Syntax Highlighting Tests...\n');
    try {
        const parser = (0, test_runner_1.createMockParser)();
        (0, test_runner_1.runTestSuites)(baseline_tests_1.testSuites, parser);
    }
    catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=run-tests.js.map