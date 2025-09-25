/**
 * Full-File Compiler
 *
 * This module provides functionality to compile an entire TypeScript source file,
 * processing template syntax both inside and outside of function definitions.
 */

import * as ts from "typescript";
import { ParsedTSmd } from "./parser";
import { compile } from "./compiler";
import { extractFunctions } from "./parser/typescript-parser";
import { __tsm } from "./runtime/tsm-runtime";
import { TSMComponentAttribute } from "./parser/tsm-ast";
import { parseJSXExpressionToTSMComponent } from "./parser/interpolations";

import {
  extractVariableValues,
  processGlobalTemplates,
} from "./compiler/processVariables";
import { extractFunctionContent } from "./compiler/function-extractor";
import { generateTranspiledFile } from "./compiler/generatedTranspiledFile";

export interface FullFileCompilationResult {
  functions: Array<{
    functionInfo: {
      name: string;
      isExported: boolean;
      isDefaultExport: boolean;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        defaultValue?: string;
      }>;
      returnType?: string;
      line: number;
      column: number;
    };
    compiled: any;
  }>;
  globalTemplates: Array<{
    variableName: string;
    isExported: boolean;
    originalValue: string;
    transpiledValue: string;
    interpolations: Array<{ placeholder: string; expression: string }>;
    conditionalBlocks: Array<{ condition: string; content: any }>;
    ternaryExpressions: Array<{
      condition: string;
      trueValue: any;
      falseValue: any;
    }>;
    jsxExpressions: Array<{
      placeholder: string;
      expression: string;
      name: string;
      props: Array<TSMComponentAttribute>;
    }>;
  }>;
  transpiledFile: string;
  errors: string[];
}

export interface FullFileExecutionResult {
  functions: Array<{
    functionInfo: {
      name: string;
      isExported: boolean;
      isDefaultExport: boolean;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        defaultValue?: string;
      }>;
      returnType?: string;
      line: number;
      column: number;
    };
    renderedOutput: string;
    errors: string[];
  }>;
  globalTemplates: Array<{
    variableName: string;
    isExported: boolean;
    renderedValue: string;
    errors: string[];
  }>;
  errors: string[];
}

/**
 * Compiles an entire TypeScript source file, processing template syntax everywhere
 */
export function transpile(source: string): FullFileCompilationResult {
  const errors: string[] = [];
  const functions: Array<{ functionInfo: any; compiled: any }> = [];
  const globalTemplates: Array<any> = [];

  try {
    const preprocessedSource = source;

    const sourceFile = ts.createSourceFile(
      "input.ts",
      preprocessedSource,
      ts.ScriptTarget.Latest,
      true
    );

    const { processedSource, templates } = processGlobalTemplates(sourceFile);

    // Store the global templates
    globalTemplates.push(...templates);

    const processedSourceFile = ts.createSourceFile(
      "processed.ts",
      processedSource,
      ts.ScriptTarget.Latest,
      true
    );

    const variableValues = extractVariableValues(processedSourceFile);

    // Now extract and compile functions from the processed source
    const allFunctions = extractFunctions(processedSourceFile);

    for (const functionInfo of allFunctions) {
      try {
        // Extract the actual function content from the AST
        const {
          typescript,
          returnStatements,
          interpolations,
          conditionalBlocks,
          ternaryExpressions,
          jsxExpressions,
        } = extractFunctionContent(processedSourceFile, functionInfo.name);

        // Create ParsedTSmd for each function
        const markdownContent =
          returnStatements.length > 0
            ? returnStatements[0].content
            : `# ${functionInfo.name} Content`;

        const jsxExpressionsMapped = jsxExpressions
          .map((expr) => ({
            parsed: parseJSXExpressionToTSMComponent(expr.expression),
            ...expr,
          }))
          .filter((expr) => expr.parsed !== null)
          .map((expr) => ({
            placeholder: expr.placeholder,
            expression: expr.expression,
            name: expr.parsed.name,
            props: expr.parsed.attributes,
          }));

        const parsed: ParsedTSmd = {
          imports: [],
          functionInfo: functionInfo,
          functionName: functionInfo.name,
          functionParams: functionInfo.parameters.map((p) => p.name),
          isAsync: functionInfo.isAsync,
          typescript: typescript,
          markdown: markdownContent,
          interpolations: interpolations,
          conditionalBlocks: conditionalBlocks,
          ternaryExpressions: ternaryExpressions,
          jsxExpressions: jsxExpressionsMapped,
          returnStatements: returnStatements,
          propsInterface:
            functionInfo.parameters.length > 0
              ? `interface ${
                  functionInfo.name
                }Props {\n  ${functionInfo.parameters
                  .map((p) => `${p.name}: ${p.type}${p.required ? "" : "?"}`)
                  .join(";\n  ")}\n}`
              : "",
          parameterTypes: functionInfo.parameters,
        };
        console.log("DEBUG: parsed:", parsed);
        const compiled = compile(parsed);
        console.log("DEBUG: compiled:", compiled);

        functions.push({ functionInfo, compiled });
      } catch (error: any) {
        errors.push(
          `Failed to compile function ${functionInfo.name}: ${error.message}`
        );
      }
    }
    console.log("DEBUG: functions:", functions);
    const transpiledFile = generateTranspiledFile(
      processedSourceFile,
      globalTemplates,
      functions
    );
    console.log("DEBUG: transpiledFile:", transpiledFile);

    return {
      functions,
      globalTemplates,
      transpiledFile,
      errors,
    };
  } catch (error: any) {
    errors.push(`Failed to parse TypeScript source: ${error.message}`);
    return {
      functions: [],
      globalTemplates: [],
      transpiledFile: "",
      errors,
    };
  }
}

export function _transpile(source: string): string {
  const { transpiledFile, errors } = transpile(source);
  return transpiledFile;
}
