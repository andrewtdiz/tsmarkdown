
import { __tsm } from "./src/runtime/tsm-runtime";

import { OlItem } from './components/OlItem'

import { UlItem } from './components/UlItem'

interface ListProps {
  items: string[];
  ordered: boolean
}

export function List({ items, ordered }: ListProps): string {
  
    return __tsm([
    "Items", '\n',
    "", items.map((item, index) => ordered ? (
  <@OlItem item={item} index={index} />
) : (
  <@UlItem item={item} />
))
]);
}

(async () => {
  try {
    const out = await List({ items: ["Item 1"] });
    console.log("\n=== Runtime Output ===");
    console.log(out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
