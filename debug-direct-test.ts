// Direct test to isolate the issue
import { renderASTToChunks } from './src/parser/interpolations';
import type { ParseContext } from './src/parser/types';
import type { TSMBlock } from './src/parser/tsm-ast';

// Create a simple test case
const testContent = `Welcome, {{ data.name }}!`;

const context: ParseContext = {
  interpolations: [],
  conditionalBlocks: [],
  ternaryExpressions: [],
  jsxExpressions: []
};

// Test the parsing pipeline directly
console.log('Testing direct parsing...');

try {
  // This should work
  const ast = {
    type: 'TSMBlock' as const,
    lines: [{
      type: 'TSMLine' as const,
      chunks: [
        { type: 'TSMTextChunk' as const, content: 'Welcome, ' },
        { type: 'TSMInterpolation' as const, expression: 'data.name', isLogical: false, isConditional: false },
        { type: 'TSMTextChunk' as const, content: '!' }
      ]
    }]
  };

  const result = renderASTToChunks(ast, context);
  console.log('Direct test result:', result);
  console.log('Result type:', typeof result);
} catch (error) {
  console.error('Direct test error:', error);
}
