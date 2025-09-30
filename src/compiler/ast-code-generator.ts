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

            // Skip comment lines
            if (line.isComment) continue;

            // Skip leading empty lines
            if (i < firstNonEmptyIndex) continue;

            // Add comma before each line (except the first)
            if (i > firstNonEmptyIndex) {
                this.output.push(', ');
            }

            // Check if this is an empty line (only contains empty text chunks)
            const isEmptyLine = line.chunks.every(chunk =>
                chunk.type === 'TSMTextChunk' && chunk.content.trim() === ''
            );

            if (isEmptyLine) {
                // For empty lines, add an empty string to preserve the line break
                this.output.push('""');
            } else {
                this.visitLine(line);
            }

            // Add newline after each line (except the last non-empty line)
            if (i < lastNonEmptyIndex) {
                this.output.push(', "\\n"');
            }
        }

        this.output.push('])');
    }

    visitLine(line: TSMLine): void {
        // Skip comment lines
        if (line.isComment) {
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
        } else if (interpolation.isLogical) {
            // Handle logical expressions like {{ cond && (...) }}
            // Parse the expression to extract the condition and content
            const andPattern = /&&\s*\(/;
            const match = interpolation.expression.match(andPattern);
            if (match) {
                const andIndex = match.index!;
                const condition = interpolation.expression.substring(0, andIndex).trim();
                const parenStart = andIndex + match[0].length - 1;
                const parenEnd = this.findMatchingParen(interpolation.expression, parenStart);

                if (parenEnd !== -1) {
                    this.output.push('(');
                    this.output.push(condition);
                    this.output.push(' && ');

                    // PHASE 1 FIX: Use nested AST if available, otherwise fall back to content parsing
                    if (interpolation.nestedConditionalBlock) {
                        // Generate code from the nested AST (without return statement since this is within an expression)
                        const nestedGenerator = new TSMCodeGenerator(this.context);
                        const nestedCode = nestedGenerator.generateExpression(interpolation.nestedConditionalBlock);
                        this.output.push(nestedCode);
                    } else {
                        // Fallback to the old method for backward compatibility
                        const blockContent = interpolation.expression.substring(parenStart + 1, parenEnd).trim();
                        if (false) {
                            this.generateTSMBlockFromContent(blockContent);
                        } else {
                            this.output.push(blockContent);
                        }
                    }

                    this.output.push(')');
                } else {
                    // Invalid syntax, treat as regular expression
                    this.output.push(interpolation.expression);
                }
            } else {
                // No && pattern found, treat as regular expression
                this.output.push(interpolation.expression);
            }
        } else if (interpolation.expression.includes('?')) {
            // Handle ternary expressions - check if they contain TSM blocks
            this.generateTernaryExpression(interpolation);
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
     * Generate code for ternary expressions, handling TSM blocks within them
     */
    private generateTernaryExpression(interpolation: TSMInterpolation): void {
        const expression = interpolation.expression;

        // Parse the ternary expression to extract condition, true value, and false value
        const questionIndex = expression.indexOf('?');
        const colonIndex = expression.lastIndexOf(':');

        if (questionIndex === -1 || colonIndex === -1 || colonIndex <= questionIndex) {
            // Invalid ternary, treat as regular expression
            this.output.push('(');
            this.output.push(expression);
            this.output.push(')');
            return;
        }

        const condition = expression.substring(0, questionIndex).trim();
        let trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
        let falseValue = expression.substring(colonIndex + 1).trim();

        // Remove outer parentheses if present for cleaner parsing
        if (trueValue.startsWith('(') && trueValue.endsWith(')')) {
            trueValue = trueValue.slice(1, -1).trim();
        }
        if (falseValue.startsWith('(') && falseValue.endsWith(')')) {
            falseValue = falseValue.slice(1, -1).trim();
        }

        // Check if either value is a TSM block
        // For ternary expressions, if the value is within parentheses, it's likely TSM content
        const isTrueTSMBlock = false;
        const isFalseTSMBlock = false;

        this.output.push('(');
        this.output.push(condition);
        this.output.push(' ? ');

        if (isTrueTSMBlock) {
            // Generate __tsm call for TSM block
            this.generateTSMBlockFromContent(trueValue);
        } else {
            // Regular TypeScript expression
            this.output.push(trueValue);
        }

        this.output.push(' : ');

        if (isFalseTSMBlock) {
            // Generate __tsm call for TSM block
            this.generateTSMBlockFromContent(falseValue);
        } else {
            // Regular TypeScript expression
            this.output.push(falseValue);
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
