import ts from "typescript";

function isBooleanLiteral(node: ts.Node): node is ts.BooleanLiteral {
    return node.kind === ts.SyntaxKind.TrueKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword;
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