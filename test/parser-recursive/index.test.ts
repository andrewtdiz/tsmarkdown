import { describe, it, expect } from "bun:test";
import { parseContent } from "../../src/parser/pipeline";
import type { ParseContext } from "../../src/parser/types";
import type { TSMBlock, TSMInterpolation, TSMComponent } from "../../src/parser/tsm-ast";

describe("Recursive TSM Parser", () => {

    it("should create a nested AST for a simple conditional expression", () => {
        const content = `{{ condition && (
  # Hello from a nested block
) }}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        // Expect one line with one chunk (the interpolation)
        expect(ast.lines).toHaveLength(1);
        const line = ast.lines[0];
        expect(line.chunks).toHaveLength(1);

        const interpolation = line.chunks[0] as TSMInterpolation;
        expect(interpolation.type).toBe("TSMInterpolation");

        // The key check: does it have a nested block?
        expect(interpolation.nestedConditionalBlock).toBeDefined();

        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;
        expect(nestedBlock.type).toBe("TSMBlock");
        expect(nestedBlock.lines).toHaveLength(1);
        expect(nestedBlock.lines[0].chunks[0].type).toBe("TSMTextChunk");
        // @ts-ignore
        expect(nestedBlock.lines[0].chunks[0].content.trim()).toBe("# Hello from a nested block");
    });

    it("should create a nested AST for a simple ternary expression", () => {
        const content = `{{ condition ? (
  # True branch
) : (
  # False branch
) }}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        expect(interpolation.type).toBe("TSMInterpolation");

        // Check for the nested blocks in the ternary
        expect(interpolation.ternaryExpressions).toBeDefined();
        expect(interpolation.ternaryExpressions).toHaveLength(1);

        const ternary = interpolation.ternaryExpressions![0];
        expect(ternary.trueBlock).toBeDefined();
        expect(ternary.falseBlock).toBeDefined();

        const trueBlock = ternary.trueBlock as TSMBlock;
        expect(trueBlock.type).toBe("TSMBlock");
        expect(trueBlock.lines).toHaveLength(1);
        // @ts-ignore
        expect(trueBlock.lines[0].chunks[0].content.trim()).toBe("# True branch");

        const falseBlock = ternary.falseBlock as TSMBlock;
        expect(falseBlock.type).toBe("TSMBlock");
        expect(falseBlock.lines).toHaveLength(1);
        // @ts-ignore
        expect(falseBlock.lines[0].chunks[0].content.trim()).toBe("# False branch");
    });

    it("should handle deeply nested conditionals", () => {
        const content = `{{ condition1 && (
  # Level 1
  {{ condition2 ? (
    # Level 2
  ) : (
    # Level 2 - False
  ) }}
) }}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const topInterpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        expect(topInterpolation.nestedConditionalBlock).toBeDefined();

        // Nested block (Level 1)
        const nestedBlock = topInterpolation.nestedConditionalBlock as TSMBlock;
        expect(nestedBlock.lines).toHaveLength(2); // "# Level 1" and the next interpolation

        const nestedInterpolation = nestedBlock.lines[1].chunks[0] as TSMInterpolation;
        expect(nestedInterpolation.ternaryExpressions).toBeDefined();
        expect(nestedInterpolation.ternaryExpressions).toHaveLength(1);

        // Deeply nested blocks (Level 2)
        const deepTernary = nestedInterpolation.ternaryExpressions![0];
        const deepTrueBlock = deepTernary.trueBlock as TSMBlock;
        const deepFalseBlock = deepTernary.falseBlock as TSMBlock;

        expect(deepTrueBlock.lines).toHaveLength(1);
        // @ts-ignore
        expect(deepTrueBlock.lines[0].chunks[0].content.trim()).toBe("# Level 2");

        expect(deepFalseBlock.lines).toHaveLength(1);
        // @ts-ignore
        expect(deepFalseBlock.lines[0].chunks[0].content.trim()).toBe("# Level 2 - False");
    });

    it("should not break simple interpolations without nesting", () => {
        const content = "Hello, {{ name }}!";
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        expect(ast.lines[0].chunks).toHaveLength(3); // "Hello, ", "{{ name }}", "!"

        const interpolation = ast.lines[0].chunks[1] as TSMInterpolation;
        expect(interpolation.expression).toBe(" name ");
        expect(interpolation.nestedConditionalBlock).toBeUndefined();
        expect(interpolation.ternaryExpressions).toEqual([]);
    });

    it("should handle a nested component call in a conditional", () => {
        const content = `{{ condition && (
  <@MyComponent />
) }}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        expect(interpolation.nestedConditionalBlock).toBeDefined();

        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;
        expect(nestedBlock.lines).toHaveLength(1);
        const component = nestedBlock.lines[0].chunks[0] as TSMComponent;
        expect(component.name).toBe("MyComponent");
    });

    it("should handle a component call in a ternary", () => {
        const content = `{{ condition ? (
  <@TrueComponent />
) : (
  <@FalseComponent />
)}}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        expect(interpolation.ternaryExpressions).toHaveLength(1);

        const trueBlock = interpolation.ternaryExpressions![0].trueBlock as TSMBlock;
        const falseBlock = interpolation.ternaryExpressions![0].falseBlock as TSMBlock;

        const trueComponent = trueBlock.lines[0].chunks[0] as TSMComponent;
        expect(trueComponent.name).toBe("TrueComponent");

        const falseComponent = falseBlock.lines[0].chunks[0] as TSMComponent;
        expect(falseComponent.name).toBe("FalseComponent");
    });

    it("should handle a component with props in a conditional", () => {
        const content = `{{ condition && (
  <@MyComponent name="World" />
)}}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;
        const component = nestedBlock.lines[0].chunks[0] as TSMComponent;

        expect(component.name).toBe("MyComponent");
        expect(component.attributes).toHaveLength(1);
        expect(component.attributes[0].name).toBe("name");
        expect(component.attributes[0].value.type).toBe("string");
        expect(component.attributes[0].value.value).toBe("World");
    });

    it("should handle a component with text content", () => {
        const content = `{{ condition && (
  # Here's a component: <@MyComponent name="World" />
)}}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;

        // The line has text first, then the component
        expect(nestedBlock.lines[0].chunks).toHaveLength(2);
        expect(nestedBlock.lines[0].chunks[0].type).toBe("TSMTextChunk");

        const component = nestedBlock.lines[0].chunks[1] as TSMComponent;
        expect(component.name).toBe("MyComponent");
        expect(component.attributes).toHaveLength(1);
        expect(component.attributes[0].name).toBe("name");
        expect(component.attributes[0].value.type).toBe("string");
        expect(component.attributes[0].value.value).toBe("World");
    });

    it("should handle a component with text content inside a block", () => {
        const content = `{{ condition && (
  # Here's a component:
  {{ condition2 && (
    # Nested block <@MyComponent name="World" />
  )}}
)}}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;

        // The nested block has 2 lines: "# Here's a component:" and the nested interpolation
        expect(nestedBlock.lines).toHaveLength(2);

        // The component is inside the second interpolation (line 1)
        const nestedInterpolation = nestedBlock.lines[1].chunks[0] as TSMInterpolation;
        const deeplyNestedBlock = nestedInterpolation.nestedConditionalBlock as TSMBlock;

        // The deeply nested block has text and the component
        expect(deeplyNestedBlock.lines[0].chunks).toHaveLength(2);
        const component = deeplyNestedBlock.lines[0].chunks[1] as TSMComponent;

        expect(component.name).toBe("MyComponent");
        expect(component.attributes).toHaveLength(1);
        expect(component.attributes[0].name).toBe("name");
        expect(component.attributes[0].value.type).toBe("string");
        expect(component.attributes[0].value.value).toBe("World");
    });

    it("should keep empty lines inside a block but trim leading/trailing", () => {
        const content = `{{ condition && (

  # Here's a component:

  ## Another line

)}}`;
        const context: ParseContext = { interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
        const ast = parseContent(content, context);

        expect(ast.lines).toHaveLength(1);
        const interpolation = ast.lines[0].chunks[0] as TSMInterpolation;
        const nestedBlock = interpolation.nestedConditionalBlock as TSMBlock;

        expect(nestedBlock.lines).toHaveLength(5);

        expect(nestedBlock.lines[0].chunks).toHaveLength(0);
        expect(nestedBlock.lines[0].isEmpty).toBe(true);

        expect(nestedBlock.lines[1].chunks).toHaveLength(1);
        // @ts-ignore
        expect(nestedBlock.lines[1].chunks[0].content.trim()).toBe("# Here's a component:");

        expect(nestedBlock.lines[2].chunks).toHaveLength(0);
        expect(nestedBlock.lines[2].isEmpty).toBe(true);

        expect(nestedBlock.lines[3].chunks).toHaveLength(1);
        // @ts-ignore
        expect(nestedBlock.lines[3].chunks[0].content.trim()).toBe("## Another line");

        expect(nestedBlock.lines[4].chunks).toHaveLength(0);
        expect(nestedBlock.lines[4].isEmpty).toBe(true);
    });
});
