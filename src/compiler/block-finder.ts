import * as ts from 'typescript';
import { TSMBlockMatch } from '../parser/types';

/**
 * Represents a nested TSM block found within an expression
 */
export interface NestedTSMBlock {
    outerExpression: string;
    nestedContent: string;
    variableScope: Map<string, string>;
    nestingLevel: number;
    parentBlock?: NestedTSMBlock;
    startIndex: number;
    endIndex: number;
    expressionType: 'arrow' | 'ternary' | 'conditional' | 'map' | 'other';
}

/**
 * Traverses a TypeScript AST to find and extract TSM block expressions.
 *
 * A TSM block is defined as a return statement with a parenthesized expression,
 * e.g., `return (...)`.
 *
 * @param sourceFile The TypeScript source file AST node.
 * @returns An array of ParenthesizedExpression nodes that represent TSM blocks.
 */
export function findRootLevelTsmBlocks(node: ts.Node): Array<{ match: TSMBlockMatch, content: string }> {
    const blocks: Array<{ match: TSMBlockMatch, content: string }> = [];


    function visit(node: ts.Node) {
        if (ts.isReturnStatement(node)) {
            const returnStart = node.getStart();

            const textBeforeReturn = node.getSourceFile().text.substring(0, returnStart);
            const linesBeforeReturn = textBeforeReturn.split('\n');
            const returnLine = linesBeforeReturn[linesBeforeReturn.length - 1];

            const leadingSpaces = returnLine.match(/^(\s*)/)?.[1]?.length || 0;

            const closingParen = node.getSourceFile().text.substring(returnStart + 1);
            const lines = closingParen.split(/(?<!\\)\n/);

            const closingParenLine = lines.findIndex(line => line.startsWith(" ".repeat(leadingSpaces) + ")"));
            if (closingParenLine !== -1) {
                const insideLines = lines.slice(1, closingParenLine);
                const minWhiteSpace = insideLines.reduce((min, line) => Math.min(min, line.match(/^(\s*)/)?.[1]?.length || 0), leadingSpaces * 2);
                const removeLeadingIndent = insideLines.map(line => line.slice(minWhiteSpace));
                console.log('DEBUG: removeLeadingIndent:', removeLeadingIndent);

                const content = removeLeadingIndent.join('\n');

                // Find the complete return statement by looking for the closing parenthesis
                const sourceText = node.getSourceFile().text;
                const returnText = sourceText.substring(returnStart);
                const openParen = returnText.indexOf('(');
                if (openParen === -1) return;

                // Find matching closing parenthesis
                let parenCount = 0;
                let endPos = openParen;
                for (let i = openParen; i < returnText.length; i++) {
                    if (returnText[i] === '(') parenCount++;
                    else if (returnText[i] === ')') {
                        parenCount--;
                        if (parenCount === 0) {
                            endPos = i + 1;
                            break;
                        }
                    }
                }


                const fullReturnStatement = returnText.substring(0, endPos);

                const match: TSMBlockMatch = {
                    index: returnStart,
                    [0]: fullReturnStatement,
                    [1]: content
                };

                blocks.push({ match, content });
                // newBlocks.push(...removeLeadingIndent);
                // const stringArrayLiteral = ts.factory.createArrayLiteralExpression(
                //     removeLeadingIndent.map(v => ts.factory.createStringLiteral(v)),
                //     true
                //   );
                // const nodes = ts.factory.createCallExpression(
                //     ts.factory.createIdentifier("__tsm"),
                //     undefined,
                //     [stringArrayLiteral]     
                //   );

                //   const sf = ts.factory.createSourceFile(
                //     [ts.factory.createExpressionStatement(nodes)],
                //     ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
                //     ts.NodeFlags.None
                //   );

                //   const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
                //   console.log("DEBUG: nodes:", printer.printFile(sf));
            } else {
                console.log('DEBUG: Closing parenthesis not found');
            }

        }
        ts.forEachChild(node, visit);
    }

    visit(node);
    return blocks;
}

