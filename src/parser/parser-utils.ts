// Re-exports from modular parser architecture

// Core pipeline and types
export type { ParseContext } from './types';
export { parseContent } from './pipeline';

// String utilities
export { findMatchingBrace, findMatchingParen, normalizeIndentation } from '../utils/string-helpers';

// Conditional parsing
export { parseConditionals, processConditionalBlocks } from './conditionals';

// Ternary parsing
export { processTernaryExpressions } from './ternary';


// Parameter parsing
export { parseParameters, parseParameterTypes, inferTypeFromUsage, generatePropsInterface } from './parameters';

// TypeScript parser integration exports (replaces ESLint parser)
export { parseWithTypeScript, validateWithTypeScript, extractTypeInfo, analyzeReturnStatements, extractParametersFromAST, extractFunctions } from './typescript-parser';
export { locateComponent, splitComponent, validateComponentStructure } from './component-scanner';

// TypeScript parser types
export type { TypeScriptParseResult, TypeScriptParseOptions } from './typescript-parser';
export type { ComponentSplit, ComponentLocation } from './component-scanner';
// Legacy compatibility - maintain ESLint parser interface for backward compatibility
export { parseWithTypeScript as parseForESLint, validateWithTypeScript as validateForESLint } from './typescript-parser';
export type { TypeScriptParseResult as ESLintParseResult, TypeScriptParseOptions as ESLintParseOptions } from './typescript-parser';

