/**
 * Full-File Compiler
 * 
 * This module provides functionality to compile an entire TypeScript source file,
 * processing template syntax both inside and outside of function definitions.
 */

import * as ts from 'typescript';
import { ParsedMDX } from '../parser';
import { compile } from '../compiler';
import { extractFunctions } from '../parser/typescript-parser';
import { parseContent } from '../parser/pipeline';
import { protectCodeBlocks, restoreCodeBlocks } from '../parser/code-protection';
import { normalizeIndentation } from '../renderer/string-helpers';

/**
 * Preprocesses MDX syntax within functions to make them parseable by TypeScript
 */
function preprocessMDXInFunctions(source: string): string {
    // Find all return statements with MDX syntax and convert them to template literals
    // This handles patterns like: return (content with {{ interpolation }})

    let processedSource = source;

    // Find return statements with parentheses that contain multi-line content
    // This regex matches return ( followed by any content until the matching closing paren
    const returnWithParensRegex = /return\s*\(\s*([\s\S]*?)\s*\)/g;

    processedSource = processedSource.replace(returnWithParensRegex, (match, content) => {
        // Check if the content contains MDX syntax (headers, interpolations, etc.)
        const hasMDXSyntax = /(^#{1,6}\s|\{\{[^}]+\}\})/m.test(content);

        if (hasMDXSyntax) {
            // Convert MDX syntax to valid TypeScript template literal
            let templateContent = content
                .trim()
                // Escape backticks and dollar signs for template literals
                .replace(/`/g, '\\`')
                .replace(/\$/g, '\\$')
                // Convert {{ }} to ${ } for template literals
                .replace(/\{\{([^}]+)\}\}/g, '${$1}');

            return 'return `' + templateContent + '`';
        }

        // If no MDX syntax, return as-is
        return match;
    });

    return processedSource;
}

export interface FullFileCompilationResult {
    functions: Array<{
        functionInfo: {
            name: string;
            isExported: boolean;
            isDefaultExport: boolean;
            parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
            returnType?: string;
            line: number;
            column: number;
        };
        compiled: any;
    }>;
    globalTemplates: Array<{
        variableName: string;
        isExported: boolean;
        originalValue: string;
        transpiledValue: string;
        interpolations: Array<{ placeholder: string; expression: string }>;
        conditionalBlocks: Array<{ condition: string; content: string }>;
        ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
        jsxExpressions: Array<{ placeholder: string; expression: string }>;
    }>;
    transpiledFile: string;
    errors: string[];
}

/**
 * Compiles an entire TypeScript source file, processing template syntax everywhere
 */
export async function compileFullFile(source: string): Promise<FullFileCompilationResult> {
    const errors: string[] = [];
    const functions: Array<{ functionInfo: any; compiled: any }> = [];
    const globalTemplates: Array<any> = [];

    try {
        // Preprocess MDX syntax within functions first
        const preprocessedSource = preprocessMDXInFunctions(source);

        // Use TypeScript compiler API with the preprocessed source
        const sourceFile = ts.createSourceFile(
            'input.ts',
            preprocessedSource,
            ts.ScriptTarget.Latest,
            true
        );

        // First, process all global template syntax outside of functions
        const { processedSource, templates } = await processGlobalTemplates(sourceFile);

        // Store the global templates
        globalTemplates.push(...templates);

        // Create a new source file with the processed global templates
        const processedSourceFile = ts.createSourceFile(
            'processed.ts',
            processedSource,
            ts.ScriptTarget.Latest,
            true
        );

        // Now extract and compile functions from the processed source
        const allFunctions = extractFunctions(processedSourceFile);

        for (const functionInfo of allFunctions) {
            try {
                // Extract the actual function content from the AST
                const { typescript, returnStatements, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractFunctionContent(processedSourceFile, functionInfo.name);

                // Create ParsedMDX for each function
                const markdownContent = returnStatements.length > 0 ? returnStatements[0].content : `# ${functionInfo.name} Content`;

                const parsed: ParsedMDX = {
                    imports: [],
                    functionName: functionInfo.name,
                    functionParams: functionInfo.parameters.map(p => p.name),
                    typescript: typescript,
                    markdown: markdownContent,
                    interpolations: interpolations,
                    conditionalBlocks: conditionalBlocks,
                    ternaryExpressions: ternaryExpressions,
                    jsxExpressions: jsxExpressions,
                    returnStatements: returnStatements,
                    propsInterface: functionInfo.parameters.length > 0 ?
                        `interface ${functionInfo.name}Props {\n  ${functionInfo.parameters.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(';\n  ')}\n}` : '',
                    parameterTypes: functionInfo.parameters
                };

                const compiled = compile(parsed);
                functions.push({ functionInfo, compiled });
            } catch (error: any) {
                errors.push(`Failed to compile function ${functionInfo.name}: ${error.message}`);
            }
        }

        // Generate the complete transpiled file
        const transpiledFile = generateTranspiledFile(processedSourceFile, globalTemplates, functions);

        return {
            functions,
            globalTemplates,
            transpiledFile,
            errors
        };

    } catch (error: any) {
        errors.push(`Failed to parse TypeScript source: ${error.message}`);
        return {
            functions: [],
            globalTemplates: [],
            transpiledFile: '',
            errors
        };
    }
}

/**
 * Processes global template syntax outside of functions
 */
async function processGlobalTemplates(sourceFile: ts.SourceFile): Promise<{ processedSource: string; templates: any[] }> {
    const templates: any[] = [];
    let processedSource = sourceFile.getFullText();

    // Find all variable declarations at the top level
    function visit(node: ts.Node): void {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    const variableName = declaration.name.text;
                    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

                    // Get the raw source text for the initializer, since TypeScript parser may truncate MDX syntax
                    const sourceText = sourceFile.getFullText();
                    const initializerStart = declaration.initializer.getStart();
                    const initializerEnd = declaration.initializer.getEnd();
                    let initializerText = sourceText.slice(initializerStart, initializerEnd);

                    // For parentheses expressions, we need to manually find the matching closing parenthesis
                    if (initializerText.startsWith('(') && !initializerText.endsWith(')')) {
                        // Find the matching closing parenthesis manually
                        let parenCount = 0;
                        let endPos = initializerStart;
                        let foundStart = false;

                        for (let i = initializerStart; i < sourceText.length; i++) {
                            if (sourceText[i] === '(') {
                                parenCount++;
                                foundStart = true;
                            } else if (sourceText[i] === ')') {
                                parenCount--;
                                if (parenCount === 0 && foundStart) {
                                    endPos = i;
                                    break;
                                }
                            }
                        }
                        initializerText = sourceText.slice(initializerStart, endPos + 1);
                    }


                    if (containsTemplateSyntax(initializerText)) {
                        // Extract and process the template content
                        const templateResult = processTemplateInExpression(initializerText, sourceFile);

                        if (templateResult) {
                            templates.push({
                                variableName,
                                isExported,
                                originalValue: initializerText,
                                transpiledValue: templateResult.transpiled,
                                interpolations: templateResult.interpolations,
                                conditionalBlocks: templateResult.conditionalBlocks,
                                ternaryExpressions: templateResult.ternaryExpressions,
                                jsxExpressions: templateResult.jsxExpressions
                            });

                            // Replace the original expression with the transpiled version
                            const originalStart = declaration.initializer!.getStart();
                            const originalEnd = declaration.initializer!.getEnd();
                            processedSource = processedSource.substring(0, originalStart) +
                                templateResult.transpiled +
                                processedSource.substring(originalEnd);
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return { processedSource, templates };
}

/**
 * Checks if an expression contains template syntax
 */
function containsTemplateSyntax(expression: string): boolean {
    // Check for parentheses template syntax (*...*) - can contain nested braces
    const parenTemplateRegex = /\(\*[\s\S]*?\*\)/;
    return parenTemplateRegex.test(expression);
}

/**
 * Processes template syntax in an expression and returns the transpiled version
 */
function processTemplateInExpression(expression: string, sourceFile: ts.SourceFile): {
    transpiled: string;
    interpolations: Array<{ placeholder: string; expression: string }>;
    conditionalBlocks: Array<{ condition: string; content: string }>;
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
    jsxExpressions: Array<{ placeholder: string; expression: string }>;
} | null {

    // Find parentheses template syntax (*...*) - can contain nested braces
    const parenTemplateMatch = expression.match(/\(\*([\s\S]*?)\*\)/);

    if (!parenTemplateMatch) {
        return null;
    }

    const templateContent = parenTemplateMatch[1];

    // Process the template content using the existing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(templateContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    // Convert the processed content to a template literal
    const transpiled = convertToTemplateLiteral(processedContent, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions);

    return {
        transpiled,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

/**
 * Converts processed content to a template literal with proper substitutions
 */
function convertToTemplateLiteral(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
    jsxExpressions: Array<{ placeholder: string; expression: string }>
): string {
    let result = content;

    // Replace interpolations with template literal syntax
    interpolations.forEach(({ placeholder, expression }) => {
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
    });

    // Replace conditional blocks - these need special handling since they're not simple substitutions
    conditionalBlocks.forEach(({ condition, content: blockContent }, index) => {
        const placeholder = `__CONDITIONAL_${index}__`;
        // For conditional blocks, we need to handle them specially
        // This is a simplified approach - in practice, you might want more sophisticated handling
        const conditionalExpression = `${condition} ? \`${blockContent}\` : ''`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), conditionalExpression);
    });

    // Replace ternary expressions
    ternaryExpressions.forEach(({ condition, trueValue, falseValue }, index) => {
        const placeholder = `__TERNARY_${index}__`;
        const ternaryExpression = `${condition} ? \`${trueValue}\` : \`${falseValue}\``;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ternaryExpression);
    });

    // Replace JSX expressions
    jsxExpressions.forEach(({ placeholder, expression }) => {
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), expression);
    });

    // Return the result without wrapping in backticks (they're already handled elsewhere)
    return result;
}

/**
 * Extracts regular TypeScript variables (non-template, non-function)
 */
function extractRegularVariables(
    sourceFile: ts.SourceFile,
    globalTemplates: any[],
    functions: Array<{ functionInfo: any; compiled: any }>
): Array<{ text: string; isExported: boolean }> {
    const regularVariables: Array<{ text: string; isExported: boolean }> = [];
    const processedStatements = new Set<string>();

    // Get names of variables that are already processed as templates or functions
    const processedNames = new Set([
        ...globalTemplates.map(t => t.variableName),
        ...functions.map(f => f.functionInfo.name)
    ]);

    function visit(node: ts.Node, depth: number = 0): void {
        if (ts.isVariableStatement(node)) {
            // Only process top-level variable statements (depth 0)
            if (depth === 0) {
                const statementText = node.getText(sourceFile);

                // Skip if we've already processed this statement
                if (processedStatements.has(statementText)) {
                    return;
                }

                // Check if any variable in this statement is already processed
                let hasProcessedVariable = false;
                for (const declaration of node.declarationList.declarations) {
                    if (ts.isIdentifier(declaration.name)) {
                        if (processedNames.has(declaration.name.text)) {
                            hasProcessedVariable = true;
                            break;
                        }
                    }
                }

                if (hasProcessedVariable) {
                    return;
                }

                // Check if this statement contains template syntax
                if (statementText.includes('(*') || statementText.includes('{{')) {
                    return;
                }

                // This is a regular top-level variable statement
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

                regularVariables.push({
                    text: statementText,
                    isExported
                });

                processedStatements.add(statementText);
            }
        }

        // Increase depth when entering function bodies
        const newDepth = (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) ? depth + 1 : depth;

        ts.forEachChild(node, (child) => visit(child, newDepth));
    }

    visit(sourceFile);
    return regularVariables;
}

/**
 * Generates the complete transpiled file
 */
function generateTranspiledFile(
    sourceFile: ts.SourceFile,
    globalTemplates: any[],
    functions: Array<{ functionInfo: any; compiled: any }>
): string {
    let transpiledFile = '';

    // Extract regular TypeScript variables (non-template, non-function)
    const regularVariables = extractRegularVariables(sourceFile, globalTemplates, functions);

    // Add regular variables first
    for (const variable of regularVariables) {
        const exportKeyword = variable.isExported ? 'export ' : '';
        transpiledFile += `${exportKeyword}${variable.text}\n\n`;
    }

    // Add global templates
    for (const template of globalTemplates) {
        const exportKeyword = template.isExported ? 'export ' : '';
        transpiledFile += `${exportKeyword}const ${template.variableName} = ${template.transpiledValue};\n\n`;
    }

    // Add functions
    functions.forEach(({ functionInfo, compiled }) => {
        transpiledFile += compiled.typescript + '\n\n';
    });

    return transpiledFile.trim();
}

// Helper functions for function extraction (copied from multi-function-compiler)
function isFunctionLike(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);
}

function getRootLevelReturnsOfFunction(
    sourceFile: ts.SourceFile,
    fn: ts.FunctionLikeDeclarationBase
): ts.ReturnStatement[] {
    const returns: ts.ReturnStatement[] = [];
    let functionDepth = 0;

    function visit(n: ts.Node) {
        if (isFunctionLike(n)) {
            functionDepth++;
            ts.forEachChild(n, visit);
            functionDepth--;
            return;
        }

        if (ts.isReturnStatement(n) && functionDepth === 1) {
            returns.push(n);
        }

        ts.forEachChild(n, visit);
    }

    if (fn.body) {
        functionDepth = 1;
        ts.forEachChild(fn.body, visit);
    }
    return returns;
}

function extractNonReturnStatements(
    sourceFile: ts.SourceFile,
    fn: ts.FunctionLikeDeclarationBase
): string {
    if (!fn.body) return '';

    const statementsToKeep: string[] = [];

    function collectStatements(node: ts.Node): void {
        if (node.parent === fn.body && ts.isVariableStatement(node)) {
            const statementText = node.getText(sourceFile);
            statementsToKeep.push(statementText);
            return;
        }

        ts.forEachChild(node, collectStatements);
    }

    collectStatements(fn.body);
    return statementsToKeep.join('\n');
}

function extractConditionFromAST(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): string | undefined {
    let parent = returnNode.parent;

    while (parent) {
        if (ts.isIfStatement(parent)) {
            const conditionText = parent.expression.getText(sourceFile);
            return conditionText;
        }

        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
            break;
        }

        parent = parent.parent;
    }

    return undefined;
}