/**
 * Extracts the raw string content from within a TSM block node.
 * It uses the AST node's position to slice the text from the original source file
 * and performs a basic de-indentation of the extracted block.
 *
 * @param block The ParenthesizedExpression node of the TSM block.
 * @param sourceFile The source file containing the block.
 * @returns The raw, de-indented string content of the block.
 */
export function extractBlockContent(block: ts.ParenthesizedExpression, sourceFile: ts.SourceFile): string {
    console.log('DEBUG: block:', block.getFullText());
    const rawContent = sourceFile.text.substring(block.getStart() + 1, block.getEnd() - 1);

    const lines = rawContent.split('\n');

    // Find the minimum indentation of all non-empty lines.
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length > 0) {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            minIndent = Math.min(minIndent, indent);
        }
    }

    if (minIndent === Infinity) {
        return lines.join('\n')
    }

    // Remove the common indentation from each line.
    const deindentedLines = lines.map(line => {
        return line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line;
    });

    // Join the lines and trim any leading/trailing whitespace or newlines.
    return deindentedLines.join('\n')
}

/**
 * Detects TSM content patterns within a string
 */
function isTSMContentPattern(content: string): boolean {
    return content.includes('{{') ||
        content.includes('<@') ||
        (content.includes('#') && (content.includes('##') || content.includes('###'))) ||
        (content.includes('*') && !!content.match(/\*\*.*\*\*/)) ||
        (content.includes('-') && !!content.match(/^- .*$/m));
}

/**
 * Finds nested TSM blocks within expressions using regex-based detection
 * This is the core function for detecting TSM content at any nesting level
 */
