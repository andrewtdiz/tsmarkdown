

// Unified parsing architecture interfaces
export interface ParseContext {
  interpolations: Array<{ placeholder: string, expression: string }>;
  conditionalBlocks: Array<{ condition: string, content: string }>;
  ternaryExpressions: Array<{ condition: string, trueValue: string, falseValue: string }>;
  jsxExpressions: Array<{ placeholder: string, expression: string }>;
}

// Unified parsing entry point - applies the full parsing pipeline recursively
export function parseContent(content: string, context: ParseContext): string {
  let processed = content;

  // Apply full parsing pipeline recursively
  processed = parseInterpolations(processed, context);
  processed = parseConditionals(processed, context);
  processed = parseTernary(processed, context);
  processed = parseJSX(processed, context);

  return processed;
}

// Recursive interpolation parser
export function parseInterpolations(content: string, context: ParseContext): string {
  let processedContent = content;
  let startIndex = 0;

  while (startIndex < processedContent.length) {
    // Find the next {{ pattern
    const openIndex = processedContent.indexOf('{{', startIndex);
    if (openIndex === -1) break;

    // Find the matching }} by counting nested braces
    let braceCount = 0;
    let closeIndex = openIndex + 2; // Start after {{

    while (closeIndex < processedContent.length) {
      const char = processedContent[closeIndex];
      const nextChar = processedContent[closeIndex + 1];

      if (char === '{' && nextChar === '{') {
        // Found nested {{
        braceCount++;
        closeIndex += 2;
      } else if (char === '}' && nextChar === '}') {
        // Found }}
        if (braceCount === 0) {
          // This is the matching closing }}
          break;
        } else {
          // This is a nested closing }}, decrement count
          braceCount--;
          closeIndex += 2;
        }
      } else {
        closeIndex++;
      }
    }

    if (closeIndex >= processedContent.length) {
      // No matching }} found, skip this one
      startIndex = openIndex + 2;
      continue;
    }

    // Extract the expression (everything between {{ and }})
    const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

    if (expression) {
      const placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
      context.interpolations.push({ placeholder, expression });

      // Replace the entire {{ expression }} with the placeholder
      processedContent = processedContent.substring(0, openIndex) +
        placeholder +
        processedContent.substring(closeIndex + 2);

      // Update startIndex to continue from the placeholder
      startIndex = openIndex + placeholder.length;
    } else {
      // Empty expression, skip
      startIndex = closeIndex + 2;
    }
  }

  return processedContent;
}

