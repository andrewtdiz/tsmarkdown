import * as ts from 'typescript';
import { ParsedTSmd } from '../parser';
import { compile } from '../compiler';
import { extractFunctions } from '../parser/typescript-parser';
import { TSMComponentAttribute } from '../parser/tsm-ast';
import { parseJSXExpressionToTSMComponent } from '../parser/interpolations';
import { extractFunctionContent } from './function-extractor';
import { generateTranspiledFile } from './generatedTranspiledFile';

export async function newCompileFullFile(source: string): Promise<any> {
    const sourceFile = ts.createSourceFile('input.ts', source, ts.ScriptTarget.Latest, true);
    const functions = extractFunctions(sourceFile);
    const compiledFunctions: any[] = [];

    for (const functionInfo of functions) {
        const { typescript, returnStatements, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractFunctionContent(sourceFile, functionInfo.name);
        const markdownContent = returnStatements.length > 0 ? returnStatements[0].content : '';

        const parsed: ParsedTSmd = {
            imports: [],
            functionInfo: functionInfo,
            functionName: functionInfo.name,
            functionParams: functionInfo.parameters.map(p => p.name),
            isAsync: functionInfo.isAsync,
            typescript: typescript,
            markdown: markdownContent,
            interpolations: interpolations,
            conditionalBlocks: conditionalBlocks,
            ternaryExpressions: ternaryExpressions,
            jsxExpressions: jsxExpressions.map(expr => ({ parsed: parseJSXExpressionToTSMComponent(expr.expression), ...expr })).filter(expr => expr.parsed !== null).map((expr) => ({ placeholder: expr.placeholder, expression: expr.expression, name: expr.parsed.name, props: expr.parsed.attributes })),
            returnStatements: returnStatements,
            propsInterface: functionInfo.parameters.length > 0 ? `interface ${functionInfo.name}Props {\n  ${functionInfo.parameters.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(';\n  ')}\n}` : '',
            parameterTypes: functionInfo.parameters
        };

        const compiled = compile(parsed);
        compiledFunctions.push(compiled);
    }

    const transpiledFile = generateTranspiledFile(sourceFile, [], compiledFunctions);
    return { transpiledFile };
}
