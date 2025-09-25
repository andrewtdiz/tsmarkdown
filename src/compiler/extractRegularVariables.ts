import ts from "typescript";

/**
 * Extracts regular TypeScript variables (non-template, non-function)
 */
export function extractRegularVariables(
    sourceFile: ts.SourceFile,
    globalTemplates: any[],
    functions: Array<{ functionInfo: any; compiled: any }>
): Array<{ text: string; isExported: boolean }> {
    const regularVariables: Array<{ text: string; isExported: boolean }> = [];
    const processedStatements = new Set<string>();

    // Get names of variables that are already processed as templates or functions
    const processedNames = new Set([
        ...globalTemplates.map(t => t.variableName),
        ...functions.map(f => f.functionInfo.name)
    ]);

    function visit(node: ts.Node, depth: number = 0): void {
        if (ts.isVariableStatement(node)) {
            // Only process top-level variable statements (depth 0)
            if (depth === 0) {
                const statementText = node.getText(sourceFile);

                // Skip if we've already processed this statement
                if (processedStatements.has(statementText)) {
                    return;
                }

                // Check if any variable in this statement is already processed
                let hasProcessedVariable = false;
                for (const declaration of node.declarationList.declarations) {
                    if (ts.isIdentifier(declaration.name)) {
                        if (processedNames.has(declaration.name.text)) {
                            hasProcessedVariable = true;
                            break;
                        }
                    }
                }

                if (hasProcessedVariable) {
                    return;
                }

                // Check if this statement contains template syntax
                if (statementText.includes('(*') || statementText.includes('{{')) {
                    return;
                }

                // This is a regular top-level variable statement
                const isExported = node.modifiers?.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword) || false;

                regularVariables.push({
                    text: statementText,
                    isExported
                });

                processedStatements.add(statementText);
            }
        }

        // Increase depth when entering function bodies
        const newDepth = (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) ? depth + 1 : depth;

        ts.forEachChild(node, (child) => visit(child, newDepth));
    }

    visit(sourceFile);
    return regularVariables;
}