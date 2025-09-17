"use strict";
/**
 * Scope validation utilities for Better MDX syntax highlighting tests
 * This module provides utilities to validate scope assignments in grammar patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScopes = validateScopes;
exports.createScopeMatch = createScopeMatch;
exports.parseScopeString = parseScopeString;
exports.scopeMatches = scopeMatches;
exports.formatTestResults = formatTestResults;
exports.validateRequiredScopes = validateRequiredScopes;
/**
 * Validates that actual scopes match expected scopes for a given input
 */
function validateScopes(testCase, actualScopes) {
    const errors = [];
    const { name, expectedScopes } = testCase;
    // Check if we have the expected number of scopes
    if (actualScopes.length !== expectedScopes.length) {
        errors.push(`Expected ${expectedScopes.length} scopes, but got ${actualScopes.length}`);
    }
    // Validate each expected scope
    expectedScopes.forEach((expected, index) => {
        const actual = actualScopes[index];
        if (!actual) {
            errors.push(`Missing scope at index ${index}: ${expected.scope}`);
            return;
        }
        // Check scope name
        if (actual.scope !== expected.scope) {
            errors.push(`Scope mismatch at index ${index}: expected "${expected.scope}", got "${actual.scope}"`);
        }
        // Check position
        if (actual.start !== expected.start) {
            errors.push(`Start position mismatch at index ${index}: expected ${expected.start}, got ${actual.start}`);
        }
        if (actual.end !== expected.end) {
            errors.push(`End position mismatch at index ${index}: expected ${expected.end}, got ${actual.end}`);
        }
        // Check content
        if (actual.content !== expected.content) {
            errors.push(`Content mismatch at index ${index}: expected "${expected.content}", got "${actual.content}"`);
        }
    });
    return {
        testName: name,
        passed: errors.length === 0,
        errors,
        actualScopes,
        expectedScopes
    };
}
/**
 * Creates a scope match object for test cases
 */
function createScopeMatch(scope, start, end, content) {
    return { scope, start, end, content };
}
/**
 * Parses a scope string into its components
 * Example: "source.better-mdx meta.interpolation.better-mdx" -> ["source.better-mdx", "meta.interpolation.better-mdx"]
 */
function parseScopeString(scopeString) {
    return scopeString.split(' ').filter(s => s.length > 0);
}
/**
 * Checks if a scope matches a pattern (supports wildcards)
 */
function scopeMatches(actualScope, expectedPattern) {
    if (expectedPattern === actualScope) {
        return true;
    }
    // Support wildcard matching
    if (expectedPattern.includes('*')) {
        const regex = new RegExp(expectedPattern.replace(/\*/g, '.*'));
        return regex.test(actualScope);
    }
    // Support partial matching (actual scope can have additional parts)
    const expectedParts = parseScopeString(expectedPattern);
    const actualParts = parseScopeString(actualScope);
    return expectedParts.every((part, index) => actualParts[index] === part);
}
/**
 * Formats test results for display
 */
function formatTestResults(results) {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    let output = `\nTest Results: ${passed}/${total} tests passed\n\n`;
    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        output += `${status} ${result.testName}\n`;
        if (!result.passed) {
            result.errors.forEach(error => {
                output += `  - ${error}\n`;
            });
        }
    });
    return output;
}
/**
 * Validates that all required scopes are present in the actual results
 */
function validateRequiredScopes(actualScopes, requiredScopes) {
    const errors = [];
    const actualScopeStrings = actualScopes.map(s => s.scope);
    requiredScopes.forEach(required => {
        const found = actualScopeStrings.some(actual => scopeMatches(actual, required));
        if (!found) {
            errors.push(`Required scope not found: ${required}`);
        }
    });
    return errors;
}
//# sourceMappingURL=scope-validator.js.map