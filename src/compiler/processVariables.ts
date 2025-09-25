import ts from "typescript";
import { protectCodeBlocks, restoreCodeBlocks } from "../parser/code-protection";
import { normalizeIndentation } from "../utils/string-helpers";
import { parseContent } from "../parser/parser-utils";
import { TSMComponentAttribute } from "../parser/tsm-ast";


function isBooleanLiteral(node: ts.Node): node is ts.BooleanLiteral {
    return node.kind === ts.SyntaxKind.TrueKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword;
}


/**
 * Processes template syntax in an expression and returns the transpiled version
 */
function processTemplateInExpression(expression: string, sourceFile: ts.SourceFile, variableValues?: Map<string, string>): {
    transpiled: string;
    interpolations: Array<{ placeholder: string; expression: string }>;
    conditionalBlocks: Array<{ condition: string; content: any }>;
    ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }>;
    jsxExpressions: Array<{ name: string; props: Array<{ name: string; value: { type: string; value: string } }> }>;
} | null {

    // Find parentheses template syntax (*...*) - can contain nested braces
    const parenTemplateMatch = expression.match(/\(\*([\s\S]*?)\*\)/);

    if (!parenTemplateMatch) {
        return null;
    }

    const templateContent = parenTemplateMatch[1];

    // Process the template content using the existing pipeline
    const { protectedContent, codeBlocks } = protectCodeBlocks(templateContent);
    const normalizedMarkdown = normalizeIndentation(protectedContent).trim();

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
        variableValues, // Pass variable values for resolution
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    // Convert chunks to string first
    const contentString = chunksToTemplateLiteral(processedContent);

    // Convert TSMComponent jsxExpressions to the expected format for convertToTemplateLiteral
    const convertedJSXExpressions = jsxExpressions.map(jsx => ({
        name: jsx.name,
        props: jsx.props
    }));

    // Convert the processed content to a template literal
    const transpiled = convertToTemplateLiteral(contentString, interpolations, conditionalBlocks, ternaryExpressions, convertedJSXExpressions);

    return {
        transpiled,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions // Return the new TSMComponent structure
    };
}

/**
 * Checks if an expression contains template syntax
 */
function containsTemplateSyntax(expression: string): boolean {
    // A simple check for the interpolation syntax is a reliable way to identify TSM blocks.
    return expression.includes('{{');
}

/**
 * Extracts all variable declarations and their evaluated values from the source file
 */
