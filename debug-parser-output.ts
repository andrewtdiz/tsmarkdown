import { parseMDX } from './src/parser';

const input = `
function TestComponent() {
  const data = { isAuthorized: true };
  return (
    # Admin panel
    {{ data.isAuthorized && (
      Authorized
    )}}
  )
}`;

const parsed = parseMDX(input);
console.log('Markdown chunks from parseMDX:', JSON.stringify(parsed.markdown, null, 2));
