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
export declare function validateScopes(testCase: TestCase, actualScopes: ScopeMatch[]): TestResult;
/**
 * Creates a scope match object for test cases
 */
export declare function createScopeMatch(scope: string, start: number, end: number, content: string): ScopeMatch;
/**
 * Parses a scope string into its components
 * Example: "source.better-mdx meta.interpolation.better-mdx" -> ["source.better-mdx", "meta.interpolation.better-mdx"]
 */
export declare function parseScopeString(scopeString: string): string[];
/**
 * Checks if a scope matches a pattern (supports wildcards)
 */
export declare function scopeMatches(actualScope: string, expectedPattern: string): boolean;
/**
 * Formats test results for display
 */
export declare function formatTestResults(results: TestResult[]): string;
/**
 * Validates that all required scopes are present in the actual results
 */
export declare function validateRequiredScopes(actualScopes: ScopeMatch[], requiredScopes: string[]): string[];
//# sourceMappingURL=scope-validator.d.ts.map