/**
 * Extracts markdown content from a return statement using original source text
 */
function extractMarkdownFromReturnStatementWithOriginalSource(returnNode: ts.ReturnStatement, originalSource: string): { content: string; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: '', interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    let rawContent = '';

    // Handle different types of return expressions using original source
    if (ts.isParenthesizedExpression(returnNode.expression)) {
        const start = returnNode.expression.getStart();

        // Find the matching closing parenthesis manually since TypeScript parser fails on MDX syntax
        let parenCount = 0;
        let endPos = start;
        let foundStart = false;

        for (let i = start; i < originalSource.length; i++) {
            if (originalSource[i] === '(') {
                parenCount++;
                foundStart = true;
            } else if (originalSource[i] === ')') {
                parenCount--;
                if (parenCount === 0 && foundStart) {
                    endPos = i;
                    break;
                }
            }
        }

        const fullText = originalSource.slice(start, endPos + 1);

        // Extract content between the parentheses
        if (fullText.startsWith('(') && fullText.endsWith(')')) {
            rawContent = fullText.slice(1, -1).trim();
        } else {
            rawContent = fullText.trim();
        }
    } else if (ts.isStringLiteral(returnNode.expression)) {
        // Handle return "content" format
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // Handle return `content` format
        rawContent = originalSource.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    } else {
        // Fallback: get the raw text from original source
        rawContent = originalSource.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    }

    // Clean up the content
    rawContent = rawContent.trim();

    // Remove leading whitespace from each line (dedent)
    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        // Find the minimum indentation (excluding empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) { // Skip empty lines
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        // Remove the minimum indentation from all lines
        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    // Now parse the markdown content using the MDX parsing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

function extractMarkdownFromReturnStatement(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): { content: string; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: '', interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    const sourceText = sourceFile.getFullText();
    let rawContent = '';

    if (ts.isParenthesizedExpression(returnNode.expression)) {
        const start = returnNode.expression.getStart();

        let parenCount = 0;
        let endPos = start;
        let foundStart = false;

        for (let i = start; i < sourceText.length; i++) {
            if (sourceText[i] === '(') {
                parenCount++;
                foundStart = true;
            } else if (sourceText[i] === ')') {
                parenCount--;
                if (parenCount === 0 && foundStart) {
                    endPos = i;
                    break;
                }
            }
        }

        const fullText = sourceText.slice(start, endPos + 1);

        if (fullText.startsWith('(') && fullText.endsWith(')')) {
            rawContent = fullText.slice(1, -1).trim();
        } else {
            rawContent = fullText.trim();
        }
    } else if (ts.isStringLiteral(returnNode.expression)) {
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        rawContent = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    } else {
        rawContent = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    }

    rawContent = rawContent.trim();

    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) {
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}

function extractFunctionContent(ast: ts.SourceFile, functionName: string): { typescript: string; returnStatements: any[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    let functionNode: ts.Node | null = null;
    let typescript = '';
    let returnStatements: any[] = [];
    let allInterpolations: any[] = [];
    let allConditionalBlocks: any[] = [];
    let allTernaryExpressions: any[] = [];
    let allJsxExpressions: any[] = [];

    function visit(node: ts.Node): void {
        if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
            functionNode = node;

            if (node.body) {
                const sourceFile = node.getSourceFile();
                typescript = extractNonReturnStatements(sourceFile, node);
                const returns = getRootLevelReturnsOfFunction(sourceFile, node);

                for (const returnStmt of returns) {
                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                    returnStatements.push({
                        condition: condition,
                        content: content,
                        isTemplate: true
                    });

                    allInterpolations.push(...interpolations);
                    allConditionalBlocks.push(...conditionalBlocks);
                    allTernaryExpressions.push(...ternaryExpressions);
                    allJsxExpressions.push(...jsxExpressions);
                }
            }
        }

        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === functionName && declaration.initializer) {
                    if (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer)) {
                        functionNode = declaration.initializer;

                        if (declaration.initializer.body) {
                            const sourceFile = node.getSourceFile();
                            typescript = extractNonReturnStatements(sourceFile, declaration.initializer);

                            if (ts.isArrowFunction(declaration.initializer)) {
                                if (ts.isParenthesizedExpression(declaration.initializer.body)) {
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement({
                                        expression: declaration.initializer.body
                                    } as unknown as ts.ReturnStatement, sourceFile);

                                    returnStatements.push({
                                        condition: undefined,
                                        content: content,
                                        isTemplate: true
                                    });

                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                } else {
                                    const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                    for (const returnStmt of returns) {
                                        const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                                        const condition = extractConditionFromAST(returnStmt, sourceFile);

                                        returnStatements.push({
                                            condition: condition,
                                            content: content,
                                            isTemplate: true
                                        });

                                        allInterpolations.push(...interpolations);
                                        allConditionalBlocks.push(...conditionalBlocks);
                                        allTernaryExpressions.push(...ternaryExpressions);
                                        allJsxExpressions.push(...jsxExpressions);
                                    }
                                }
                            } else {
                                const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                for (const returnStmt of returns) {
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                                    returnStatements.push({
                                        condition: condition,
                                        content: content,
                                        isTemplate: true
                                    });

                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                }
                            }
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(ast);

    return {
        typescript,
        returnStatements,
        interpolations: allInterpolations,
        conditionalBlocks: allConditionalBlocks,
        ternaryExpressions: allTernaryExpressions,
        jsxExpressions: allJsxExpressions
    };
}
