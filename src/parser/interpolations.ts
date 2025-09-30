import { findMatchingDoubleBrace, findMatchingParen } from '../utils/string-helpers';
import type { ParseContext } from './types';
import type { TSMChunk, TSMComponent, TSMComponentAttribute, TSMInterpolation, TSMLine, TSMBlock } from './tsm-ast';
import { parseContent } from './pipeline';

// Helper function to create TSM AST nodes
function createTSMTextChunk(content: string): TSMChunk {
    return {
        type: 'TSMTextChunk',
        content
    };
}

/**
 * Strip common leading indentation from a block of text while preserving empty lines
 * This is used for ternary and conditional blocks to normalize their indentation
 */
function stripBlockIndentation(content: string): string {
    console.log('stripBlockIndentation:', JSON.stringify(content, null, 2));
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
    console.log('strippedLines:', JSON.stringify(strippedLines, null, 2));
    // Trim leading and trailing empty lines
    while (strippedLines.length > 0 && strippedLines[0].trim() === '') {
        strippedLines.shift();
    }
    while (strippedLines.length > 0 && strippedLines[strippedLines.length - 1].trim() === '') {
        strippedLines.pop();
    }

    return strippedLines.join('\n');
}

function parseComponent(content: string): { component: TSMComponent, newIndex: number } {
    const nameMatch = content.match(/<@(\w+)/);
    const componentName = nameMatch ? nameMatch[1] : '';

    const attributes: TSMComponentAttribute[] = [];
    const propsRegex = /([\w-]+)=("([^"]*)"|(\{[^}]*\}))/g;
    let match;
    while ((match = propsRegex.exec(content)) !== null) {
        const name = match[1];
        const stringValue = match[3]; // String literal value (without quotes)
        const exprValue = match[4]; // Expression value (with braces)

        if (exprValue) {
            attributes.push({
                type: 'TSMComponentAttribute',
                name,
                value: { type: 'expression', value: exprValue.slice(1, -1) }
            });
        } else {
            attributes.push({
                type: 'TSMComponentAttribute',
                name,
                value: { type: 'string', value: stringValue }
            });
        }
    }

    const closingIndex = content.indexOf('/>');
    const newIndex = closingIndex !== -1 ? closingIndex + 2 : content.length;

    const component: TSMComponent = {
        type: 'TSMComponent',
        name: componentName,
        attributes: attributes,
        isSelfClosing: true,
    };

    return { component, newIndex };
}

