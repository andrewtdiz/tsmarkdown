import { ParsedMDX } from "../parser";
import { propsToObjectString } from "../renderer/string-helpers";
import { Chunk } from "../runtime/tsm-runtime";

export function generateReturnStatements(parsed: ParsedMDX): string {
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
                    console.log("RETURN STMT CONTENT: ", returnStmt.content);
                    // Content is already chunks - convert them to JavaScript literals
                    for (const chunk of returnStmt.content) {
                        if (chunk === null || chunk === undefined || chunk === false) {
                            chunks.push(String(chunk));
                        } else if (chunk === '\n') {
                            chunks.push("'\\n'");
                        } else if (typeof chunk === 'string') {
                            let includeQuotes = true;
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
                            chunks.push(includeQuotes ? `"${processedChunk}"` : processedChunk);
                        } else if (Array.isArray(chunk)) {
                            // TSMInterpolations should be evaluated by TypeScript as expressions
                            // Join array elements as a single expression
                            console.log("CHUNK: ", chunk);
                            const hasNestedChunks = chunk.some(c => Array.isArray(c));
                            let expression = chunk.join('');
                            if (hasNestedChunks) {
                                expression = `__tsm([${expression}])`;
                            }
                            console.log("EXPRESSION: ", expression);
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
                if (chunk === "'\\n'") {
                    currentChunk.push(chunk);
                    processedChunks.push(currentChunk);
                    currentChunk = [];
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