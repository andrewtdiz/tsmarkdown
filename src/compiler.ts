import { ParsedMDX } from './parser';

export interface CompiledMDX {
  id: string;
  typescript: string;
  template: string;
  dependencies: string[];
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  metadata: {
    functionName: string;
    lastModified: string;
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
      interpolations: parsed.interpolations,
      conditionalBlocks: parsed.conditionalBlocks,
      metadata: {
        functionName: parsed.functionName,
        lastModified: new Date().toISOString()
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
    // Combine imports and typescript code
    const imports = parsed.imports.join('\n');
    const typescript = parsed.typescript;

    return `${imports}\n\n${typescript}`.trim();
  }

  private compileTemplate(markdown: string): string {
    // For now, return markdown as-is
    // Later we'll add more sophisticated template compilation
    return markdown;
  }
}