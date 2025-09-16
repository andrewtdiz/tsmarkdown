import { CompiledMDX } from './compiler';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { MDXParser } from './parser';
import { MDXCompiler } from './compiler';

export interface TemplateContext {
  [key: string]: any;
}

export interface ComponentRegistry {
  [componentName: string]: CompiledMDX;
}

export interface TemplateExecutionResult {
  content: string;
  errors: string[];
}

export class TemplateExecutionEngine {
  private componentRegistry: ComponentRegistry = {};
  private parser = new MDXParser();
  private compiler = new MDXCompiler();

  async execute(compiled: CompiledMDX, context: TemplateContext = {}, props: any = {}, basePath?: string): Promise<TemplateExecutionResult> {
    const errors: string[] = [];
    let processedContent = compiled.template;

    try {
      // Load dependencies (imported components)
      if (basePath) {
        this.loadDependencies(compiled.dependencies, basePath, errors);
      }

      // Merge props into context for function parameters
      const propsContext = this.createPropsContext(compiled.functionParams || [], props);
      const mergedContext = { ...context, ...propsContext };

      // Execute TypeScript to get runtime values (now supports async)
      const runtimeContext = await this.executeTypeScript(compiled.typescript, mergedContext);
      const fullContext = { ...mergedContext, ...runtimeContext };

      // Process conditional blocks first (they may contain interpolations)
      processedContent = this.processConditionalBlocks(
        processedContent,
        compiled.conditionalBlocks,
        compiled.interpolations,
        fullContext,
        errors
      );

      // Process any remaining interpolations
      processedContent = this.processInterpolations(
        processedContent,
        compiled.interpolations,
        fullContext,
        errors
      );

      // Process JSX expressions (like array.map())
      processedContent = await this.processJSXExpressions(
        processedContent,
        compiled.jsxExpressions || [],
        fullContext,
        errors
      );

    } catch (error) {
      errors.push(`Template execution error: ${error}`);
    }

    // Clean up extra whitespace and normalize spacing
    processedContent = processedContent
      .split('\n')
      .map(line => line.trimRight()) // Remove trailing spaces
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
      .trim(); // Remove leading/trailing whitespace

    return {
      content: processedContent,
      errors
    };
  }

  private loadDependencies(dependencies: string[], basePath: string, errors: string[]): void {
    for (const componentName of dependencies) {
      if (!this.componentRegistry[componentName]) {
        try {
          // Try to find the component file
          const componentPath = this.resolveComponentPath(componentName, basePath);
          if (componentPath) {
            const componentContent = readFileSync(componentPath, 'utf-8');
            const parsed = this.parser.parse(componentContent);
            const compiled = this.compiler.compile(parsed);
            this.componentRegistry[componentName] = compiled;
          }
        } catch (error) {
          errors.push(`Failed to load component ${componentName}: ${error}`);
        }
      }
    }
  }

  private resolveComponentPath(componentName: string, basePath: string): string | null {
    // Try different possible paths for the component
    const possiblePaths = [
      resolve(basePath, `${componentName}.mdx`),
      resolve(basePath, `${componentName}.tsx`),
      resolve(basePath, `${componentName}.ts`),
      resolve(basePath, componentName, 'index.mdx'),
      resolve(basePath, componentName, 'index.tsx'),
      resolve(basePath, componentName, 'index.ts'),
    ];

    for (const path of possiblePaths) {
      try {
        readFileSync(path); // Test if file exists
        return path;
      } catch (error) {
        // Continue to next path
      }
    }

    return null;
  }

  private createPropsContext(functionParams: string[], props: any): TemplateContext {
    const context: TemplateContext = {};

    // If props is an object and we have parameters, map them
    if (props && typeof props === 'object' && functionParams.length > 0) {
      for (const param of functionParams) {
        if (props.hasOwnProperty(param)) {
          context[param] = props[param];
        }
      }
    }

    return context;
  }

  private async executeTypeScript(typescript: string, context: TemplateContext): Promise<any> {
    if (!typescript.trim()) {
      return {};
    }

    try {
      // Create a safe execution environment
      const safeContext = this.createSafeContext(context, typescript);

      // Remove import statements as they can't be executed in this context
      const executableCode = this.removeImports(typescript);

      if (!executableCode.trim()) {
        return {};
      }

      // Build the function that executes TypeScript and returns variables
      const variableNames = this.extractVariableNames(executableCode);
      const returnStatement = variableNames.length > 0
        ? `return { ${variableNames.map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(', ')} };`
        : 'return {};';

      const functionBody = `
        ${executableCode}
        ${returnStatement}
      `;

      // Create async function to support await
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const func = new AsyncFunction(...Object.keys(safeContext), functionBody);
      return await func(...Object.values(safeContext)) || {};
    } catch (error) {
      throw new Error(`TypeScript execution failed: ${error}`);
    }
  }

