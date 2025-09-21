import { compileFullFile } from "./src/compiler";


const completeTypeScriptSource = `
import { Dashboard } from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";
const inlineVersion = (
  *Version: {{ VERSION_NUMBER }}!*
);

async function TestComponent() {
  return (
    # Version
    {{ inlineVersion }}
  )
}
`;

const expectedOutput = `# Version
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
