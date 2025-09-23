
import { __tsm } from "./src/runtime/tsm-runtime";

import {Dashboard} from "./components/Dashboard";

import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";

function LocalComponent(): string {
  const someNumber = 30;
    return __tsm([
    Dashboard()
]);
}

interface OlItemProps {
  item: string;
  index: number
}

function OlItem({ item, index }: OlItemProps): string {
  
    return __tsm([
    index + 1, ". ", item
]);
}

interface ListProps {
  items: string[];
  withAnd: boolean;
  separator: string
}

function List({ items, withAnd, separator }: ListProps): string {
  const beginningItems = items.slice(0, -1);
const lastItem = items[items.length - 1];
const sep = separator || ',';
const separatorString = sep + ' '
const someStr = beginningItems.join(separatorString) + (withAnd ? ' and ' : separatorString) + lastItem
    return __tsm([
    items.length === 0 ? "Empty" : "__JSX_EXPRESSION_0__"
]);
}

export function TestComponent(): string {
  const someNumber = 3;
const names = ["John", "Jane", "Jim"];
const lowerCaseNames = names.map(name => name.toLowerCase());
const anotherVariable = "Another Variable";
const someBool = someNumber > 5;
    return __tsm([
    "# Version", '\n',
    "## Here is some content", '\n',
    "* ", VERSION_NUMBER, " *", '\n',
    "Test: More content *bolded* and **italicized** or __underlined__", '\n',
    "", '\n', LocalComponent(), '\n',
    "", '\n', Dashboard({ title: "My Dashboard", showHeader: true }), '\n',
    "", '\n', "## Users", '\n',
    List({ items: names, separator: " |" }), '\n',
    "", '\n', "Some number x 5: ", someNumber * 5, "", '\n',
    "", '\n', "", someBool ? __tsm(["Some number is greater than 5! Here it is: ", someNumber]) : __tsm(["Some number is less than 5, it's ", someNumber]), "", '\n',
    "", someNumber > 10 ? "Some number is greater than 10!" : __tsm(["Some number is less than 10, it's ", someNumber]), "", '\n',
    "More Content"
]);
}

(() => {
  try {
    const out = TestComponent();
    Bun.write("compiled-test.md", out);

  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
