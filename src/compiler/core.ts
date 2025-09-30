import * as ts from 'typescript';
import { findRootLevelTsmBlocks, extractBlockContent, NestedTSMBlock } from './block-finder';
import { parseContent } from '../parser/pipeline';
import { generateFromAST, generateExpressionFromAST } from './ast-code-generator';
import { isPositionWithinReturnStatement } from './ast/return-detection';
import type { ParseContext, TSMBlockMatch } from '../parser/types';

export interface TranspilationResult {
    transpiledFile: string;
    errors: string[];
}


// Backward compatibility alias for existing test files
export const compileFullFile = transpileSource;

/**
 * De-indent content by removing common leading whitespace from all lines
 */
function deindentContent(content: string): string {
    const lines = content.split('\n');

    // Find the minimum indentation of all non-empty lines.
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length > 0) {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            minIndent = Math.min(minIndent, indent);
        }
    }

    if (minIndent === Infinity) {
        return lines.join('\n');
    }

    // Remove the common indentation from each line.
    const deindentedLines = lines.map(line => {
        return line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line;
    });

    // Join the lines and trim any leading/trailing whitespace or newlines.
    return deindentedLines.join('\n');
}

/**
 * Check if content contains TSM syntax
 */
function isTSMContent(content: string): boolean {
    // More strict check for TSM content - look for clear TSM markers
    return content.includes('{{') ||
        content.includes('<@') ||
        (content.includes('#') && (content.includes('##') || content.includes('###'))) ||
        (content.includes('*') && !!content.match(/\*\*.*\*\*/)) ||
        (content.includes('-') && !!content.match(/^- .*$/m)); // Only consider - as TSM if it's at start of line
}

/**
 * The new core entry point for the TSM transpiler.
 * This function orchestrates the transpilation process using a pure AST-based approach.
 *
 * @param source The raw TypeScript-Markdown source code.
 * @returns A TranspilationResult containing the transpiled code and any errors.
 */
