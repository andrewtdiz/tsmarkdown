import * as ts from 'typescript';

/**
 * Check if a given position in the source is within a return statement using TypeScript AST
 */
export function isPositionWithinReturnStatement(sourceFile: ts.SourceFile, position: number): boolean {
    let foundReturn = false;

    function visit(node: ts.Node) {
        if (ts.isReturnStatement(node)) {
            const start = node.getStart();
            const end = node.getEnd();
            if (position >= start && position <= end) {
                foundReturn = true;
                return;
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return foundReturn;
}
