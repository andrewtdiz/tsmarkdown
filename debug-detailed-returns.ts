import * as ts from 'typescript';
import { extractFunctions } from './src/parser/typescript-parser';

const testSource = `
export function MiniComponent({ name, isLoggedIn = true }: { name: string, isLoggedIn: boolean }) {
  const excited = name.split("").map(letter => {
    return letter.toUpperCase()
  }).join("");

  if (name === "") return (Welcome, {{ someName }}!)
  return (# Hello {{ excited }}!)
}
`;

// Create AST
const sourceFile = ts.createSourceFile(
    'test.ts',
    testSource,
    ts.ScriptTarget.Latest,
    true
);

console.log("=== Original Source ===");
console.log(testSource);

console.log("\n=== AST Analysis ===");

// Find the function
let functionNode: ts.FunctionDeclaration | null = null;
function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'MiniComponent') {
        functionNode = node;
        console.log("Function found:", node.name?.text);
        console.log("Function start:", node.getStart());
        console.log("Function end:", node.getEnd());
        console.log("Function text:", node.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
}
visit(sourceFile);

if (functionNode && functionNode.body) {
    console.log("\n=== Function Body Analysis ===");
    console.log("Body start:", functionNode.body.getStart());
    console.log("Body end:", functionNode.body.getEnd());
    console.log("Body text:", functionNode.body.getText(sourceFile));
    
    console.log("\n=== Statement Analysis ===");
    functionNode.body.statements.forEach((stmt, index) => {
        console.log(`Statement ${index}:`, stmt.kind, ts.SyntaxKind[stmt.kind]);
        console.log("  Text:", stmt.getText(sourceFile));
        
        if (ts.isIfStatement(stmt)) {
            console.log("  This is an if statement");
            console.log("  Then statement:", stmt.thenStatement.getText(sourceFile));
            if (ts.isReturnStatement(stmt.thenStatement)) {
                console.log("  Then statement is a return!");
            }
        }
        if (ts.isReturnStatement(stmt)) {
            console.log("  This is a return statement");
        }
    });
}
