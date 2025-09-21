// Backward compatibility barrel - re-exports everything from the new modules
export * from './render-context';
export * from './string-helpers';
export * from './template-parsing';
export * from './template-processing';
export * from './jsx-runtime';

// Export JSX prop parsing utilities for template-parsing
export { parseJSXProps, propsToObjectString, type ParsedProp, type JSXExpressionInfo } from './string-helpers';