export function parseInterpolationsToAST(content: string, context: ParseContext, isNested: boolean = false): TSMBlock {
    // Parse the entire content as a continuous string first,
    // finding interpolations and components that may span multiple lines
    console.log('parseInterpolationsToAST:', JSON.stringify(content, null, 2));
    const chunks: TSMChunk[] = [];
    let currentIndex = 0;

    while (currentIndex < content.length) {
        // Find next component or interpolation
        const componentIndex = content.indexOf('<@', currentIndex);
        const interpolationIndex = content.indexOf('{{', currentIndex);

        // Determine which comes first (or if either exists)
        let nextSpecialIndex = -1;
        let isComponent = false;

        if (componentIndex !== -1 && interpolationIndex !== -1) {
            // Both exist, pick the closer one
            if (componentIndex < interpolationIndex) {
                nextSpecialIndex = componentIndex;
                isComponent = true;
            } else {
                nextSpecialIndex = interpolationIndex;
                isComponent = false;
            }
        } else if (componentIndex !== -1) {
            nextSpecialIndex = componentIndex;
            isComponent = true;
        } else if (interpolationIndex !== -1) {
            nextSpecialIndex = interpolationIndex;
            isComponent = false;
        }

        // If neither component nor interpolation found, add remaining text
        if (nextSpecialIndex === -1) {
            if (currentIndex < content.length) {
                chunks.push(createTSMTextChunk(content.substring(currentIndex)));
            }
            break;
        }

        // Add text before the component/interpolation
        if (nextSpecialIndex > currentIndex) {
            chunks.push(createTSMTextChunk(content.substring(currentIndex, nextSpecialIndex)));
        }

        // Handle component
        if (isComponent) {
            const { component, newIndex } = parseComponent(content.substring(nextSpecialIndex));
            chunks.push(component);
            currentIndex = nextSpecialIndex + newIndex;
            continue;
        }

        // Handle interpolation
        const closeIndex = findMatchingDoubleBrace(content, nextSpecialIndex);
        if (closeIndex === -1) {
            // No matching close, treat as literal text
            chunks.push(createTSMTextChunk('{{'));
            currentIndex = nextSpecialIndex + 2;
            continue;
        }

        // Parse the interpolation
        const expression = content.substring(nextSpecialIndex + 2, closeIndex);
        const interpolation: TSMInterpolation = {
            type: 'TSMInterpolation',
            expression: expression,
            ternaryExpressions: [],
        };

        // Check for conditional (logical &&) with nested block
        const conditionalMatch = expression.match(/&&\s*\(/);
        if (conditionalMatch && conditionalMatch.index !== undefined) {
            const parenStart = conditionalMatch.index + conditionalMatch[0].length - 1;
            const parenEnd = findMatchingParen(expression, parenStart);
            if (parenEnd !== -1) {
                let blockContent = expression.substring(parenStart + 1, parenEnd);

                // Strip common leading indentation from conditional blocks
                blockContent = stripBlockIndentation(blockContent);

                interpolation.isLogical = true;
                interpolation.nestedConditionalBlock = parseContent(blockContent, context, true);
            }
        }

        // Check for ternary with nested blocks
        const ternaryMatch = expression.match(/\?\s*\(/);
        if (ternaryMatch && ternaryMatch.index !== undefined) {
            const conditionEnd = ternaryMatch.index;
            const trueBlockStart = conditionEnd + ternaryMatch[0].length;
            const trueBlockEnd = findMatchingParen(expression, trueBlockStart - 1);

            if (trueBlockEnd !== -1) {
                const colonIndex = expression.indexOf(':', trueBlockEnd);
                if (colonIndex !== -1) {
                    const falseBlockStart = expression.indexOf('(', colonIndex) + 1;
                    const falseBlockEnd = findMatchingParen(expression, falseBlockStart - 1);

                    if (falseBlockEnd !== -1) {
                        let trueBlockContent = expression.substring(trueBlockStart, trueBlockEnd);
                        let falseBlockContent = expression.substring(falseBlockStart, falseBlockEnd);

                        // Strip common leading indentation from ternary blocks
                        trueBlockContent = stripBlockIndentation(trueBlockContent);
                        falseBlockContent = stripBlockIndentation(falseBlockContent);

                        interpolation.isConditional = true;
                        interpolation.ternaryExpressions!.push({
                            trueBlock: parseContent(trueBlockContent, context, true),
                            falseBlock: parseContent(falseBlockContent, context, true),
                        });
                    }
                }
            }
        }

        chunks.push(interpolation);
        currentIndex = closeIndex + 2;
    }

    // Now organize chunks into lines
    // Split text chunks by newlines, but keep interpolations and components intact
    const tsmLines: TSMLine[] = [];
    let currentLine: TSMChunk[] = [];

    const pushLine = () => {
        const isEmpty = currentLine.every(c => c.type === 'TSMTextChunk' && c.content.trim() === '');
        tsmLines.push({ type: 'TSMLine', chunks: currentLine, isEmpty });
        currentLine = [];
    };

    for (const chunk of chunks) {
        if (chunk.type === 'TSMTextChunk') {
            const lines = chunk.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length > 0) {
                    currentLine.push(createTSMTextChunk(lines[i]));
                }
                if (i < lines.length - 1) {
                    pushLine();
                }
            }
        } else {
            currentLine.push(chunk);
        }
    }
    pushLine();

    // Don't trim empty lines - preserve all lines including empty ones
    return { type: 'TSMBlock', lines: tsmLines };
}