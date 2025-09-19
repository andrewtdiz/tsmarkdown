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

// Find the function
const functions = extractFunctions(sourceFile);
console.log("Found functions:", functions.map(f => f.name));

// Get the function node
let functionNode: ts.FunctionDeclaration | null = null;
function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'MiniComponent') {
        functionNode = node;
    }
    ts.forEachChild(node, visit);
}
visit(sourceFile);

if (functionNode) {
    console.log("Function found:", functionNode.name?.text);
    
    // Find return statements using the same logic as the compiler
    const returns: ts.ReturnStatement[] = [];
    let functionDepth = 0;

    function findReturns(n: ts.Node) {
        if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) {
            functionDepth++;
            ts.forEachChild(n, findReturns);
            functionDepth--;
            return;
        }

        if (ts.isReturnStatement(n) && functionDepth === 1) {
            returns.push(n);
        }

        ts.forEachChild(n, findReturns);
    }

    if (functionNode.body) {
        functionDepth = 1;
        ts.forEachChild(functionNode.body, findReturns);
    }
    
    console.log(`Found ${returns.length} return statements`);
    returns.forEach((ret, index) => {
        console.log(`Return ${index + 1}:`, ret.getText(sourceFile));
    });
}
