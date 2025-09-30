/**
 * AST-based Code Generator for TSM
 * 
 * This module implements a visitor pattern to generate TypeScript code
 * from TSM AST nodes. It replaces the complex chunk-based code generation
 * with a clean, maintainable AST visitor approach.
 */

import { TSMBlock, TSMLine, TSMChunk, TSMTextChunk, TSMInterpolation, TSMComponent, TSMVisitor } from '../parser/tsm-ast';
import { parseContent } from '../parser/pipeline';
import type { ParseContext } from '../parser/types';
import type { TSMInterpolation as TSMInterpolationType } from '../parser/tsm-ast';

/**
 * Code generation context
 */
interface CodeGenContext {
    indentLevel: number;
    isAsync: boolean;
    functionName: string;
    isNested?: boolean;
}

/**
 * AST Visitor that generates TypeScript code from TSM AST nodes
 */
class TSMCodeGenerator implements TSMVisitor {
    private context: CodeGenContext;
    private parseContext?: ParseContext;
    private output: string[] = [];

    constructor(context: CodeGenContext, parseContext?: ParseContext) {
        this.context = context;
        this.parseContext = parseContext;
    }

    /**
     * Generate TypeScript code from a TSM Block
     */
    generate(block: TSMBlock): string {
        this.output = [];
        this.output.push('return ');
        this.visitBlock(block);
        return this.output.join('');
    }

    /**
     * Generate TypeScript code from a TSM Block without return statement
     */
    generateExpression(block: TSMBlock): string {
        this.output = [];
        this.visitBlock(block);
        return this.output.join('');
    }

    visitBlock(block: TSMBlock): void {
        // Generate __tsm([...]) call
        this.output.push('__tsm([');

        // Find the first and last non-empty lines to trim leading/trailing empty lines
        let firstNonEmptyIndex = -1;
        let lastNonEmptyIndex = -1;

        for (let i = 0; i < block.lines.length; i++) {
            const line = block.lines[i];
            if (line.isComment) continue;

            const isEmptyLine = line.chunks.every(chunk =>
                chunk.type === 'TSMTextChunk' && chunk.content.trim() === ''
            );

            if (!isEmptyLine) {
                if (firstNonEmptyIndex === -1) {
                    firstNonEmptyIndex = i;
                }
                lastNonEmptyIndex = i;
            }
        }

        // Process lines from first non-empty to last non-empty
        for (let i = 0; i < block.lines.length; i++) {
            const line = block.lines[i];

            // Add comma before each line (except the first)
            if (i > 0 && i < block.lines.length) {
                this.output.push(', ');
            }

            this.visitLine(line);

            // Add newline after each line (except the last non-empty line)
            if (i < block.lines.length - 1) {
                this.output.push(', "\\n"');
            }
        }

        this.output.push('])');
        if (!this.context.isNested) {
            this.output.push('\n');
        }
    }

    visitLine(line: TSMLine): void {
        // Skip comment lines
        if (line.isComment) {
            return;
        }

        if (line.chunks.length === 0) {
            this.output.push('""');
            return;
        }

        // Process each chunk in the line
        for (let i = 0; i < line.chunks.length; i++) {
            const chunk = line.chunks[i];
            this.visitChunk(chunk);

            // Add comma between chunks (except the last one)
            if (i < line.chunks.length - 1) {
                this.output.push(', ');
            }
        }
    }

    visitChunk(chunk: TSMChunk): void {
        if (chunk.type === 'TSMTextChunk') {
            this.visitTextChunk(chunk);
        } else if (chunk.type === 'TSMInterpolation') {
            this.visitInterpolation(chunk);
        } else if (chunk.type === 'TSMComponent') {
            this.visitComponent(chunk);
        }
    }

    visitTextChunk(chunk: TSMTextChunk): void {
        // Escape the content and wrap in quotes
        const escaped = this.escapeString(chunk.content);
        this.output.push(`"${escaped}"`);
    }

