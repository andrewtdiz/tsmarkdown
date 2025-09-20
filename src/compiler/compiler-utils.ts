import { ParsedMDX } from "../parser";

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
    // Process interpolations in the markdown template
    let processedMarkdown = parsed.markdown;

    // Clean up the markdown - remove leading/trailing whitespace and fix common issues
    processedMarkdown = processedMarkdown.trim();

    // Remove the opening parenthesis and newline if it starts with "(\n"
    if (processedMarkdown.startsWith('(\n')) {
        processedMarkdown = processedMarkdown.substring(2);
    }

    // Replace interpolation placeholders with actual expressions
    for (const interpolation of parsed.interpolations) {
        const placeholder = interpolation.placeholder;
        const expression = interpolation.expression;

        // Replace the placeholder with the expression wrapped in ${}
        processedMarkdown = processedMarkdown.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `\${${expression}}`
        );
    }

    // Replace conditional block placeholders with actual conditional logic
    // Process in reverse order to handle nested conditionals correctly
    for (let i = parsed.conditionalBlocks.length - 1; i >= 0; i--) {
        const conditional = parsed.conditionalBlocks[i];
        const placeholder = `__CONDITIONAL_${i}__`;

        // Process the content to handle any interpolations within it
        let processedContent = conditional.content;

        // Process any interpolations within the conditional content
        for (const interpolation of parsed.interpolations) {
            const interpolationPlaceholder = interpolation.placeholder;
            const interpolationExpression = interpolation.expression;

            processedContent = processedContent.replace(
                new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                `\${${interpolationExpression}}`
            );
        }

        // Create the conditional expression
        const escapedContent = processedContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const conditionalExpression = `\${${conditional.condition} ? \`${escapedContent}\` : ''}`;

        // Replace the placeholder with the conditional expression
        processedMarkdown = processedMarkdown.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            conditionalExpression
        );
    }

    // Replace ternary expression placeholders with actual ternary logic
    // Process in reverse order to handle nested ternaries correctly
    for (let i = parsed.ternaryExpressions.length - 1; i >= 0; i--) {
        const ternary = parsed.ternaryExpressions[i];
        const placeholder = `__TERNARY_${i}__`;

        // Process the trueValue and falseValue to handle any interpolations within them
        let processedTrueValue = ternary.trueValue;
        let processedFalseValue = ternary.falseValue;

        // Remove wrapping parentheses if they exist, but preserve indentation
        if (processedTrueValue.trim().startsWith('(') && processedTrueValue.trim().endsWith(')')) {
            // Find the first newline after the opening parenthesis
            const firstNewline = processedTrueValue.indexOf('\n');
            if (firstNewline !== -1) {
                // Keep the content after the first newline, preserving indentation
                processedTrueValue = processedTrueValue.substring(firstNewline + 1);
                // Remove the closing parenthesis and any trailing whitespace
                const lastParen = processedTrueValue.lastIndexOf(')');
                if (lastParen !== -1) {
                    processedTrueValue = processedTrueValue.substring(0, lastParen);
                }
            } else {
                // Single line case
                processedTrueValue = processedTrueValue.trim().slice(1, -1).trim();
            }
        }

        if (processedFalseValue.trim().startsWith('(') && processedFalseValue.trim().endsWith(')')) {
            // Find the first newline after the opening parenthesis
            const firstNewline = processedFalseValue.indexOf('\n');
            if (firstNewline !== -1) {
                // Keep the content after the first newline, preserving indentation
                processedFalseValue = processedFalseValue.substring(firstNewline + 1);
                // Remove the closing parenthesis and any trailing whitespace
                const lastParen = processedFalseValue.lastIndexOf(')');
                if (lastParen !== -1) {
                    processedFalseValue = processedFalseValue.substring(0, lastParen);
                }
            } else {
                // Single line case
                processedFalseValue = processedFalseValue.trim().slice(1, -1).trim();
            }
        }

        // Process any interpolations within the ternary values
        for (const interpolation of parsed.interpolations) {
            const interpolationPlaceholder = interpolation.placeholder;
            const interpolationExpression = interpolation.expression;

            processedTrueValue = processedTrueValue.replace(
                new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                `\${${interpolationExpression}}`
            );

            processedFalseValue = processedFalseValue.replace(
                new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                `\${${interpolationExpression}}`
            );
        }

        // Create the ternary expression using string concatenation to avoid escaping issues
        const escapedTrueValue = processedTrueValue.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const escapedFalseValue = processedFalseValue.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const ternaryExpression = `\${${ternary.condition} ? \`${escapedTrueValue}\` : \`${escapedFalseValue}\`}`;

        // Replace the placeholder with the ternary expression
        processedMarkdown = processedMarkdown.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            ternaryExpression
        );
    }

    // Escape the template literal properly
    // First escape backslashes
    let escapedMarkdown = processedMarkdown.replace(/\\/g, '\\\\');

    // Don't escape backticks since ternary expressions already have properly escaped backticks
    // and we don't want to double-escape them

    // Check if the content is already a template literal (starts with backtick)
    if (escapedMarkdown.startsWith('`') && escapedMarkdown.endsWith('`')) {
        return `return ${escapedMarkdown};`;
    } else {
        return `return \`${escapedMarkdown}\`;`;
    }
}

