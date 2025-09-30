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

            transpiledCode = transpiledCode.substring(0, match.index) +
                generatedCode +
                transpiledCode.substring(match.index + match[0].length);
        }

        const hasImport = transpiledCode.includes('import { __tsm');
        const imports = hasImport ? '' : `import { __tsm, __erasePrevLine } from 'typescriptmd';\n\n`;

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