    visitInterpolation(interpolation: TSMInterpolation): void {
        if (interpolation.isNull) {
            // Handle {{ null }} line-erase escape
            this.output.push('__erasePrevLine');
        } else if (interpolation.isTSMContent) {
            // Handle TSM content in interpolations - convert to __tsm block
            this.generateTSMBlockFromContent(interpolation.expression);
        } else if (interpolation.isConditional && interpolation.conditionalBlocks) {
            // Handle conditional expressions like {{ cond ? (...) : (...) }}
            this.output.push('(');
            this.output.push(interpolation.expression);
            this.output.push(')');
        } else if (interpolation.nestedConditionalBlock) {
            const andPattern = /&&\s*\(/;
            const match = interpolation.expression.match(andPattern);
            if (match) {
                const andIndex = match.index!;
                const condition = interpolation.expression.substring(0, andIndex).trim();

                // Generate ternary that returns null when condition is false
                // This prevents rendering empty lines for false conditionals
                this.output.push('(');
                this.output.push(condition);
                this.output.push(' ? ');
                const nestedGenerator = new TSMCodeGenerator({ ...this.context, isNested: true });
                const nestedCode = nestedGenerator.generateExpression(interpolation.nestedConditionalBlock);
                this.output.push(nestedCode);
                this.output.push(' : null)');
            }
        } else if (interpolation.ternaryExpressions && interpolation.ternaryExpressions.length > 0) {
            const ternary = interpolation.ternaryExpressions[0];
            const questionIndex = interpolation.expression.indexOf('?');
            const condition = interpolation.expression.substring(0, questionIndex).trim();
            this.output.push(condition);
            this.output.push(' ? ');
            if (ternary.trueBlock) {
                const nestedGenerator = new TSMCodeGenerator({ ...this.context, isNested: true });
                const nestedCode = nestedGenerator.generateExpression(ternary.trueBlock);
                this.output.push(nestedCode);
            }
            this.output.push(' : ');
            if (ternary.falseBlock) {
                const nestedGenerator = new TSMCodeGenerator({ ...this.context, isNested: true });
                const nestedCode = nestedGenerator.generateExpression(ternary.falseBlock);
                this.output.push(nestedCode);
            }
        } else if (interpolation.expression.includes('.map(')) {
            const mapPattern = /(.+)\.map\s*\((.+)\s*=>\s*\(([\s\S]+)\)\)/s;
            const match = interpolation.expression.match(mapPattern);
            if (match) {
                const array = match[1].trim();
                const params = match[2].trim();
                let blockContent = match[3];

                // Strip common indentation from map block content
                blockContent = this.stripBlockIndentation(blockContent);

                const nestedGenerator = new TSMCodeGenerator({ ...this.context, isNested: true });
                const nestedAst = parseContent(blockContent, this.parseContext!);
                const nestedCode = nestedGenerator.generateExpression(nestedAst);

                this.output.push(`${array}.map(${params} => ${nestedCode}).join('\\n')`);
            } else {
                this.output.push(interpolation.expression);
            }
        } else {
            // Regular interpolation
            const processedExpression = this.replacePlaceholders(interpolation.expression);
            this.output.push(processedExpression);
        }
    }

    visitComponent(component: TSMComponent): void {
        // Generate component call
        this.output.push(component.name);
        this.output.push('(');

        // Add props if any
        if (component.attributes.length > 0) {
            this.output.push('{');
            for (let i = 0; i < component.attributes.length; i++) {
                const attr = component.attributes[i];
                this.output.push(attr.name);
                this.output.push(': ');

                if (attr.value.type === 'string') {
                    this.output.push(`"${this.escapeString(attr.value.value)}"`);
                } else {
                    this.output.push(attr.value.value);
                }

                if (i < component.attributes.length - 1) {
                    this.output.push(', ');
                }
            }
            this.output.push('}');
        }

        this.output.push(')');
    }

    /**
     * Generate __tsm call from TSM block content
     */
    private generateTSMBlockFromContent(content: string): void {
        // Remove outer parentheses if present
        let blockContent = content.trim();
        if (blockContent.startsWith('(') && blockContent.endsWith(')')) {
            blockContent = blockContent.slice(1, -1).trim();
        }

        // Parse the content into TSM AST and generate proper chunks
        try {
            const context: ParseContext = {
                interpolations: [],
                conditionalBlocks: [],
                ternaryExpressions: [],
                jsxExpressions: []
            };

            const parsedBlock = parseContent(blockContent, context);

            // Generate code from the parsed AST (without return statement since this is within an expression)
            const generator = new TSMCodeGenerator(this.context, this.parseContext);
            const generatedCode = generator.generateExpression(parsedBlock);
            this.output.push(generatedCode);
        } catch (error) {
            // Fallback to simple string if parsing fails
            console.warn('Failed to parse TSM block recursively:', error);
            this.output.push('__tsm([');
            this.output.push('"');
            this.output.push(this.escapeString(blockContent));
            this.output.push('"');
            this.output.push('])');
        }
    }

    /**
     * Find matching parenthesis
     */
    private findMatchingParen(content: string, startIndex: number): number {
        let parenCount = 0;

        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];

            if (char === '(') {
                parenCount++;
            } else if (char === ')') {
                parenCount--;
                if (parenCount === 0) {
                    return i;
                }
            }
        }

