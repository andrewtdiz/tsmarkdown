/**
 * Full-File Compiler
 * 
 * This module provides functionality to compile an entire TypeScript source file,
 * processing template syntax both inside and outside of function definitions.
 */

import * as ts from 'typescript';
import { ParsedTSmd } from '../parser.js';
import { compile } from '../compiler.js';
import { extractFunctions } from '../parser/typescript-parser.js';
import { parseContent } from '../parser/pipeline.js';
import { protectCodeBlocks, restoreCodeBlocks } from '../parser/code-protection.js';
import { generatePropsInterface, normalizeIndentation } from '../renderer/string-helpers.js';
import { Chunk, __tsm } from '../runtime/tsm-runtime.js';
import { TSMComponentAttribute } from '../parser/tsm-ast.js';
import { parseJSXExpressionToTSMComponent } from '../parser/interpolations';

/**
 * Preprocesses TSmd syntax within functions to make them parseable by TypeScript
 */
function preprocessTSmdInFunctions(source: string): string {
    // Find all return statements with TSmd syntax and convert them to template literals
    // This handles patterns like: return (content with {{ interpolation }})

    let processedSource = source;

    // Use a proper approach that handles nested parentheses
    // We'll find return statements and then find the matching closing paren by counting braces
    const returnWithParensRegex = /return\s*\(/g;

    let match;
    let offset = 0;

    // Process return statements one by one to avoid conflicts
    const returnMatches = [...processedSource.matchAll(returnWithParensRegex)];

    for (const match of returnMatches) {
        const returnStart = match.index;
        const openParenIndex = returnStart + match[0].length - 1; // Position of the opening (

        // Find the matching closing parenthesis by counting braces
        // We need to be more careful about nested parentheses in ternary expressions
        let braceLevel = 0;
        let closeParenIndex = -1;
        let inString: string | false = false;
        let escapeNext = false;

        for (let i = openParenIndex; i < processedSource.length; i++) {
            const char = processedSource[i];
            const prevChar = i > 0 ? processedSource[i - 1] : '';

            // Handle string literals
            if (!escapeNext && (char === '"' || char === "'" || char === '`')) {
                if (!inString) {
                    inString = char;
                } else if (inString === char) {
                    inString = false;
                }
            }

            // Handle escape characters
            if (char === '\\' && !escapeNext) {
                escapeNext = true;
                continue;
            }
            escapeNext = false;

            // Only count braces when not inside strings
            if (!inString) {
                if (char === '(') {
                    braceLevel++;
                } else if (char === ')') {
                    braceLevel--;
                    if (braceLevel === 0) {
                        closeParenIndex = i;
                        break;
                    }
                }
            }
        }

        if (closeParenIndex !== -1) {
            // Extract the content between the parentheses
            const content = processedSource.slice(openParenIndex + 1, closeParenIndex);

            // Check if the content contains TSmd syntax AND hasn't already been converted to template literal
            // Exclude {{...}} syntax which should be handled by the new parsing system
            const hasTSmdSyntax = /(^#{1,6}\s)/m.test(content);
            const sourceBeforeReturn = processedSource.slice(returnStart, openParenIndex);
            const alreadyConvertedToTemplate = sourceBeforeReturn.includes('return `');


            if (hasTSmdSyntax && !alreadyConvertedToTemplate) {
                // Convert TSmd syntax to valid TypeScript template literal
                let templateContent = content
                    .trim()
                    // Escape backticks for template literals
                    .replace(/`/g, '\\`')
                    // Convert {{ }} to ${ } for template literals
                    .replace(/\{\{([^}]+)\}\}/g, '${$1}');

                // Handle ternary expressions by converting them to use template literals
                templateContent = templateContent.replace(/(\w+\s*\?\s*\([^)]+\)\s*:\s*\([^)]+\))/g, (match) => {
                    // Convert ternary like "data.isAuthorized ? (Authorized) : (Not Authorized)" to use template literals
                    return match.replace(/\(\s*([^)]+?)\s*\)/g, '`$1`');
                });

                // Replace the return statement with template literal
                const beforeReturn = processedSource.slice(0, returnStart);
                const afterReturn = processedSource.slice(closeParenIndex + 1);

                const newReturnStatement = 'return `' + templateContent + '`';
                processedSource = beforeReturn + newReturnStatement + afterReturn;

                break; // Process one at a time to avoid conflicts
            }
        }
    }

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
        conditionalBlocks: Array<{ condition: string; content: any }>;
        ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }>;
        jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>;
    }>;
    transpiledFile: string;
    errors: string[];
}

