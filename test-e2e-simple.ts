/**
 * End-to-end test demonstrating jscodeshift integration for AST transformations
 * 
 * This file shows how to use jscodeshift to make structural changes to TypeScript
 * code declaratively and testably, instead of using manual string parsing or regex.
 * 
 * Key benefits demonstrated:
 * - Declarative AST manipulation
 * - Testable transformations
 * - No manual string/regex parsing
 * - Reusable codemods
 */

import { compile, compileAllExportedFunctions, compileAllFunctions, compileFullFile } from "./src/compiler";

const completeTypeScriptSource = `
import { Dashboard } from "./components/Dashboard";
function TestComponent() {
  const data = { isAuthorized: true };

  return (
    # Admin panel
    {{ data.isAuthorized && (
      Welcome, {{ data.name }}!
    )}}
    {{ data.isAuthorized ? (
      Authorized
    ) : (
      Not Authorized,
      Name: {{ data.name }}
    )}}
  )
}
`;


console.log("\n=== Testing Full-File Compilation ===");
const fullFileResult = await compileFullFile(completeTypeScriptSource);
console.log("Full-file compilation errors:", fullFileResult.errors);
console.log("Global templates found:", fullFileResult.globalTemplates.length);

if (fullFileResult.globalTemplates.length > 0) {
    console.log("\n--- Global Templates ---");
    fullFileResult.globalTemplates.forEach(template => {
        console.log(`Variable: ${template.variableName} (${template.isExported ? 'exported' : 'internal'})`);
        console.log(`Original: ${template.originalValue}`);
        console.log(`Transpiled: ${template.transpiledValue}`);
        console.log(`Interpolations: ${template.interpolations.length}`);
        console.log("");
    });
}

console.log("\n=== Complete Transpiled File (Full-File) ===");
console.log(fullFileResult.transpiledFile);
