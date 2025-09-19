import { validateComponentStructure } from './src/parser/parser-utils';

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

console.log('Testing indices...');

const validation = validateComponentStructure(mdx);
if (validation.split) {
    console.log('returnStartIndex:', validation.split.returnStartIndex);
    console.log('returnEndIndex:', validation.split.returnEndIndex);

    console.log('\n--- Source around returnStartIndex ---');
    console.log(JSON.stringify(mdx.slice(validation.split.returnStartIndex - 10, validation.split.returnStartIndex + 10)));

    console.log('\n--- Source around returnEndIndex ---');
    console.log(JSON.stringify(mdx.slice(validation.split.returnEndIndex - 10, validation.split.returnEndIndex + 10)));

    console.log('\n--- Full tsPrelude ---');
    console.log(JSON.stringify(validation.split.tsPrelude));

    console.log('\n--- Full markdownBody ---');
    console.log(JSON.stringify(validation.split.markdownBody));
}