export function transpileSource(source: string): TranspilationResult {
    try {
        const sourceFile = ts.createSourceFile(
            'source.tsm',
            source,
            ts.ScriptTarget.Latest,
            true // setParentNodes
        );

        const tsmBlocks = findRootLevelTsmBlocks(sourceFile);

        if (tsmBlocks.length === 0) {
            return {
                transpiledFile: source,
                errors: [],
            };
        }

        const parsedBlocks = tsmBlocks.map(({ content }) => {
            const context: ParseContext = {
                interpolations: [],
                conditionalBlocks: [],
                ternaryExpressions: [],
                jsxExpressions: []
            };
            const ast = parseContent(content, context);

            let processedNestedBlocks: NestedTSMBlock[] | undefined;

            return {
                ast,
                context,
                nestedBlocks: processedNestedBlocks
            };
        });
        console.log('parsedBlocks:', JSON.stringify(parsedBlocks, null, 2));

        let transpiledCode = source;

        for (let i = tsmBlocks.length - 1; i >= 0; i--) {
            const { match } = tsmBlocks[i];
            const { ast, context: parseContext, nestedBlocks } = parsedBlocks[i];
            const context = {
                indentLevel: 0,
                isAsync: false,
                functionName: `block_${i}`
            };

            const isWithinReturnStatement = isPositionWithinReturnStatement(sourceFile, match.index);

            let generatedCode = isWithinReturnStatement
                ? generateFromAST(ast, context, parseContext)
                : generateExpressionFromAST(ast, context, parseContext);

            // Handle nested blocks if they exist
            if (nestedBlocks && nestedBlocks.length > 0) {
                generatedCode = processNestedBlocks(generatedCode, nestedBlocks, context, parseContext);
            }

            transpiledCode = transpiledCode.substring(0, match.index) +
                generatedCode +
                transpiledCode.substring(match.index + match[0].length);
        }

        const hasImport = transpiledCode.includes('import { __tsm');
        const imports = hasImport ? '' : `import { __tsm, __erasePrevLine } from './src/runtime/tsm-runtime';\n\n`;

        return {
            transpiledFile: imports + transpiledCode,
            errors: [],
        };
    } catch (error) {
        return {
            transpiledFile: source,
            errors: [`Transpilation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        };
    }
}

/**
 * Processes nested TSM blocks within generated code
 */
function processNestedBlocks(
    generatedCode: string,
    nestedBlocks: (NestedTSMBlock & { parsedAST?: any })[],
    context: any,
    parseContext: ParseContext
): string {
    let processedCode = generatedCode;

    // Sort nested blocks by start index (reverse order for replacement)
    const sortedBlocks = [...nestedBlocks].sort((a, b) => b.startIndex - a.startIndex);

    for (const nestedBlock of sortedBlocks) {
        if (nestedBlock.parsedAST) {
            // Generate code for the nested block
            const nestedContext = {
                ...context,
                functionName: `${context.functionName}_nested_${nestedBlock.nestingLevel}`
            };

            const nestedGeneratedCode = generateExpressionFromAST(nestedBlock.parsedAST, nestedContext, parseContext);

            // Handle different expression types
            if (nestedBlock.expressionType === 'map') {
                // For map functions, we need to replace the arrow function body
                // The generated code should be a template literal that can be used in the map

                // Look for the specific pattern in the processed code
                const mapPattern = /\.map\s*\(\s*\([^)]+\)\s*=>\s*\([^)]+\)/;
                const mapMatch = processedCode.match(mapPattern);

                if (mapMatch) {
                    // Extract the map parameters
                    const paramMatch = mapMatch[0].match(/\.map\s*\(\s*\(([^)]+)\)\s*=>/);
                    if (paramMatch) {
                        const params = paramMatch[1].split(',').map(p => p.trim());

                        // For map functions, we need to create a function that returns TSM chunks
                        // The nestedGeneratedCode contains the __tsm call, but we need to extract the content
                        const tsmContent = extractTSMContentFromGeneratedCode(nestedGeneratedCode);

                        // Create a function that returns the TSM content as an array
                        const mapFunction = `.map((${params.join(', ')}) => __tsm([${tsmContent}]))`;

                        // Replace the map function
                        processedCode = processedCode.replace(mapPattern, mapFunction);
                    }
                }
            } else if (nestedBlock.expressionType === 'ternary') {
                // Handle ternary expressions
                const ternaryPattern = /\?\s*\([^)]+\)\s*:\s*\([^)]+\)/;
                const ternaryMatch = processedCode.match(ternaryPattern);

                if (ternaryMatch) {
                    // Replace the ternary true/false values with generated code
                    const ternaryCode = ternaryMatch[0].replace(/\([^)]+\)/, `(${nestedGeneratedCode})`);
                    processedCode = processedCode.replace(ternaryPattern, ternaryCode);
                }
            } else if (nestedBlock.expressionType === 'conditional') {
                // Handle conditional expressions
                const conditionalPattern = /&&\s*\([^)]+\)/;
                const conditionalMatch = processedCode.match(conditionalPattern);

                if (conditionalMatch) {
                    const conditionalCode = conditionalMatch[0].replace(/\([^)]+\)/, `(${nestedGeneratedCode})`);
                    processedCode = processedCode.replace(conditionalPattern, conditionalCode);
                }
            } else {
                // Fallback: simple replacement
                const nestedContentPattern = nestedBlock.nestedContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(nestedContentPattern, 'g');
                processedCode = processedCode.replace(regex, nestedGeneratedCode);
            }
        }
    }

    return processedCode;
}

/**
 * Extracts TSM content from generated code
 */
function extractTSMContentFromGeneratedCode(generatedCode: string): string {
    // If the generated code is a __tsm call, extract the content
    const tsmMatch = generatedCode.match(/__tsm\(\[([^\]]+)\]\)/);
    if (tsmMatch) {
        // Extract the array content and return it as-is for the __tsm call
        const arrayContent = tsmMatch[1];
        return arrayContent;
    }

    // Fallback: return the code as-is
    return generatedCode;
}
