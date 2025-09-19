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

console.log('Step-by-step parser debug...');

const lines = mdx.split("\n");
let inFunction = false;
let inReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for function declaration patterns
    if (trimmed.startsWith("function ")) {
        console.log(`Found function declaration at line ${i}: "${trimmed}"`);
        inFunction = true;
    } else if (trimmed.startsWith("const ") && trimmed.includes("=>")) {
        console.log(`Found arrow function at line ${i}: "${trimmed}"`);
        inFunction = true;
    }

    if (inFunction && !inReturn) {
        if (trimmed === "return (") {
            console.log(`Found return statement at line ${i}: "${trimmed}"`);
            inReturn = true;
        }
    }

    if (inReturn) {
        console.log(`In return at line ${i}: "${trimmed}"`);
        if (trimmed === ")" || trimmed === ");") {
            console.log(`End of return at line ${i}: "${trimmed}"`);
            inReturn = false;
        }
    }
}
