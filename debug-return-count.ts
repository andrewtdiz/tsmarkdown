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

console.log('Manual return count...');

// First, find the actual function declaration
const functionMatch = mdx.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>)\s*\{/);
console.log('Function match:', functionMatch?.[0]);

if (functionMatch) {
    const functionStartPos = functionMatch.index! + functionMatch[0].length - 1;
    console.log('Function starts at:', functionStartPos);
    console.log('Function start context:', JSON.stringify(mdx.slice(functionStartPos - 10, functionStartPos + 20)));

    let braceLevel = 0;
    let inFunction = false;
    let returnCount = 0;

    for (let i = functionStartPos; i < mdx.length; i++) {
        const char = mdx[i];
        const nextChars = mdx.slice(i, i + 6);

        if (char === '{') {
            braceLevel++;
            if (braceLevel === 1 && !inFunction) {
                inFunction = true;
                console.log('Entered function at:', i);
            }
        } else if (char === '}') {
            braceLevel--;
            if (braceLevel === 0 && inFunction) {
                console.log('Exited function at:', i);
                break;
            }
        }

        // Count return statements
        if (inFunction && braceLevel === 1 && nextChars === 'return') {
            const afterReturn = mdx.slice(i + 6).trim();
            console.log(`Found return at ${i}, braceLevel: ${braceLevel}, afterReturn: "${afterReturn.slice(0, 20)}"`);
            if (afterReturn.startsWith('(')) {
                returnCount++;
                console.log(`Return statement ${returnCount} found at index ${i}`);
            }
        }
    }

    console.log(`Total return count: ${returnCount}`);
}
