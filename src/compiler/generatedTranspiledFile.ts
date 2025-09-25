import ts from "typescript";
import { extractRegularVariables } from "./extractRegularVariables";

/**
 * Extracts import statements from the TypeScript source file
 */
function extractImportStatements(
  sourceFile: ts.SourceFile
): Array<{ text: string; isExported: boolean }> {
  const importStatements: Array<{ text: string; isExported: boolean }> = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const importText = node.getText(sourceFile);
      const isExported =
        node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        ) || false;

      importStatements.push({
        text: importText,
        isExported,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return importStatements;
}

/**
 * Generates the complete transpiled file
 */
export function generateTranspiledFile(
  sourceFile: ts.SourceFile,
  globalTemplates: any[],
  functions: any[]
): string {
  let transpiledFile = "";

  // Extract import statements first
  const importStatements = extractImportStatements(sourceFile);

  // Add import statements first
  for (const importStmt of importStatements) {
    const exportKeyword = importStmt.isExported ? "export " : "";
    transpiledFile += `${exportKeyword}${importStmt.text}\n\n`;
  }

  // Extract regular TypeScript variables (non-template, non-function)
  const regularVariables = extractRegularVariables(
    sourceFile,
    globalTemplates,
    functions
  );

  // Add regular variables after imports
  for (const variable of regularVariables) {
    const exportKeyword = variable.isExported ? "export " : "";
    transpiledFile += `${exportKeyword}${variable.text}\n\n`;
  }

  // Add global templates
  for (const template of globalTemplates) {
    const exportKeyword = template.isExported ? "export " : "";
    transpiledFile += `${exportKeyword}const ${template.variableName} = ${template.transpiledValue};\n\n`;
  }

  // Add functions
  functions.forEach((func) => {
    transpiledFile += func.compiled.typescript + "\n\n";
  });

  return transpiledFile.trim();
}
