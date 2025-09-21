// Unified double-brace syntax dispatcher
import { findMatchingDoubleBrace, findMatchingBrace } from './string-helpers';
import type { ParseContext } from './types';
import type { Chunk } from '../runtime/tsm-runtime';
import type { TSMChunk, TSMComponent, TSMComponentAttribute, TSMAttributeValue } from './tsm-ast';
import { protectCodeBlocks, restoreCodeBlocks } from './code-protection';
import { normalizeIndentation, parseJSXProps, propsToObjectString } from '../renderer/string-helpers';
import { parseContent } from './pipeline';

// Warning system for legacy single-brace usage
const legacyWarnings = new Set<string>();

function warnLegacySyntax(expression: string, line: number): void {
    const warning = `Legacy single-brace syntax detected at line ${line}: {${expression}}. Please migrate to double-brace syntax: {{${expression}}}`;
    if (!legacyWarnings.has(warning)) {
        console.warn(`[Better MDX] ${warning}`);
        legacyWarnings.add(warning);
    }
}

// Process legacy single-brace syntax with warnings
function processLegacySingleBraces(content: string, context: ParseContext): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next { pattern (not {{)
        const openIndex = processedContent.indexOf('{', startIndex);
        if (openIndex === -1) break;

        // Skip if it's a double brace {{
        if (processedContent[openIndex + 1] === '{') {
            startIndex = openIndex + 2;
            continue;
        }

        // Find the matching closing brace
        const closeIndex = findMatchingBrace(processedContent, openIndex);
        if (closeIndex === -1) {
            startIndex = openIndex + 1;
            continue;
        }

        // Extract the expression
        const expression = processedContent.substring(openIndex + 1, closeIndex).trim();

        if (expression) {
            // Calculate approximate line number for warning
            const lineNumber = processedContent.substring(0, openIndex).split('\n').length;
            warnLegacySyntax(expression, lineNumber);

            // Classify and process the legacy expression as if it were double-brace
            const expressionType = classifyExpression(expression);
            let placeholder: string;

            switch (expressionType) {
                case 'conditional':
                    placeholder = `__CONDITIONAL_${context.conditionalBlocks.length}__`;
                    const andPattern = /&&\s*\(/;
                    const match = expression.match(andPattern);
                    if (match) {
                        const andIndex = match.index!;
                        const condition = expression.substring(0, andIndex).trim();
                        const parenStart = andIndex + match[0].length - 1;
                        const parenEnd = findMatchingParen(expression, parenStart);
                        if (parenEnd !== -1) {
                            const blockContent = expression.substring(parenStart + 1, parenEnd).trim();
                            // Recursively process the block content to handle nested constructs
                            const processedBlockContent = parseInterpolations(blockContent, context);
                            context.conditionalBlocks.push({
                                condition: condition,
                                content: processedBlockContent,
                            });
                        }
                    }
                    break;

                case 'ternary':
                    placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
                    const questionIndex = expression.indexOf('?');
                    const colonIndex = expression.lastIndexOf(':');
                    if (questionIndex !== -1 && colonIndex !== -1 && colonIndex > questionIndex) {
                        const condition = expression.substring(0, questionIndex).trim();
                        const trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
                        const falseValue = expression.substring(colonIndex + 1).trim();
                        context.ternaryExpressions.push({
                            condition: condition,
                            trueValue: trueValue,
                            falseValue: falseValue,
                        });
                    }
                    break;

                case 'jsx':
                    placeholder = `__JSX_EXPRESSION_${context.jsxExpressions.length}__`;
                    context.jsxExpressions.push({ placeholder, expression });
                    break;

                case 'interpolation':
                default:
                    placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                    context.interpolations.push({ placeholder, expression });
                    break;
            }

            // Replace the entire { expression } with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 1);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            startIndex = closeIndex + 1;
        }
    }

    return processedContent;
}

// Classify expression type and route to appropriate handler
function classifyExpression(expression: string): 'conditional' | 'ternary' | 'jsx' | 'interpolation' {
    const trimmed = expression.trim();

    // Check for conditional pattern: condition && (content)
    // Must have && followed by ( and the pattern should be at the start
    if (trimmed.includes('&&') && trimmed.includes('(') && trimmed.includes(')')) {
        const andPattern = /&&\s*\(/;
        if (andPattern.test(trimmed)) {
            return 'conditional';
        }
    }

    // Check for ternary pattern: condition ? trueValue : falseValue
    // Must have at least one ? and one : in the right order
    if (trimmed.includes('?') && trimmed.includes(':')) {
        const questionIndex = trimmed.indexOf('?');
        const colonIndex = trimmed.lastIndexOf(':');
        if (colonIndex > questionIndex) {
            return 'ternary';
        }
    }

    // Check for JSX pattern: contains < and > or JSX elements
    if (trimmed.includes('<') && trimmed.includes('>')) {
        return 'jsx';
    }

    return 'interpolation';
}


// Unified dispatcher for double-brace syntax with legacy support
export function parseInterpolations(content: string, context: ParseContext): string {
    let processedContent = content;
    let startIndex = 0;

    // First pass: process double-brace syntax {{...}}
    while (startIndex < processedContent.length) {
        // Find the next {{ pattern
        const openIndex = processedContent.indexOf('{{', startIndex);
        if (openIndex === -1) break;

        // Find the matching }} using the helper function
        const closeIndex = findMatchingDoubleBrace(processedContent, openIndex);
        if (closeIndex === -1) {
            // No matching }} found, skip this one
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            // Classify the expression type
            const expressionType = classifyExpression(expression);

            let placeholder: string = '';

            switch (expressionType) {
                case 'conditional':
                    // Parse conditional logic
                    const andPattern = /&&\s*\(/;
                    const match = expression.match(andPattern);
                    if (match) {
                        const andIndex = match.index!;
                        const condition = expression.substring(0, andIndex).trim();
                        const parenStart = andIndex + match[0].length - 1;
                        const parenEnd = findMatchingParen(expression, parenStart);
                        if (parenEnd !== -1) {
                            const blockContent = expression.substring(parenStart + 1, parenEnd).trim();

                            // Store the current length to get the correct index for this conditional
                            const currentIndex = context.conditionalBlocks.length;

                            // Add the conditional block first (before processing nested content)
                            context.conditionalBlocks.push({
                                condition: condition,
                                content: blockContent, // Don't process nested content yet
                            });

                            // Now process the nested content and update the content
                            const processedBlockContent = parseInterpolations(blockContent, context);
                            context.conditionalBlocks[currentIndex].content = processedBlockContent;

                            placeholder = `__CONDITIONAL_${currentIndex}__`;
                        } else {
                            // Invalid conditional syntax, treat as regular interpolation
                            placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                            context.interpolations.push({ placeholder, expression });
                        }
                    } else {
                        // Invalid conditional syntax, treat as regular interpolation
                        placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                        context.interpolations.push({ placeholder, expression });
                    }
                    break;

                case 'ternary':
                    placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
                    // Parse ternary logic with proper nesting support
                    const { condition, trueValue, falseValue } = parseNestedTernary(expression);
                    if (condition && trueValue && falseValue) {
                        // Process interpolations within the ternary values
                        const processedTrueValue = parseInterpolations(trueValue, context);
                        const processedFalseValue = parseInterpolations(falseValue, context);

                        context.ternaryExpressions.push({
                            condition: condition,
                            trueValue: processedTrueValue,
                            falseValue: processedFalseValue,
                        });
                    }
                    break;

                case 'jsx':
                    placeholder = `__JSX_EXPRESSION_${context.jsxExpressions.length}__`;
                    context.jsxExpressions.push({ placeholder, expression });
                    break;

                case 'interpolation':
                default:
                    placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                    context.interpolations.push({ placeholder, expression });
                    break;
            }

            // Replace the entire {{ expression }} with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 2);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            // Empty expression, skip
            startIndex = closeIndex + 2;
        }
    }

    // Second pass: process legacy single-brace syntax {...} with warnings
    processedContent = processLegacySingleBraces(processedContent, context);

    return processedContent;
}

// Helper function to find matching parenthesis (needed for conditional parsing)
function findMatchingParen(content: string, startIndex: number): number {
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

// Helper function to clean parentheses and whitespace from ternary values
function cleanParenthesesAndWhitespace(value: string): string {
    // Remove leading and trailing whitespace
    let cleaned = value.trim();

    // If the value starts with ( and ends with ), and they match (not nested),
    // remove the outer parentheses
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        // Check if the parentheses are properly matched at the top level
        let parenCount = 0;
        let hasUnmatchedParens = false;

        for (let i = 0; i < cleaned.length; i++) {
            const char = cleaned[i];
            if (char === '(') {
                parenCount++;
            } else if (char === ')') {
                parenCount--;
                // If we hit 0 before the end, there are nested parentheses
                if (parenCount === 0 && i < cleaned.length - 1) {
                    hasUnmatchedParens = true;
                    break;
                }
            }
        }

        // Only remove outer parentheses if they're properly matched
        if (!hasUnmatchedParens && parenCount === 0) {
            cleaned = cleaned.slice(1, -1).trim();
        }
    }

    return cleaned;
}

// Helper function to parse nested ternary expressions
function parseNestedTernary(expression: string): { condition: string; trueValue: string; falseValue: string } {
    let parenCount = 0;
    let questionIndex = -1;
    let colonIndex = -1;

    // Find the outermost ? operator
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '?' && parenCount === 0) {
            questionIndex = i;
            break;
        }
    }

    if (questionIndex === -1) {
        return { condition: '', trueValue: '', falseValue: '' };
    }

    // Find the matching : operator for this ?
    for (let i = questionIndex + 1; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === ':' && parenCount === 0) {
            colonIndex = i;
            break;
        }
    }

    if (colonIndex === -1) {
        return { condition: '', trueValue: '', falseValue: '' };
    }

    const condition = expression.substring(0, questionIndex).trim();
    let trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
    let falseValue = expression.substring(colonIndex + 1).trim();

    // Clean up parentheses and whitespace from trueValue and falseValue
    trueValue = cleanParenthesesAndWhitespace(trueValue);
    falseValue = cleanParenthesesAndWhitespace(falseValue);

    return { condition, trueValue, falseValue };
}

export function processNestedInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next {{ pattern
        const openIndex = processedContent.indexOf('{{', startIndex);
        if (openIndex === -1) break;

        // Find the matching }} by counting nested braces
        let braceCount = 0;
        let closeIndex = openIndex + 2; // Start after {{

        while (closeIndex < processedContent.length) {
            const char = processedContent[closeIndex];
            const nextChar = processedContent[closeIndex + 1];

            if (char === '{' && nextChar === '{') {
                // Found nested {{
                braceCount++;
                closeIndex += 2;
            } else if (char === '}' && nextChar === '}') {
                // Found }}
                if (braceCount === 0) {
                    // This is the matching closing }}
                    break;
                } else {
                    // This is a nested closing }}, decrement count
                    braceCount--;
                    closeIndex += 2;
                }
            } else {
                closeIndex++;
            }
        }

        if (closeIndex >= processedContent.length) {
            // No matching }} found, skip this one
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            const placeholder = `__INTERPOLATION_${interpolations.length}__`;
            interpolations.push({ placeholder, expression });

            // Replace the entire {{ expression }} with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 2);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            // Empty expression, skip
            startIndex = closeIndex + 2;
        }
    }

    return processedContent;
}

// TSM AST parser that builds AST nodes instead of chunks
import type { TSMBlock, TSMLine, TSMTextChunk, TSMInterpolation } from './tsm-ast';

// Helper function to create TSM AST nodes
function createTSMTextChunk(content: string): TSMTextChunk {
    return {
        type: 'TSMTextChunk',
        content
    };
}

function createTSMInterpolation(expression: string, isLogical?: boolean, isConditional?: boolean): TSMInterpolation {
    return {
        type: 'TSMInterpolation',
        expression,
        isLogical,
        isConditional
    };
}

// TSM AST parser that builds AST nodes instead of chunks
export function parseInterpolationsToAST(content: string, context: ParseContext): TSMBlock {

    // First, split content into lines
    const lines = content.split('\n');
    const tsmLines: TSMLine[] = [];

    // Process the entire content at once, not line by line
    const chunks: TSMChunk[] = [];
    let startIndex = 0;

    // First pass: process double-brace syntax {{...}}
    while (startIndex < content.length) {
        // Find the next {{ pattern
        const openIndex = content.indexOf('{{', startIndex);
        if (openIndex === -1) {
            // No more {{, process remaining text for JSX elements before adding as text chunk
            if (startIndex < content.length) {
                const remainingText = content.substring(startIndex);
                const processedText = processJSXElementsInText(remainingText, context);
                chunks.push(createTSMTextChunk(processedText));
            }
            break;
        }

        // Add text before {{ as text chunk, but process JSX elements first
        if (openIndex > startIndex) {
            const textSegment = content.substring(startIndex, openIndex);
            const processedText = processJSXElementsInText(textSegment, context);
            chunks.push(createTSMTextChunk(processedText));
        }

        // Find the matching }} using the helper function
        const closeIndex = findMatchingDoubleBrace(content, openIndex);
        if (closeIndex === -1) {
            // No matching }} found, add {{ and continue
            chunks.push(createTSMTextChunk('{{'));
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = content.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            // Classify the expression type
            const expressionType = classifyExpression(expression);

            switch (expressionType) {
                case 'conditional':
                    // Parse conditional logic
                    const andPattern = /&&\s*\(/;
                    const match = expression.match(andPattern);
                    if (match) {
                        const andIndex = match.index!;
                        const condition = expression.substring(0, andIndex).trim();
                        const parenStart = andIndex + match[0].length - 1;
                        const parenEnd = findMatchingParen(expression, parenStart);
                        if (parenEnd !== -1) {
                            const blockContent = expression.substring(parenStart + 1, parenEnd).trim();

                            // Process the conditional content through the parsing pipeline
                            const { protectedContent, codeBlocks } = protectCodeBlocks(blockContent);
                            const normalizedMarkdown = normalizeIndentation(protectedContent).trim();
                            const content = parseContent(normalizedMarkdown, context);
                            const restoredContent = restoreCodeBlocks(content, codeBlocks);

                            console.log('DEBUG: Conditional blockContent:', blockContent);
                            console.log('DEBUG: Conditional content type:', typeof content);
                            console.log('DEBUG: Conditional content:', content);

                            // Store the conditional block
                            const currentIndex = context.conditionalBlocks.length;
                            context.conditionalBlocks.push({
                                condition: condition,
                                content: restoredContent,
                            });

                            // Add the conditional expression as TSMInterpolation
                            chunks.push({
                                type: 'TSMInterpolation',
                                expression: expression,
                                isConditional: false,
                                isLogical: true,
                            });
                        } else {
                            // Invalid conditional syntax, treat as regular interpolation
                            chunks.push(createTSMInterpolation(expression, false, false));
                        }
                    } else {
                        // Invalid conditional syntax, treat as regular interpolation
                        chunks.push(createTSMInterpolation(expression, false, false));
                    }
                    break;

                case 'ternary':
                    // Parse ternary logic with proper nesting support
                    const { condition, trueValue, falseValue } = parseNestedTernary(expression);
                    if (condition && trueValue && falseValue) {
                        // Process the true and false values through the parsing pipeline
                        const processValue = (value: string): Chunk[] => {
                            if (value.trim()) {
                                const { protectedContent, codeBlocks } = protectCodeBlocks(value);
                                const normalizedMarkdown = normalizeIndentation(protectedContent).trim();
                                const chunks = parseContent(normalizedMarkdown, context);
                                return restoreCodeBlocks(chunks, codeBlocks);
                            }
                            return [];
                        };

                        const processedTrueValue = processValue(trueValue);
                        const processedFalseValue = processValue(falseValue);

                        context.ternaryExpressions.push({
                            condition: condition,
                            trueValue: processedTrueValue,
                            falseValue: processedFalseValue,
                        });

                        // Add the ternary expression as TSMInterpolation
                        chunks.push(createTSMInterpolation(expression, false, true));
                    } else {
                        // Invalid ternary syntax, treat as regular interpolation
                        chunks.push(createTSMInterpolation(expression, false, false));
                    }
                    break;

                case 'jsx':
                    // Handle JSX expressions
                    chunks.push(createTSMInterpolation(expression, false, false));
                    break;

                case 'interpolation':
                default:
                    // Regular interpolation - add to context and create chunk
                    const placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                    context.interpolations.push({ placeholder, expression });
                    chunks.push(createTSMInterpolation(expression, false, false));
                    break;
            }

            // Update startIndex to continue after the }}
            startIndex = closeIndex + 2;
        } else {
            // Empty expression, add {{}} as text
            chunks.push(createTSMTextChunk('{{}}'));
            startIndex = closeIndex + 2;
        }
    }

    // Create TSM lines from chunks, splitting on newlines
    let currentLineChunks: TSMChunk[] = [];

    for (const chunk of chunks) {
        if (chunk.type === 'TSMTextChunk' && chunk.content.includes('\n')) {
            // Split text chunk on newlines
            const parts = chunk.content.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (parts[i]) {
                    currentLineChunks.push(createTSMTextChunk(parts[i]));
                } else {
                    // Create empty text chunk to preserve empty lines
                    currentLineChunks.push(createTSMTextChunk(''));
                }
                if (i < parts.length - 1) {
                    // End current line and start new one
                    tsmLines.push({
                        type: 'TSMLine',
                        chunks: currentLineChunks
                    });
                    currentLineChunks = [];
                }
            }
        } else {
            currentLineChunks.push(chunk);
        }
    }

    // Add final line if it has content
    if (currentLineChunks.length > 0) {
        tsmLines.push({
            type: 'TSMLine',
            chunks: currentLineChunks
        });
    }

    return {
        type: 'TSMBlock',
        lines: tsmLines
    };
}

// TSM AST renderer that converts AST nodes to chunks
export function renderASTToChunks(ast: TSMBlock, context: ParseContext): Chunk[] {
    const chunks: Chunk[] = [];

    for (const line of ast.lines) {
        for (const chunk of line.chunks) {
            if (chunk.type === 'TSMTextChunk') {
                // Process JSX elements in text chunks
                const processedContent = processJSXElementsInText(chunk.content, context);
                chunks.push(processedContent);
            } else if (chunk.type === 'TSMInterpolation') {
                const interpolation = chunk as TSMInterpolation;

                // Handle different types of interpolations
                if (interpolation.isLogical) {
                    // Handle conditional expressions like {{ cond && (content) }}
                    // Extract condition by finding the && pattern and getting text before it
                    const andMatch = interpolation.expression.match(/(.+?)\s*&&\s*\(/);
                    console.log('DEBUG: andMatch:', andMatch);
                    console.log('DEBUG: context.conditionalBlocks:', context.conditionalBlocks);
                    const conditionalIndex = andMatch ? context.conditionalBlocks.findIndex(cb => cb.condition === andMatch[1].trim()) : -1;
                    console.log('DEBUG: conditionalIndex:', conditionalIndex);
                    if (conditionalIndex !== -1) {
                        const conditional = context.conditionalBlocks[conditionalIndex];
                        // Convert chunks to TSM runtime calls
                        const processChunks = (chunks: any[], isNested: boolean = false): any => {
                            // Ensure chunks is always treated as an array
                            if (!Array.isArray(chunks)) {
                                chunks = [chunks];
                            }

                            if (chunks.length === 0) return isNested ? [] : '__tsm([])';
                            if (chunks.length === 1) {
                                const chunk = chunks[0];
                                if (typeof chunk === 'string') {
                                    // Single string - return simple string or chunk depending on context
                                    return isNested ? chunk : `"${chunk}"`;
                                }
                                if (Array.isArray(chunk)) {
                                    // Check if this is a runtime interpolation array [ "variable.name" ]
                                    if (chunk.length === 1 && typeof chunk[0] === 'string') {
                                        // This is a runtime interpolation
                                        // In nested context (like conditional content), treat as variable reference
                                        // In non-nested context, execute as expression
                                        return isNested ? chunk[0] : chunk.join('');
                                    }
                                    // Otherwise, recursively process nested chunks
                                    return processChunks(chunk, true);
                                }
                                return isNested ? chunk : String(chunk);
                            }

                            // Check if this is nested content (mixed strings and arrays)
                            const hasMixedContent = chunks.some(chunk =>
                                Array.isArray(chunk) && chunk.length > 1
                            ) || (chunks.some(chunk => typeof chunk === 'string') &&
                                chunks.some(chunk => Array.isArray(chunk)));

                            if (isNested || hasMixedContent) {
                                // Return chunks directly for nested content
                                return chunks;
                            }

                            // Multiple chunks - collect them for __tsm call
                            const tsmChunks: string[] = [];
                            for (const chunk of chunks) {
                                if (typeof chunk === 'string') {
                                    tsmChunks.push(`"${chunk}"`);
                                } else if (Array.isArray(chunk)) {
                                    // Check if this is a ternary condition array [ "condition", " ? ", ... ]
                                    if (chunk.length >= 3 && chunk[1] === ' ? ') {
                                        // This is a ternary expression, preserve the condition as a variable reference
                                        tsmChunks.push(chunk[0]); // The condition
                                        // Add the rest of the ternary as-is
                                        for (let i = 1; i < chunk.length; i++) {
                                            tsmChunks.push(chunk[i]);
                                        }
                                    } else if (chunk.length === 1 && typeof chunk[0] === 'string') {
                                        // This is a runtime interpolation - always treat as variable reference
                                        tsmChunks.push(chunk[0]);
                                    } else {
                                        // Otherwise, recursively process nested chunks
                                        tsmChunks.push(processChunks(chunk, true));
                                    }
                                } else {
                                    tsmChunks.push(String(chunk));
                                }
                            }

                            return `__tsm([${tsmChunks.join(', ')}])`;
                        };

                        // Process conditional content - always process through TSM runtime
                        let content: any = conditional.content;

                        if (Array.isArray(content)) {
                            // For arrays, process through chunks to ensure TSM rendering
                            // Always process through TSM runtime for any array content
                            if (content.length === 1 && typeof content[0] === 'string') {
                                content = `__tsm(["${content[0]}"])`;
                            } else {
                                // For mixed content or multiple elements, manually construct TSM call
                                const tsmArgs: string[] = [];
                                for (const chunk of content) {
                                    if (typeof chunk === 'string') {
                                        tsmArgs.push(`"${chunk}"`);
                                    } else if (Array.isArray(chunk)) {
                                        if (chunk.length === 1 && typeof chunk[0] === 'string') {
                                            // This is a runtime interpolation - treat as variable reference
                                            tsmArgs.push(chunk[0]);
                                        } else {
                                            // Otherwise, recursively process
                                            const nestedResult = processChunks(chunk, true);
                                            tsmArgs.push(nestedResult);
                                        }
                                    } else {
                                        tsmArgs.push(String(chunk));
                                    }
                                }
                                content = `__tsm([${tsmArgs.join(', ')}])`;
                            }
                        }

                        chunks.push([conditional.condition, ' && ', content] as Chunk);
                    }
                } else if (interpolation.isConditional) {
                    // Handle ternary expressions like {{ cond ? true : false }}
                    // Parse the ternary expression directly instead of matching to stored expressions
                    const { condition, trueValue, falseValue } = parseNestedTernary(interpolation.expression);
                    if (condition && trueValue && falseValue) {
                        // Process the true and false values through the parsing pipeline
                        const processValue = (value: string): any => {
                            if (value.trim()) {
                                const { protectedContent, codeBlocks } = protectCodeBlocks(value);
                                const normalizedMarkdown = normalizeIndentation(protectedContent).trim();
                                const chunks = parseContent(normalizedMarkdown, context);
                                const restoredChunks = restoreCodeBlocks(chunks, codeBlocks);

                                // If we have chunks, check if they represent a conditional expression
                                if (Array.isArray(restoredChunks) && restoredChunks.length > 0) {
                                    if (restoredChunks.length === 1) {
                                        const chunk = restoredChunks[0];
                                        if (typeof chunk === 'string') {
                                            // Check if this is a conditional expression pattern
                                            if (chunk.includes('&&') && chunk.includes('(') && chunk.includes(')')) {
                                                // This is a conditional - return as-is to be processed later
                                                return chunk;
                                            }
                                            return `"${chunk}"`;
                                        }
                                        if (Array.isArray(chunk)) {
                                            // Recursively process nested chunks
                                            const processChunks = (chunks: any[], isNested: boolean = false): any => {
                                                // Ensure chunks is always treated as an array
                                                if (!Array.isArray(chunks)) {
                                                    chunks = [chunks];
                                                }

                                                if (chunks.length === 0) return isNested ? [] : '__tsm([])';
                                                if (chunks.length === 1) {
                                                    const chunk = chunks[0];
                                                    if (typeof chunk === 'string') {
                                                        return isNested ? chunk : `"${chunk}"`;
                                                    }
                                                    if (Array.isArray(chunk)) {
                                                        // Recursively process nested chunks
                                                        return processChunks(chunk, true);
                                                    }
                                                    return isNested ? chunk : String(chunk);
                                                }

                                                // Check if this is nested content (mixed strings and arrays)
                                                const hasMixedContent = chunks.some(chunk =>
                                                    Array.isArray(chunk) && chunk.length > 1
                                                ) || (chunks.some(chunk => typeof chunk === 'string') &&
                                                    chunks.some(chunk => Array.isArray(chunk)));

                                                if (isNested || hasMixedContent) {
                                                    // Return chunks directly for nested content
                                                    return chunks;
                                                }

                                                // Multiple chunks - collect them for __tsm call
                                                const tsmChunks: string[] = [];
                                                for (const chunk of chunks) {
                                                    if (typeof chunk === 'string') {
                                                        tsmChunks.push(`"${chunk}"`);
                                                    } else if (Array.isArray(chunk)) {
                                                        // Recursively process nested chunks
                                                        tsmChunks.push(processChunks(chunk, true));
                                                    } else {
                                                        tsmChunks.push(String(chunk));
                                                    }
                                                }

                                                return `__tsm([${tsmChunks.join(', ')}])`;
                                            };
                                            return processChunks(chunk);
                                        }
                                        return String(chunk);
                                    }

                                    // Multiple chunks - collect them for __tsm call
                                    const processChunks = (chunks: any[], isNested: boolean = false): any => {
                                        // Ensure chunks is always treated as an array
                                        if (!Array.isArray(chunks)) {
                                            chunks = [chunks];
                                        }

                                        if (chunks.length === 0) return isNested ? [] : '__tsm([])';
                                        if (chunks.length === 1) {
                                            const chunk = chunks[0];
                                            if (typeof chunk === 'string') {
                                                return isNested ? chunk : `"${chunk}"`;
                                            }
                                            if (Array.isArray(chunk)) {
                                                // Check if this is a runtime interpolation array [ "variable.name" ]
                                                if (chunk.length === 1 && typeof chunk[0] === 'string') {
                                                    // This is a runtime interpolation
                                                    // In nested context (like conditional content), treat as variable reference
                                                    // In non-nested context, execute as expression
                                                    return isNested ? chunk[0] : chunk.join('');
                                                }
                                                // Otherwise, recursively process nested chunks
                                                return processChunks(chunk, true);
                                            }
                                            return isNested ? chunk : String(chunk);
                                        }

                                        // Check if this is nested content (mixed strings and arrays)
                                        const hasMixedContent = chunks.some(chunk =>
                                            Array.isArray(chunk) && chunk.length > 1
                                        ) || (chunks.some(chunk => typeof chunk === 'string') &&
                                            chunks.some(chunk => Array.isArray(chunk)));

                                        if (isNested || hasMixedContent) {
                                            // Return chunks directly for nested content
                                            return chunks;
                                        }

                                        // Multiple chunks - collect them for __tsm call
                                        const tsmChunks: string[] = [];
                                        for (const chunk of chunks) {
                                            if (typeof chunk === 'string') {
                                                tsmChunks.push(`"${chunk}"`);
                                            } else if (Array.isArray(chunk)) {
                                                // Check if this is a runtime interpolation array [ "variable.name" ]
                                                if (chunk.length === 1 && typeof chunk[0] === 'string') {
                                                    // This is a runtime interpolation
                                                    // In nested context (like conditional content), treat as variable reference
                                                    // In non-nested context, execute as expression
                                                    if (isNested) {
                                                        tsmChunks.push(chunk[0]);
                                                    } else {
                                                        tsmChunks.push(chunk.join(''));
                                                    }
                                                } else {
                                                    // Otherwise, recursively process nested chunks
                                                    tsmChunks.push(processChunks(chunk, true));
                                                }
                                            } else {
                                                tsmChunks.push(String(chunk));
                                            }
                                        }

                                        return `__tsm([${tsmChunks.join(', ')}])`;
                                    };

                                    return processChunks(restoredChunks, true);
                                }
                                return `"${value}"`;
                            }
                            return '""';
                        };

                        const trueVal = processValue(trueValue);
                        const falseVal = processValue(falseValue);
                        // The condition should be preserved as a runtime variable reference
                        chunks.push([condition.trim(), ' ? ', trueVal, ' : ', falseVal] as Chunk);
                    } else {
                        // Fallback to treating as regular interpolation if parsing fails
                        chunks.push([interpolation.expression] as Chunk);
                    }
                } else {
                    // Regular interpolation - check if it's a variable reference that can be resolved
                    const expression = interpolation.expression.trim();

                    // Check if this is a simple variable reference (no dots, no function calls, etc.)
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expression) && context.variableValues?.has(expression)) {
                        // This is a variable reference that can be resolved
                        const resolvedValue = context.variableValues.get(expression);
                        chunks.push(resolvedValue);
                    } else {
                        // Regular interpolation that can't be resolved
                        chunks.push([interpolation.expression] as Chunk);
                    }
                }
            } else if (chunk.type === 'TSMComponent') {
                // Handle components
                chunks.push([chunk.name] as Chunk);
            }
        }

        // Add newline between lines (but not after the last line)
        if (line !== ast.lines[ast.lines.length - 1]) {
            chunks.push('\n');
        }
    }

    return chunks;
}

