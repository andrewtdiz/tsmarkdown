import { __tsm, __erasePrevLine } from './src/runtime/tsm-runtime';

function ListItem({ item, index }: { item: string, index: number }) {
  return __tsm([ index + 1 , ". ",  item ])

}

export function Test() {
  const fruits = ['Apple', 'Banana', 'Cherry'];

  return __tsm([
    "Here's a list of items:", "\n",
    (fruits.length > 0 ? __tsm(["There are fruits a plenty!"]) : null), "\n",
    fruits.length === 0 ? __tsm(["No fruits currently"]) : __tsm(["# Fruits:", "\n", fruits.map((fruit, i) => __tsm([ i + 1 , ". ",  fruit ])).join('\n')])])

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
