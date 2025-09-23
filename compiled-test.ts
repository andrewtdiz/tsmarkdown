
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

export function TestComponent(): string {
  const someNumber = 3;
const names = ["John", "Jane", "Jim"];
const lowerCaseNames = names.map(name => name.toLowerCase());
const anotherVariable = "Another Variable";
const someBool = someNumber > 5;
    return __tsm([
    "# Version", '\n',
    "## Here i am", '\n',
    "* ", VERSION_NUMBER, " *", '\n',
    "Test: More content *bolded*", '\n',
    "", '\n',
    LocalComponent(), '\n',
    "", '\n',
    Dashboard({ title: "My Dashboard", showHeader: true }), '\n',
    "", '\n',
    "", names.length > 0 ? __tsm(["Names: ", names.join(", ")]) : "No names", "", '\n',
    "", '\n',
    "", someBool ? __tsm(["Some number is greater than 5! It's ", someNumber]) : __tsm(["Some number is less than 5, it's ", someNumber]), "", '\n',
    "", someNumber > 10 ? "Some number is greater than 10!" : __tsm(["Some number is less than 10, it's ", someNumber]), "", '\n',
    "More Content"
]);
}

(async () => {
  try {
    const out = await TestComponent();
    console.log("\n=== Runtime Output ===");
    console.log(out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