export interface FullFileExecutionResult {
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
        renderedOutput: string;
        errors: string[];
    }>;
    globalTemplates: Array<{
        variableName: string;
        isExported: boolean;
        renderedValue: string;
        errors: string[];
    }>;
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
        const preprocessedSource = preprocessTSmdInFunctions(source);

        const sourceFile = ts.createSourceFile(
            'input.ts',
            preprocessedSource,
            ts.ScriptTarget.Latest,
            true
        );

        const { processedSource, templates } = await processGlobalTemplates(sourceFile);

        globalTemplates.push(...templates);

        const processedSourceFile = ts.createSourceFile(
            'processed.ts',
            processedSource,
            ts.ScriptTarget.Latest,
            true
        );

        const variableValues = extractVariableValues(processedSourceFile);

        const allFunctions = extractFunctions(processedSourceFile);

        for (const functionInfo of allFunctions) {
            try {
                const { typescript, returnStatements, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractFunctionContent(processedSourceFile, functionInfo.name);

                const jsxExpressionsMapped = jsxExpressions
                    .map(expr => ({ parsed: parseJSXExpressionToTSMComponent(expr.expression), ...expr }))
                    .filter(expr => expr.parsed !== null)
                    .map((expr) => ({
                        placeholder: expr.placeholder,
                        expression: expr.expression,
                        name: expr.parsed.name,
                        props: expr.parsed.attributes
                    }));

                const parsed: ParsedTSmd = {
                    imports: [],
                    functionInfo: functionInfo,
                    functionName: functionInfo.name,
                    functionParams: functionInfo.parameters.map(p => p.name),
                    isAsync: functionInfo.isAsync,
                    typescript: typescript,
                    interpolations: interpolations,
                    conditionalBlocks: conditionalBlocks,
                    ternaryExpressions: ternaryExpressions,
                    jsxExpressions: jsxExpressionsMapped,
                    returnStatements: returnStatements,
                    propsInterface: generatePropsInterface(functionInfo),
                    parameterTypes: functionInfo.parameters
                };

                const compiled = compile(parsed);

                functions.push({ functionInfo, compiled });
            } catch (error: any) {
                errors.push(`Failed to compile function ${functionInfo.name}: ${error.message}`);
            }
        }

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

export async function transpile(source: string): Promise<string> {
    const { transpiledFile, errors } = await compileFullFile(source);
    return transpiledFile;
}

function isBooleanLiteral(node: ts.Node): node is ts.BooleanLiteral {
    return node.kind === ts.SyntaxKind.TrueKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword;
}

/**
 * Extracts all variable declarations and their evaluated values from the source file
 */
function extractVariableValues(sourceFile: ts.SourceFile): Map<string, any> {
    const variableValues = new Map<string, any>();

    function visit(node: ts.Node): void {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    const variableName = declaration.name.text;

                    try {
                        // Try to evaluate the initializer using TypeScript's evaluation capabilities
                        // Get the raw source text for the initializer
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

                        // Only store non-template variables (those without (*...*) syntax)
                        const hasTemplateSyntax = containsTemplateSyntax(initializerText);
                        if (!hasTemplateSyntax) {
                            // For simple literals, we can evaluate them
                            if (ts.isStringLiteral(declaration.initializer)) {
                                variableValues.set(variableName, declaration.initializer.text);
                            } else if (ts.isNumericLiteral(declaration.initializer)) {
                                const value = parseFloat(declaration.initializer.text);
                                variableValues.set(variableName, value);
                            } else if (isBooleanLiteral(declaration.initializer)) {
                                const value = declaration.initializer.kind === ts.SyntaxKind.TrueKeyword;
                                variableValues.set(variableName, value);
                            } else if (ts.isObjectLiteralExpression(declaration.initializer)) {
                                // For object literals, convert to a simple object representation
                                const obj: any = {};
                                for (const prop of declaration.initializer.properties) {
                                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                                        const propName = prop.name.text;
                                        if (ts.isStringLiteral(prop.initializer)) {
                                            obj[propName] = prop.initializer.text;
                                        } else if (ts.isNumericLiteral(prop.initializer)) {
                                            obj[propName] = parseFloat(prop.initializer.text);
                                        } else if (isBooleanLiteral(prop.initializer)) {
                                            obj[propName] = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
                                        }
                                    }
                                }
                                variableValues.set(variableName, obj);
                            } else {
                                // For more complex expressions, store as string for JSON parsing later
                                variableValues.set(variableName, initializerText.trim());
                            }
                        } else {
                            console.log(`DEBUG: Skipping template variable ${variableName}:`, initializerText);
                        }
                    } catch (error) {
                        console.warn(`Failed to evaluate variable ${variableName}: ${error}`);
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return variableValues;
}

/**
 * Processes global template syntax outside of functions
 */
async function processGlobalTemplates(sourceFile: ts.SourceFile): Promise<{ processedSource: string; templates: any[] }> {
    const templates: any[] = [];
    let processedSource = sourceFile.getFullText();

    // First, extract all variable values to use for resolution
    const variableValues = extractVariableValues(sourceFile);

    // Find all variable declarations at the top level
    function visit(node: ts.Node): void {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    const variableName = declaration.name.text;
                    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

                    // Get the raw source text for the initializer, since TypeScript parser may truncate TSmd syntax
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
                        // Extract and process the template content with variable resolution
                        const templateResult = processTemplateInExpression(initializerText, sourceFile, variableValues);

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
    const result = expression.includes('(*') && expression.includes('*)');
    return result;
}

/**
 * Processes template syntax in an expression and returns the transpiled version
 */
function processTemplateInExpression(expression: string, sourceFile: ts.SourceFile, variableValues?: Map<string, string>): {
    transpiled: string;
    interpolations: Array<{ placeholder: string; expression: string }>;
    conditionalBlocks: Array<{ condition: string; content: any }>;
    ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }>;
    jsxExpressions: Array<{ name: string; props: Array<{ name: string; value: { type: string; value: string } }> }>;
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
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
        variableValues, // Pass variable values for resolution
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    // Convert chunks to string first
    const contentString = chunksToTemplateLiteral(processedContent);

    // Convert TSMComponent jsxExpressions to the expected format for convertToTemplateLiteral
    const convertedJSXExpressions = jsxExpressions.map(jsx => ({
        name: jsx.name,
        props: jsx.props
    }));

    // Convert the processed content to a template literal
    const transpiled = convertToTemplateLiteral(contentString, interpolations, conditionalBlocks, ternaryExpressions, convertedJSXExpressions);

    return {
        transpiled,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions // Return the new TSMComponent structure
    };
}

/**
 * Converts processed content to a template literal with proper substitutions
 */
// Helper function to convert chunks to TSM runtime calls
function chunksToTemplateLiteral(chunks: any[]): string {
    if (!Array.isArray(chunks)) {
        return String(chunks);
    }

    if (chunks.length === 0) {
        return '__tsm([])';
    }

    if (chunks.length === 1) {
        const chunk = chunks[0];
        if (typeof chunk === 'string') {
            // Single string - return simple string
            return `"${chunk}"`;
        }
        if (Array.isArray(chunk)) {
            // Check if this is a runtime interpolation array [ "variable.name" ]
            if (chunk.length === 1 && typeof chunk[0] === 'string') {
                // This is a runtime interpolation, return the variable reference
                return chunk[0];
            }
            // Otherwise, recursively process nested chunks
            return chunksToTemplateLiteral(chunk);
        }
        return String(chunk);
    }

    // Multiple chunks - collect them for __tsm call
    const tsmChunks: string[] = [];
    for (const chunk of chunks) {
        if (typeof chunk === 'string') {
            tsmChunks.push(`"${chunk}"`);
        } else if (Array.isArray(chunk)) {
            // Check if this is a ternary condition array [ "condition", " ? ", ... ]
            if (chunk.length >= 3 && chunk[1] === ' ? ') {
                // This is a ternary expression, convert it to a proper ternary that returns __tsm calls
                const condition = chunk[0];
                const trueValue = chunk[2];
                const falseValue = chunk[4];

                // Convert true and false values to __tsm calls
                const trueTsm = typeof trueValue === 'string' ? `__tsm(["${trueValue}"])` : chunksToTemplateLiteral(trueValue);
                const falseTsm = typeof falseValue === 'string' ? `__tsm(["${falseValue}"])` : chunksToTemplateLiteral(falseValue);

                // Create a ternary expression that returns __tsm calls
                tsmChunks.push(`${condition} ? ${trueTsm} : ${falseTsm}`);
            } else if (chunk.length === 1 && typeof chunk[0] === 'string') {
                // This is a runtime interpolation, return the variable reference
                tsmChunks.push(chunk[0]);
            } else {
                // Otherwise, recursively process nested chunks
                const nestedResult = chunksToTemplateLiteral(chunk);
                // If the nested result is already a __tsm call, don't wrap it again
                if (nestedResult.startsWith('__tsm([') && nestedResult.endsWith('])')) {
                    // Extract the inner content without the __tsm wrapper
                    const innerContent = nestedResult.slice(7, -2); // Remove '__tsm([' and '])'
                    tsmChunks.push(innerContent);
                } else {
                    tsmChunks.push(nestedResult);
                }
            }
        } else {
            tsmChunks.push(String(chunk));
        }
    }

    return `__tsm([${tsmChunks.join(', ')}])`;
}

function convertToTemplateLiteral(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: any }>,
    ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }>,
    jsxExpressions: Array<{ name: string; props: Array<{ name: string; value: { type: string; value: string } }> }>
): string {
    let result = content;

    // Replace interpolations with template literal syntax
    interpolations.forEach(({ placeholder, expression }) => {
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
    });

    // Replace conditional blocks - these need special handling since they're not simple substitutions
    conditionalBlocks.forEach(({ condition, content: blockContent }, index) => {
        const placeholder = `__CONDITIONAL_${index}__`;
        // Convert chunks to template literal content
        const templateContent = chunksToTemplateLiteral(blockContent);
        const conditionalExpression = `${condition} && \`${templateContent}\``;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), conditionalExpression);
    });

    // Replace ternary expressions
    ternaryExpressions.forEach(({ condition, trueValue, falseValue }, index) => {
        const placeholder = `__TERNARY_${index}__`;
        const trueContent = chunksToTemplateLiteral(trueValue);
        const falseContent = chunksToTemplateLiteral(falseValue);
        const ternaryExpression = `${condition} ? \`${trueContent}\` : \`${falseContent}\``;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ternaryExpression);
    });

    // Replace JSX expressions
    jsxExpressions.forEach(({ name, props }) => {
        // Convert TSMComponent to function call
        const functionCall = convertTSMComponentToFunctionCall(name, props);
        // Wrap in template literal syntax so the expression executes at runtime
        result = result.replace(new RegExp(`__JSX_EXPRESSION_\\d+__`, 'g'), `\${${functionCall}}`);
    });

    // Return the result without wrapping in backticks (they're already handled elsewhere)
    return result;
}

