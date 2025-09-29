import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";

const completeTypeScriptSource = `
const VERSION_NUMBER = "1.0.0";

function LocalComponent() {
  const someNumber = 30;

  return (
    Dashboard
  )
}

function OlItem({ item, index }: { item: string, index: number }) {
  return (
    {{ index + 1 }}. {{ item }}
  )
}

function List({ items, withAnd, separator }: { items: string[]; withAnd?: boolean, separator?: string }) {
  const beginningItems = items.slice(0, -1);
  const lastItem = items[items.length - 1];
  const sep = separator || ',';
  const separatorString = sep + ' '
  const someStr = beginningItems.join(separatorString) + (withAnd ? ' and ' : separatorString) + lastItem
  
  return (
    {{ items.length === 0 ? Empty : (
      <@OlItem item={item} index={index} />
    )}}
  )
}

export function TestComponent() {
  const someNumber = 3;
  const names = ["John", "Jane", "Jim"];
  const lowerCaseNames = names.map(name => name.toLowerCase());
  const anotherVariable = "Another Variable";
  const someBool = someNumber > 5;

  return (
    # Version
    ## Here is some content
    * {{ VERSION_NUMBER }} *
    Test: More content *bolded* and **italicized** or __underlined__

    <@LocalComponent />

    ## Users
    <@List items={names}  />

    Some number x 5: {{ someNumber * 5 }}

    {{ someBool ? (
      Some number is greater than 5! Here it is: {{ someNumber }}
    ) : (
      Some number is less than 5, it's {{ someNumber }}
    )}}
    {{ someNumber > 10 ? Some number is greater than 10! : Some number is less than 10, it's {{ someNumber }} }}
    More Content
  )
}
`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);


const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${fullFileResult.transpiledFile}

(() => {
  try {
    const out = TestComponent();
    Bun.write("compiled-test.md", out);

  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
`;

Bun.write("compiled-test.ts", fileToRun);

execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });

const totalEnd = performance.now();
console.log(`Compiled in: ${(totalEnd - totalStart).toFixed(2)}ms`);

