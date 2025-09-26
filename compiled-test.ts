
import { __tsm } from "./src/runtime/tsm-runtime";

interface ListItemProps {
  item: string;
  index: number
}

function ListItem({ item, index }: ListItemProps): string {
  
    return __tsm([
    item, " | ", " "
]);
}

function Test(): string {
  const items = ['Apple', 'Banana', 'Cherry'];
const user = { name: 'Alice', age: 30 };
    return __tsm([
    "Here's a list of items:", '\n',
    "", items.map((item, index) => __tsm(["- ", item, "\n", index === items.length - 1 && null]))
]);
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
