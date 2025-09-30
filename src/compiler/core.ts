import * as ts from 'typescript';
import { findRootLevelTsmBlocks, NestedTSMBlock } from './block-finder';
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
        const imports = hasImport ? '' : `import { __tsm } from 'typescriptmd';\n\n`;

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
