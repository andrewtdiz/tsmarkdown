/**
 * Scope validation utilities for Better MDX syntax highlighting tests
 * This module provides utilities to validate scope assignments in grammar patterns
 */

export interface ScopeMatch {
    scope: string;
    start: number;
    end: number;
    content: string;
}

export interface TestCase {
    name: string;
    input: string;
    expectedScopes: ScopeMatch[];
    description?: string;
}

export interface TestResult {
    testName: string;
    passed: boolean;
    errors: string[];
    actualScopes: ScopeMatch[];
    expectedScopes: ScopeMatch[];
}

/**
 * Validates that actual scopes match expected scopes for a given input
 */
export function validateScopes(
    testCase: TestCase,
    actualScopes: ScopeMatch[]
): TestResult {
    const errors: string[] = [];
    const { name, expectedScopes } = testCase;

    // Check if we have the expected number of scopes
    if (actualScopes.length !== expectedScopes.length) {
        errors.push(
            `Expected ${expectedScopes.length} scopes, but got ${actualScopes.length}`
        );
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
            errors.push(
                `Scope mismatch at index ${index}: expected "${expected.scope}", got "${actual.scope}"`
            );
        }

        // Check position
        if (actual.start !== expected.start) {
            errors.push(
                `Start position mismatch at index ${index}: expected ${expected.start}, got ${actual.start}`
            );
        }

        if (actual.end !== expected.end) {
            errors.push(
                `End position mismatch at index ${index}: expected ${expected.end}, got ${actual.end}`
            );
        }

        // Check content
        if (actual.content !== expected.content) {
            errors.push(
                `Content mismatch at index ${index}: expected "${expected.content}", got "${actual.content}"`
            );
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
export function createScopeMatch(
    scope: string,
    start: number,
    end: number,
    content: string
): ScopeMatch {
    return { scope, start, end, content };
}

/**
 * Parses a scope string into its components
 * Example: "source.better-mdx meta.interpolation.better-mdx" -> ["source.better-mdx", "meta.interpolation.better-mdx"]
 */
export function parseScopeString(scopeString: string): string[] {
    return scopeString.split(' ').filter(s => s.length > 0);
}

/**
 * Checks if a scope matches a pattern (supports wildcards)
 */
export function scopeMatches(actualScope: string, expectedPattern: string): boolean {
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
export function formatTestResults(results: TestResult[]): string {
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
export function validateRequiredScopes(
    actualScopes: ScopeMatch[],
    requiredScopes: string[]
): string[] {
    const errors: string[] = [];
    const actualScopeStrings = actualScopes.map(s => s.scope);

    requiredScopes.forEach(required => {
        const found = actualScopeStrings.some(actual =>
            scopeMatches(actual, required)
        );

        if (!found) {
            errors.push(`Required scope not found: ${required}`);
        }
    });

    return errors;
}

















