export interface ParsedMDX {
  imports: string[];
  functionName: string;
  functionParams: string[];
  typescript: string;
  markdown: string;
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string; expression: string }>;
  propsInterface?: string;
  parameterTypes: Array<{ name: string; type: string; required: boolean }>;
}

export class MDXParser {
  parse(content: string): ParsedMDX {
    const lines = content.split("\n");
    const imports: string[] = [];
    const interpolations: Array<{ placeholder: string; expression: string }> =
      [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    let functionName = "";
    let functionParams: string[] = [];
    let typescript = "";
    let markdown = "";
    let inFunction = false;
    let inReturn = false;
    let braceLevel = 0;
    let parameterTypes: Array<{ name: string; type: string; required: boolean }> = [];
    let rawParams = "";

    // First pass: extract imports and function metadata
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("import ")) {
        imports.push(trimmed);
        continue;
      }

      if (trimmed.startsWith("function ") || trimmed.startsWith("async function ")) {
        const match = trimmed.match(/(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
        if (match) {
          functionName = match[1];
          rawParams = match[2].trim();
          if (rawParams) {
            // Parse parameters - handle destructured objects like { items }
            functionParams = this.parseParameters(rawParams);
            parameterTypes = this.parseParameterTypes(rawParams);
          }
          inFunction = true;
        }
        continue;
      }

      if (inFunction && !inReturn) {
        if (trimmed === "return (") {
          inReturn = true;
          continue;
        }
        if (trimmed !== "{") {
          typescript += line + "\n";
        }
        continue;
      }

      if (inReturn) {
        // Check if this line contains the closing parenthesis of the return statement
        const trimmedLine = line.trim();
        if (
          trimmedLine === ")" ||
          (trimmedLine.endsWith(")") && braceLevel === 0)
        ) {
          break; // This is the end of the return statement
        }

        for (const char of line) {
          if (char === "{") braceLevel++;
          if (char === "}") braceLevel--;
        }

        if (braceLevel < 0) {
          break;
        }

        markdown += line + "\n";
      }
    }

    // Second pass: process markdown for interpolations, conditionals, and JSX expressions
    markdown = this.processTemplateContent(
      this.normalizeIndentation(markdown).trim(),
      interpolations,
      conditionalBlocks,
      jsxExpressions,
    );

    // Generate props interface
    const propsInterface = this.generatePropsInterface(functionName, parameterTypes);

    return {
      imports: imports.filter(Boolean),
      functionName,
      functionParams,
      typescript: typescript.trim(),
      markdown,
      interpolations,
      conditionalBlocks,
      jsxExpressions,
      propsInterface,
      parameterTypes,
    };
  }

  private parseParameters(params: string): string[] {
    const parameters: string[] = [];

    // Handle destructured object parameters like { items, user }
    const destructuredMatch = params.match(/\{\s*([^}]+)\s*\}/);
    if (destructuredMatch) {
      const destructuredParams = destructuredMatch[1]
        .split(',')
        .map(p => p.trim().split(':')[0].trim()) // Remove type annotations for parameter names
        .filter(p => p.length > 0);
      parameters.push(...destructuredParams);
    } else {
      // Handle regular parameters
      const regularParams = params
        .split(',')
        .map(p => p.trim().split(':')[0].trim()) // Remove type annotations
        .filter(p => p.length > 0);
      parameters.push(...regularParams);
    }

    return parameters;
  }