// Helper function to process JSX elements in text chunks
function processJSXElementsInText(content: string, context: ParseContext): string {
    // Find JSX elements like <@Component prop={value} />
    const jsxElementRegex = /<@(\w+)([^/>]*)\/>/g;

    let processedContent = content;

    let match;
    while ((match = jsxElementRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const componentName = match[1];
        const props = match[2] || '';

        // Create a JSX expression placeholder
        const placeholder = `__JSX_EXPRESSION_${context.jsxExpressions.length}__`;
        const fullJsxElement = fullMatch; // Keep the full JSX element for later processing

        // Add to JSX expressions array
        context.jsxExpressions.push({ placeholder, expression: fullJsxElement });

        // Replace the JSX element with the placeholder
        processedContent = processedContent.replace(fullMatch, placeholder);
    }

    return processedContent;
}

/**
 * Parses a JSX expression like <@Dashboard title="My Title" showHeader={true} /> into a TSMComponent
 */
export function parseJSXExpressionToTSMComponent(jsxExpression: string): TSMComponent | null {
    // Match JSX element pattern: <@ComponentName props... />
    const jsxElementRegex = /<@(\w+)([^/>]*)\/>/;
    const match = jsxExpression.match(jsxElementRegex);

    if (!match) {
        return null;
    }

    const componentName = match[1];
    const propsString = match[2] || '';

    // Parse props using the existing parseJSXProps function
    const parsedProps = parseJSXProps(propsString);

    // Convert parsed props to TSMComponentAttribute objects
    const attributes: TSMComponentAttribute[] = parsedProps.map(prop => ({
        type: 'TSMComponentAttribute',
        name: prop.name,
        value: prop.isExpression
            ? { type: 'expression', value: prop.value }
            : { type: 'string', value: prop.value }
    }));

    return {
        type: 'TSMComponent',
        name: componentName,
        attributes,
        isSelfClosing: true
    };
}

// Legacy chunk-based parser (keeping for backward compatibility)
export function parseInterpolationsToChunks(content: string, context: ParseContext): Chunk[] {
    const ast = parseInterpolationsToAST(content, context);

    // Convert AST to chunks
    return renderASTToChunks(ast, context);
}