// Recursive conditional parser
export function parseConditionals(content: string, context: ParseContext): string {
  let processedContent = content;
  let startIndex = 0;

  while (startIndex < processedContent.length) {
    const openBraceIndex = processedContent.indexOf('{', startIndex);
    if (openBraceIndex === -1) break;

    // Skip if it's a double brace {{ }}
    if (processedContent[openBraceIndex + 1] === '{') {
      startIndex = openBraceIndex + 2;
      continue;
    }

    // Find the matching closing brace
    const endIndex = findMatchingBrace(processedContent, openBraceIndex);
    if (endIndex === -1) {
      startIndex = openBraceIndex + 1;
      continue;
    }

    const expression = processedContent.substring(openBraceIndex + 1, endIndex);
    const trimmedExpression = expression.trim();

    // Check if this is a conditional block (contains && and parentheses)
    if (trimmedExpression.includes('&&') && trimmedExpression.includes('(') && trimmedExpression.includes(')')) {
      // Look for the pattern: condition && (content)
      const andPattern = /&&\s*\(/;
      const match = trimmedExpression.match(andPattern);

      if (!match) {
        startIndex = endIndex + 1;
        continue;
      }

      const andIndex = match.index!;
      const condition = trimmedExpression.substring(0, andIndex).trim();

      // Find the opening parenthesis that comes after the &&
      const parenStart = andIndex + match[0].length - 1; // -1 because we want the position of the (
      if (parenStart === -1) {
        startIndex = endIndex + 1;
        continue;
      }

      // Find the matching closing parenthesis
      const parenEnd = findMatchingParen(trimmedExpression, parenStart);
      if (parenEnd === -1) {
        startIndex = endIndex + 1;
        continue;
      }

      const blockContent = trimmedExpression.substring(parenStart + 1, parenEnd).trim();

      // RECURSIVE: Apply the full parsing pipeline to nested content
      const parsedNested = parseContent(blockContent, context);

      const placeholder = `__CONDITIONAL_${context.conditionalBlocks.length}__`;
      context.conditionalBlocks.push({
        condition: condition,
        content: parsedNested,
      });

      // Replace the entire conditional block with the placeholder
      processedContent = processedContent.substring(0, openBraceIndex) +
        placeholder +
        processedContent.substring(endIndex + 1);

      // Update startIndex to continue from the placeholder
      startIndex = openBraceIndex + placeholder.length;
    } else {
      startIndex = endIndex + 1;
    }
  }

  return processedContent;
}

// Recursive ternary parser
export function parseTernary(content: string, context: ParseContext): string {
  // Match ternary expressions - {condition ? trueValue : falseValue}
  const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}<>]*)*)\}/g;

  return content.replace(
    ternaryRegex,
    (match, condition, trueValue, falseValue) => {
      const trimmedCondition = condition.trim();
      const trimmedTrueValue = trueValue.trim();
      const trimmedFalseValue = falseValue.trim();

      // Skip if any part is empty
      if (!trimmedCondition || !trimmedTrueValue || !trimmedFalseValue) {
        return match;
      }

      // RECURSIVE: Apply the full parsing pipeline to both true and false values
      const parsedTrueValue = parseContent(trimmedTrueValue, context);
      const parsedFalseValue = parseContent(trimmedFalseValue, context);

      const placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
      context.ternaryExpressions.push({
        condition: trimmedCondition,
        trueValue: parsedTrueValue,
        falseValue: parsedFalseValue,
      });
      return placeholder;
    },
  );
}

// Recursive JSX parser
export function parseJSX(content: string, context: ParseContext): string {
  // For now, JSX support is temporarily disabled
  // This function is a placeholder for future JSX support
  return content;
}

export function parseParameters(params: string): string[] {
  const parameters: string[] = [];

  // Handle destructured object parameters like { items, user }
  const destructuredMatch = params.match(/\{\s*([^}]+)\s*\}/);
  if (destructuredMatch) {
    const destructuredParams = destructuredMatch[1]
      .split(',')
      .map(p => p.trim().split(':')[0].trim().split('=')[0].trim()) // Remove type annotations and default values
      .filter(p => p.length > 0);
    parameters.push(...destructuredParams);
  } else {
    // Handle regular parameters
    const regularParams = params
      .split(',')
      .map(p => p.trim().split(':')[0].trim().split('=')[0].trim()) // Remove type annotations and default values
      .filter(p => p.length > 0);
    parameters.push(...regularParams);
  }

  return parameters;
}


export function parseParameterTypes(params: string): Array<{ name: string; type: string; required: boolean }> {
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
      const hasDefaultValue = prop.includes('=');
      const cleanName = prop.replace('?', '').split('=')[0].trim();

      const typeInfo = typeMap.get(cleanName);
      const inferredType = typeInfo?.type || inferTypeFromUsage(cleanName) || 'any';
      const isTypeOptional = typeInfo?.optional || false;

      parameterTypes.push({
        name: cleanName,
        type: inferredType,
        required: !isOptional && !isTypeOptional && !hasDefaultValue
      });
    }
  } else {
    // Handle regular parameters
    const regularParams = params.split(',').map(p => p.trim());

    for (const param of regularParams) {
      const [name, paramType] = param.split(':').map(s => s?.trim());
      const isOptional = name?.includes('?') || false;
      const hasDefaultValue = name?.includes('=') || false;
      const cleanName = name?.replace('?', '').split('=')[0].trim() || '';

      if (cleanName) {
        parameterTypes.push({
          name: cleanName,
          type: paramType || inferTypeFromUsage(cleanName) || 'any',
          required: !isOptional && !hasDefaultValue
        });
      }
    }
  }

  return parameterTypes;
}

