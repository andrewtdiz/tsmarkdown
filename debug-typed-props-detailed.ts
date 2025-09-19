import { validateComponentStructure, extractTypeInfo, parseForESLint } from './src/parser/parser-utils';

const mdx = `interface User {
    name: string;
    age: number;
    isActive: boolean;
}

type UserRole = 'admin' | 'user' | 'guest';

const TypedProps = ({ user }: { user?: User }) => {    
    if (!user) {
        return (
            No User
        )
    }
    const role: UserRole = 'admin';
    const isAdmin = role === 'admin';
    
    return (
        # User Profile
        Name: {{ user.name }}
        Age: {{ user.age }}
        {{ isAdmin && (
            Admin panel access
        )}}
        {{ user.isActive ? "Account is active" : "Account is inactive" }}
    )
}`;

console.log('Testing typed-props.mdx with detailed analysis...');

console.log('\n1. Component Structure Validation:');
const validation = validateComponentStructure(mdx);
console.log('isValid:', validation.isValid);
console.log('diagnostics:', validation.diagnostics);
if (validation.component) {
    console.log('component functionName:', validation.component.functionName);
}
if (validation.split) {
    console.log('split tsPrelude length:', validation.split.tsPrelude.length);
    console.log('split markdownBody length:', validation.split.markdownBody.length);
    console.log('split hasValidStructure:', validation.split.hasValidStructure);
    console.log('split returnStartIndex:', validation.split.returnStartIndex);
    console.log('split returnEndIndex:', validation.split.returnEndIndex);

    console.log('\n--- tsPrelude ---');
    console.log(validation.split.tsPrelude);
    console.log('\n--- markdownBody ---');
    console.log(validation.split.markdownBody);
}

console.log('\n2. Type Information Extraction:');
const typeInfo = extractTypeInfo(mdx);
console.log('success:', typeInfo.success);
console.log('diagnostics:', typeInfo.diagnostics);

console.log('\n3. ESLint Parsing:');
const parseResult = parseForESLint(mdx, {
    includeMarkdownStub: true,
    fileName: 'typed-props.mdx'
});
console.log('success:', parseResult.success);
console.log('diagnostics:', parseResult.diagnostics);
