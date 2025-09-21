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
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";
const inlineVersion = (
    *Version: {{ VERSION_NUMBER }}!*
);

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
    
    {{ inlineVersion }}
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