export function processTernaryExpressions(
  content: string,
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
): string {
  // Match ternary expressions - {condition ? trueValue : falseValue}
  // This regex handles nested parentheses and braces within each part
  // But excludes JSX expressions (those containing < and >)
  const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}<>]*)*)\}/g;

  return content.replace(
    ternaryRegex,
    (match, condition, trueValue, falseValue) => {
      const trimmedCondition = condition.trim();
      const trimmedTrueValue = trueValue.trim();
      const trimmedFalseValue = falseValue.trim();

      // Skip if any part is empty
      if (!trimmedCondition || !trimmedTrueValue || !trimmedFalseValue) {
        return match;
      }

      const placeholder = `__TERNARY_${ternaryExpressions.length}__`;
      ternaryExpressions.push({
        condition: trimmedCondition,
        trueValue: trimmedTrueValue,
        falseValue: trimmedFalseValue,
      });
      return placeholder;
    },
  );
}

export function inferTypeFromUsage(paramName: string): string {
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



export function processJSXElements(
  content: string,
  jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
  // Find JSX elements like <Component prop={value} />
  const jsxElementRegex = /<(\w+)([^/>]*)\/>/g;

  return content.replace(jsxElementRegex, (match, componentName, props) => {
    // Parse props to extract JSX expressions within them
    const propMatches = props.match(/(\w+)=\{([^}]+)\}/g) || [];
    const processedProps: string[] = [];

    // Handle props with ={} syntax
    for (const propMatch of propMatches) {
      const [, propName, propExpr] = propMatch.match(/(\w+)=\{([^}]+)\}/) || [];
      if (propName && propExpr) {
        // Create a JSX expression placeholder for the prop value
        const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
        jsxExpressions.push({ placeholder, expression: propExpr.trim() });
        processedProps.push(`${propName}=${placeholder}`);
      }
    }

    // Handle props without ={} syntax (default to true)
    const booleanProps = props.match(/\b(\w+)(?=\s|$)/g) || [];
    for (const booleanProp of booleanProps) {
      // Skip if this prop is already handled by the ={} syntax
      const isAlreadyHandled = propMatches.some((propMatch: string) =>
        propMatch.includes(`${booleanProp}=`)
      );
      if (!isAlreadyHandled) {
        processedProps.push(booleanProp);
      }
    }

    // Reconstruct the JSX element with processed props
    const processedPropsString = processedProps.length > 0 ? ' ' + processedProps.join(' ') : '';
    return `<${componentName}${processedPropsString} />`;
  });
}

