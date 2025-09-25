import * as ts from 'typescript';
import { findTsmBlocks, extractBlockContent } from './block-finder';

export interface TranspilationResult {
    transpiledFile: string;
    errors: string[];
}

/**
 * The new core entry point for the TSM transpiler.
 * This function orchestrates the transpilation process using a pure AST-based approach.
 *
 * @param source The raw TypeScript-Markdown source code.
 * @returns A TranspilationResult containing the transpiled code and any errors.
 */
export function transpileSource(source: string): TranspilationResult {
    // Phase 1: Parse the unmodified source code into a TypeScript AST.
    const sourceFile = ts.createSourceFile(
        'source.tsm', // Virtual file name
        source,
        ts.ScriptTarget.Latest,
        true // setParentNodes
    );

    // Task 1.2: Traverse the AST to find all TSM blocks.
    const tsmBlocks = findTsmBlocks(sourceFile);

    // Task 1.3: Extract the content from each found block.
    const blockContents = tsmBlocks.map(block => extractBlockContent(block, sourceFile));

    // The subsequent phases of the migration will be built out from here.
    // - Phase 2: Pass blockContents to the enhanced TSM parser.
    // - Phase 3: Rewrite code generation based on a rich TSM AST.

    // For now, this serves as the foundation of the new pipeline.
    // We will return a placeholder result indicating the number of blocks and their content.
    const firstBlockContent = blockContents.length > 0 ? `\n\n// Content of first block:\n/*\n${blockContents[0]}\n*/` : '';
    const placeholderContent = `// New AST-based transpilation pipeline initialized for ${sourceFile.fileName}.\n// Found ${tsmBlocks.length} TSM block(s).${firstBlockContent}`;

    return {
        transpiledFile: placeholderContent,
        errors: [],
    };
}
