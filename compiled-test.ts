import { __tsm, __erasePrevLine } from './src/runtime/tsm-runtime';

export function Test() {
  const fruits = ['Apple', 'Banana', 'Cherry'];

  if (false) {
    __tsm(["- ", item])s.map((item, index) => (
      - {{ item }}
    ));
  }
    
  __tsm(["Here's a list of items:", "\n", "", fruits.map((fruit, i) => (
  __JSX_EXPRESSION_0__
))])it} index={i} />
    ))}}
  )
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
