import { ParsedMDX } from "../parser";
import type { Chunk } from "../runtime/tsm-runtime";
import { parseJSXProps, propsToObjectString } from "../renderer/string-helpers";
import { TSMComponent, TSMComponentAttribute } from "../parser/tsm-ast";

export interface DependencyInfo {
    modulePath: string;
    defaultImport?: string;
    namedImports: string[];
    namespaceImport?: string;
    isTypeOnly: boolean;
    isSideEffect: boolean;
    originalImport: string;
}

export function extractDependencies(imports: string[]): string[] {
    const dependencies: string[] = [];

    for (const importLine of imports) {
        // Check if this is a TypeScript module import (ends with .ts, .tsx, .js, .jsx)
        const modulePathMatch = importLine.match(/from\s*['"]([^'"]+)['"]/);
        if (modulePathMatch) {
            const modulePath = modulePathMatch[1];

            // Skip TypeScript/JavaScript module imports - these are handled by the TypeScript runtime
            if (modulePath.endsWith('.ts') || modulePath.endsWith('.tsx') ||
                modulePath.endsWith('.js') || modulePath.endsWith('.jsx') ||
                modulePath.endsWith('.json') || modulePath.endsWith('.yaml') ||
                modulePath.endsWith('.yml') || modulePath.endsWith('.css') ||
                modulePath.endsWith('.md') || modulePath.endsWith('.txt')) {
                continue; // Skip TypeScript/asset imports
            }

            // Prohibit MDX imports
            if (modulePath.endsWith('.mdx')) {
                throw new Error('Cannot import MDX files directly. Use TypeScript entry points instead.');
            }

            // For imports without extensions, we need to check if they're MDX components
            // Check if the path doesn't end with a file extension
            const hasFileExtension = /\.\w+$/.test(modulePath);
            if (!hasFileExtension) {
                // This could be an MDX component import, so we'll extract the dependencies
                // The component loading system will handle resolving the actual file
                // Extract default and named imports as dependencies
                const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
                if (defaultMatch) {
                    dependencies.push(defaultMatch[1]);
                }

                // Extract named imports
                const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
                if (namedMatch) {
                    const namedImports = namedMatch[1]
                        .split(',')
                        .map(name => name.trim().split(' as ')[0]) // Handle aliases
                        .filter(Boolean);
                    dependencies.push(...namedImports);
                }
                continue;
            }
        }

        // Only extract dependencies for non-TypeScript imports (legacy component system)
        const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
        if (defaultMatch) {
            dependencies.push(defaultMatch[1]);
        }

        // Extract named imports
        const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
            const namedImports = namedMatch[1]
                .split(',')
                .map(name => name.trim())
                .filter(Boolean);
            dependencies.push(...namedImports);
        }
    }

    return dependencies;
}

export function compileTypeScript(parsed: ParsedMDX): string {
    // Combine imports, props interface, and generate complete function
    const imports = parsed.imports.join('\n');
    const propsInterface = parsed.propsInterface || '';

    // Generate the complete function with the TypeScript body and return statement
    const completeFunction = generateCompleteFunction(parsed);

    const parts = [imports, propsInterface, completeFunction].filter(Boolean);
    return parts.join('\n\n').trim();
}

export function generateCompleteFunction(parsed: ParsedMDX): string {
    if (!parsed.functionName) {
        return parsed.typescript; // Fallback to just the typescript code
    }

    const interfaceName = `${parsed.functionName}Props`;
    const hasProps = parsed.parameterTypes.length > 0;

    // Generate function parameters
    let functionParams = '';
    if (hasProps) {
        const destructuredParams = parsed.parameterTypes.map(param => {
            // Include default value if present
            if (param.defaultValue) {
                return `${param.name} = ${param.defaultValue}`;
            }
            return param.name;
        }).join(', ');
        functionParams = `{ ${destructuredParams} }: ${interfaceName}`;
    }

    // Generate the return statement with the template
    const returnStatement = generateReturnStatement(parsed);

    // Combine everything into a complete function
    // The typescript body is already cleaned by the multi-function compiler
    const functionBody = `${parsed.typescript}
    ${returnStatement}`;

    return `export function ${parsed.functionName}(${functionParams}): string {
  ${functionBody}
}`;
}

export function generateReturnStatement(parsed: ParsedMDX): string {
    // Handle multiple return statements with conditions
    if (parsed.returnStatements && parsed.returnStatements.length > 0) {
        return generateMultipleReturnStatements(parsed);
    }

    // Fallback to single return statement for backward compatibility
    return generateSingleReturnStatement(parsed);
}

