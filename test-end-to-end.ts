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

import { execFileSync } from "child_process";
import { compile, compileAllExportedFunctions, compileAllFunctions, compileFullFile } from "./src/compiler";

const totalStart = performance.now();
const completeTypeScriptSource = `
import { Dashboard } from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";
const someBool = false;

async function TestComponent() {
  const { data, error, timedout } = await getData();

  if (error) return false;
  if (timedout) return (
    **API Error**
  )
  if (!data) {
    return (
      **Error**: No data available

      {{ null }}
    )
  }

  return (
    # Admin panel
    {{ data.isAuthorized ? Authorized : (
      Not Authorized
    )}}
    {{ !data.active && (
      Account is inactive
    )}}
    - Name: {{ data.name }}
    - Description: {{ data.description }}
      Access your information here

    <content>
    <@Dashboard />
    </content>
    
    Version: {{ VERSION_NUMBER }}
  )
}
`;

const expectedOutput = `# Admin panel
Authorized
- Name: Bob
- Description: Bob's description
  Access your information here

<content>
    <@Dashboard />
</content>

*Version: 1.0.0!*`;

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

const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${fullFileResult.transpiledFile}

(async () => {
  try {
    const out = await TestComponent();
    console.log("\\n=== Runtime Output ===");
    console.log(out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
`;

Bun.write("compiled-test.ts", fileToRun);

const execStart = performance.now();
execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });
const execEnd = performance.now();
console.log(`Execution time: ${(execEnd - execStart).toFixed(2)}ms`);

const file = Bun.file("compiled-test.ts");
// await file.delete();

const totalEnd = performance.now();
console.log(`Total test time: ${(totalEnd - totalStart).toFixed(2)}ms`);