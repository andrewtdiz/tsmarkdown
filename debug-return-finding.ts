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

console.log('Manual search for return statements...');

let braceLevel = 0;
let inFunction = false;
let functionStartIndex = -1;
let firstReturnIndex = -1;

for (let i = 0; i < mdx.length; i++) {
    const char = mdx[i];
    const nextChars = mdx.slice(i, i + 6);

    // Track brace levels
    if (char === '{') {
        braceLevel++;
        if (braceLevel === 1) {
            inFunction = true;
            functionStartIndex = i + 1;
            console.log(`Function starts at index ${i + 1}: "${mdx.slice(i + 1, i + 20)}"`);
        }
    } else if (char === '}') {
        braceLevel--;
        if (braceLevel === 0 && inFunction) {
            console.log(`Function ends at index ${i}: "${mdx.slice(i - 10, i + 1)}"`);
            break;
        }
    }

    // Look for return statements
    if (inFunction && nextChars === 'return') {
        console.log(`Found 'return' at index ${i}, braceLevel: ${braceLevel}`);
        const afterReturn = mdx.slice(i + 6).trim();
        console.log(`After return: "${afterReturn.slice(0, 20)}"`);
        if (afterReturn.startsWith('(')) {
            console.log(`First return statement found at index ${i}`);
            if (firstReturnIndex === -1) {
                firstReturnIndex = i;
            }
        }
    }
}

console.log(`\nResults:`);
console.log(`functionStartIndex: ${functionStartIndex}`);
console.log(`firstReturnIndex: ${firstReturnIndex}`);

if (firstReturnIndex > -1) {
    console.log(`\nTypeScript prelude (0 to ${firstReturnIndex}):`);
    console.log(JSON.stringify(mdx.slice(0, firstReturnIndex)));

    console.log(`\nReturn statement area (${firstReturnIndex} to ${firstReturnIndex + 50}):`);
    console.log(JSON.stringify(mdx.slice(firstReturnIndex, firstReturnIndex + 50)));
}
