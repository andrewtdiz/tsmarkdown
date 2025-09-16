import ts from 'typescript';
import { CompiledMDX } from './compiler';

export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  diagnostics: ts.Diagnostic[];
}

export interface TypeCheckError {
  message: string;
  line: number;
  column: number;
  file: string;
}

export class MDXTypeChecker {
  private compilerOptions: ts.CompilerOptions;

  constructor() {
    this.compilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      lib: ['ES2020', 'DOM'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      declaration: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: false, // Allow unused params in MDX functions
      noUnusedParameters: false,
    };
  }

  typeCheck(compiled: CompiledMDX, filePath: string = 'component.tsx'): TypeCheckResult {
    try {
      // Create a virtual source file
      const sourceFile = ts.createSourceFile(
        filePath,
        compiled.typescript,
        ts.ScriptTarget.ES2020,
        true,
        ts.ScriptKind.TSX
      );

      // Get basic syntax diagnostics
      const syntaxDiagnostics = sourceFile.parseDiagnostics;
      const errors = this.convertDiagnosticsToErrors(syntaxDiagnostics);

      return {
        success: errors.length === 0,
        errors,
        diagnostics: syntaxDiagnostics
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `TypeScript compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: 0,
          column: 0,
          file: filePath
        }],
        diagnostics: []
      };
    }
  }

  validatePropUsage(compiled: CompiledMDX): TypeCheckResult {
    const errors: TypeCheckError[] = [];

    // Check if all parameters used in interpolations are declared in props interface
    if (compiled.metadata.parameterTypes.length > 0) {
      const declaredParams = new Set(compiled.metadata.parameterTypes.map(p => p.name));

      // Check interpolations
      for (const interpolation of compiled.interpolations) {
        const usedVars = this.extractVariables(interpolation.expression);
        for (const variable of usedVars) {
          if (!declaredParams.has(variable) && !this.isLocalVariable(variable, compiled.typescript)) {
            errors.push({
              message: `Property '${variable}' is used but not declared in component props`,
              line: 0,
              column: 0,
              file: compiled.id
            });
          }
        }
      }

      // Check JSX expressions
      for (const jsxExpr of compiled.jsxExpressions) {
        const usedVars = this.extractVariables(jsxExpr.expression);
        for (const variable of usedVars) {
          if (!declaredParams.has(variable) && !this.isLocalVariable(variable, compiled.typescript) && !this.isImportedVariable(variable, compiled)) {
            errors.push({
              message: `Property '${variable}' is used but not declared in component props`,
              line: 0,
              column: 0,
              file: compiled.id
            });
          }
        }
      }

      // Check conditional blocks
      for (const conditional of compiled.conditionalBlocks) {
        const usedVars = this.extractVariables(conditional.condition);
        for (const variable of usedVars) {
          if (!declaredParams.has(variable) && !this.isLocalVariable(variable, compiled.typescript)) {
            errors.push({
              message: `Property '${variable}' is used in condition but not declared in component props`,
              line: 0,
              column: 0,
              file: compiled.id
            });
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      diagnostics: []
    };
  }

  private createCompilerHost(fileName: string, content: string): ts.CompilerHost {
    const defaultHost = ts.createCompilerHost(this.compilerOptions);

    return {
      ...defaultHost,
      getSourceFile: (name: string, languageVersion: ts.ScriptTarget) => {
        if (name === fileName) {
          return ts.createSourceFile(name, content, languageVersion, true, ts.ScriptKind.TSX);
        }
        // For library files, use the default host
        return defaultHost.getSourceFile(name, languageVersion);
      },
      fileExists: (name: string) => {
        if (name === fileName) return true;
        return defaultHost.fileExists(name);
      },
      readFile: (name: string) => {
        if (name === fileName) return content;
        return defaultHost.readFile(name);
      }
    };
  }

  private convertDiagnosticsToErrors(diagnostics: ts.Diagnostic[]): TypeCheckError[] {
    return diagnostics.map(diagnostic => {
      const message = typeof diagnostic.messageText === 'string'
        ? diagnostic.messageText
        : diagnostic.messageText.messageText;

      let line = 0;
      let column = 0;
      let file = 'unknown';

      if (diagnostic.file && diagnostic.start !== undefined) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        line = position.line + 1;
        column = position.character + 1;
        file = diagnostic.file.fileName;
      }

      return {
        message,
        line,
        column,
        file
      };
    });
  }

  private extractVariables(expression: string): string[] {
    const variables = new Set<string>();

    // Simple regex to find identifiers (this could be more sophisticated)
    const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;

    while ((match = identifierRegex.exec(expression)) !== null) {
      const identifier = match[1];
      // Skip common JavaScript keywords, built-ins, and methods
      if (!this.isJavaScriptKeyword(identifier) && !this.isBuiltInMethod(identifier)) {
        // Also skip if it appears to be a method call (followed by parentheses)
        const followingChar = expression[match.index + match[0].length];
        if (followingChar !== '(') {
          variables.add(identifier);
        }
      }
    }

    return Array.from(variables);
  }

  private isBuiltInMethod(identifier: string): boolean {
    const builtInMethods = new Set([
      'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
      'push', 'pop', 'shift', 'unshift', 'slice', 'splice',
      'length', 'toString', 'valueOf', 'hasOwnProperty',
      'alert', 'console', 'window', 'document',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite',
      'key', 'index', 'item' // Common loop variables
    ]);

    return builtInMethods.has(identifier);
  }

  private isJavaScriptKeyword(identifier: string): boolean {
    const keywords = new Set([
      'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof',
      'new', 'this', 'super', 'function', 'return', 'if', 'else', 'for',
      'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'const', 'let', 'var', 'class',
      'extends', 'static', 'public', 'private', 'protected', 'readonly',
      'abstract', 'interface', 'type', 'enum', 'namespace', 'module',
      'declare', 'export', 'import', 'from', 'as', 'default'
    ]);

    return keywords.has(identifier);
  }

  private isLocalVariable(identifier: string, typescript: string): boolean {
    // Check if the identifier is declared as a local variable in the typescript code
    const varDeclarationRegex = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\b`);
    return varDeclarationRegex.test(typescript);
  }

  private isImportedVariable(identifier: string, compiled: CompiledMDX): boolean {
    // Check if the identifier is in the dependencies (imported)
    return compiled.dependencies.includes(identifier);
  }
}