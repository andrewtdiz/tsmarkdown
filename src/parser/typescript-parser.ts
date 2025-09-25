// TypeScript compiler API parser for TSmd components

import * as ts from 'typescript';
import { locateComponent, splitComponent, type ComponentSplit, type ReturnStatement, extractMultipleReturnContent } from './component-scanner';
import type { ParseContext } from './types';
import { FunctionInfo } from '../parser';

// Shared compiler infrastructure for better performance
const sharedCompilerHost = ts.createCompilerHost({});

// Separate compiler options for different use cases
const parserCompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false
};

const analysisCompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false
};

// Cache for compiled source files to avoid recompilation
const sourceFileCache = new Map<string, ts.SourceFile>();

function getOrCreateSourceFile(fileName: string, source: string, useCache = true): ts.SourceFile {
    if (!useCache) {
        return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
    }

    const cacheKey = `${fileName}:${source.length}`;
    if (!sourceFileCache.has(cacheKey)) {
        const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
        sourceFileCache.set(cacheKey, sourceFile);
        // Limit cache size to prevent memory issues
        if (sourceFileCache.size > 50) {
            const firstKey = sourceFileCache.keys().next().value;
            //@ts-ignore
            sourceFileCache.delete(firstKey);
        }
    }
    return sourceFileCache.get(cacheKey)!;
}

