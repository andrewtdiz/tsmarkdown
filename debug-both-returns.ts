import { compileAllFunctions } from './src/compiler/multi-function-compiler';
import { compileFullFile } from './src/compiler/full-file-compiler';

const testSource = `
export function TestFunction({ name }: { name: string }) {
  if (name === "") return (First return: {{ name }})
  return (Second return: {{ name }})
}
`;

console.log("=== Testing Multi-Function Compiler ===");
compileAllFunctions(testSource).then(result => {
    console.log("Functions found:", result.functions.length);
    result.functions.forEach(({ functionInfo, compiled }) => {
        console.log(`Function: ${functionInfo.name}`);
        console.log("Return statements:", compiled.returnStatements?.length || 0);
        if (compiled.returnStatements) {
            compiled.returnStatements.forEach((ret, index) => {
                console.log(`  Return ${index + 1}:`, ret.content);
            });
        }
        console.log("TypeScript:", compiled.typescript);
    });
});

console.log("\n=== Testing Full-File Compiler ===");
compileFullFile(testSource).then(result => {
    console.log("Functions found:", result.functions.length);
    result.functions.forEach(({ functionInfo, compiled }) => {
        console.log(`Function: ${functionInfo.name}`);
        console.log("Return statements:", compiled.returnStatements?.length || 0);
        if (compiled.returnStatements) {
            compiled.returnStatements.forEach((ret, index) => {
                console.log(`  Return ${index + 1}:`, ret.content);
            });
        }
        console.log("TypeScript:", compiled.typescript);
    });
});
