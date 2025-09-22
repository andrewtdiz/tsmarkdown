import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";
import { parseJSXExpressionToTSMComponent } from "./src/parser/interpolations";


const completeTypeScriptSource = `
import { OlItem } from './components/OlItem'
import { UlItem } from './components/UlItem'

function List({ items, ordered }: { items: string[]; ordered: boolean }) {

  return (
    Items
    {{items.map((item, index) => ordered ? (
      item
    ) : (
      <@UlItem item={item} />
    ))}}
  )
}
`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);

console.log("FULL FILE RESULT: ", fullFileResult.transpiledFile);

const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${fullFileResult.transpiledFile}

(async () => {
  try {
    const out = List({ items: ["Item 1", "Item 2", "Item 3"], ordered: true });
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