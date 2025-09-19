// ESLint-compatible parser for Better MDX components

import { parse as parseTypeScript } from '@typescript-eslint/typescript-estree';
import { locateComponent, splitComponent, type ComponentSplit } from './component-scanner';
import type { ParseContext } from './types';

export interface ESLintParseResult {
    success: boolean;
    ast?: any; // ESTree AST
    diagnostics: string[];
    componentSplit?: ComponentSplit;
    tsPrelude?: string;
    markdownBody?: string;
}

export interface ESLintParseOptions {
    // Whether to include the markdown body as a stub in the AST
    includeMarkdownStub?: boolean;
    // Whether to preserve the original source structure
    preserveSource?: boolean;
    // Custom file name for error reporting
    fileName?: string;
}

/**
 * Parses a Better MDX component for ESLint compatibility
 * Returns an ESTree AST for the TypeScript portion and optionally includes
 * a stub for the markdown portion
 */
export function parseForESLint(
    source: string,
    options: ESLintParseOptions = {}
): ESLintParseResult {
    const {
        includeMarkdownStub = true,
        preserveSource = false,
        fileName = 'component.bmdx'
    } = options;

    const diagnostics: string[] = [];

    try {
        // First, locate and split the component
        const componentSplit = splitComponent(source);

        if (!componentSplit.hasValidStructure) {
            return {
                success: false,
                diagnostics: [
                    'Component structure validation failed',
                    ...componentSplit.diagnostics
                ]
            };
        }

        // Create a TypeScript-compatible source for parsing
        const tsSource = createTypeScriptSource(componentSplit.tsPrelude, {
            includeMarkdownStub,
            markdownBody: componentSplit.markdownBody,
            preserveSource
        });

        // Parse the TypeScript portion
        const ast = parseTypeScript(tsSource, {
            loc: true,
            range: true,
            tokens: true,
            comment: true,
            jsx: true,
            useJSXTextNode: true,
            filePath: fileName,
            project: undefined, // No project config for now
            tsconfigRootDir: undefined,
            extraFileExtensions: ['.bmdx', '.mdx']
        });

        return {
            success: true,
            ast,
            diagnostics,
            componentSplit,
            tsPrelude: componentSplit.tsPrelude,
            markdownBody: componentSplit.markdownBody
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            diagnostics: [
                'TypeScript parsing failed',
                errorMessage
            ]
        };
    }
}

/**
 * Creates a TypeScript-compatible source from the component parts
 */
function createTypeScriptSource(
    tsPrelude: string,
    options: {
        includeMarkdownStub: boolean;
        markdownBody?: string;
        preserveSource: boolean;
    }
): string {
    const { includeMarkdownStub, markdownBody, preserveSource } = options;

    if (!includeMarkdownStub) {
        // Just return the TypeScript prelude with a simple return statement
        return `${tsPrelude}
    return <div>/* Markdown content processed separately */</div>;
}`;
    }

    if (preserveSource) {
        // Include the markdown body as a template literal for source preservation
        return `${tsPrelude}
    return \`${markdownBody?.replace(/`/g, '\\`') || ''}\`;
}`;
    }

    // Create a stub that represents the markdown content
    const markdownStub = createMarkdownStub(markdownBody || '');

    return `${tsPrelude}
    return ${markdownStub};
}`;
}

/**
 * Creates a JSX stub that represents the markdown content
 * This allows ESLint to understand the structure without parsing markdown
 */
function createMarkdownStub(markdownBody: string): string {
    // For now, create a simple div with a comment indicating markdown content
    // In the future, this could be more sophisticated
    const escapedContent = markdownBody
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

    return `<div>
    {/* Markdown content: ${escapedContent.slice(0, 100)}${escapedContent.length > 100 ? '...' : ''} */}
    <span>Markdown content processed by Better MDX</span>
  </div>`;
}

/**
 * Validates that a source can be parsed for ESLint
 */
