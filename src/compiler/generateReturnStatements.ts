import { ParsedTSmd } from "../parser";
import { propsToObjectString, normalizeIndentation } from "../utils/string-helpers";
import { Chunk } from "../runtime/tsm-runtime";

// Helper function to detect ternary expression patterns in arrays
function isTernaryArray(arr: any[]): boolean {
    // Pattern: [condition, " ? ", trueValue, " : ", falseValue]
    return arr.length >= 5 &&
        arr[1] === ' ? ' &&
        arr[3] === ' : ' &&
        typeof arr[0] === 'string' && // condition
        typeof arr[2] === 'string' && // true value (can be quoted string)
        typeof arr[4] === 'string';   // false value (can be quoted string)
}

// Helper function to unquote strings if they're wrapped in quotes
function unquoteIfQuoted(str: string): string {
    // Remove surrounding quotes if present
    const match = str.match(/^"(.*)"$/);
    return match ? match[1] : str;
}

// Helper function to reconstruct ternary expressions from arrays
function reconstructTernary(arr: any[], parsed?: ParsedTSmd): string {
    if (!isTernaryArray(arr)) {
        return arr.join('');
    }

    const condition = arr[0];
    const rawTrueValue = arr[2];
    const rawFalseValue = arr[4];

    // Handle quoted strings and __tsm calls
    let trueValue = rawTrueValue;
    let falseValue = rawFalseValue;

    // Remove quotes if present
    if (typeof trueValue === 'string' && trueValue.startsWith('"') && trueValue.endsWith('"')) {
        trueValue = trueValue.slice(1, -1);
    }
    if (typeof falseValue === 'string' && falseValue.startsWith('"') && falseValue.endsWith('"')) {
        falseValue = falseValue.slice(1, -1);
    }

    // Check if true/false values contain nested interpolations that need __tsm conversion
    let processedTrueValue: string;
    let processedFalseValue: string;

    if (typeof trueValue === 'string') {
        if (trueValue.startsWith('__tsm([') && trueValue.endsWith('])')) {
            // __tsm calls are already properly formatted, extract as-is
            processedTrueValue = trueValue;
        } else if (trueValue.includes('__INTERPOLATION_') && parsed) {
            // Contains interpolation placeholders, process them
            let processedValue = trueValue;
            parsed.interpolations.forEach(({ placeholder, expression }) => {
                processedValue = processedValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
            });

            // If the processed value contains template literal syntax, check if it's a map function
            if (processedValue.includes('${') && processedValue.includes('}')) {
                if (processedValue.includes('.map(') && processedValue.includes('=>')) {
                    // This is a map function, return it as a template literal (executable TypeScript)
                    processedTrueValue = `\`${processedValue}\``;
                } else {
                    // Convert to __tsm array format for other cases
                    processedTrueValue = convertTernaryValueToTsmArray(processedValue);
                }
            } else {
                processedTrueValue = processedValue;
            }
        } else if (trueValue.includes('{{') && trueValue.includes('}}')) {
            // Contains nested interpolations, convert to __tsm array format
            processedTrueValue = convertTernaryValueToTsmArray(trueValue);
        } else {
            // Simple string values should be wrapped in __tsm calls
            processedTrueValue = `__tsm(["${trueValue}"])`;
        }
    } else {
        // Recursively process nested ternary expressions
        processedTrueValue = reconstructTernary(trueValue, parsed);
    }

    if (typeof falseValue === 'string') {
        if (falseValue.startsWith('__tsm([') && falseValue.endsWith('])')) {
            // __tsm calls are already properly formatted, extract as-is
            processedFalseValue = falseValue;
        } else if (falseValue.includes('__INTERPOLATION_') && parsed) {
            // Contains interpolation placeholders, process them
            let processedValue = falseValue;
            parsed.interpolations.forEach(({ placeholder, expression }) => {
                processedValue = processedValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
            });

            // If the processed value contains template literal syntax, check if it's a map function
            if (processedValue.includes('${') && processedValue.includes('}')) {
                if (processedValue.includes('.map(') && processedValue.includes('=>')) {
                    // This is a map function, return it as a template literal (executable TypeScript)
                    processedFalseValue = `\`${processedValue}\``;
                } else {
                    // Convert to __tsm array format for other cases
                    processedFalseValue = convertTernaryValueToTsmArray(processedValue);
                }
            } else {
                processedFalseValue = processedValue;
            }
        } else if (falseValue.includes('{{') && falseValue.includes('}}')) {
            // Contains nested interpolations, convert to __tsm array format
            processedFalseValue = convertTernaryValueToTsmArray(falseValue);
        } else {
            // Simple string values should be wrapped in __tsm calls
            processedFalseValue = `__tsm(["${falseValue}"])`;
        }
    } else if (Array.isArray(falseValue)) {
        // Handle array values by converting them to __tsm calls
        processedFalseValue = convertArrayToTsmCall(falseValue);
    } else {
        // Recursively process nested ternary expressions
        processedFalseValue = reconstructTernary(falseValue, parsed);
    }

    // Add quotes back if the original values were quoted, but not if the processed value is already a __tsm call, template literal, or map function
    const finalTrueValue = (rawTrueValue.startsWith('"') && rawTrueValue.endsWith('"') && !processedTrueValue.startsWith('__tsm(') && !processedTrueValue.startsWith('`')) ? `"${processedTrueValue}"` : processedTrueValue;
    const finalFalseValue = (rawFalseValue.startsWith('"') && rawFalseValue.endsWith('"') && !processedFalseValue.startsWith('__tsm(') && !processedFalseValue.startsWith('`')) ? `"${processedFalseValue}"` : processedFalseValue;

    return `${condition} ? ${finalTrueValue} : ${finalFalseValue}`;
}