export function processJSXExpressions(
  content: string,
  jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
  // Find all {expression} patterns and process them
  let processedContent = content;
  let startIndex = 0;

  while (startIndex < processedContent.length) {
    const openBraceIndex = processedContent.indexOf('{', startIndex);
    if (openBraceIndex === -1) break;

    // Skip if it's a double brace {{ }}
    if (processedContent[openBraceIndex + 1] === '{') {
      startIndex = openBraceIndex + 2;
      continue;
    }

    // Skip if we're inside a JSX element (between < and />)
    const beforeBrace = processedContent.substring(0, openBraceIndex);
    const lastOpenAngle = beforeBrace.lastIndexOf('<');
    const lastCloseAngle = beforeBrace.lastIndexOf('>');
    const lastSlashAngle = beforeBrace.lastIndexOf('/>');

    // If we have an unclosed JSX element (last < is after last >), skip this brace
    if (lastOpenAngle > lastCloseAngle && lastOpenAngle > lastSlashAngle) {
      startIndex = openBraceIndex + 1;
      continue;
    }

    // Find the matching closing brace
    const endIndex = findMatchingBrace(processedContent, openBraceIndex);
    if (endIndex === -1) {
      startIndex = openBraceIndex + 1;
      continue;
    }

    const expression = processedContent.substring(openBraceIndex + 1, endIndex);
    const trimmedExpression = expression.trim();

    // Skip if it's a conditional block (contains &&)
    if (trimmedExpression.includes('&&')) {
      startIndex = endIndex + 1;
      continue;
    }

    // Skip if it's a ternary expression (contains ? and :) and doesn't contain JSX
    if (trimmedExpression.includes('?') && trimmedExpression.includes(':') && !trimmedExpression.includes('<')) {
      startIndex = endIndex + 1;
      continue;
    }

    // Skip if it's empty
    if (!trimmedExpression) {
      startIndex = endIndex + 1;
      continue;
    }

    const placeholder = `__JSX_EXPRESSION_${jsxExpressions.length}__`;
    jsxExpressions.push({ placeholder, expression: trimmedExpression });
    processedContent = processedContent.substring(0, openBraceIndex) + placeholder + processedContent.substring(endIndex + 1);
    startIndex = openBraceIndex + placeholder.length;
  }

  return processedContent;
}

export function findMatchingBrace(content: string, startIndex: number): number {
  let braceCount = 0;
  let parenCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      continue;
    }

    if (inString) continue;

    // Count braces and parentheses
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return i;
      }
    } else if (char === '(') {
      parenCount++;
    } else if (char === ')') {
      parenCount--;
    }
  }

  return -1; // No matching brace found
}

export function findMatchingParen(content: string, startIndex: number): number {
  let parenCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      continue;
    }

    if (inString) continue;

    // Count parentheses
    if (char === '(') {
      parenCount++;
    } else if (char === ')') {
      parenCount--;
      if (parenCount === 0) {
        return i;
      }
    }
  }

  return -1; // No matching parenthesis found
}