function generateSingleReturnStatement(parsed: ParsedMDX): string {
    // Generate chunk-based code instead of template literals
    const chunks: string[] = [];

    // Add the parsed content as chunks
    if (parsed.markdown && parsed.markdown.length > 0) {
        // Content is already chunks - convert them to JavaScript literals
        for (const chunk of parsed.markdown) {
            if (chunk === null) {
                chunks.push('__ERASE_PREV_LINE');
            } else if (chunk === undefined || chunk === false) {
                chunks.push(String(chunk));
            } else if (chunk === '\n') {
                chunks.push('"\\n"');
            } else if (typeof chunk === 'string') {
                chunks.push(`"${chunk}"`);
            } else if (Array.isArray(chunk)) {
                // TSMInterpolations should be evaluated by TypeScript as expressions
                // Join array elements as a single expression
                const expression = chunk.join('');
                chunks.push(expression);
            } else {
                chunks.push(String(chunk));
            }
        }
    }

    if (chunks.length === 0) {
        return 'return "";';
    }

    const chunksString = chunks.join(',\n    ');
    return `return __tsm([\n    ${chunksString}\n]);`;
}

function generateMultipleReturnStatements(parsed: ParsedMDX): string {
    const conditionalReturns: string[] = [];
    let defaultReturn: string | null = null;

    // Process return statements in order
    for (let i = 0; i < parsed.returnStatements.length; i++) {
        const returnStmt = parsed.returnStatements[i];
        if (returnStmt.isTemplate) {
            // Generate chunk-based code for this return statement
            const chunks: string[] = [];

            // Add the markdown content as chunks
            if (returnStmt.content) {
                if (Array.isArray(returnStmt.content)) {
                    // Content is already chunks - convert them to JavaScript literals
                    for (const chunk of returnStmt.content) {
                        if (chunk === null || chunk === undefined || chunk === false) {
                            chunks.push(String(chunk));
                        } else if (chunk === '\n') {
                            chunks.push("'\\n'");
                        } else if (typeof chunk === 'string') {
                            let includeQuotes = true;
                            // Replace JSX expression placeholders with actual expressions
                            let processedChunk = chunk;
                            if (chunk.includes('__JSX_EXPRESSION_')) {
                                parsed.jsxExpressions.filter(expr => expr.placeholder === chunk).forEach(({ name, props }) => {
                                    // Remove braces from expression and replace placeholder
                                    // const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    // processedChunk = processedChunk.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                    processedChunk = `${name}(${propsToObjectString(props)})`
                                });
                                includeQuotes = false;
                            }
                            chunks.push(includeQuotes ? `"${processedChunk}"` : processedChunk);
                        } else if (Array.isArray(chunk)) {
                            // TSMInterpolations should be evaluated by TypeScript as expressions
                            // Join array elements as a single expression
                            const expression = chunk.join('');
                            chunks.push(expression);
                        } else {
                            chunks.push(String(chunk));
                        }
                    }
                } else {
                    // Content is a string, split by newlines
                    const lines = returnStmt.content.split('\n');
                    for (let j = 0; j < lines.length; j++) {
                        if (lines[j].trim()) {
                            // Replace JSX expression placeholders with actual expressions
                            let processedLine = lines[j];
                            if (parsed.jsxExpressions) {
                                parsed.jsxExpressions.forEach(({ placeholder, expression }) => {
                                    // Remove braces from expression and replace placeholder
                                    const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    processedLine = processedLine.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                });
                            }
                            chunks.push(`"${processedLine}"`);
                        }
                        if (j < lines.length - 1) {
                            chunks.push("'\\n'");
                        }
                    }
                }
            }

            // Note: Conditional blocks, ternary expressions, and interpolations
            // should already be included in the returnStmt.content as chunks
            // We don't need to add them separately

            // Generate the return statement
            const chunksString = chunks.join(',\n    ');
            const returnStatement = `return __tsm([\n    ${chunksString}\n]);`;

            // Determine if this should be a conditional or default return
            const isLastReturn = i === parsed.returnStatements.length - 1;
            const hasCondition = returnStmt.condition && returnStmt.condition !== 'undefined';

            if (hasCondition && !isLastReturn) {
                // Conditional return statement (not the last one)
                conditionalReturns.push(`if (${returnStmt.condition}) ${returnStatement}`);
            } else {
                // Default return statement (last one or no condition)
                defaultReturn = returnStatement;
            }
        }
    }

    // Combine conditional returns and default return
    const allReturns = [...conditionalReturns];
    if (defaultReturn) {
        allReturns.push(defaultReturn);
    }

    return allReturns.join('\n  ');
}

export function generateTypedFunction(parsed: ParsedMDX): string {
    if (!parsed.functionName) return '';

    const interfaceName = `${parsed.functionName}Props`;
    const hasProps = parsed.parameterTypes.length > 0;

    if (!hasProps) {
        return `export function ${parsed.functionName}(): string {
  // Implementation will be generated here
  return '';
}`;
    }

    // Generate destructured parameter with types (don't include optional markers in destructuring)
    const destructuredParams = parsed.parameterTypes.map(param => {
        // Include default value if present
        if (param.defaultValue) {
            return `${param.name} = ${param.defaultValue}`;
        }
        return param.name;
    }).join(', ');

    return `export function ${parsed.functionName}({ ${destructuredParams} }: ${interfaceName}): string {
  // Implementation will be generated here
  return '';
}`;
}