function generateMultipleReturnStatements(parsed: ParsedMDX): string {
    const conditionalReturns: string[] = [];
    let defaultReturn: string | null = null;

    // Process return statements in order
    for (let i = 0; i < parsed.returnStatements.length; i++) {
        const returnStmt = parsed.returnStatements[i];
        if (returnStmt.isTemplate) {
            // Process interpolations in the markdown template
            let processedMarkdown = returnStmt.content;

            // Clean up the markdown - remove leading/trailing whitespace and fix common issues
            processedMarkdown = processedMarkdown.trim();

            // Remove the opening parenthesis and newline if it starts with "(\n"
            if (processedMarkdown.startsWith('(\n')) {
                processedMarkdown = processedMarkdown.substring(2);
            }

            // Replace interpolation placeholders with actual expressions
            for (const interpolation of parsed.interpolations) {
                const placeholder = interpolation.placeholder;
                const expression = interpolation.expression;

                // Replace the placeholder with the expression wrapped in ${}
                processedMarkdown = processedMarkdown.replace(
                    new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    `\${${expression}}`
                );
            }

            // Replace ternary expression placeholders with actual ternary logic
            // Process in reverse order to handle nested ternaries correctly
            for (let i = parsed.ternaryExpressions.length - 1; i >= 0; i--) {
                const ternary = parsed.ternaryExpressions[i];
                const placeholder = `__TERNARY_${i}__`;

                // Process the trueValue and falseValue to handle any interpolations within them
                let processedTrueValue = ternary.trueValue;
                let processedFalseValue = ternary.falseValue;

                // Remove wrapping parentheses if they exist, but preserve indentation
                if (processedTrueValue.trim().startsWith('(') && processedTrueValue.trim().endsWith(')')) {
                    // Find the first newline after the opening parenthesis
                    const firstNewline = processedTrueValue.indexOf('\n');
                    if (firstNewline !== -1) {
                        // Keep the content after the first newline, preserving indentation
                        processedTrueValue = processedTrueValue.substring(firstNewline + 1);
                        // Remove the closing parenthesis and any trailing whitespace
                        const lastParen = processedTrueValue.lastIndexOf(')');
                        if (lastParen !== -1) {
                            processedTrueValue = processedTrueValue.substring(0, lastParen);
                        }
                    } else {
                        // Single line case
                        processedTrueValue = processedTrueValue.trim().slice(1, -1).trim();
                    }
                }

                if (processedFalseValue.trim().startsWith('(') && processedFalseValue.trim().endsWith(')')) {
                    // Find the first newline after the opening parenthesis
                    const firstNewline = processedFalseValue.indexOf('\n');
                    if (firstNewline !== -1) {
                        // Keep the content after the first newline, preserving indentation
                        processedFalseValue = processedFalseValue.substring(firstNewline + 1);
                        // Remove the closing parenthesis and any trailing whitespace
                        const lastParen = processedFalseValue.lastIndexOf(')');
                        if (lastParen !== -1) {
                            processedFalseValue = processedFalseValue.substring(0, lastParen);
                        }
                    } else {
                        // Single line case
                        processedFalseValue = processedFalseValue.trim().slice(1, -1).trim();
                    }
                }

                // Process any interpolations within the ternary values
                for (const interpolation of parsed.interpolations) {
                    const interpolationPlaceholder = interpolation.placeholder;
                    const interpolationExpression = interpolation.expression;

                    processedTrueValue = processedTrueValue.replace(
                        new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        `\${${interpolationExpression}}`
                    );

                    processedFalseValue = processedFalseValue.replace(
                        new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        `\${${interpolationExpression}}`
                    );
                }

                // Create the ternary expression using string concatenation to avoid escaping issues
                const escapedTrueValue = processedTrueValue.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
                const escapedFalseValue = processedFalseValue.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
                const ternaryExpression = `\${${ternary.condition} ? \`${escapedTrueValue}\` : \`${escapedFalseValue}\`}`;

                // Replace the placeholder with the ternary expression
                processedMarkdown = processedMarkdown.replace(
                    new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    ternaryExpression
                );
            }

            // Replace conditional block placeholders with actual conditional logic
            // Process in reverse order to handle nested conditionals correctly
            for (let j = parsed.conditionalBlocks.length - 1; j >= 0; j--) {
                const conditional = parsed.conditionalBlocks[j];
                const placeholder = `__CONDITIONAL_${j}__`;

                // Process the content to handle any interpolations within it
                let processedContent = conditional.content;

                // Process any interpolations within the conditional content
                for (const interpolation of parsed.interpolations) {
                    const interpolationPlaceholder = interpolation.placeholder;
                    const interpolationExpression = interpolation.expression;

                    processedContent = processedContent.replace(
                        new RegExp(interpolationPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        `\${${interpolationExpression}}`
                    );
                }

                // Create the conditional expression using &&
                const escapedContent = processedContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
                const conditionalExpression = `\${${conditional.condition} && \`${escapedContent}\`}`;

                // Replace the placeholder with the conditional expression
                processedMarkdown = processedMarkdown.replace(
                    new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    conditionalExpression
                );
            }

            // Escape the template literal properly
            // First escape backslashes
            let escapedMarkdown = processedMarkdown.replace(/\\/g, '\\\\');

            // Don't escape backticks since ternary expressions already have properly escaped backticks
            // and we don't want to double-escape them

            // Determine if this should be a conditional or default return
            const isLastReturn = i === parsed.returnStatements.length - 1;
            const hasCondition = returnStmt.condition && returnStmt.condition !== 'undefined';

            if (hasCondition && !isLastReturn) {
                // Conditional return statement (not the last one)
                // Check if the content is already a template literal
                if (escapedMarkdown.startsWith('`') && escapedMarkdown.endsWith('`')) {
                    conditionalReturns.push(`if (${returnStmt.condition}) return ${escapedMarkdown};`);
                } else {
                    conditionalReturns.push(`if (${returnStmt.condition}) return \`${escapedMarkdown}\`;`);
                }
            } else {
                // Default return statement (last one or no condition)
                // Check if the content is already a template literal
                if (escapedMarkdown.startsWith('`') && escapedMarkdown.endsWith('`')) {
                    defaultReturn = `return ${escapedMarkdown};`;
                } else {
                    defaultReturn = `return \`${escapedMarkdown}\`;`;
                }
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

export function compileTemplate(markdown: string): string {
    // For now, return markdown as-is
    // Later we'll add more sophisticated template compilation
    return markdown;
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