export function normalizeIndentation(content: string): string {
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

export function processConditionalBlocks(
  content: string,
  conditionalBlocks: Array<{ condition: string; content: string }>,
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [],
  interpolations: Array<{ placeholder: string; expression: string }> = [],
): string {
  let processedContent = content;
  let startIndex = 0;

  while (startIndex < processedContent.length) {
    const openBraceIndex = processedContent.indexOf('{', startIndex);
    if (openBraceIndex === -1) break;

    // Skip if it's a double brace {{ }}
    if (processedContent[openBraceIndex + 1] === '{') {
      startIndex = openBraceIndex + 2;
      continue;
    }

    // Find the matching closing brace
    const endIndex = findMatchingBrace(processedContent, openBraceIndex);
    if (endIndex === -1) {
      startIndex = openBraceIndex + 1;
      continue;
    }

    const expression = processedContent.substring(openBraceIndex + 1, endIndex);
    const trimmedExpression = expression.trim();

    // Check if this is a conditional block (contains && and parentheses)
    if (trimmedExpression.includes('&&') && trimmedExpression.includes('(') && trimmedExpression.includes(')')) {
      // Look for the pattern: condition && (content)
      // We need to find the && that comes right before the opening parenthesis
      const andPattern = /&&\s*\(/;
      const match = trimmedExpression.match(andPattern);

      if (!match) {
        startIndex = endIndex + 1;
        continue;
      }

      const andIndex = match.index!;
      const condition = trimmedExpression.substring(0, andIndex).trim();

      // Find the opening parenthesis that comes after the &&
      const parenStart = andIndex + match[0].length - 1; // -1 because we want the position of the (
      if (parenStart === -1) {
        startIndex = endIndex + 1;
        continue;
      }

      // Find the matching closing parenthesis
      const parenEnd = findMatchingParen(trimmedExpression, parenStart);
      if (parenEnd === -1) {
        startIndex = endIndex + 1;
        continue;
      }

      const blockContent = trimmedExpression.substring(parenStart + 1, parenEnd).trim();

      // Process any nested conditionals, ternary expressions, and interpolations within this block recursively
      let processedBlockContent = blockContent;
      if (blockContent.includes('{') && blockContent.includes('&&')) {
        processedBlockContent = processConditionalBlocks(processedBlockContent, conditionalBlocks, ternaryExpressions, interpolations);
      }
      if (blockContent.includes('{') && blockContent.includes('?')) {
        processedBlockContent = processTernaryExpressions(processedBlockContent, ternaryExpressions);
      }
      if (blockContent.includes('{{')) {
        processedBlockContent = processedBlockContent.replace(
          /\{\{\s*([^}]+)\s*\}\}/g,
          (match, expression) => {
            const placeholder = `__INTERPOLATION_${interpolations.length}__`;
            interpolations.push({ placeholder, expression: expression.trim() });
            return placeholder;
          },
        );
      }

      const placeholder = `__CONDITIONAL_${conditionalBlocks.length}__`;
      conditionalBlocks.push({
        condition: condition,
        content: processedBlockContent,
      });

      // Replace the entire conditional block with the placeholder
      processedContent = processedContent.substring(0, openBraceIndex) +
        placeholder +
        processedContent.substring(endIndex + 1);

      // Update startIndex to continue from the placeholder
      startIndex = openBraceIndex + placeholder.length;
    } else {
      startIndex = endIndex + 1;
    }
  }

  return processedContent;
}

export function processNestedInterpolations(
  content: string,
  interpolations: Array<{ placeholder: string; expression: string }>,
): string {
  let processedContent = content;
  let startIndex = 0;

  while (startIndex < processedContent.length) {
    // Find the next {{ pattern
    const openIndex = processedContent.indexOf('{{', startIndex);
    if (openIndex === -1) break;

    // Find the matching }} by counting nested braces
    let braceCount = 0;
    let closeIndex = openIndex + 2; // Start after {{

    while (closeIndex < processedContent.length) {
      const char = processedContent[closeIndex];
      const nextChar = processedContent[closeIndex + 1];

      if (char === '{' && nextChar === '{') {
        // Found nested {{
        braceCount++;
        closeIndex += 2;
      } else if (char === '}' && nextChar === '}') {
        // Found }}
        if (braceCount === 0) {
          // This is the matching closing }}
          break;
        } else {
          // This is a nested closing }}, decrement count
          braceCount--;
          closeIndex += 2;
        }
      } else {
        closeIndex++;
      }
    }

    if (closeIndex >= processedContent.length) {
      // No matching }} found, skip this one
      startIndex = openIndex + 2;
      continue;
    }

    // Extract the expression (everything between {{ and }})
    const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

    if (expression) {
      const placeholder = `__INTERPOLATION_${interpolations.length}__`;
      interpolations.push({ placeholder, expression });

      // Replace the entire {{ expression }} with the placeholder
      processedContent = processedContent.substring(0, openIndex) +
        placeholder +
        processedContent.substring(closeIndex + 2);

      // Update startIndex to continue from the placeholder
      startIndex = openIndex + placeholder.length;
    } else {
      // Empty expression, skip
      startIndex = closeIndex + 2;
    }
  }

  return processedContent;
}

export function processTemplateContent(
  content: string,
  interpolations: Array<{ placeholder: string; expression: string }>,
  conditionalBlocks: Array<{ condition: string; content: string }>,
  ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
  jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
  // Create unified parsing context
  const context: ParseContext = {
    interpolations,
    conditionalBlocks,
    ternaryExpressions,
    jsxExpressions,
  };

  // Use the new unified parsing architecture
  return parseContent(content, context);
}

export function generatePropsInterface(functionName: string, parameterTypes: Array<{ name: string; type: string; required: boolean }>): string {
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