  private parseParameterTypes(params: string): Array<{ name: string; type: string; required: boolean }> {
    const parameterTypes: Array<{ name: string; type: string; required: boolean }> = [];

    // Handle destructured object parameters with type annotations like { month, amount }: { month: string; amount: number }
    const destructuredMatch = params.match(/\{\s*([^}]+)\s*\}(?:\s*:\s*\{\s*([^}]+)\s*\})?/);
    if (destructuredMatch) {
      const destructuredParams = destructuredMatch[1];
      const typeAnnotation = destructuredMatch[2];

      let typeMap: Map<string, { type: string; optional: boolean }> = new Map();

      // If there's a type annotation, parse it
      if (typeAnnotation) {
        const typeProperties = typeAnnotation.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        for (const typeProp of typeProperties) {
          const colonIndex = typeProp.indexOf(':');
          if (colonIndex !== -1) {
            const typeName = typeProp.substring(0, colonIndex).trim().replace('?', '');
            const typeValue = typeProp.substring(colonIndex + 1).trim();
            const isOptional = typeProp.substring(0, colonIndex).includes('?');
            typeMap.set(typeName, { type: typeValue, optional: isOptional });
          }
        }
      }

      // Parse parameter names
      const properties = destructuredParams.split(',').map(p => p.trim());

      for (const prop of properties) {
        // In destructuring, there shouldn't be type annotations in the parameter names
        const isOptional = prop.includes('?');
        const cleanName = prop.replace('?', '').trim();

        const typeInfo = typeMap.get(cleanName);
        const inferredType = typeInfo?.type || this.inferTypeFromUsage(cleanName) || 'any';
        const isTypeOptional = typeInfo?.optional || false;

        parameterTypes.push({
          name: cleanName,
          type: inferredType,
          required: !isOptional && !isTypeOptional
        });
      }
    } else {
      // Handle regular parameters
      const regularParams = params.split(',').map(p => p.trim());

      for (const param of regularParams) {
        const [name, paramType] = param.split(':').map(s => s?.trim());
        const isOptional = name?.includes('?') || false;
        const cleanName = name?.replace('?', '') || '';

        if (cleanName) {
          parameterTypes.push({
            name: cleanName,
            type: paramType || this.inferTypeFromUsage(cleanName) || 'any',
            required: !isOptional
          });
        }
      }
    }

    return parameterTypes;
  }

  private inferTypeFromUsage(paramName: string): string {
    // Basic type inference based on common naming patterns
    if (paramName.includes('count') || paramName.includes('amount') || paramName.includes('price') || paramName.includes('score')) {
      return 'number';
    }
    if (paramName.includes('name') || paramName.includes('title') || paramName.includes('text') || paramName.includes('message')) {
      return 'string';
    }
    if (paramName.includes('is') || paramName.includes('has') || paramName.includes('can') || paramName.includes('enabled')) {
      return 'boolean';
    }
    if (paramName.includes('items') || paramName.includes('list') || paramName.includes('array')) {
      return 'any[]';
    }
    return 'any';
  }

  private generatePropsInterface(functionName: string, parameterTypes: Array<{ name: string; type: string; required: boolean }>): string {
    if (parameterTypes.length === 0) {
      return '';
    }

    const interfaceName = `${functionName}Props`;
    const properties = parameterTypes.map(param => {
      const optional = param.required ? '' : '?';
      return `  ${param.name}${optional}: ${param.type};`;
    }).join('\n');

    return `export interface ${interfaceName} {
${properties}
}`;
  }

  private normalizeIndentation(content: string): string {
    const lines = content.split("\n");
    if (lines.length === 0) return content;

    // Find the first non-empty line's indentation as the base
    let baseIndent = 0;
    for (const line of lines) {
      if (line.trim() === "") continue;
      baseIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
      break;
    }

    // Remove the base indentation from all lines
    return lines
      .map((line) => {
        if (line.trim() === "") return "";
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        if (currentIndent >= baseIndent) {
          return line.slice(baseIndent);
        }
        return line;
      })
      .join("\n");
  }

  private processTemplateContent(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
  ): string {
    // Process interpolations first
    let processedContent = content.replace(
      /\{\{\s*([^}]+)\s*\}\}/g,
      (match, expression) => {
        const placeholder = `__INTERPOLATION_${interpolations.length}__`;
        interpolations.push({ placeholder, expression: expression.trim() });
        return placeholder;
      },
    );

    // Process conditional blocks - handle multiline {condition && (content)}
    processedContent = this.processConditionalBlocks(
      processedContent,
      conditionalBlocks,
    );

    // Process JSX expressions - handle {expression} that are not interpolations or conditionals
    processedContent = this.processJSXExpressions(
      processedContent,
      jsxExpressions,
    );

    return processedContent;
  }

  private processConditionalBlocks(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
  ): string {
    // Match conditional blocks with proper nesting
    const conditionalRegex = /\{([^{}]+?)\s*&&\s*\(\s*([\s\S]*?)\s*\)\s*\}/g;

    return content.replace(
      conditionalRegex,
      (match, condition, blockContent) => {
        const placeholder = `__CONDITIONAL_${conditionalBlocks.length}__`;
        conditionalBlocks.push({
          condition: condition.trim(),
          content: blockContent.trim(),
        });
        return placeholder;
      },
    );
  }

  private processJSXExpressions(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
  ): string {
    // Match JSX expressions - single line {expression} that are not {{ }} or && (
    const jsxRegex = /\{(?!\{)([^{}]*(?:\{[^}]*\}[^{}]*)*)\}(?!\})/g;

    return content.replace(
      jsxRegex,
      (match, expression) => {
        const trimmedExpression = expression.trim();

        // Skip if it's a conditional block (contains &&)
        if (trimmedExpression.includes('&&')) {
          return match;
        }

        // Skip if it's empty
        if (!trimmedExpression) {
          return match;
        }

        const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
        jsxExpressions.push({ placeholder, expression: trimmedExpression });
        return placeholder;
      },
    );
  }
}
