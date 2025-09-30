
import { __tsm } from 'typescriptmd';


function ListItem({ item, index }: { item: string, index: number }) {
  return __tsm(["- ",  item ])

}

function List({ items }: { items: string[] }) {
  return __tsm([items.map((item, index) => __tsm([ListItem({item: item, index: index})])).join('\n')])

}

function Test() {
  const fruits = [ 'Apple', 'Banana', 'Cherry', 'Strawberry' ];
  const vegetables = [ 'Carrot', 'Broccoli', 'Spinach', 'Tomato' ];
  const fruit = 'Apple';
  
  return __tsm(["Here's a list of items:", "\n", "    ", fruits.length > 0 ? __tsm(["Test:", "\n", List({items: fruits}), "\n", List({items: vegetables})]) : __tsm(["No fruits"])])

}


(async () => {
  const out = await Test();
  Bun.write("output.md", out);
})();
