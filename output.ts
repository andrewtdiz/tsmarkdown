
import { __tsm } from 'typescriptmd';


function ListItem({ item, index }: { item: string, index: number }) {
  return __tsm(["", "\n", "- ",  item , "\n", "  "])

}

function List({ items }: { items: string[] }) {
  return __tsm(["", "\n", items.map((item, index) => __tsm([ListItem({item: item, index: index})])).join(''), "\n", "  "])

}

function Test() {
  const fruits = [ 'Apple', 'Banana', 'Cherry', 'Strawberry' ];
  const fruit = 'Apple';
  
  return __tsm(["", "\n", "Here's a list of items:", "\n", fruits.length > 0 ? __tsm(["", "\n", "Test:", "\n", List({items: fruits}), "\n", ""]) : __tsm(["", "\n", "No fruits", "\n", ""]), "\n", "  "])

}


(async () => {
  const out = await Test();
  Bun.write("output.md", out);
})();
