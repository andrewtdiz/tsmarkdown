
import { __tsm } from "./src/runtime/tsm-runtime";


    
function Test(): string {
  const name = 'Test';
    return __tsm([
    "# ", name
]);
}

(async () => {
  try {
    const props = {};
    
    const out = await Test(props);
    Bun.write("compiled-test.md", out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