        return -1; // No matching parenthesis found
    }

    /**
     * Replace placeholders with actual expressions from parse context
     */
    private replacePlaceholders(content: string): string {
        if (!this.parseContext) {
            return content;
        }

        let replaced = content;

        // Replace interpolation placeholders
        this.parseContext.interpolations.forEach(({ placeholder, expression }) => {
            replaced = replaced.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), expression);
        });

        // Replace conditional placeholders
        this.parseContext.conditionalBlocks.forEach((conditional, index) => {
            const placeholder = `__CONDITIONAL_${index}__`;
            replaced = replaced.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), conditional.condition);
        });

        // Replace ternary placeholders
        this.parseContext.ternaryExpressions.forEach((ternary, index) => {
            const placeholder = `__TERNARY_${index}__`;
            replaced = replaced.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ternary.condition);
        });

        return replaced;
    }

    /**
     * Escape string content for JavaScript
     */
    private escapeString(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * Strip common leading indentation from a block of text while preserving empty lines
     */
    private stripBlockIndentation(content: string): string {
        const lines = content.split('\n');

        // Find minimum indentation (ignoring empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            const trimmed = line.trimStart();
            if (trimmed.length === 0) {
                // Skip empty lines when calculating minimum indent
                continue;
            }
            const indent = line.length - trimmed.length;
            minIndent = Math.min(minIndent, indent);
        }

        // If all lines are empty, return as-is
        if (minIndent === Infinity) {
            return content;
        }

        // Strip the minimum indentation from all lines, preserving empty lines
        const strippedLines = lines.map(line => {
            if (line.trim().length === 0) {
                // Preserve empty lines as empty strings
                return '';
            }
            return line.slice(minIndent);
        });

        // Remove leading and trailing empty lines
        while (strippedLines.length > 0 && strippedLines[0] === '') {
            strippedLines.shift();
        }
        while (strippedLines.length > 0 && strippedLines[strippedLines.length - 1] === '') {
            strippedLines.pop();
        }

        return strippedLines.join('\n');
    }
}

/**
 * Generate TypeScript code from a TSM AST block
 */
export function generateFromAST(block: TSMBlock, context: CodeGenContext, parseContext?: ParseContext): string {
    const generator = new TSMCodeGenerator(context, parseContext);
    return generator.generate(block);
}

/**
 * Generate TypeScript expression from a TSM AST block (without return statement)
 */
export function generateExpressionFromAST(block: TSMBlock, context: CodeGenContext, parseContext?: ParseContext): string {
    const generator = new TSMCodeGenerator(context, parseContext);
    return generator.generateExpression(block);
}

/**
 * Generate a complete function with TSM blocks converted to __tsm calls
 */
export function generateFunctionWithTSM(source: string, functionName: string, isAsync: boolean = false): string {
    // This is a placeholder for the full implementation
    // In the complete implementation, this would:
    // 1. Parse the source to find TSM blocks
    // 2. Convert each TSM block to __tsm calls
    // 3. Return the complete function with imports

    const context: CodeGenContext = {
        indentLevel: 0,
        isAsync,
        functionName
    };

    // For now, return a placeholder
    return `// Generated function: ${functionName}\n// This is a placeholder for the full AST-based code generation`;
}
