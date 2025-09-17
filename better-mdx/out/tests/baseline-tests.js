"use strict";
/**
 * Baseline test cases for Better MDX syntax highlighting
 * These tests establish the foundation for validating grammar patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSuites = exports.markdownTests = exports.expressionTests = exports.functionDeclarationTests = exports.interpolationTests = exports.basicSyntaxTests = void 0;
const scope_validator_1 = require("./scope-validator");
/**
 * Basic syntax element tests
 */
exports.basicSyntaxTests = [
    {
        name: 'Basic string interpolation',
        input: 'Hello {{ name }}!',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.interpolation.better-mdx', 6, 16, '{{ name }}'),
            (0, scope_validator_1.createScopeMatch)('source.better-mdx variable.other.interpolation.better-mdx', 8, 14, ' name ')
        ],
        description: 'Tests basic string interpolation with variable name'
    },
    {
        name: 'Basic JavaScript expression',
        input: 'Count: { count }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.expression.better-mdx', 7, 15, '{ count }')
        ],
        description: 'Tests basic JavaScript expression syntax'
    },
    {
        name: 'Function declaration',
        input: 'function myFunction() { return "hello"; }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.function.declaration.better-mdx', 0, 20, 'function myFunction()')
        ],
        description: 'Tests function declaration syntax'
    },
    {
        name: 'Import statement',
        input: 'import { Component } from "react";',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.import.better-mdx', 0, 33, 'import { Component } from "react";')
        ],
        description: 'Tests import statement syntax'
    },
    {
        name: 'Markdown header',
        input: '# My Header',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx markup.heading.better-mdx', 0, 10, '# My Header')
        ],
        description: 'Tests markdown header syntax'
    },
    {
        name: 'String literal',
        input: 'const message = "Hello World";',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx string.quoted.double.better-mdx', 16, 28, '"Hello World"')
        ],
        description: 'Tests string literal syntax'
    },
    {
        name: 'Single line comment',
        input: '// This is a comment',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx comment.line.double-slash.better-mdx', 0, 20, '// This is a comment')
        ],
        description: 'Tests single line comment syntax'
    }
];
/**
 * String interpolation specific tests
 */
exports.interpolationTests = [
    {
        name: 'Simple variable interpolation',
        input: '{{ variableName }}',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.interpolation.better-mdx', 0, 18, '{{ variableName }}'),
            (0, scope_validator_1.createScopeMatch)('source.better-mdx variable.other.interpolation.better-mdx', 2, 16, ' variableName ')
        ],
        description: 'Tests simple variable interpolation'
    },
    {
        name: 'Interpolation with expression',
        input: '{{ count + 1 }}',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.interpolation.better-mdx', 0, 15, '{{ count + 1 }}'),
            (0, scope_validator_1.createScopeMatch)('source.better-mdx variable.other.interpolation.better-mdx', 2, 13, ' count + 1 ')
        ],
        description: 'Tests interpolation with arithmetic expression'
    },
    {
        name: 'Nested interpolation',
        input: '{{ user.{{ field }} }}',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.interpolation.better-mdx', 0, 20, '{{ user.{{ field }} }}'),
            (0, scope_validator_1.createScopeMatch)('source.better-mdx variable.other.interpolation.better-mdx', 2, 18, ' user.{{ field }} ')
        ],
        description: 'Tests nested interpolation patterns'
    }
];
/**
 * Function declaration tests
 */
exports.functionDeclarationTests = [
    {
        name: 'Basic function declaration',
        input: 'function myFunction() { return "hello"; }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.function.declaration.better-mdx', 0, 20, 'function myFunction()')
        ],
        description: 'Tests basic function declaration'
    },
    {
        name: 'Function with typed parameters',
        input: 'function add(a: number, b: number): number { return a + b; }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.function.declaration.better-mdx', 0, 45, 'function add(a: number, b: number): number')
        ],
        description: 'Tests function with TypeScript type annotations'
    },
    {
        name: 'Arrow function declaration',
        input: 'const multiply = (x: number, y: number) => x * y;',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.function.declaration.better-mdx', 6, 35, 'multiply = (x: number, y: number)')
        ],
        description: 'Tests arrow function declaration'
    }
];
/**
 * JavaScript expression tests
 */
exports.expressionTests = [
    {
        name: 'Simple variable expression',
        input: '{ variableName }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.expression.better-mdx', 0, 15, '{ variableName }')
        ],
        description: 'Tests simple variable expression'
    },
    {
        name: 'Conditional expression',
        input: '{ condition ? "yes" : "no" }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.expression.better-mdx', 0, 30, '{ condition ? "yes" : "no" }')
        ],
        description: 'Tests ternary conditional expression'
    },
    {
        name: 'Function call expression',
        input: '{ formatDate(date) }',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx meta.expression.better-mdx', 0, 20, '{ formatDate(date) }')
        ],
        description: 'Tests function call within expression'
    }
];
/**
 * Markdown syntax tests
 */
exports.markdownTests = [
    {
        name: 'H1 header',
        input: '# Main Title',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx markup.heading.better-mdx', 0, 12, '# Main Title')
        ],
        description: 'Tests H1 header syntax'
    },
    {
        name: 'H3 header',
        input: '### Section Title',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx markup.heading.better-mdx', 0, 16, '### Section Title')
        ],
        description: 'Tests H3 header syntax'
    },
    {
        name: 'Bold text',
        input: 'This is **bold** text',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx markup.bold.better-mdx', 8, 16, '**bold**')
        ],
        description: 'Tests bold text syntax'
    },
    {
        name: 'Italic text',
        input: 'This is *italic* text',
        expectedScopes: [
            (0, scope_validator_1.createScopeMatch)('source.better-mdx markup.italic.better-mdx', 8, 16, '*italic*')
        ],
        description: 'Tests italic text syntax'
    }
];
/**
 * Test suites for different feature areas
 */
exports.testSuites = [
    {
        name: 'Basic Syntax Elements',
        tests: exports.basicSyntaxTests
    },
    {
        name: 'String Interpolation',
        tests: exports.interpolationTests
    },
    {
        name: 'Function Declarations',
        tests: exports.functionDeclarationTests
    },
    {
        name: 'JavaScript Expressions',
        tests: exports.expressionTests
    },
    {
        name: 'Markdown Syntax',
        tests: exports.markdownTests
    }
];
//# sourceMappingURL=baseline-tests.js.map