  private createSafeContext(context: TemplateContext, typescript?: string): any {
    // Extract variable names from TypeScript to avoid conflicts
    const declaredVars = typescript ? this.extractVariableNames(typescript) : [];

    // Create context without declared variables to avoid conflicts
    const filteredContext = Object.entries(context)
      .filter(([key]) => !declaredVars.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Create a safe execution context with common utilities
    return {
      ...filteredContext,
      // Add safe built-in functions
      Date,
      Math,
      String,
      Number,
      Boolean,
      Array,
      Object,
      JSON,
      // Utility functions
      console: {
        log: (...args: any[]) => console.log('[MDX]', ...args),
        warn: (...args: any[]) => console.warn('[MDX]', ...args),
        error: (...args: any[]) => console.error('[MDX]', ...args)
      }
    };
  }

  private removeImports(code: string): string {
    const lines = code.split('\n');
    const filteredLines: string[] = [];
    let inExportBlock = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip import statements
      if (trimmed.startsWith('import ')) {
        continue;
      }

      // Handle export blocks
      if (trimmed.startsWith('export ')) {
        if (trimmed.includes('{')) {
          inExportBlock = true;
          braceCount = 1;
          if (trimmed.includes('}')) {
            // Single line export like export { foo }
            braceCount = 0;
            inExportBlock = false;
          }
        }
        continue;
      }

      if (inExportBlock) {
        // Count braces to track when the export block ends
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount === 0) {
          inExportBlock = false;
        }
        continue;
      }

      // Include non-export, non-import lines
      if (trimmed !== '') {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n').trim();
  }

  private extractVariableNames(typescript: string): string[] {
    const variables = new Set<string>();

    // Extract const/let/var declarations
    const declarationRegex = /(?:const|let|var)\s+(\w+)/g;
    let match;
    while ((match = declarationRegex.exec(typescript)) !== null) {
      variables.add(match[1]);
    }

    // Extract destructured variables
    const destructureRegex = /(?:const|let|var)\s*\{\s*([^}]+)\s*\}/g;
    while ((match = destructureRegex.exec(typescript)) !== null) {
      const destructuredVars = match[1]
        .split(',')
        .map(v => v.trim().split(':')[0].trim())
        .filter(Boolean);
      destructuredVars.forEach(v => variables.add(v));
    }

    return Array.from(variables);
  }

