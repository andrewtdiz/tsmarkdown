import { __tsm } from "typescriptmd";

export function Test() {
  const items = ['Apple', 'Banana', 'Cherry'];
  const itemsStr = items.map((item, index) => `- ${item}`).join('\n');
  
  return (
    Here's a list of items:
    <@ListItem items={items[0]} />
  )
}