export function validateForESLint(source: string): {
    canParse: boolean;
    diagnostics: string[];
    componentSplit?: ComponentSplit;
} {
    const diagnostics: string[] = [];

    try {
        const componentSplit = splitComponent(source);

        if (!componentSplit.hasValidStructure) {
            diagnostics.push(...componentSplit.diagnostics);
            return {
                canParse: false,
                diagnostics
            };
        }

        // Try to parse the TypeScript portion
        const tsSource = createTypeScriptSource(componentSplit.tsPrelude, {
            includeMarkdownStub: false,
            preserveSource: false
        });

        parseTypeScript(tsSource, {
            loc: true,
            range: true,
            tokens: false,
            comment: false,
            jsx: true,
            useJSXTextNode: true,
            filePath: 'validation.bmdx'
        });

        return {
            canParse: true,
            diagnostics,
            componentSplit
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            canParse: false,
            diagnostics: [
                'TypeScript validation failed',
                errorMessage
            ]
        };
    }
}

/**
 * Extracts type information from the TypeScript prelude
 */
export function extractTypeInfo(source: string): {
    success: boolean;
    types: string[];
    interfaces: string[];
    diagnostics: string[];
} {
    const diagnostics: string[] = [];
    const types: string[] = [];
    const interfaces: string[] = [];

    try {
        const result = parseForESLint(source, {
            includeMarkdownStub: false,
            preserveSource: false
        });

        if (!result.success) {
            return {
                success: false,
                types,
                interfaces,
                diagnostics: result.diagnostics
            };
        }

        if (result.ast) {
            extractTypesFromAST(result.ast, types, interfaces);
        }

        return {
            success: true,
            types,
            interfaces,
            diagnostics
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            types,
            interfaces,
            diagnostics: [
                'Type extraction failed',
                errorMessage
            ]
        };
    }
}

/**
 * Analyzes return statements within the main function execution context
 * Excludes return statements from nested functions, callbacks, etc.
 */
export function analyzeReturnStatements(source: string): {
    success: boolean;
    returnCount: number;
    returnStatements: Array<{
        line: number;
        column: number;
        isMainFunction: boolean;
        context: string;
    }>;
    diagnostics: string[];
} {
    const diagnostics: string[] = [];
    const returnStatements: Array<{
        line: number;
        column: number;
        isMainFunction: boolean;
        context: string;
    }> = [];

    try {
        // Create a TypeScript-compatible source by converting MDX syntax to valid TypeScript
        const tsSource = convertMDXToTypeScriptForAnalysis(source);

        // Parse the TypeScript source
        const ast = parseTypeScript(tsSource, {
            loc: true,
            range: true,
            tokens: true,
            comment: true,
            jsx: true,
            useJSXTextNode: true,
            filePath: 'return-analysis.bmdx',
            project: undefined,
            tsconfigRootDir: undefined,
            extraFileExtensions: ['.bmdx', '.mdx']
        });

        const mainFunctionReturnCount = analyzeReturnsInMainFunction(ast, returnStatements);
        return {
            success: true,
            returnCount: mainFunctionReturnCount,
            returnStatements,
            diagnostics
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            returnCount: 0,
            returnStatements,
            diagnostics: [
                'Return statement analysis failed',
                errorMessage
            ]
        };
    }
}

/**
 * Converts MDX syntax to valid TypeScript for return statement analysis
 * Replaces MDX-specific syntax with TypeScript-compatible equivalents
 */
