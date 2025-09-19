const testSource = `
export function MiniComponent({ name, isLoggedIn = true }: { name: string, isLoggedIn: boolean }) {
  const excited = name.split("").map(letter => {
    return letter.toUpperCase()
  }).join("");

  if (name === "") return (Welcome, {{ someName }}!)
  return (# Hello {{ excited }}!)
}
`;

function preprocessMDXInFunctions(source: string): string {
    console.log("Original source:");
    console.log(source);
    
    let processedSource = source;
    
    // Find return statements with parentheses that contain MDX syntax
    const returnWithParensRegex = /return\s*\(\s*([^)]*\{\{[^}]+\}\}[^)]*)\s*\)/g;
    
    console.log("\nLooking for regex matches with returnWithParensRegex...");
    let match;
    while ((match = returnWithParensRegex.exec(source)) !== null) {
        console.log("Found match:", match[0]);
        console.log("Content:", match[1]);
    }
    
    processedSource = processedSource.replace(returnWithParensRegex, (match, content) => {
        console.log("Replacing:", match);
        let templateContent = content
            .replace(/#\s+/g, '# ')
            .trim();
        
        const replacement = `return (${templateContent})`;
        console.log("With:", replacement);
        return replacement;
    });
    
    // Also handle return statements with hash syntax (like # Hello)
    const returnWithHashRegex = /return\s*\(\s*(#[^)]*)\s*\)/g;
    
    console.log("\nLooking for regex matches with returnWithHashRegex...");
    returnWithHashRegex.lastIndex = 0; // Reset regex
    while ((match = returnWithHashRegex.exec(processedSource)) !== null) {
        console.log("Found match:", match[0]);
        console.log("Content:", match[1]);
    }
    
    processedSource = processedSource.replace(returnWithHashRegex, (match, content) => {
        console.log("Replacing:", match);
        let templateContent = content.trim();
        
        const replacement = `return (${templateContent})`;
        console.log("With:", replacement);
        return replacement;
    });
    
    console.log("\nFinal processed source:");
    console.log(processedSource);
    
    return processedSource;
}

const result = preprocessMDXInFunctions(testSource);
