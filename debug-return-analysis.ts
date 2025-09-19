import { analyzeReturnStatements } from './src/parser/parser-utils';

const testMdx = `function BasicMultipleReturns({ name }: { name?: string }) {
    if (!name) {
        return (
            Name not provided.
        );
    }
    return (
        Welcome back, {{ name }}!
    )
}`;

console.log('Testing return analysis...');
const result = analyzeReturnStatements(testMdx);
console.log('Result:', JSON.stringify(result, null, 2));
