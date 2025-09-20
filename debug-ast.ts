import { parseInterpolationsToAST, renderASTToChunks } from './src/parser/interpolations';
import { restoreCodeBlocks } from './src/parser/code-protection';

const content = `# Admin panel
{{ data.isAuthorized && (
  Authorized
)}}`;

const context = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
const ast = parseInterpolationsToAST(content, context);
console.log('AST:', JSON.stringify(ast, null, 2));

let chunks = renderASTToChunks(ast, context);
console.log('Chunks from renderASTToChunks:', JSON.stringify(chunks, null, 2));

const codeBlocks = [];
chunks = restoreCodeBlocks(chunks, codeBlocks);
console.log('Chunks after restoreCodeBlocks:', JSON.stringify(chunks, null, 2));