// Pre-compiled regex patterns for better performance
const INTERPOLATION_REGEX = /\{\{([^}]+)\}\}/g;
const HEADER_REGEX = /^(#{1,6})\s+(.*)$/gm;
const RETURN_REGEX = /return\s*\(\s*([\s\S]*?)\s*\)/g;
const HEADER_MATCH_REGEX = /^(#{1,6})\s+(.*)$/;

function convertHeaderToJSX(line: string): string {
    const match = line.match(HEADER_MATCH_REGEX);
    if (match) {
        const level = match[1].length;
        const text = match[2];
        return `<h${level}>${text}</h${level}>`;
    }
    return `<div>${line.trim()}</div>`;
}

export interface TypeScriptParseResult {
    success: boolean;
    ast?: ts.SourceFile; // TypeScript AST
    diagnostics: string[];
    componentSplit?: ComponentSplit;
    tsPrelude?: string;
    markdownBody?: string;
    returnStatements?: ReturnStatement[];
}

export interface TypeScriptParseOptions {
    // Whether to include the markdown body as a stub in the AST
    includeMarkdownStub?: boolean;
    // Whether to preserve the original source structure
    preserveSource?: boolean;
    // Custom file name for error reporting
    fileName?: string;
}

/**
 * Parses a TSmd component using TypeScript compiler API
 * Returns a TypeScript AST for the TypeScript portion and optionally includes
 * a stub for the markdown portion
 */
export function parseWithTypeScript(
    source: string,
    options: TypeScriptParseOptions = {}
): TypeScriptParseResult {
    const {
        includeMarkdownStub = true,
        preserveSource = false,
        fileName = 'component.tsmd'
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
            preserveSource,
            returnStatements: componentSplit.returnStatements
        });

        // Parse the TypeScript portion using TypeScript compiler API
        const sourceFile = getOrCreateSourceFile(fileName, tsSource, false); // Don't cache to avoid interfering with TSmd compilation
        const host = ts.createCompilerHost({});
        const program = ts.createProgram({
            rootNames: [fileName],
            options: parserCompilerOptions,
            host,
        });

        // Check for syntax errors
        const syntaxErrors = program.getSyntacticDiagnostics(sourceFile);
        if (syntaxErrors.length > 0) {
            const errorMessages = syntaxErrors.map(diag =>
                `Line ${diag.start ? ts.getLineAndCharacterOfPosition(sourceFile, diag.start).line + 1 : 'unknown'}: ${diag.messageText}`
            );
            return {
                success: false,
                diagnostics: [
                    'TypeScript parsing failed',
                    ...errorMessages
                ]
            };
        }

        return {
            success: true,
            ast: sourceFile,
            diagnostics,
            componentSplit,
            tsPrelude: componentSplit.tsPrelude,
            markdownBody: componentSplit.markdownBody,
            returnStatements: componentSplit.returnStatements
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
        returnStatements?: ReturnStatement[];
    }
): string {
    const { includeMarkdownStub, markdownBody, preserveSource, returnStatements } = options;

    if (!includeMarkdownStub) {
        // Just return the TypeScript prelude with a simple return statement
        // Check if the prelude already ends with a return statement
        if (tsPrelude.trim().endsWith('return (')) {
            return `${tsPrelude}
    null
);
}`;
        } else {
            return `${tsPrelude}
    return null;
}`;
        }
    }

    if (preserveSource) {
        // Include the markdown body as a template literal for source preservation
        return `${tsPrelude}
    return \`${markdownBody?.replace(/`/g, '\\`') || ''}\`;
}`;
    }

    // If we have return statements, we need to handle them properly
    if (returnStatements && returnStatements.length > 0) {
        // Create a valid TypeScript function with proper return statements
        let functionBody = tsPrelude;

        // Add return statements as valid TypeScript
        for (const returnStmt of returnStatements) {
            if (returnStmt.condition) {
                functionBody += `
    if (${returnStmt.condition}) {
        return null;
    }`;
            } else {
                // If the prelude ends with 'return (', we need to close it properly
                if (functionBody.trim().endsWith('return (')) {
                    functionBody += `
    null
);`;
                } else {
                    functionBody += `
    return null;`;
                }
            }
        }

        return `${functionBody}
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
 * This allows TypeScript to understand the structure without parsing markdown
 */
function createMarkdownStub(markdownBody: string): string {
    // Create a simple JSX element that TypeScript can parse
    return `<div>Markdown content processed by TSmd</div>`;
}

/**
 * Validates that a source can be parsed with TypeScript
 */
export function validateWithTypeScript(source: string): {
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
            preserveSource: false,
            returnStatements: componentSplit.returnStatements
        });

        const sourceFile = ts.createSourceFile(
            'validation.tsmd',
            tsSource,
            ts.ScriptTarget.Latest,
            true // setParentNodes
        );
        const host = ts.createCompilerHost({});
        const program = ts.createProgram({
            rootNames: ['file.ts'],
            options: {},
            host,
        });

        // Check for syntax errors
        const syntaxErrors = program.getSyntacticDiagnostics(sourceFile);
        if (syntaxErrors.length > 0) {
            const errorMessages = syntaxErrors.map(diag =>
                `Line ${diag.start ? ts.getLineAndCharacterOfPosition(sourceFile, diag.start).line + 1 : 'unknown'}: ${diag.messageText}`
            );
            diagnostics.push(...errorMessages);
            return {
                canParse: false,
                diagnostics
            };
        }

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
        const result = parseWithTypeScript(source, {
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
        // Create a TypeScript-compatible source by converting TSmd syntax to valid TypeScript
        const tsSource = convertTSmdToTypeScriptForAnalysis(source);

        // Parse the TypeScript source with JSX support
        const fileName = 'return-analysis.tsx';
        const sourceFile = getOrCreateSourceFile(fileName, tsSource, false); // Don't cache to avoid interfering with TSmd compilation
        const host = ts.createCompilerHost({});
        const program = ts.createProgram({
            rootNames: [fileName],
            options: analysisCompilerOptions,
            host,
        });

        // Check for syntax errors
        const syntaxErrors = program.getSyntacticDiagnostics(sourceFile);
        if (syntaxErrors.length > 0) {
            const errorMessages = syntaxErrors.map(diag =>
                `Line ${diag.start ? ts.getLineAndCharacterOfPosition(sourceFile, diag.start).line + 1 : 'unknown'}: ${diag.messageText}`
            );
            return {
                success: false,
                returnCount: 0,
                returnStatements,
                diagnostics: [
                    'TypeScript parsing failed',
                    ...errorMessages
                ]
            };
        }

        const mainFunctionReturnCount = analyzeReturnsInMainFunction(sourceFile, returnStatements);
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
 * Converts TSmd syntax to valid TypeScript for return statement analysis
 * Replaces TSmd-specific syntax with TypeScript-compatible equivalents
 * Now handles multiple return statements with conditions
 */
function convertTSmdToTypeScriptForAnalysis(source: string): string {
    let converted = source;

    // Convert TSmd interpolation syntax {{ }} to valid JSX expressions
    converted = converted.replace(INTERPOLATION_REGEX, '{$1}');

    // Convert markdown headers to JSX elements
    converted = converted.replace(HEADER_REGEX, '<h$1>$2</h$1>');

    // Handle multiple return statements by converting each one individually
    // This preserves the conditional structure while making the content valid JSX
    converted = converted.replace(RETURN_REGEX, (match, content) => {
        // Convert the content inside return statements to valid JSX
        const jsxElements = content
            .split('\n')
            .map((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // If it's a markdown header, convert to JSX
                if (trimmed.match(/^#{1,6}\s+/)) {
                    return convertHeaderToJSX(trimmed);
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
function analyzeReturnsInMainFunction(ast: ts.SourceFile, returnStatements: Array<{
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
    walkFunctionBody(mainFunction, (node: ts.Node, depth: number) => {
        if (ts.isReturnStatement(node)) {
            const isMainFunction = depth === 0; // Only count returns at the main function level
            const sourceFile = node.getSourceFile();
            const lineAndChar = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            const line = lineAndChar.line + 1; // TypeScript uses 0-based line numbers
            const column = lineAndChar.character;

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
function findMainFunction(ast: ts.SourceFile): ts.FunctionDeclaration | null {
    let mainFunction: ts.FunctionDeclaration | null = null;

    function visit(node: ts.Node): void {
        if (ts.isFunctionDeclaration(node) && !mainFunction) {
            mainFunction = node;
            return;
        }
        ts.forEachChild(node, visit);
    }

    visit(ast);
    return mainFunction;
}

/**
 * Walks the function body and calls a callback for each node
 * Tracks depth to distinguish between main function and nested contexts
 */
function walkFunctionBody(node: ts.Node, callback: (node: ts.Node, depth: number) => void, depth: number): void {
    // Call callback for current node
    callback(node, depth);

    // Determine if we should increase depth for nested contexts
    // Only increase depth for nested functions, not the main function we're analyzing
    const shouldIncreaseDepth =
        (ts.isFunctionDeclaration(node) && depth > 0) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isClassDeclaration(node);

    const nextDepth = shouldIncreaseDepth ? depth + 1 : depth;

    // Recursively process child nodes
    ts.forEachChild(node, (child) => walkFunctionBody(child, callback, nextDepth));
}

/**
 * Extracts parameter information from a function declaration AST node
 */
export function extractParametersFromAST(functionNode: ts.FunctionDeclaration): Array<{ name: string; type: string; required: boolean; defaultValue?: string }> {
    if (!functionNode || !ts.isFunctionDeclaration(functionNode)) {
        return [];
    }

    const parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: string }> = [];

    if (!functionNode.parameters || functionNode.parameters.length === 0) {
        return parameters;
    }

    for (const param of functionNode.parameters) {
        if (ts.isObjectBindingPattern(param.name)) {
            // Handle destructured parameters like { name, isLoggedIn = true }: { name: string; isLoggedIn: boolean }
            // Extract type information from the type annotation
            const typeAnnotation = param.type;
            let typeMap: Map<string, { type: string; optional: boolean }> = new Map();

            if (typeAnnotation && ts.isTypeLiteralNode(typeAnnotation)) {
                // Parse the type literal: { name: string; isLoggedIn: boolean }
                for (const member of typeAnnotation.members) {
                    if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
                        const propName = member.name.text;
                        const propType = extractTypeFromTypeAnnotation(member.type);
                        const isOptional = member.questionToken !== undefined;
                        typeMap.set(propName, { type: propType, optional: isOptional });
                    }
                }
            }

            for (const element of param.name.elements) {
                if (ts.isBindingElement(element)) {
                    const paramInfo = extractParameterInfo(element, typeMap);
                    if (paramInfo) {
                        parameters.push(paramInfo);
                    }
                }
            }
        } else if (ts.isIdentifier(param.name)) {
            // Handle simple parameters like name: string
            //@ts-ignore
            const paramInfo = extractParameterInfo(param, param.type);
            if (paramInfo) {
                parameters.push(paramInfo);
            }
        }
    }

    return parameters;
}

/**
 * Extracts information from a single parameter AST node
 */
function extractParameterInfo(paramNode: ts.BindingElement | ts.Identifier, typeInfo?: ts.TypeNode | Map<string, { type: string; optional: boolean }>): { name: string; type: string; required: boolean; defaultValue?: string } | null {
    let name: string;
    let defaultValue: string | undefined;
    let isOptional = false;

    if (ts.isBindingElement(paramNode)) {
        // Destructured parameter property
        if (ts.isIdentifier(paramNode.name)) {
            name = paramNode.name.text;
        } else {
            return null; // Skip complex binding patterns for now
        }
        //@ts-ignore
        isOptional = paramNode.questionToken !== undefined;

        if (paramNode.initializer) {
            // Has default value: { name = "default" }
            defaultValue = extractDefaultValueFromAST(paramNode.initializer);
        }
    } else if (ts.isIdentifier(paramNode)) {
        // Simple parameter
        name = paramNode.text;
        // For simple parameters, we need to check if they have default values
        // This would require looking at the parent parameter node
    } else {
        return null;
    }

    // Extract type information
    let type = 'any';
    let isTypeOptional = false;

    if (typeInfo instanceof Map) {
        // Type info from type map (for destructured parameters)
        const typeData = typeInfo.get(name);
        if (typeData) {
            type = typeData.type;
            isTypeOptional = typeData.optional;
        }
    } else if (typeInfo) {
        // Direct type annotation
        type = extractTypeFromTypeAnnotation(typeInfo);
    }

    // Determine if parameter is required
    const required = !isOptional && !isTypeOptional && !defaultValue;

    return {
        name,
        type,
        required,
        defaultValue
    };
}

/**
 * Extracts the default value from an AST node
 */
function extractDefaultValueFromAST(node: ts.Expression): string | undefined {
    if (!node) return undefined;

    if (ts.isStringLiteral(node)) {
        return `"${node.text}"`;
    } else if (ts.isNumericLiteral(node)) {
        return node.text;
    } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
        return 'true';
    } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
        return 'false';
    } else if (ts.isIdentifier(node)) {
        return node.text;
    } else {
        // For complex expressions, we might need to reconstruct from source
        return undefined;
    }
}

/**
 * Extracts type information from a TypeScript type annotation
 */
function extractTypeFromTypeAnnotation(typeAnnotation: ts.TypeNode | undefined): string {
    if (!typeAnnotation) return 'any';

    switch (typeAnnotation.kind) {
        case ts.SyntaxKind.StringKeyword:
            return 'string';
        case ts.SyntaxKind.NumberKeyword:
            return 'number';
        case ts.SyntaxKind.BooleanKeyword:
            return 'boolean';
        case ts.SyntaxKind.ArrayType:
            if (ts.isArrayTypeNode(typeAnnotation)) {
                const elementType = extractTypeFromTypeAnnotation(typeAnnotation.elementType);
                return `${elementType}[]`;
            }
            return 'any[]';
        case ts.SyntaxKind.TypeReference:
            if (ts.isTypeReferenceNode(typeAnnotation) && ts.isIdentifier(typeAnnotation.typeName)) {
                return typeAnnotation.typeName.text;
            }
            return 'any';
        case ts.SyntaxKind.UnionType:
            if (ts.isUnionTypeNode(typeAnnotation)) {
                const types = typeAnnotation.types.map(t => extractTypeFromTypeAnnotation(t));
                return types.join(' | ');
            }
            return 'any';
        default:
            return 'any';
    }
}

/**
 * Recursively walks the AST to extract type declarations
 */
function extractTypesFromAST(node: ts.Node, types: string[], interfaces: string[]): void {
    if (ts.isInterfaceDeclaration(node)) {
        interfaces.push(node.name.text);
    }

    if (ts.isTypeAliasDeclaration(node)) {
        types.push(node.name.text);
    }

    // Recursively process child nodes
    ts.forEachChild(node, (child) => extractTypesFromAST(child, types, interfaces));
}

/**
 * Extracts exported functions from the TypeScript AST
 */
export function extractFunctions(ast: ts.SourceFile): FunctionInfo[] {
    const exportedFunctions: FunctionInfo[] = []

    function visit(node: ts.Node): void {
        // Check for function declarations
        if (ts.isFunctionDeclaration(node)) {
            const name = node.name?.text || 'anonymous';
            const isExported = hasExportModifier(node);
            const isDefaultExport = hasDefaultExportModifier(node);
            const isAsync = hasAsyncModifier(node);
            const parameters = extractParametersFromAST(node);
            const returnType = extractReturnTypeFromAST(node);

            const sourceFile = node.getSourceFile();
            const lineAndChar = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

            exportedFunctions.push({
                name,
                isExported,
                isDefaultExport,
                isAsync,
                parameters,
                returnType,
                line: lineAndChar.line + 1, // TypeScript uses 0-based line numbers
                column: lineAndChar.character
            });
        }

        // Check for variable declarations with function expressions
        if (ts.isVariableStatement(node)) {
            const isExported = hasExportModifier(node);
            const isDefaultExport = hasDefaultExportModifier(node);

            // Process all variable declarations, not just exported ones
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    if (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer)) {
                        const name = declaration.name.text;
                        const parameters = extractParametersFromFunctionExpression(declaration.initializer);
                        const returnType = extractReturnTypeFromFunctionExpression(declaration.initializer);

                        const sourceFile = node.getSourceFile();
                        const lineAndChar = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

                        exportedFunctions.push({
                            name,
                            isExported,
                            isDefaultExport,
                            isAsync: hasAsyncModifier(declaration.initializer),
                            parameters,
                            returnType,
                            line: lineAndChar.line + 1,
                            column: lineAndChar.character
                        });
                    }
                }
            }
        }

        // Recursively visit child nodes
        ts.forEachChild(node, visit);
    }

    visit(ast);
    return exportedFunctions;
}

/**
 * Checks if a node has the export modifier
 */
function hasExportModifier(node: ts.Node): boolean {
    //@ts-ignore
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) || false;
}

/**
 * Checks if a node has the default export modifier
 */
function hasDefaultExportModifier(node: ts.Node): boolean {
    //@ts-ignore
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) || false;
}

/**
 * Extracts return type from a function declaration AST node
 */
function extractReturnTypeFromAST(functionNode: ts.FunctionDeclaration): string | undefined {
    if (!functionNode || !ts.isFunctionDeclaration(functionNode)) {
        return undefined;
    }

    if (functionNode.type) {
        return extractTypeFromTypeAnnotation(functionNode.type);
    }

    return undefined;
}

/**
 * Extracts parameters from a function expression or arrow function
 */
function extractParametersFromFunctionExpression(functionNode: ts.FunctionExpression | ts.ArrowFunction): Array<{ name: string; type: string; required: boolean; defaultValue?: string }> {
    if (!functionNode || (!ts.isFunctionExpression(functionNode) && !ts.isArrowFunction(functionNode))) {
        return [];
    }

    const parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: string }> = [];

    if (!functionNode.parameters || functionNode.parameters.length === 0) {
        return parameters;
    }

    for (const param of functionNode.parameters) {
        if (ts.isObjectBindingPattern(param.name)) {
            // Handle destructured parameters
            const typeAnnotation = param.type;
            let typeMap: Map<string, { type: string; optional: boolean }> = new Map();

            if (typeAnnotation && ts.isTypeLiteralNode(typeAnnotation)) {
                for (const member of typeAnnotation.members) {
                    if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
                        const propName = member.name.text;
                        const propType = extractTypeFromTypeAnnotation(member.type);
                        const isOptional = member.questionToken !== undefined;
                        typeMap.set(propName, { type: propType, optional: isOptional });
                    }
                }
            }

            for (const element of param.name.elements) {
                if (ts.isBindingElement(element)) {
                    const paramInfo = extractParameterInfo(element, typeMap);
                    if (paramInfo) {
                        parameters.push(paramInfo);
                    }
                }
            }
        } else if (ts.isIdentifier(param.name)) {
            // Handle simple parameters
            //@ts-ignore
            const paramInfo = extractParameterInfo(param, param.type);
            if (paramInfo) {
                parameters.push(paramInfo);
            }
        }
    }

    return parameters;
}

/**
 * Extracts return type from a function expression or arrow function
 */
function extractReturnTypeFromFunctionExpression(functionNode: ts.FunctionExpression | ts.ArrowFunction): string | undefined {
    if (!functionNode || (!ts.isFunctionExpression(functionNode) && !ts.isArrowFunction(functionNode))) {
        return undefined;
    }

    if (functionNode.type) {
        return extractTypeFromTypeAnnotation(functionNode.type);
    }

    return undefined;
}

/**
 * Checks if a node has the async modifier
 */
function hasAsyncModifier(node: ts.Node): boolean {
    //@ts-ignore
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || false;
}
