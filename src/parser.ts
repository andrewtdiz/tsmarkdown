export interface ParsedMDX {
  imports: string[];
  functionName: string;
  typescript: string;
  markdown: string;
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
}

export class MDXParser {
  parse(content: string): ParsedMDX {
    const lines = content.split('\n');
    const imports: string[] = [];
    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];

    let functionName = '';
    let typescript = '';
    let markdown = '';
    let inFunction = false;
    let inReturn = false;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Parse imports
      if (trimmed.startsWith('import ')) {
        imports.push(trimmed);
        continue;
      }

      // Parse function declaration
      if (trimmed.startsWith('function ')) {
        const match = trimmed.match(/function\s+(\w+)/);
        if (match) {
          functionName = match[1];
          inFunction = true;
        }
        continue;
      }

      // Parse function body
      if (inFunction && !inReturn) {
        if (trimmed === 'return (') {
          inReturn = true;
          continue;
        }
        if (trimmed !== '{') {
          typescript += line + '\n';
        }
        continue;
      }

      // Parse return content (markdown with interpolations)
      if (inReturn) {
        // Count braces to know when function ends
        for (const char of line) {
          if (char === '{') braceLevel++;
          if (char === '}') braceLevel--;
        }

        // End of function
        if (braceLevel < 0) {
          break;
        }

        // Parse interpolations {{ }}
        const interpolationRegex = /\{\{\s*([^}]+)\s*\}\}/g;
        let match;
        let processedLine = line;

        while ((match = interpolationRegex.exec(line)) !== null) {
          const expression = match[1].trim();
          const placeholder = `__INTERPOLATION_${interpolations.length}__`;
          interpolations.push({ placeholder, expression });
          processedLine = processedLine.replace(match[0], placeholder);
        }

        // Parse conditional blocks {condition && (content)}
        const conditionalRegex = /\{([^}]+)\s*&&\s*\(([^}]+)\)\}/gs;
        let conditionalMatch;

        while ((conditionalMatch = conditionalRegex.exec(line)) !== null) {
          const condition = conditionalMatch[1].trim();
          const content = conditionalMatch[2].trim();
          conditionalBlocks.push({ condition, content });
          processedLine = processedLine.replace(conditionalMatch[0], `__CONDITIONAL_${conditionalBlocks.length - 1}__`);
        }

        markdown += processedLine + '\n';
      }
    }

    return {
      imports: imports.filter(Boolean),
      functionName,
      typescript: typescript.trim(),
      markdown: markdown.trim(),
      interpolations,
      conditionalBlocks
    };
  }
}