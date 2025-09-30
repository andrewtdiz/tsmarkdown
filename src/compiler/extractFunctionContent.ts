import ts from "typescript";
import { findRootLevelTsmBlocks, extractBlockContent } from "./block-finder";

export function extractFunctionContent(ast: ts.SourceFile, functionName: string): {
    typescript: string;
    returnStatements: {
        condition: string | undefined;
        content: string;
        isTemplate: boolean;
    }[];
} {
    let functionNode: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | null = null;

    function visit(node: ts.Node) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
            functionNode = node;
        } else if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === functionName && declaration.initializer && (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer))) {
                    functionNode = declaration.initializer;
                }
            }
        }
        if (!functionNode) {
            ts.forEachChild(node, visit);
        }
    }

    visit(ast);

    if (!functionNode) {
        return { typescript: '', returnStatements: [] };
    }

    const tsmBlocks = findRootLevelTsmBlocks(functionNode);
    const returnStatements = tsmBlocks.map(block => {
        // @ts-ignore
        const content = extractBlockContent(block, ast);
        return {
            condition: undefined, // Condition extraction is part of the old implementation and will be handled differently now.
            content: content,
            isTemplate: true,
        };
    });

    // For now, we are not extracting the other typescript parts of the function.
    // This will be handled by the new compiler architecture.
    const typescript = '';

    return {
        typescript,
        returnStatements,
    };
}