  private processInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
  ): string {
    let processedContent = content;

    for (const interpolation of interpolations) {
      try {
        const value = this.evaluateExpression(interpolation.expression, context);
        const stringValue = this.valueToString(value);
        processedContent = processedContent.replace(
          interpolation.placeholder,
          stringValue
        );
      } catch (error) {
        errors.push(`Interpolation error in "${interpolation.expression}": ${error}`);
        processedContent = processedContent.replace(interpolation.placeholder, '');
      }
    }

    return processedContent;
  }

  private processConditionalBlocks(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    interpolations: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
  ): string {
    let processedContent = content;

    for (let i = 0; i < conditionalBlocks.length; i++) {
      const block = conditionalBlocks[i];
      const placeholder = `__CONDITIONAL_${i}__`;

      try {
        const shouldRender = this.evaluateExpression(block.condition, context);
        let blockContent = shouldRender ? block.content : '';

        // Process any interpolations within the conditional block content
        if (blockContent && shouldRender) {
          // Normalize indentation within the conditional block
          blockContent = this.normalizeIndentation(blockContent.trim());
          blockContent = this.processInterpolations(blockContent, interpolations, context, errors);
        }

        // Replace placeholder and normalize line spacing
        const lines = processedContent.split('\n');
        const updatedLines = lines.map(line => {
          if (line.includes(placeholder)) {
            // Replace the placeholder and remove any excess leading whitespace
            return line.replace(placeholder, blockContent).replace(/^\s{8}/, '');
          }
          return line;
        });
        processedContent = updatedLines.join('\n');
      } catch (error) {
        errors.push(`Condition error in "${block.condition}": ${error}`);
        processedContent = processedContent.replace(placeholder, '');
      }
    }

    return processedContent;
  }

  private evaluateExpression(expression: string, context: any): any {
    try {
      // Create function with safe context
      const func = new Function(...Object.keys(context), `return (${expression})`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error}`);
    }
  }

  private normalizeIndentation(content: string): string {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    // Find all non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length === 0) return content;

    // Get indentation levels
    const indentLevels = nonEmptyLines.map(line => line.match(/^(\s*)/)?.[1].length ?? 0);

    // If there are multiple indentation levels, find the most common non-zero one
    const indentCounts = indentLevels.reduce((acc, level) => {
      if (level > 0) {
        acc[level] = (acc[level] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    let targetIndent = 0;
    if (Object.keys(indentCounts).length > 0) {
      // Find the most common non-zero indentation
      targetIndent = parseInt(Object.keys(indentCounts).reduce((a, b) =>
        indentCounts[parseInt(a)] > indentCounts[parseInt(b)] ? a : b
      ));
    }

    // If no common indentation found or it's 0, return as-is
    if (targetIndent === 0) return content;

    // Remove the target indentation from lines that have it
    return lines
      .map(line => {
        if (line.trim() === '') {
          return ''; // Empty lines become truly empty
        }
        // Only remove indentation if the line starts with the target indent level
        if (line.startsWith(' '.repeat(targetIndent))) {
          return line.slice(targetIndent);
        }
        return line; // Keep other lines as-is (like headers)
      })
      .join('\n');
  }

  private valueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object Object]';
      }
    }
    return String(value);
  }

  private async processJSXExpressions(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
  ): Promise<string> {
    let processedContent = content;

    for (const jsxExpr of jsxExpressions) {
      try {
        // Evaluate the JSX expression
        const result = await this.evaluateJSXExpression(jsxExpr.expression, context);
        const stringValue = this.jsxResultToString(result);

        processedContent = processedContent.replace(
          jsxExpr.placeholder,
          stringValue
        );
      } catch (error) {
        errors.push(`JSX expression error in "${jsxExpr.expression}": ${error}`);
        processedContent = processedContent.replace(jsxExpr.placeholder, '');
      }
    }

    return processedContent;
  }

  private async evaluateJSXExpression(expression: string, context: any): Promise<any> {
    try {
      // Check if this is a .map() expression for arrays
      if (expression.includes('.map(')) {
        return await this.evaluateMapExpression(expression, context);
      }

      // For other JSX expressions, evaluate normally
      const func = new Function(...Object.keys(context), `return (${expression})`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`JSX expression evaluation failed: ${error}`);
    }
  }

  private async evaluateMapExpression(expression: string, context: any): Promise<string> {
    // Parse expressions like: items.map((item, index) => <ListItem key={index} item={item} />)
    const mapMatch = expression.match(/(.+)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*(.+)\s*\)/);

    if (!mapMatch) {
      // Fall back to regular evaluation
      const func = new Function(...Object.keys(context), `return (${expression})`);
      return func(...Object.values(context));
    }

    const [, arrayExpr, params, elementExpr] = mapMatch;

    // Get the array
    const arrayFunc = new Function(...Object.keys(context), `return (${arrayExpr})`);
    const array = arrayFunc(...Object.values(context));

    if (!Array.isArray(array)) {
      throw new Error(`Expected array but got ${typeof array}`);
    }

    // Parse parameters (e.g., "item, index")
    const paramNames = params.split(',').map(p => p.trim());

    // Map over the array (now using Promise.all for async operations)
    const results = await Promise.all(array.map(async (item, index) => {
      // Create context for this iteration
      const iterationContext = { ...context };
      paramNames.forEach((paramName, paramIndex) => {
        if (paramIndex === 0) iterationContext[paramName] = item;
        if (paramIndex === 1) iterationContext[paramName] = index;
      });

      // For JSX components, we need special handling
      if (elementExpr.includes('<') && elementExpr.includes('>')) {
        return await this.renderJSXComponent(elementExpr, iterationContext);
      }

      // For regular expressions, evaluate them
      const elemFunc = new Function(...Object.keys(iterationContext), `return (${elementExpr})`);
      return elemFunc(...Object.values(iterationContext));
    }));

    return results.join('\n');
  }

  private async renderJSXComponent(jsxElement: string, context: any): Promise<string> {
    // Parse JSX like: <ListItem key={index} item={item} />
    const componentMatch = jsxElement.match(/<(\w+)([^/>]*)\/>/);

    if (!componentMatch) {
      return jsxElement; // Return as-is if we can't parse it
    }

    const [, componentName, props] = componentMatch;

    // Parse props
    const propMatches = props.match(/(\w+)=\{([^}]+)\}/g) || [];
    const propValues: any = {};

    for (const propMatch of propMatches) {
      const [, propName, propExpr] = propMatch.match(/(\w+)=\{([^}]+)\}/) || [];
      if (propName && propExpr) {
        try {
          const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
          propValues[propName] = propFunc(...Object.values(context));
        } catch (error) {
          // Skip invalid prop expressions
        }
      }
    }

    // Check if we have the component in our registry
    if (this.componentRegistry[componentName]) {
      try {
        const componentResult = await this.execute(this.componentRegistry[componentName], {}, propValues);
        return componentResult.content;
      } catch (error) {
        return `<${componentName}:ERROR>`;
      }
    }

    // Fallback rendering for common components
    if (componentName === 'ListItem' && propValues.item) {
      return `- ${propValues.item}`;
    }

    // Fallback representation
    return `<${componentName} ${Object.entries(propValues).map(([k, v]) => `${k}="${v}"`).join(' ')} />`;
  }

  private jsxResultToString(result: any): string {
    if (result === null || result === undefined) {
      return '';
    }
    if (Array.isArray(result)) {
      return result.map(item => this.valueToString(item)).join('\n');
    }
    return this.valueToString(result);
  }
}