export function extractVariableValues(sourceFile: ts.SourceFile): Map<string, any> {
    const variableValues = new Map<string, any>();

    function visit(node: ts.Node): void {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    const variableName = declaration.name.text;

                    try {
                        // Try to evaluate the initializer using TypeScript's evaluation capabilities
                        // Get the raw source text for the initializer
                        const sourceText = sourceFile.getFullText();
                        const initializerStart = declaration.initializer.getStart();
                        const initializerEnd = declaration.initializer.getEnd();
                        let initializerText = sourceText.slice(initializerStart, initializerEnd);

                        // For parentheses expressions, we need to manually find the matching closing parenthesis
                        if (initializerText.startsWith('(') && !initializerText.endsWith(')')) {
                            // Find the matching closing parenthesis manually
                            let parenCount = 0;
                            let endPos = initializerStart;
                            let foundStart = false;

                            for (let i = initializerStart; i < sourceText.length; i++) {
                                if (sourceText[i] === '(') {
                                    parenCount++;
                                    foundStart = true;
                                } else if (sourceText[i] === ')') {
                                    parenCount--;
                                    if (parenCount === 0 && foundStart) {
                                        endPos = i;
                                        break;
                                    }
                                }
                            }
                            initializerText = sourceText.slice(initializerStart, endPos + 1);
                        }

                        // Only store non-template variables (those without (*...*) syntax)
                        const hasTemplateSyntax = containsTemplateSyntax(initializerText);
                        if (!hasTemplateSyntax) {
                            // For simple literals, we can evaluate them
                            if (ts.isStringLiteral(declaration.initializer)) {
                                variableValues.set(variableName, declaration.initializer.text);
                            } else if (ts.isNumericLiteral(declaration.initializer)) {
                                const value = parseFloat(declaration.initializer.text);
                                variableValues.set(variableName, value);
                            } else if (isBooleanLiteral(declaration.initializer)) {
                                const value = declaration.initializer.kind === ts.SyntaxKind.TrueKeyword;
                                variableValues.set(variableName, value);
                            } else if (ts.isObjectLiteralExpression(declaration.initializer)) {
                                // For object literals, convert to a simple object representation
                                const obj: any = {};
                                for (const prop of declaration.initializer.properties) {
                                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                                        const propName = prop.name.text;
                                        if (ts.isStringLiteral(prop.initializer)) {
                                            obj[propName] = prop.initializer.text;
                                        } else if (ts.isNumericLiteral(prop.initializer)) {
                                            obj[propName] = parseFloat(prop.initializer.text);
                                        } else if (isBooleanLiteral(prop.initializer)) {
                                            obj[propName] = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
                                        }
                                    }
                                }
                                variableValues.set(variableName, obj);
                            } else {
                                // For more complex expressions, store as string for JSON parsing later
                                variableValues.set(variableName, initializerText.trim());
                            }
                        } else {
                            console.log(`DEBUG: Skipping template variable ${variableName}:`, initializerText);
                        }
                    } catch (error) {
                        console.warn(`Failed to evaluate variable ${variableName}: ${error}`);
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return variableValues;
}

/**
 * Processes global template syntax outside of functions
 */
export function processGlobalTemplates(sourceFile: ts.SourceFile): { processedSource: string; templates: any[] } {
    const templates: any[] = [];
    let processedSource = sourceFile.getFullText();

    // First, extract all variable values to use for resolution
    const variableValues = extractVariableValues(sourceFile);

    // Find all variable declarations at the top level
    function visit(node: ts.Node): void {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.initializer) {
                    const variableName = declaration.name.text;
                    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

                    // Get the raw source text for the initializer, since TypeScript parser may truncate TSmd syntax
                    const sourceText = sourceFile.getFullText();
                    const initializerStart = declaration.initializer.getStart();
                    const initializerEnd = declaration.initializer.getEnd();
                    let initializerText = sourceText.slice(initializerStart, initializerEnd);

                    // For parentheses expressions, we need to manually find the matching closing parenthesis
                    if (initializerText.startsWith('(') && !initializerText.endsWith(')')) {
                        // Find the matching closing parenthesis manually
                        let parenCount = 0;
                        let endPos = initializerStart;
                        let foundStart = false;

                        for (let i = initializerStart; i < sourceText.length; i++) {
                            if (sourceText[i] === '(') {
                                parenCount++;
                                foundStart = true;
                            } else if (sourceText[i] === ')') {
                                parenCount--;
                                if (parenCount === 0 && foundStart) {
                                    endPos = i;
                                    break;
                                }
                            }
                        }
                        initializerText = sourceText.slice(initializerStart, endPos + 1);
                    }


                    if (containsTemplateSyntax(initializerText)) {
                        // Extract and process the template content with variable resolution
                        const templateResult = processTemplateInExpression(initializerText, sourceFile, variableValues);

                        if (templateResult) {
                            templates.push({
                                variableName,
                                isExported,
                                originalValue: initializerText,
                                transpiledValue: templateResult.transpiled,
                                interpolations: templateResult.interpolations,
                                conditionalBlocks: templateResult.conditionalBlocks,
                                ternaryExpressions: templateResult.ternaryExpressions,
                                jsxExpressions: templateResult.jsxExpressions
                            });

                            // Replace the original expression with the transpiled version
                            const originalStart = declaration.initializer!.getStart();
                            const originalEnd = declaration.initializer!.getEnd();
                            processedSource = processedSource.substring(0, originalStart) +
                                templateResult.transpiled +
                                processedSource.substring(originalEnd);
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return { processedSource, templates };
}