// Helper function to convert map function content to __tsm array format
function convertToTsmArray(content: string): string {
    // Apply the same whitespace normalization logic as full-file-compiler.ts
    // Count leading and trailing newlines in the content
    const leadingMatch = content.match(/^(\s*\n+)/);
    const trailingMatch = content.match(/(\n+\s*)$/);

    const leadingNewlines = leadingMatch ? (leadingMatch[1].match(/\n/g) || []).length : 0;
    const trailingNewlines = trailingMatch ? (trailingMatch[1].match(/\n/g) || []).length : 0;

    // Normalize indentation and trim, but preserve (n-1) newlines
    const normalized = normalizeIndentation(content);
    const trimmed = normalized.trim();
    const leadingNewlineString = '\n'.repeat(Math.max(0, leadingNewlines - 1));
    const trailingNewlineString = '\n'.repeat(Math.max(0, trailingNewlines - 1));

    const normalizedContent = leadingNewlineString + trimmed + trailingNewlineString;

    // Split the normalized content by template literal syntax and convert to __tsm array format
    const parts: string[] = [];
    let currentIndex = 0;

    // Find all ${...} expressions
    const templateLiteralRegex = /\$\{([^}]+)\}/g;
    let match;

    while ((match = templateLiteralRegex.exec(normalizedContent)) !== null) {
        // Add text before the expression
        if (match.index > currentIndex) {
            const textBefore = normalizedContent.substring(currentIndex, match.index);
            if (textBefore) {
                // Use regular string literals, not template literals
                const stringLiteral = JSON.stringify(textBefore);
                parts.push(stringLiteral);
            }
        }

        // Add the expression
        parts.push(match[1]);

        currentIndex = match.index + match[0].length;
    }

    // Add remaining text after the last expression
    if (currentIndex < normalizedContent.length) {
        const textAfter = normalizedContent.substring(currentIndex);
        if (textAfter) {
            // Use regular string literals, not template literals
            const stringLiteral = JSON.stringify(textAfter);
            parts.push(stringLiteral);
        }
    }

    // If no template literals were found, treat the entire content as a string
    if (parts.length === 0) {
        const stringLiteral = JSON.stringify(normalizedContent);
        parts.push(stringLiteral);
    }

    return `__tsm([${parts.join(', ')}])`;
}

// Helper function to convert array values to __tsm calls
function convertArrayToTsmCall(arr: any[]): string {
    const chunks: string[] = [];

    for (const item of arr) {
        if (typeof item === 'string') {
            chunks.push(`"${item}"`);
        } else if (Array.isArray(item)) {
            // This is likely an interpolation, process it
            if (item.length === 1 && typeof item[0] === 'string') {
                // Simple interpolation
                chunks.push(item[0]);
            } else {
                // Complex interpolation, convert to __tsm call
                chunks.push(convertArrayToTsmCall(item));
            }
        } else {
            chunks.push(String(item));
        }
    }

    return `__tsm([${chunks.join(', ')}])`;
}

