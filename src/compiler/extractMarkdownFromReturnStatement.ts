import ts from "typescript";
import { protectCodeBlocks, restoreCodeBlocks } from "../parser/code-protection";
import { normalizeIndentation } from "../utils/string-helpers";
import { parseContent } from "../parser/parser-utils";
import { TSMComponentAttribute } from "../parser/tsm-ast";
import { Chunk } from "../runtime/tsm-runtime";

export function extractMarkdownFromReturnStatement(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): { content: Chunk[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: [], interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    const sourceText = sourceFile.getFullText();
    let rawContent = '';

    if (ts.isParenthesizedExpression(returnNode.expression)) {
        // Use the AST to get the start and end of the parenthesized expression
        // and slice the original source text to get the raw content.
        rawContent = sourceText.slice(returnNode.expression.getStart() + 1, returnNode.expression.getEnd() - 1);
    throw new Error(`SOURCE: ${sourceText} ||| RAW: ${rawContent}`);
    } else if (ts.isStringLiteral(returnNode.expression)) {
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // This case handles standard template literals, which might be used for simple cases.
        const templateText = returnNode.expression.getText(sourceFile);
        const backtickMatch = templateText.match(/^`([\s\S]*?)`$/);
        if (backtickMatch) {
            let content = backtickMatch[1];
            // Convert ${...} back to {{...}} for the TSM parser pipeline
            content = content.replace(/\$\{([^}]+)\}/g, '{{$1}}');
            rawContent = content;
        } else {
            rawContent = templateText;
        }
    } else {
        // Fallback for other simple expressions like `return false` or `return myVar`
        rawContent = returnNode.expression.getText(sourceFile);
    }

    const lines = rawContent.split('\n');
    if (lines.length > 1) {
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim()) {
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                minIndent = Math.min(minIndent, indent);
            }
        }

        if (minIndent > 0 && minIndent < Infinity) {
            rawContent = lines.map(line =>
                line.trim() ? line.slice(minIndent) : line
            ).join('\n');
        }
    }

    const { protectedContent, codeBlocks } = protectCodeBlocks(rawContent);

    // Count leading and trailing newlines in the protected content
    const leadingMatch = protectedContent.match(/^(\s*\n+)/);
    const trailingMatch = protectedContent.match(/(\n+\s*)$/);

    const leadingNewlines = leadingMatch ? (leadingMatch[1].match(/\n/g) || []).length : 0;
    const trailingNewlines = trailingMatch ? (trailingMatch[1].match(/\n/g) || []).length : 0;

    // Normalize indentation and trim, but preserve (n-1) newlines
    const normalized = normalizeIndentation(protectedContent);
    const trimmed = normalized.trim();
    const leadingNewlineString = '\n'.repeat(Math.max(0, leadingNewlines - 1));
    const trailingNewlineString = '\n'.repeat(Math.max(0, trailingNewlines - 1));

    const normalizedMarkdown = leadingNewlineString + trimmed + trailingNewlineString;

    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: any }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: any; falseValue: any }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }> = [];

    let processedContent = parseContent(normalizedMarkdown, {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    });

    processedContent = restoreCodeBlocks(processedContent, codeBlocks);

    return {
        content: processedContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    };
}