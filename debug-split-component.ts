import { splitComponent } from './src/parser/parser-utils';

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

console.log('Testing component split...');
const result = splitComponent(testMdx);
console.log('Split result:', JSON.stringify(result, null, 2));
