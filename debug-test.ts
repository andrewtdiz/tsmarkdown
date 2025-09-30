import { compileFullFile } from "./src/compiler/core";

const result = compileFullFile(`
const name = "Test";

function someContent() {
  return (
    <content>
      {{ name }}
    </content>
  )
}

export function Test() {

  return (
    # Test
    <@someContent />
    And more
    
  )
}
`);

console.log(result.transpiledFile);

