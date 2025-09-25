import * as ts from 'typescript';
import { Chunk } from '../runtime/tsm-runtime';
import { parseContent } from '../parser/pipeline';
import { protectCodeBlocks, restoreCodeBlocks } from '../parser/code-protection';
import { normalizeIndentation } from '../utils/string-helpers';
import { TSMComponentAttribute } from '../parser/tsm-ast';

export function isFunctionLike(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);
}

export function getRootLevelReturnsOfFunction(
    sourceFile: ts.SourceFile,
    fn: ts.FunctionLikeDeclarationBase
): ts.ReturnStatement[] {
    const returns: ts.ReturnStatement[] = [];
    let functionDepth = 0;

    function visit(n: ts.Node) {
        if (isFunctionLike(n)) {
            functionDepth++;
            ts.forEachChild(n, visit);
            functionDepth--;
            return;
        }

        if (ts.isReturnStatement(n) && functionDepth === 1) {
            returns.push(n);
        }

        ts.forEachChild(n, visit);
    }

    if (fn.body) {
        functionDepth = 1;
        ts.forEachChild(fn.body, visit);
    }
    return returns;
}

export function extractNonReturnStatements(
    sourceFile: ts.SourceFile,
    fn: ts.FunctionLikeDeclarationBase
): string {
    if (!fn.body) return '';

    const statementsToKeep: string[] = [];

    function collectStatements(node: ts.Node): void {
        if (node.parent === fn.body && ts.isVariableStatement(node)) {
            const statementText = node.getText(sourceFile);
            statementsToKeep.push(statementText);
            return;
        }

        ts.forEachChild(node, collectStatements);
    }

    collectStatements(fn.body);
    return statementsToKeep.join('\n');
}

export function extractConditionFromAST(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): string | undefined {
    let parent = returnNode.parent;

    while (parent) {
        if (ts.isIfStatement(parent)) {
            const conditionText = parent.expression.getText(sourceFile);
            return conditionText;
        }

        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
            break;
        }

        parent = parent.parent;
    }

    return undefined;
}

export function extractMarkdownFromReturnStatement(returnNode: ts.ReturnStatement, sourceFile: ts.SourceFile): { content: Chunk[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    if (!returnNode.expression) {
        return { content: [], interpolations: [], conditionalBlocks: [], ternaryExpressions: [], jsxExpressions: [] };
    }

    const sourceText = sourceFile.getFullText();
    let rawContent = '';

    if (ts.isParenthesizedExpression(returnNode.expression)) {
        // Use the AST to get the start and end of the parenthesized expression
        // and slice the original source text to get the raw content.
        const start = returnNode.expression.getStart() + 1;
        const end = returnNode.expression.getEnd() - 1;
        rawContent = sourceText.slice(start, end);
        console.log('DEBUG: Parenthesized expression content:', JSON.stringify(rawContent));
    } else if (ts.isStringLiteral(returnNode.expression)) {
        rawContent = returnNode.expression.text;
    } else if (ts.isTemplateExpression(returnNode.expression)) {
        // This case handles standard template literals, which might be used for simple cases.
        const templateText = returnNode.expression.getText(sourceFile);
        console.log('DEBUG: Template expression:', JSON.stringify(templateText));
        const backtickMatch = templateText.match(/^`([\s\S]*?)`$/);
        if (backtickMatch) {
            let content = backtickMatch[1];
            console.log('DEBUG: Extracted template content:', JSON.stringify(content));
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
    console.log('DEBUG: After indentation processing:', JSON.stringify(rawContent));

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

export function extractFunctionContent(ast: ts.SourceFile, functionName: string): { typescript: string; returnStatements: any[]; interpolations: any[]; conditionalBlocks: any[]; ternaryExpressions: any[]; jsxExpressions: any[] } {
    let functionNode: ts.Node | null = null;
    let typescript = '';
    let returnStatements: any[] = [];
    let allInterpolations: any[] = [];
    let allConditionalBlocks: any[] = [];
    let allTernaryExpressions: any[] = [];
    let allJsxExpressions: any[] = [];

    function visit(node: ts.Node): void {
        if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
            functionNode = node;

            if (node.body) {
                const sourceFile = node.getSourceFile();
                typescript = extractNonReturnStatements(sourceFile, node);
                const returns = getRootLevelReturnsOfFunction(sourceFile, node);
                console.log('DEBUG: Found returns:', returns.length);

                for (const returnStmt of returns) {
                    console.log('DEBUG: Return statement:', returnStmt.getText(sourceFile));
                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                    returnStatements.push({
                        condition: condition,
                        content: content,
                        isTemplate: true
                    });

                    allInterpolations.push(...interpolations);
                    allConditionalBlocks.push(...conditionalBlocks);
                    allTernaryExpressions.push(...ternaryExpressions);
                    allJsxExpressions.push(...jsxExpressions);
                }
            }
        }

        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === functionName && declaration.initializer) {
                    if (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer)) {
                        functionNode = declaration.initializer;

                        if (declaration.initializer.body) {
                            const sourceFile = node.getSourceFile();
                            typescript = extractNonReturnStatements(sourceFile, declaration.initializer);

                            if (ts.isArrowFunction(declaration.initializer)) {
                                if (ts.isParenthesizedExpression(declaration.initializer.body)) {
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement({
                                        expression: declaration.initializer.body
                                    } as unknown as ts.ReturnStatement, sourceFile);

                                    returnStatements.push({
                                        condition: undefined,
                                        content: content,
                                        isTemplate: true
                                    });

                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                } else {
                                    const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                    for (const returnStmt of returns) {
                                        const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                                        const condition = extractConditionFromAST(returnStmt, sourceFile);

                                        returnStatements.push({
                                            condition: condition,
                                            content: content,
                                            isTemplate: true
                                        });

                                        allInterpolations.push(...interpolations);
                                        allConditionalBlocks.push(...conditionalBlocks);
                                        allTernaryExpressions.push(...ternaryExpressions);
                                        allJsxExpressions.push(...jsxExpressions);
                                    }
                                }
                            } else {
                                const returns = getRootLevelReturnsOfFunction(sourceFile, declaration.initializer);

                                for (const returnStmt of returns) {
                                    const { content, interpolations, conditionalBlocks, ternaryExpressions, jsxExpressions } = extractMarkdownFromReturnStatement(returnStmt, sourceFile);
                                    const condition = extractConditionFromAST(returnStmt, sourceFile);

                                    returnStatements.push({
                                        condition: condition,
                                        content: content,
                                        isTemplate: true
                                    });

                                    allInterpolations.push(...interpolations);
                                    allConditionalBlocks.push(...conditionalBlocks);
                                    allTernaryExpressions.push(...ternaryExpressions);
                                    allJsxExpressions.push(...jsxExpressions);
                                }
                            }
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(ast);

    return {
        typescript,
        returnStatements,
        interpolations: allInterpolations,
        conditionalBlocks: allConditionalBlocks,
        ternaryExpressions: allTernaryExpressions,
        jsxExpressions: allJsxExpressions
    };
}
