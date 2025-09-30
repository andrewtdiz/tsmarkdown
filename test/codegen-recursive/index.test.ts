import { describe, it, expect } from "bun:test";
import { generateFromAST } from "../../src/compiler/ast-code-generator";
import type { TSMBlock, TSMInterpolation, TSMComponent } from "../../src/parser/tsm-ast";
import type { ParseContext } from "../../src/parser/types";

describe("Recursive Code Generator", () => {

    it("should generate correct code for a nested conditional expression", () => {
        const nestedBlock: TSMBlock = {
            type: "TSMBlock",
            lines: [
                {
                    type: "TSMLine",
                    chunks: [
                        {
                            type: "TSMTextChunk",
                            content: "# Hello from a nested block"
                        }
                    ]
                }
            ]
        };

        const interpolation: TSMInterpolation = {
            type: "TSMInterpolation",
            expression: "condition && (\n# Hello from a nested block\n)",
            isLogical: true,
            nestedConditionalBlock: nestedBlock
        };

        const ast: TSMBlock = {
            type: "TSMBlock",
            lines: [
                {
                    type: "TSMLine",
                    chunks: [interpolation]
                }
            ]
        };

        const context = { indentLevel: 0, isAsync: false, functionName: 'test' };
        const generatedCode = generateFromAST(ast, context);

        const expectedCode = `return __tsm([condition && __tsm(["# Hello from a nested block"])])`;
        expect(generatedCode.replace(/\s/g, '')).toBe(expectedCode.replace(/\s/g, ''));
    });

    it("should generate correct code for a nested ternary expression", () => {
        const trueBlock: TSMBlock = {
            type: "TSMBlock",
            lines: [
                {
                    type: "TSMLine",
                    chunks: [
                        {
                            type: "TSMTextChunk",
                            content: "# True branch"
                        }
                    ]
                }
            ]
        };

        const falseBlock: TSMBlock = {
            type: "TSMBlock",
            lines: [
                {
                    type: "TSMLine",
                    chunks: [
                        {
                            type: "TSMTextChunk",
                            content: "# False branch"
                        }
                    ]
                }
            ]
        };

        const interpolation: TSMInterpolation = {
            type: "TSMInterpolation",
            expression: "condition ? (\n# True branch\n) : (\n# False branch\n)",
            isConditional: true,
            ternaryExpressions: [
                {
                    trueBlock: trueBlock,
                    falseBlock: falseBlock
                }
            ]
        };

        const ast: TSMBlock = {
            type: "TSMBlock",
            lines: [
                {
                    type: "TSMLine",
                    chunks: [interpolation]
                }
            ]
        };

        const context = { indentLevel: 0, isAsync: false, functionName: 'test' };
        const generatedCode = generateFromAST(ast, context);

        const expectedCode = `return __tsm([condition ? __tsm(["# True branch"]) : __tsm(["# False branch"])])`;
        expect(generatedCode.replace(/\s/g, '')).toBe(expectedCode.replace(/\s/g, ''));
    });
});
