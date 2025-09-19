import { parseMDX } from './src/parser';

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

console.log('Testing updated parser with multiple returns...');

const parsed = parseMDX(mdx);

console.log('Function name:', parsed.functionName);
console.log('Function params:', parsed.functionParams);
console.log('Return statements count:', parsed.returnStatements.length);

console.log('\nReturn statements:');
parsed.returnStatements.forEach((stmt, index) => {
    console.log(`Return ${index + 1}:`, JSON.stringify(stmt.content));
});

console.log('\nMain markdown:');
console.log(JSON.stringify(parsed.markdown));

console.log('\nTypeScript:');
console.log(JSON.stringify(parsed.typescript));
