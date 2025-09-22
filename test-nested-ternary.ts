import { compileFullFile } from './src/compiler/full-file-compiler';

async function testNestedConditional() {
    const source = `
function TestNestedConditional() {
  const cond1 = true;
  const cond2 = false;
  const cond3 = true;

  return (
    {{cond1 ? (
      Some content {{cond2 && (
        nested content {{ cond3 && (
            nested content 3
        )}}
      )}}
      More content
    ) : (
      Other content
    )}}
  )
}
`;

    try {
        const result = await compileFullFile(source);
        console.log('=== COMPILED RESULT ===');
        console.log(result.transpiledFile);
        console.log('\n=== ERRORS ===');
        console.log(result.errors);
    } catch (error) {
        console.error('Compilation failed:', error);
    }
}

testNestedConditional();