export function findNestedTsmBlocks(content: string): NestedTSMBlock[] {
    const nestedBlocks: NestedTSMBlock[] = [];
    let currentIndex = 0;

    // Scan for various expression patterns that might contain TSM content
    const patterns = [
        // Arrow functions: (param) => (TSM content)
        {
            regex: /(\w+)\s*=>\s*\(/g,
            type: 'arrow' as const,
            extractScope: (match: RegExpExecArray) => {
                const paramMatch = match[0].match(/(\w+)\s*=>/);
                return paramMatch ? new Map([[paramMatch[1], paramMatch[1]]]) : new Map();
            }
        },
        // Map functions: items.map((item, index) => (TSM content))
        {
            regex: /\.map\s*\(\s*\([^)]+\)\s*=>\s*\(/g,
            type: 'map' as const,
            extractScope: (match: RegExpExecArray) => {
                const paramMatch = match[0].match(/\(([^)]+)\)\s*=>/);
                if (paramMatch) {
                    const params = paramMatch[1].split(',').map(p => p.trim());
                    const scope = new Map();
                    params.forEach(param => scope.set(param, param));
                    return scope;
                }
                return new Map();
            }
        },
        // Ternary expressions: condition ? (TSM content) : (TSM content)
        {
            regex: /\?\s*\(/g,
            type: 'ternary' as const,
            extractScope: () => new Map()
        },
        // Conditional expressions: condition && (TSM content)
        {
            regex: /&&\s*\(/g,
            type: 'conditional' as const,
            extractScope: () => new Map()
        }
    ];

    // Scan for each pattern
    for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern.regex.source, 'g');

        while ((match = regex.exec(content)) !== null) {
            const startIndex = match.index;
            const parenStart = match.index + match[0].length - 1; // Position of opening (

            // Find matching closing parenthesis
            const parenEnd = findMatchingParen(content, parenStart);
            if (parenEnd === -1) continue;

            const nestedContent = content.substring(parenStart + 1, parenEnd).trim();

            // Check if this content contains TSM patterns
            if (isTSMContentPattern(nestedContent)) {
                // For map functions, find the start of the map call
                let expressionStart = startIndex;
                if (pattern.type === 'map') {
                    // For map functions, we need to find the actual start of the map call
                    // The startIndex points to the position after the pattern match
                    // We need to look backwards to find the variable name
                    const mapStartPattern = /(\w+)\.map\s*\(/;
                    const searchStart = Math.max(0, startIndex - 50);
                    const searchContent = content.substring(searchStart, startIndex + 10);
                    const mapStartMatch = searchContent.match(mapStartPattern);
                    if (mapStartMatch) {
                        expressionStart = searchStart + mapStartMatch.index!;
                    }
                } else {
                    expressionStart = findExpressionStart(content, startIndex);
                }

                // Find the end of the expression (including the closing }})
                let expressionEnd = parenEnd + 1;
                // Look for the closing }} after the parentheses
                while (expressionEnd < content.length && content[expressionEnd] !== '}') {
                    expressionEnd++;
                }
                if (content[expressionEnd] === '}') {
                    expressionEnd++; // Include the closing }
                }

                const outerExpression = content.substring(expressionStart, expressionEnd);

                // Extract variable scope
                const variableScope = pattern.extractScope(match);

                nestedBlocks.push({
                    outerExpression,
                    nestedContent,
                    variableScope,
                    nestingLevel: 0, // Will be calculated later
                    startIndex: parenStart + 1,
                    endIndex: parenEnd,
                    expressionType: pattern.type
                });
            }
        }
    }

    // Calculate nesting levels and parent relationships
    calculateNestingLevels(nestedBlocks);

    return nestedBlocks;
}

/**
 * Finds the start of an expression containing the given position
 */
function findExpressionStart(content: string, position: number): number {
    // Look backwards for the start of the expression
    let start = position;

    // Skip whitespace
    while (start > 0 && /\s/.test(content[start - 1])) {
        start--;
    }

    // For map functions, look for the pattern: variable.map(
    const mapPattern = /(\w+)\.map\s*\(/;
    const beforePosition = content.substring(0, position);
    const mapMatch = beforePosition.match(mapPattern);

    if (mapMatch) {
        return mapMatch.index!;
    }

    // Also look for the pattern in the reverse direction from the current position
    const reverseMapPattern = /(\w+)\.map\s*\(/;
    const fromPosition = content.substring(Math.max(0, position - 100), position);
    const reverseMapMatch = fromPosition.match(reverseMapPattern);

    if (reverseMapMatch) {
        return Math.max(0, position - 100) + reverseMapMatch.index!;
    }

    // Look for common expression starters, but be more specific
    const expressionStarters = ['=', '(', ':', '?', '&&', '||', 'return'];

    for (let i = start; i >= 0; i--) {
        for (const starter of expressionStarters) {
            if (content.substring(i, i + starter.length) === starter) {
                // Don't match the opening brace of {{ }} interpolations
                if (starter === '{' && i > 0 && content[i - 1] === '{') {
                    continue;
                }
                return i;
            }
        }
    }

    return Math.max(0, start - 50); // Fallback: take 50 chars before position
}

/**
 * Finds matching parenthesis in a string
 */
function findMatchingParen(content: string, startIndex: number): number {
    let parenCount = 0;

    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '(') {
            parenCount++;
        } else if (content[i] === ')') {
            parenCount--;
            if (parenCount === 0) {
                return i;
            }
        }
    }

    return -1; // No matching parenthesis found
}

/**
 * Calculates nesting levels and parent relationships for nested blocks
 */
function calculateNestingLevels(blocks: NestedTSMBlock[]): void {
    // Sort blocks by start position
    blocks.sort((a, b) => a.startIndex - b.startIndex);

    for (let i = 0; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        let nestingLevel = 0;
        let parentBlock: NestedTSMBlock | undefined;

        // Find parent block (if any)
        for (let j = i - 1; j >= 0; j--) {
            const candidateParent = blocks[j];
            if (candidateParent.startIndex < currentBlock.startIndex &&
                candidateParent.endIndex > currentBlock.endIndex) {
                parentBlock = candidateParent;
                nestingLevel = candidateParent.nestingLevel + 1;
                break;
            }
        }

        currentBlock.nestingLevel = nestingLevel;
        currentBlock.parentBlock = parentBlock;
    }
}
