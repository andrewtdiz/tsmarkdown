import { ParsedTSmd } from './parser';
import { extractDependencies, compileTypeScript, compileTemplate } from './compiler/compiler-utils';
import { TSMComponentAttribute } from './parser/tsm-ast';
export { type MultiFunctionCompilationResult } from './compiler/multi-function-compiler';
export { compileFullFile, type FullFileCompilationResult, type FullFileExecutionResult } from './compiler/full-file-compiler';

export interface CompiledTSmd {
  id: string;
  typescript: string;
  template: string;
  dependencies: string[];
  functionParams: string[];
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: any[] }>;
  ternaryExpressions: Array<{ condition: string; trueValue: any[]; falseValue: any[] }>;
  jsxExpressions: Array<{ name: string; props: TSMComponentAttribute[] }>;
  returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>;
  metadata: {
    functionName: string;
    lastModified: string;
    propsInterface?: string;
    parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
  };
}

export function compile(parsed: ParsedTSmd): CompiledTSmd {
  // Extract dependencies from imports
  const dependencies = extractDependencies(parsed.imports);

  // Generate a basic ID from function name
  const id = parsed.functionName || 'unnamed-component';

  return {
    id,
    typescript: compileTypeScript(parsed),
    template: compileTemplate(parsed.markdown, parsed.jsxExpressions),
    dependencies,
    functionParams: parsed.functionParams,
    interpolations: parsed.interpolations,
    conditionalBlocks: parsed.conditionalBlocks.map(block => ({
      condition: block.condition,
      content: Array.isArray(block.content) ? block.content : [block.content]
    })),
    ternaryExpressions: parsed.ternaryExpressions.map(expr => ({
      condition: expr.condition,
      trueValue: Array.isArray(expr.trueValue) ? expr.trueValue : [expr.trueValue],
      falseValue: Array.isArray(expr.falseValue) ? expr.falseValue : [expr.falseValue]
    })),
    jsxExpressions: parsed.jsxExpressions,
    returnStatements: parsed.returnStatements,
    metadata: {
      functionName: parsed.functionName,
      lastModified: new Date().toISOString(),
      propsInterface: parsed.propsInterface,
      parameterTypes: parsed.parameterTypes
    }
  };
}

// Backward compatibility alias
export const compileTSmd = compile;