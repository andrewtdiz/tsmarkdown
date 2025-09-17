#!/usr/bin/env node

/**
 * Main test runner entry point
 * This script runs all Better MDX syntax highlighting tests
 */

import { runTestSuites, createMockParser } from './test-runner';
import { testSuites } from './baseline-tests';

/**
 * Main function to run all tests
 */
function main(): void {
    console.log('Starting Better MDX Syntax Highlighting Tests...\n');

    try {
        const parser = createMockParser();
        runTestSuites(testSuites, parser);
    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}

export { main };
