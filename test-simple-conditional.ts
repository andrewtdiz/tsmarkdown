import { compileFullFile } from './src/compiler/full-file-compiler';

const simpleTest = `
function TestComponent() {
  const data = { isAuthorized: true };

  return (
    # Admin panel
    {{ data.isAuthorized && (
      Authorized
    )}}
  )
}
`;

async function test() {
  console.log("=== Simple Conditional Test ===");
  console.log("Input:");
  console.log(simpleTest);
  console.log("\nOutput:");

  const result = await compileFullFile(simpleTest);
  console.log((result.transpiledFile));
}

test().catch(console.error);
