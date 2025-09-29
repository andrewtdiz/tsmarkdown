import { ParsedTSmd } from "../parser";
import { __tsm, type Chunk } from "../runtime/tsm-runtime";
import { parseJSXProps, propsToObjectString } from "../renderer/string-helpers";
import { TSMComponent, TSMComponentAttribute } from "../parser/tsm-ast";
import { generateReturnStatements } from "./generateReturnStatements";

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
                modulePath.endsWith('.js') || modulePath.endsWith('.jsx')) {
                continue; // Skip TypeScript/asset imports
            }

            // Prohibit TSmd imports
            if (modulePath.endsWith('.tsmd')) {
                throw new Error('Cannot import TSmd files directly. Use TypeScript entry points instead.');
            }

            // For imports without extensions, we need to check if they're TSmd components
            // Check if the path doesn't end with a file extension
            const hasFileExtension = /\.\w+$/.test(modulePath);
            if (!hasFileExtension) {
                // This could be an TSmd component import, so we'll extract the dependencies
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

export function compileTypeScript(parsed: ParsedTSmd): string {
    // Combine imports, props interface, and generate complete function
    const imports = parsed.imports.join('\n');
    const propsInterface = parsed.propsInterface || '';

    // Generate the complete function with the TypeScript body and return statement
    const completeFunction = generateCompleteFunction(parsed);

    const parts = [imports, propsInterface, completeFunction].filter(Boolean);
    return parts.join('\n\n').trim();
}

export function generateCompleteFunction(parsed: ParsedTSmd): string {
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

    const returnStatement = generateReturnStatements(parsed);

    // Combine everything into a complete function
    // The typescript body is already cleaned by the multi-function compiler
    const functionBody = `${parsed.typescript}
    ${returnStatement}`;

    const asyncKeyword = parsed.isAsync ? "async " : "";
    const returnType = parsed.isAsync ? "Promise<string>" : "string";
    const exportedKeyword = parsed.functionInfo.isExported ? "export " : "";
    const defaultExportKeyword = parsed.functionInfo.isDefaultExport ? "default " : "";

    return `${exportedKeyword}${defaultExportKeyword}${asyncKeyword}function ${parsed.functionName}(${functionParams}): ${returnType} {
  ${functionBody}
}`;
}


export function compileTemplate(markdown: string | Chunk[], jsxExpressions?: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>): string {
    // For now, if markdown is chunks, convert to string
    // Later we'll add more sophisticated template compilation
    if (Array.isArray(markdown)) {
        // Replace JSX expression placeholders with actual expressions
        if (jsxExpressions) {
            const processedChunks = replaceJSXExpressionPlaceholders(markdown, jsxExpressions);
            return __tsm(processedChunks);
        } else {
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
