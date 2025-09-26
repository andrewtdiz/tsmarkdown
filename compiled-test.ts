import { __tsm, __erasePrevLine } from './src/runtime/tsm-runtime';

function ListItem({ item, index }: { item: string, index: number }) {
  return (__tsm(["- ", item, "", ""]))
}

function Test() {
  const items = ['Apple', 'Banana', 'Cherry'];
  const itemsStr = items.map((item, index) => `- ${item}`).join('\n');
  
  return (__tsm(["Here's a list of items:", "\n", "__JSX_EXPRESSION_0__", ""]))
}


(async () => {
  try {
    const out = await Test();
    Bun.write("compiled-test.md", out);

  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
