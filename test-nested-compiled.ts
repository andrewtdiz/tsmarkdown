
import { __tsm } from "./dist/runtime/tsm-runtime";

export function TestComponent(): string {
  const someNumber = 10;
const anotherNumber = 20
    return __tsm([
    someNumber > 5 ? Some number is greater than 5. Another number is ,anotherNumber : "Some number is less than 5"
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