// Helper function to convert ternary expression values to __tsm array format
function convertTernaryValueToTsmArray(content: string): string {
    // Check if the content contains nested interpolations or template literal syntax
    const hasNestedInterpolations = content.includes('{{') && content.includes('}}');
    const hasTemplateLiteralSyntax = content.includes('${') && content.includes('}');

    if (!hasNestedInterpolations && !hasTemplateLiteralSyntax) {
        // No nested interpolations or template literal syntax, return as-is
        return JSON.stringify(content);
    }

    // Apply the same whitespace normalization logic as full-file-compiler.ts
    const leadingMatch = content.match(/^(\s*\n+)/);
    const trailingMatch = content.match(/(\n+\s*)$/);

    const leadingNewlines = leadingMatch ? (leadingMatch[1].match(/\n/g) || []).length : 0;
    const trailingNewlines = trailingMatch ? (trailingMatch[1].match(/\n/g) || []).length : 0;

    // Normalize indentation and trim, but preserve (n-1) newlines
    const normalized = normalizeIndentation(content);
    const trimmed = normalized.trim();
    const leadingNewlineString = '\n'.repeat(Math.max(0, leadingNewlines - 1));
    const trailingNewlineString = '\n'.repeat(Math.max(0, trailingNewlines - 1));

    const normalizedContent = leadingNewlineString + trimmed + trailingNewlineString;

    // Split the normalized content by template literal syntax and convert to __tsm array format
    const parts: string[] = [];
    let currentIndex = 0;

    // Find all ${...} expressions
    const templateLiteralRegex = /\$\{([^}]+)\}/g;
    let match;

    while ((match = templateLiteralRegex.exec(normalizedContent)) !== null) {
        // Add text before the expression
        if (match.index > currentIndex) {
            const textBefore = normalizedContent.substring(currentIndex, match.index);
            if (textBefore) {
                // Use regular string literals, not template literals
                const stringLiteral = JSON.stringify(textBefore);
                parts.push(stringLiteral);
            }
        }

        // Add the expression
        parts.push(match[1]);

        currentIndex = match.index + match[0].length;
    }

    // Add remaining text after the last expression
    if (currentIndex < normalizedContent.length) {
        const textAfter = normalizedContent.substring(currentIndex);
        if (textAfter) {
            // Use regular string literals, not template literals
            const stringLiteral = JSON.stringify(textAfter);
            parts.push(stringLiteral);
        }
    }

    // If no template literals were found, treat the entire content as a string
    if (parts.length === 0) {
        const stringLiteral = JSON.stringify(normalizedContent);
        parts.push(stringLiteral);
    }

    return `__tsm([${parts.join(', ')}])`;
}

