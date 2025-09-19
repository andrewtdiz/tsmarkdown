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

console.log('Detailed return search...');

// First, find the actual function declaration
const functionMatch = mdx.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>)\s*\{/);
console.log('Function match:', functionMatch?.[0]);

if (functionMatch) {
    const functionStartPos = functionMatch.index! + functionMatch[0].length - 1;
    console.log('Function starts at:', functionStartPos);

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

        // Look for return statements
        if (inFunction && nextChars === 'return') {
            const afterReturn = mdx.slice(i + 6).trim();
            console.log(`Found 'return' at ${i}, braceLevel: ${braceLevel}, afterReturn: "${afterReturn.slice(0, 30)}"`);
            if (afterReturn.startsWith('(')) {
                returnCount++;
                console.log(`Return statement ${returnCount} found at index ${i}`);
            } else {
                console.log(`Return at ${i} doesn't start with '('`);
            }
        }
    }

    console.log(`Total return count: ${returnCount}`);

    // Let's also search for all occurrences of 'return'
    console.log('\nAll return occurrences:');
    let searchIndex = 0;
    while (true) {
        const returnIndex = mdx.indexOf('return', searchIndex);
        if (returnIndex === -1) break;

        const context = mdx.slice(returnIndex - 10, returnIndex + 20);
        console.log(`'return' at ${returnIndex}: "${context}"`);
        searchIndex = returnIndex + 1;
    }
}