/**
 * Converts TSMComponent to function call string
 */
function convertTSMComponentToFunctionCall(name: string, props: Array<{ name: string; value: { type: string; value: string } }>): string {
    // Build props object
    const propsObj: Record<string, any> = {};

    props.forEach(prop => {
        if (prop.value.type === 'string') {
            // Remove quotes from string values
            propsObj[prop.name] = prop.value.value.replace(/^"(.*)"$/, '$1');
        } else if (prop.value.type === 'expression') {
            propsObj[prop.name] = prop.value.value;
        }
    });

    // Convert props object to string
    const propsString = Object.keys(propsObj).length > 0
        ? `{ ${Object.entries(propsObj).map(([key, value]) => `${key}: ${value}`).join(', ')} }`
        : '';

    return `${name}(${propsString})`;
}

/**
 * Extracts import statements from the TypeScript source file
 */
function extractImportStatements(sourceFile: ts.SourceFile): Array<{ text: string; isExported: boolean }> {
    const importStatements: Array<{ text: string; isExported: boolean }> = [];

    function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node)) {
            const importText = node.getText(sourceFile);
            const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

            importStatements.push({
                text: importText,
                isExported
            });
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return importStatements;
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

    // Extract import statements first
    const importStatements = extractImportStatements(sourceFile);

    // Add import statements first
    for (const importStmt of importStatements) {
        const exportKeyword = importStmt.isExported ? 'export ' : '';
        transpiledFile += `${exportKeyword}${importStmt.text}\n\n`;
    }

    // Extract regular TypeScript variables (non-template, non-function)
    const regularVariables = extractRegularVariables(sourceFile, globalTemplates, functions);

    // Add regular variables after imports
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
    return statementsToKeep.join('\n  ');
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

function extractMarkdownFromReturnStatement(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): { content: Chunk[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: [], interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    const sourceText = sourceFile.getFullText();
    let rawContent = '';

    if (ts.isParenthesizedExpression(returnNode.expression) || returnNode.expression.getText(sourceFile).trim().startsWith("(")) {
        // if (ts.isParenthesizedExpression(returnNode.expression) ) {
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
            rawContent = fullText.slice(1, -1);
        } else {
            rawContent = fullText.trim();
        }
    } else if (ts.isStringLiteral(returnNode.expression)) {
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // Handle template expressions by extracting the content between backticks
        const templateText = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
        // Extract content between backticks, removing ${...} syntax and converting back to {{...}}
        const backtickMatch = templateText.match(/^`([\s\S]*?)`$/);
        if (backtickMatch) {
            let content = backtickMatch[1];
            // Convert ${...} back to {{...}} for downstream processing
            content = content.replace(/\$\{([^}]+)\}/g, '{{$1}}');
            // Handle nested template literals within ternary expressions
            // In the context of ternary expressions, the content inside backticks should be kept as-is
            // since it represents the actual content to be rendered
            content = content.replace(/`([^`]+)`/g, '$1');
            rawContent = content;
        } else {
            rawContent = templateText;
        }
    } else {
        rawContent = sourceText.slice(returnNode.expression.getStart(), returnNode.expression.getEnd());
    }

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

    // Count leading and trailing newlines in the protected content
    const leadingMatch = protectedContent.match(/^(\s*\n+)/);
    const trailingMatch = protectedContent.match(/(\n+\s*)$/);

    const leadingNewlines = leadingMatch ? (leadingMatch[1].match(/\n/g) || []).length : 0;
    const trailingNewlines = trailingMatch ? (trailingMatch[1].match(/\n/g) || []).length : 0;

    // Normalize indentation and trim, but preserve (n-1) newlines
    const normalized = normalizeIndentation(protectedContent);
    const trimmed = normalized.trim();
    const leadingNewlineString = '\n'.repeat(Math.max(0, leadingNewlines - 1));
    const trailingNewlineString = '\n'.repeat(Math.max(0, trailingNewlines - 1));

    const normalizedMarkdown = leadingNewlineString + trimmed + trailingNewlineString;

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

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
