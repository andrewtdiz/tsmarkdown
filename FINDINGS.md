# Nested Template Findings

## Observed Behavior
- The harness in `test-nested.ts:6-29` compiles a function that nests `{{ someNumber > 5 ? (...) : {{ anotherNumber > 15 ? (...) : (...) }}}}`; the logged result shows the inner branch captured as `__tsm(["anotherNumber > 15", " ? ", ""Another number is greater than 15"", " : ", ""Another number is less than 15""])` instead of an executable chunk.