function convertMDXToTypeScriptForAnalysis(source: string): string {
    let converted = source;

    // Convert MDX interpolation syntax {{ }} to JSX expressions
    converted = converted.replace(/\{\{([^}]+)\}\}/g, '{/* MDX interpolation: $1 */}');

    // Convert markdown headers to JSX elements
    converted = converted.replace(/^(#{1,6})\s+(.*)$/gm, '<h$1>{/* MDX header: $2 */}</h$1>');

    // For return statement analysis, we need to preserve the function structure
    // but convert the return content to valid JSX
    // This is a more targeted approach that only affects return statement content

    // Find return statements and convert their content
    const returnRegex = /return\s*\(\s*([\s\S]*?)\s*\)/g;
    converted = converted.replace(returnRegex, (match, content) => {
        // Convert the content inside return statements to valid JSX
        let jsxElements = content
            .split('\n')
            .map((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // If it's a markdown header, convert to JSX
                if (trimmed.match(/^#{1,6}\s+/)) {
                    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
                    if (headerMatch) {
                        const level = headerMatch[1].length;
                        const text = headerMatch[2];
                        return `<h${level}>${text}</h${level}>`;
                    }
                }

                // If it's plain text, wrap in a div
                return `<div>${trimmed}</div>`;
            })
            .filter((line: string) => line);

        // Wrap all elements in a single parent div to satisfy JSX requirements
        const jsxContent = jsxElements.length > 1
            ? `<div>\n${jsxElements.join('\n')}\n</div>`
            : jsxElements[0] || '<div></div>';

        return `return (\n${jsxContent}\n)`;
    });

    return converted;
}

/**
 * Analyzes return statements specifically within the main function body
 * Excludes returns from nested functions, callbacks, arrow functions, etc.
 */
function analyzeReturnsInMainFunction(ast: any, returnStatements: Array<{
    line: number;
    column: number;
    isMainFunction: boolean;
    context: string;
}>): number {
    let mainFunctionReturnCount = 0;

    // Find the main function declaration
    const mainFunction = findMainFunction(ast);
    if (!mainFunction) {
        return 0;
    }

    // Walk the main function body to find return statements
    walkFunctionBody(mainFunction, (node: any, depth: number) => {
        if (node.type === 'ReturnStatement') {
            const isMainFunction = depth === 0; // Only count returns at the main function level
            const line = node.loc?.start?.line || 0;
            const column = node.loc?.start?.column || 0;

            returnStatements.push({
                line,
                column,
                isMainFunction,
                context: depth === 0 ? 'main-function' : `nested-depth-${depth}`
            });

            if (isMainFunction) {
                mainFunctionReturnCount++;
            }
        }
    }, 0);

    return mainFunctionReturnCount;
}

/**
 * Finds the main function declaration in the AST
 */
function findMainFunction(ast: any): any {
    if (!ast || !ast.body || !Array.isArray(ast.body)) {
        return null;
    }

    // Look for the first function declaration
    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration') {
            return node;
        }
    }

    return null;
}

/**
 * Walks the function body and calls a callback for each node
 * Tracks depth to distinguish between main function and nested contexts
 */
function walkFunctionBody(node: any, callback: (node: any, depth: number) => void, depth: number): void {
    if (!node || typeof node !== 'object') {
        return;
    }

    // Call callback for current node
    callback(node, depth);

    // Determine if we should increase depth for nested contexts
    // Only increase depth for nested functions, not the main function we're analyzing
    const shouldIncreaseDepth =
        (node.type === 'FunctionDeclaration' && depth > 0) ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'MethodDefinition' ||
        node.type === 'ClassMethod';

    const nextDepth = shouldIncreaseDepth ? depth + 1 : depth;

    // Recursively process child nodes
    for (const key in node) {
        if (node.hasOwnProperty(key) && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
                node[key].forEach((child: any) => walkFunctionBody(child, callback, nextDepth));
            } else {
                walkFunctionBody(node[key], callback, nextDepth);
            }
        }
    }
}

/**
 * Recursively walks the AST to extract type declarations
 */
function extractTypesFromAST(node: any, types: string[], interfaces: string[]): void {
    if (!node || typeof node !== 'object') {
        return;
    }

    // Extract interface declarations
    if (node.type === 'TSInterfaceDeclaration') {
        interfaces.push(node.id.name);
    }

    // Extract type alias declarations
    if (node.type === 'TSTypeAliasDeclaration') {
        types.push(node.id.name);
    }

    // Recursively process child nodes
    for (const key in node) {
        if (node.hasOwnProperty(key) && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
                node[key].forEach((child: any) => extractTypesFromAST(child, types, interfaces));
            } else {
                extractTypesFromAST(node[key], types, interfaces);
            }
        }
    }
}