export function compileTemplate(markdown: string | Chunk[], jsxExpressions?: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>): string {
    // For now, if markdown is chunks, convert to string
    // Later we'll add more sophisticated template compilation
    if (Array.isArray(markdown)) {
        // Replace JSX expression placeholders with actual expressions
        if (jsxExpressions) {
            const processedChunks = replaceJSXExpressionPlaceholders(markdown, jsxExpressions);
            // Import __tsm here to avoid circular dependencies
            const { __tsm } = require('../runtime/tsm-runtime');
            return __tsm(processedChunks);
        } else {
            // Import __tsm here to avoid circular dependencies
            const { __tsm } = require('../runtime/tsm-runtime');
            return __tsm(markdown);
        }
    }
    return markdown;
}

export function compileJSXExpression(jsxExpression: { placeholder: string; expression: string }): TSMComponent {
    const componentName = jsxExpression.expression.match(/<@(\w+)([^/>]*)\/>/)?.[1] ?? "UNKNOWN_COMPONENT";
    const parsedProps = parseJSXProps(jsxExpression.expression);

    const attributes: TSMComponentAttribute[] = parsedProps.map(prop => ({
        type: 'TSMComponentAttribute',
        name: prop.name,
        value: prop.isExpression ? { type: 'expression', value: prop.value } : { type: 'string', value: prop.value }
    }));

    return ({
        type: 'TSMComponent',
        name: componentName,
        attributes: attributes,
        isSelfClosing: true
    });
}

function replaceJSXExpressionPlaceholders(chunks: Chunk[], jsxExpressions: Array<{ placeholder: string; expression: string }>): Chunk[] {
    return chunks.map(chunk => {
        if (typeof chunk === 'string') {
            let content = chunk;
            jsxExpressions.forEach(({ placeholder, expression }) => {
                // Replace JSX expression placeholders with the original JSX expressions
                // The runtime renderer will handle JSX processing, not the template compiler
                content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), expression);
            });
            return content;
        }
        return chunk;
    });
}

/**
 * Convert JSX expression to function call
 */
function convertJSXExpressionToFunctionCall(jsxExpression: string): string {
    // Match <@ComponentName props /> syntax
    const jsxElementRegex = /<@(\w+)([^/>]*)\/>/g;

    let convertedExpression = jsxExpression;

    convertedExpression = convertedExpression.replace(jsxElementRegex, (match, componentName, props) => {
        // If the props contain JSX expression placeholders (__JSX_EXPRESSION_XX__),
        // we need to extract them for proper runtime handling
        const jsxExpressionMatches = props.match(/__JSX_EXPRESSION_\d+__/g);
        let processedProps = props;

        // Replace JSX expression placeholders with runtime-safe expressions
        if (jsxExpressionMatches) {
            jsxExpressionMatches.forEach((placeholder: any, index: any) => {
                // Extract the original expression that was replaced with this placeholder
                processedProps = processedProps.replace(placeholder, `__JSX_EXPRESSION_${index}__`);
            });
        }

        // Parse props using the existing utility
        const parsedProps = parseJSXProps(processedProps, [], true);
        const propsString = propsToObjectString(parsedProps);

        // Create function call for runtime execution
        const functionCall = `${componentName}(${propsString})`;
        return functionCall;
    });

    return convertedExpression;
}

export function parseImportStatement(importLine: string): DependencyInfo {
    const result: DependencyInfo = {
        modulePath: '',
        namedImports: [],
        isTypeOnly: false,
        isSideEffect: false,
        originalImport: importLine
    };

    // Check for type-only imports
    if (importLine.includes('import type')) {
        result.isTypeOnly = true;
    }

    // Extract module path
    const modulePathMatch = importLine.match(/from\s*['"]([^'"]+)['"]/);
    if (modulePathMatch) {
        result.modulePath = modulePathMatch[1];
    } else {
        // Side-effect import (no from clause)
        result.isSideEffect = true;
        const sideEffectMatch = importLine.match(/import\s*['"]([^'"]+)['"]/);
        if (sideEffectMatch) {
            result.modulePath = sideEffectMatch[1];
        }
        return result;
    }

    // Extract default import
    const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
    if (defaultMatch) {
        result.defaultImport = defaultMatch[1];
    }

    // Extract named imports (including aliases)
    const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
    if (namedMatch) {
        const namedImports = namedMatch[1]
            .split(',')
            .map(name => name.trim())
            .filter(Boolean);
        result.namedImports = namedImports;
    }

    // Extract namespace import
    const namespaceMatch = importLine.match(/import\s*\*\s+as\s+(\w+)\s+from/);
    if (namespaceMatch) {
        result.namespaceImport = namespaceMatch[1];
    }

    return result;
}

function isTypeScriptOrAssetImport(modulePath: string): boolean {
    return modulePath.endsWith('.ts') ||
        modulePath.endsWith('.tsx') ||
        modulePath.endsWith('.cts') ||
        modulePath.endsWith('.mts') ||
        modulePath.endsWith('.js') ||
        modulePath.endsWith('.jsx') ||
        modulePath.endsWith('.json') ||
        modulePath.endsWith('.yaml') ||
        modulePath.endsWith('.yml') ||
        modulePath.endsWith('.css') ||
        modulePath.endsWith('.md') ||
        modulePath.endsWith('.txt');
}