function processNestedArrays(chunk: any[], parsed?: ParsedTSmd): string {

    // First, check if this is a ternary expression pattern
    if (isTernaryArray(chunk)) {
        return reconstructTernary(chunk, parsed);
    }

    // Check if any element is an array (nested)
    const hasNestedArrays = chunk.some(c => Array.isArray(c));

    if (!hasNestedArrays) {
        // No nested arrays, check if any element contains interpolation placeholders
        let joinedChunk = chunk.join('');
        if (joinedChunk.includes('__INTERPOLATION_') && parsed) {
            parsed.interpolations.forEach(({ placeholder, expression }) => {
                // For interpolation placeholders, we need to replace with the expression wrapped in ${} for template literal syntax
                // But we need to be careful about the context - if this is inside a map function, we need to use template literal syntax
                if (joinedChunk.includes('map(') && joinedChunk.includes('=>')) {
                    // This is inside a map function, so we need to use template literal syntax
                    // Replace just the placeholder with ${expression} for template literal syntax
                    // But preserve the surrounding whitespace and newlines
                    const placeholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    joinedChunk = joinedChunk.replace(placeholderRegex, `\${${expression}}`);
                } else {
                    // Regular interpolation replacement
                    joinedChunk = joinedChunk.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
                }
            });
        }

        // After processing all interpolations, convert map function to return __tsm chunks
        if (joinedChunk.includes('map(') && joinedChunk.includes('=>') && joinedChunk.includes('${') && !joinedChunk.includes('__tsm(')) {
            // For map functions, we need to re-enter the __tsm scope
            // This means we need to parse the content and convert it to proper __tsm array format
            const mapMatchWithParens = joinedChunk.match(/items\.map\(\([^)]+\)\s*=>\s*\(([^)]+)\)\)/);
            if (mapMatchWithParens) {
                const mapContent = mapMatchWithParens[1]; // Don't trim to preserve newlines!
                // Parse the content and convert to __tsm array format
                const tsmContent = convertToTsmArray(mapContent);
                joinedChunk = joinedChunk.replace(mapMatchWithParens[0], `items.map((item, index) => ${tsmContent})`);
            } else {
                // Try the original pattern: items.map((item, index) => (\n...\n))
                const mapMatch = joinedChunk.match(/items\.map\(\([^)]+\)\s*=>\s*\(([^)]+)\)/);
                if (mapMatch) {
                    const mapContent = mapMatch[1]; // Don't trim to preserve newlines!
                    // Parse the content and convert to __tsm array format
                    const tsmContent = convertToTsmArray(mapContent);
                    joinedChunk = joinedChunk.replace(mapMatch[0], `items.map((item, index) => ${tsmContent})`);
                }
            }
        }

        return joinedChunk;
    }

    // Process each element, recursively handling nested arrays
    const processedElements: string[] = [];
    let hasTernaryElements = false;

    for (const element of chunk) {
        if (Array.isArray(element)) {
            // Check if this nested array is a ternary expression
            if (isTernaryArray(element)) {
                processedElements.push(reconstructTernary(element, parsed));
                hasTernaryElements = true;
            } else {
                // Recursively process nested array
                const processed = processNestedArrays(element, parsed);
                processedElements.push(processed);
                // If the nested array resulted in a __tsm call, we need to wrap this in __tsm too
                if (processed.startsWith('__tsm(')) {
                    hasTernaryElements = true;
                }
            }
        } else {
            // Check if this element contains interpolation placeholders
            let processedElement = element;
            if (typeof element === 'string' && element.includes('__INTERPOLATION_') && parsed) {
                parsed.interpolations.forEach(({ placeholder, expression }) => {
                    // For interpolation placeholders, we need to replace with the expression wrapped in ${} for template literal syntax
                    processedElement = processedElement.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
                });
            }
            processedElements.push(processedElement);
        }
    }

    // Join all processed elements
    const joinedExpression = processedElements.join('');

    // Only wrap in __tsm() if we have complex nested content that isn't just ternary expressions
    if (hasTernaryElements && joinedExpression.includes('__tsm(')) {
        return `__tsm([${joinedExpression}])`;
    }

    return joinedExpression;
}

type QuoteStyle = "auto" | "double" | "single" | "backtick";

interface EncodeOpts {
    style?: QuoteStyle;          // "auto" tries to avoid escaping
    allowTemplate?: boolean;     // if false, avoid backticks or escape ${}
    multilineOK?: boolean;       // if false and not backtick, \n will be escaped
}

