import { ParsedMDX } from './parser';

export interface CompiledMDX {
  id: string;
  typescript: string;
  template: string;
  dependencies: string[];
  functionParams: string[];
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string; expression: string }>;
  returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>;
  metadata: {
    functionName: string;
    lastModified: string;
    propsInterface?: string;
    parameterTypes: Array<{ name: string; type: string; required: boolean }>;
  };
}

export class MDXCompiler {
  compile(parsed: ParsedMDX): CompiledMDX {
    // Extract dependencies from imports
    const dependencies = this.extractDependencies(parsed.imports);

    // Generate a basic ID from function name
    const id = parsed.functionName || 'unnamed-component';

    return {
      id,
      typescript: this.compileTypeScript(parsed),
      template: this.compileTemplate(parsed.markdown),
      dependencies,
      functionParams: parsed.functionParams,
      interpolations: parsed.interpolations,
      conditionalBlocks: parsed.conditionalBlocks,
      ternaryExpressions: parsed.ternaryExpressions,
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

  private extractDependencies(imports: string[]): string[] {
    const dependencies: string[] = [];

    for (const importLine of imports) {
      // Extract component names from import statements
      const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
      if (defaultMatch) {
        dependencies.push(defaultMatch[1]);
      }

      // Extract named imports
      const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}/);
      if (namedMatch) {
        const namedImports = namedMatch[1]
          .split(',')
          .map(name => name.trim())
          .filter(Boolean);
        dependencies.push(...namedImports);
      }
    }

    return dependencies;
  }

  private compileTypeScript(parsed: ParsedMDX): string {
    // Combine imports, props interface, and typescript code (without generating stub functions)
    const imports = parsed.imports.join('\n');
    const propsInterface = parsed.propsInterface || '';
    const typescript = parsed.typescript;

    const parts = [imports, propsInterface, typescript].filter(Boolean);
    return parts.join('\n\n').trim();
  }

  private generateTypedFunction(parsed: ParsedMDX): string {
    if (!parsed.functionName) return '';

    const interfaceName = `${parsed.functionName}Props`;
    const hasProps = parsed.parameterTypes.length > 0;

    if (!hasProps) {
      return `export function ${parsed.functionName}(): string {
  // Implementation will be generated here
  return '';
}`;
    }

    // Generate destructured parameter with types (don't include optional markers in destructuring)
    const destructuredParams = parsed.parameterTypes.map(param => {
      return param.name; // Remove optional markers from parameter names in destructuring
    }).join(', ');

    return `export function ${parsed.functionName}({ ${destructuredParams} }: ${interfaceName}): string {
  // Implementation will be generated here
  return '';
}`;
  }

  private compileTemplate(markdown: string): string {
    // For now, return markdown as-is
    // Later we'll add more sophisticated template compilation
    return markdown;
  }
}