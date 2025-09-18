import { protectCodeBlocks, restoreCodeBlocks } from '../parser/code-protection';
import { parseContent } from '../parser/pipeline';

async function debugCodeBlocks() {
    console.log('=== Debugging Code Block Processing ===\n');

    const content = `    # Task Lists (Checkboxes)

    ## Task List with Code Blocks

    - [x] Implement the following function:
      \`\`\`javascript
      function greet(name) {
          return \`Hello, \${name}!\`;
      }
      \`\`\`
    - [ ] Add error handling to the function above`;

    console.log('Original content:');
    console.log(content);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test code block protection
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);
    console.log('Protected content:');
    console.log(protectedContent);
    console.log('\nCode blocks:');
    codeBlocks.forEach((block, i) => {
        console.log(`Block ${i}: ${block.placeholder}`);
        console.log(`Content: ${block.content}`);
    });
    console.log('\n' + '='.repeat(50) + '\n');

    // Test parsing pipeline
    const context = {
        interpolations: [],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: []
    };

    const processed = parseContent(protectedContent, context);
    console.log('Processed content:');
    console.log(processed);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test restoration
    const restored = restoreCodeBlocks(processed, codeBlocks);
    console.log('Restored content:');
    console.log(restored);
    console.log('\n' + '='.repeat(50) + '\n');

    // Compare line by line
    const originalLines = content.split('\n');
    const restoredLines = restored.split('\n');

    console.log('Line-by-line comparison:');
    for (let i = 0; i < Math.max(originalLines.length, restoredLines.length); i++) {
        const original = originalLines[i] || '';
        const restored = restoredLines[i] || '';
        const match = original === restored ? '✓' : '✗';
        console.log(`${i + 1}: ${match} "${original}" | "${restored}"`);
    }
}

// Run the debug function
debugCodeBlocks().catch(console.error);