function encodeStringLiteral(text: string, {
    style = "auto",
    allowTemplate = false,
    multilineOK = true,
}: EncodeOpts = {}): string {
    const hasDouble = text.includes('"');
    const hasSingle = text.includes("'");
    const hasBacktick = text.includes("`");
    const hasInterp = text.includes("${");

    // Choose wrapper
    let wrapper: '"' | "'" | "`";
    if (style === "double") wrapper = '"';
    else if (style === "single") wrapper = "'";
    else if (style === "backtick") wrapper = "`";
    else {
        // auto: prefer a wrapper that requires the least escaping
        // 1) prefer double if no "
        // 2) else prefer single if no '
        // 3) else prefer backtick if allowed and safe
        // 4) else fall back to double and escape
        if (!hasDouble) wrapper = '"';
        else if (!hasSingle) wrapper = "'";
        else if (!hasBacktick && allowTemplate && !hasInterp) wrapper = "`";
        else wrapper = '"';
    }

    // If we picked backticks but template interpolation is present and we don't allow it, force escape or switch
    if (wrapper === "`" && (!allowTemplate || hasInterp)) {
        // Safer to switch to a quote and escape
        wrapper = hasDouble ? "'" : '"';
    }

    // Escape content
    let body = text
        .replace(/\\/g, "\\\\")      // backslashes first
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");

    if (wrapper !== "`" || !multilineOK) {
        body = body.replace(/\n/g, "\\n");
    }

    if (wrapper === '"') {
        body = body.replace(/"/g, '\\"');
    } else if (wrapper === "'") {
        body = body.replace(/'/g, "\\'");
    } else {
        // backtick: escape backticks; optionally neutralize ${}
        body = body.replace(/`/g, "\\`");
        if (!allowTemplate) {
            body = body.replace(/\$\{/g, "\\${");
        }
    }

    return `${wrapper}${body}${wrapper}`;
}

export function generateReturnStatements(parsed: ParsedTSmd): string {
    const conditionalReturns: string[] = [];
    let defaultReturn: string | null = null;

    // Process return statements in order
    for (let i = 0; i < parsed.returnStatements.length; i++) {
        const returnStmt = parsed.returnStatements[i];
        if (returnStmt.isTemplate) {
            // Generate chunk-based code for this return statement
            const chunks: string[] = [];

            // Add the markdown content as chunks
            if (returnStmt.content) {
                if (Array.isArray(returnStmt.content)) {
                    // Content is already chunks - convert them to JavaScript literals
                    for (const chunk of returnStmt.content) {
                        if (chunk === null || chunk === undefined || chunk === false) {
                            chunks.push(String(chunk));
                        } else if (chunk === '\n') {
                            chunks.push("'\\n'");
                        } else if (typeof chunk === 'string') {
                            let includeQuotes = true

                            // Replace JSX expression placeholders with actual expressions
                            let processedChunk = chunk;
                            if (chunk.includes('__JSX_EXPRESSION_')) {
                                parsed.jsxExpressions.filter(expr => expr.placeholder === chunk).forEach(({ name, props }) => {
                                    // Remove braces from expression and replace placeholder
                                    // const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    // processedChunk = processedChunk.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                    processedChunk = `${name}(${propsToObjectString(props)})`
                                });
                                includeQuotes = false;
                            }

                            // Replace interpolation placeholders with actual expressions
                            if (chunk.includes('__INTERPOLATION_')) {
                                parsed.interpolations.forEach(({ placeholder, expression }) => {
                                    // For interpolation placeholders, we need to replace with the expression wrapped in ${} for template literal syntax
                                    processedChunk = processedChunk.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `\${${expression}}`);
                                });
                                includeQuotes = false;
                            }

                            const literal = includeQuotes
                                ? encodeStringLiteral(processedChunk, { style: "auto", allowTemplate: false })
                                : processedChunk;

                            chunks.push(literal);
                        } else if (Array.isArray(chunk)) {
                            // TSMInterpolations should be evaluated by TypeScript as expressions
                            // Process nested arrays with proper ternary handling
                            const expression = processNestedArrays(chunk, parsed);
                            chunks.push(expression);
                        } else {
                            chunks.push(String(chunk));
                        }
                    }
                } else {
                    // Content is a string, split by newlines
                    const lines = returnStmt.content.split('\n');
                    for (let j = 0; j < lines.length; j++) {
                        if (lines[j].trim()) {
                            // Replace JSX expression placeholders with actual expressions
                            let processedLine = lines[j];
                            if (parsed.jsxExpressions) {
                                parsed.jsxExpressions.forEach(({ placeholder, expression }) => {
                                    // Remove braces from expression and replace placeholder
                                    const cleanExpression = expression.replace(/^\{+|\}+$/g, '');
                                    processedLine = processedLine.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanExpression);
                                });
                            }
                            chunks.push(`"${processedLine}"`);
                        }
                        if (j < lines.length - 1) {
                            chunks.push("'\\n'");
                        }
                    }
                }
            }

            // Generate the return statement
            const processedChunks: Chunk[][] = [];
            let currentChunk: Chunk[] = [];
            for (const chunk of chunks) {
                const isCurrentChunkEmptyString = currentChunk.length === 1 && currentChunk.join('') === '""';
                if (chunk === "'\\n'" && !isCurrentChunkEmptyString) {
                    currentChunk.push(chunk);
                    processedChunks.push(currentChunk);
                    currentChunk = [];
                } else if (chunk === '""') {
                    currentChunk.push(chunk);
                } else {
                    currentChunk.push(chunk);
                }
            }
            if (currentChunk.length > 0) {
                processedChunks.push(currentChunk);
            }
            const chunksString = processedChunks.map(chunk => chunk.join(', ')).join(',\n    ');
            const returnStatement = `return __tsm([\n    ${chunksString}\n]);`;

            // Determine if this should be a conditional or default return
            const isLastReturn = i === parsed.returnStatements.length - 1;
            const hasCondition = returnStmt.condition && returnStmt.condition !== 'undefined';

            if (hasCondition && !isLastReturn) {
                // Conditional return statement (not the last one)
                conditionalReturns.push(`if (${returnStmt.condition}) ${returnStatement}`);
            } else {
                // Default return statement (last one or no condition)
                defaultReturn = returnStatement;
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