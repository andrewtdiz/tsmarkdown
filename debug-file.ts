import { execFileSync } from "child_process";
import { transpileSource } from "./src/compiler/core";

const file = `
function ListItem({ item, index }: { item: string, index: number }) {
  return (
  
    - {{ item }}

  )
}

function List({ items }: { items: string[] }) {
  return (
    {{ items.map((item, index) => (
      <@ListItem item={item} index={index} />

    ))}}
  )
}

function Test() {
  const fruits = [ 'Apple', 'Banana', 'Cherry', 'Strawberry' ];
  const fruit = 'Apple';
  
  return (
    Here's a list of items:
    {{ fruits.length > 0 ? (
      Test:
      <@List items={fruits}/>
    ) : (
      No fruits
    ) }}
  )
}
`;

const compiled = transpileSource(file);

const fullFile = `
${compiled.transpiledFile}

(async () => {
  const out = await Test();
  Bun.write("output.md", out);
})();
`;

Bun.write("output.ts", fullFile);

execFileSync("bun", ["output.ts"], { stdio: "inherit" });