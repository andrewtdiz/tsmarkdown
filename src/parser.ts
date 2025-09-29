import type { Chunk } from "./runtime/tsm-runtime";
import { TSMComponentAttribute } from "./parser/tsm-ast";

export interface FunctionInfo {
  name: string;
  isExported: boolean;
  isDefaultExport: boolean;
  isAsync: boolean;
  parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
  returnType?: string;
  line: number;
  column: number;
}

export interface ParsedTSmd {
  imports: string[];
  functionInfo: FunctionInfo;
  functionName: string;
  functionParams: string[];
  isAsync: boolean;
  typescript: string;
  markdown: Chunk[];
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>;
  returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>;
  propsInterface?: string;
  parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>;
}
