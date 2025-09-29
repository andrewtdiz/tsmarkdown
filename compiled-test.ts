
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
  const fruits = ['Apple', 'Banana', 'Cherry'];
  const user = { name: 'Alice', age: 30 };
    return __tsm([
    "Here's a list of fruits:", '\n',
    "<fruits>", '\n',
    "", fruits.filter(f => f.length > 5).map((fruit, i) => __tsm(["ListItem({ item: fruit, index: i })"])), "", '\n',
    "</fruits>"
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
