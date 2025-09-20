// Test the preprocessing function directly
function preprocessMDXInFunctions(source: string): string {
    let processedSource = source;

    const returnWithParensRegex = /return\s*\(\s*([\s\S]*?)\s*\)/g;

    processedSource = processedSource.replace(returnWithParensRegex, (match, content) => {
        const hasMDXSyntax = /(^#{1,6}\s|\{\{[^}]+\}\})/m.test(content);

        if (hasMDXSyntax) {
            let templateContent = content
                .trim()
                .replace(/`/g, '\\`')
                .replace(/\$/g, '\\$')
                .replace(/\{\{([^}]+)\}\}/g, '${$1}');

            return 'return `' + templateContent + '`';
        }

        return match;
    });

    return processedSource;
}

const testMDX = `function Test() {
    if (true) {
        return (
            # Hello World
            This is a test
        )
    }
}`;

console.log('=== ORIGINAL ===');
console.log(testMDX);

console.log('\n=== PREPROCESSED ===');
const preprocessed = preprocessMDXInFunctions(testMDX);
console.log(preprocessed);

console.log('\n=== PREPROCESSED (ESCAPED) ===');
console.log(JSON.stringify(preprocessed));
