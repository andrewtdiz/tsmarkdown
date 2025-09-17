import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { CompiledMDX, compile } from '../compiler';
import { parseMDX } from '../parser';

export interface RenderContext {
    [key: string]: any;
}

export interface ComponentRegistry {
    [componentName: string]: CompiledMDX;
}

export interface RenderResult {
    content: string;
    errors: string[];
}

const componentRegistry: ComponentRegistry = {};

export async function processMultipleReturnStatements(
    returnStatements: Array<{ condition?: string; content: string; isTemplate: boolean }>,
    context: any,
    errors: string[]
): Promise<string> {
    // Find the first return statement that should be executed
    for (const returnStmt of returnStatements) {
        if (returnStmt.isTemplate) {
            // Check if this return statement has a condition
            if (returnStmt.condition) {
                try {
                    // Evaluate the condition
                    const conditionResult = evaluateExpression(returnStmt.condition, context);
                    if (conditionResult) {
                        // This condition is true, use this template
                        return await processTemplate(returnStmt.content, context, errors);
                    }
                    // Continue to next return statement
                    continue;
                } catch (error) {
                    errors.push(`Condition evaluation error in "${returnStmt.condition}": ${error}`);
                    continue;
                }
            } else {
                // No condition, this is the default/fallback template
                return await processTemplate(returnStmt.content, context, errors);
            }
        }
    }

    // If no template return statement matched, return empty string
    return '';
}

export async function processTemplate(
    templateContent: string,
    context: any,
    errors: string[]
): Promise<string> {
    // Extract interpolations, conditionals, ternary expressions, and JSX expressions from the template content
    const interpolations: Array<{ placeholder: string; expression: string }> = [];
    const conditionalBlocks: Array<{ condition: string; content: string }> = [];
    const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
    const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

    // Process the template content to extract all the different types of expressions
    let processedContent = processTemplateContent(
        templateContent,
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions
    );

    // Process conditional blocks first (they may contain interpolations)
    processedContent = processConditionalBlocks(
        processedContent,
        conditionalBlocks,
        interpolations,
        context,
        errors
    );

    // Process any remaining interpolations
    processedContent = processInterpolations(
        processedContent,
        interpolations,
        context,
        errors
    );

    // Process ternary expressions
    processedContent = processTernaryExpressions(
        processedContent,
        ternaryExpressions,
        context,
        errors
    );

    // Process JSX expressions
    processedContent = await processJSXExpressions(
        processedContent,
        jsxExpressions,
        context,
        errors
    );

    return processedContent;
}

export function processTemplateContent(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
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
    processedContent = processConditionalBlocksForParsing(
        processedContent,
        conditionalBlocks,
    );

    // Process ternary expressions - handle {condition ? trueValue : falseValue}
    processedContent = processTernaryExpressionsForParsing(
        processedContent,
        ternaryExpressions,
    );

    // Process JSX elements first (like <Component prop={value} />)
    processedContent = processJSXElementsForParsing(
        processedContent,
        jsxExpressions,
    );

    // Process JSX expressions - handle {expression} that are not interpolations, conditionals, or ternary expressions
    processedContent = processJSXExpressionsForParsing(
        processedContent,
        jsxExpressions,
    );

    return processedContent;
}

export function processConditionalBlocksForParsing(
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

export function processTernaryExpressionsForParsing(
    content: string,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
): string {
    // Match ternary expressions - {condition ? trueValue : falseValue}
    const ternaryRegex = /\{([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*)\s*\?\s*([^{}:<>]*(?:\{[^}]*\}[^{}:<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\s*:\s*([^{}<>]*(?:\{[^}]*\}[^{}<>]*)*(?:\([^)]*\)[^{}:<>]*)*)\}/g;

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

export function processJSXElementsForParsing(
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

export function processJSXExpressionsForParsing(
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

export function loadDependencies(dependencies: string[], basePath: string, errors: string[]): void {
    for (const componentName of dependencies) {
        if (!componentRegistry[componentName]) {
            try {
                // Try to find the component file
                const componentPath = resolveComponentPath(componentName, basePath);
                if (componentPath) {
                    const componentContent = readFileSync(componentPath, 'utf-8');
                    const parsed = parseMDX(componentContent);
                    const compiled = compile(parsed);
                    componentRegistry[componentName] = compiled;

                    // Recursively load dependencies of this component
                    if (compiled.dependencies && compiled.dependencies.length > 0) {
                        loadDependencies(compiled.dependencies, basePath, errors);
                    }
                }
            } catch (error) {
                errors.push(`Failed to load component ${componentName}: ${error}`);
            }
        }
    }
}

export function resolveComponentPath(componentName: string, basePath: string): string | null {
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

export function createPropsContext(functionParams: string[], props: any, parameterTypes?: Array<{ name: string; type: string; required: boolean }>): RenderContext {
    const context: RenderContext = {};

    // If props is an object and we have parameters, map them
    if (props && typeof props === 'object' && functionParams.length > 0) {
        for (const param of functionParams) {
            if (props.hasOwnProperty(param)) {
                context[param] = props[param];
            } else {
                // Check if this parameter has a default value (not required)
                const paramType = parameterTypes?.find(p => p.name === param);
                if (paramType && !paramType.required) {
                    // For optional parameters, provide a default value based on type
                    if (paramType.type === 'boolean') {
                        context[param] = false;
                    } else if (paramType.type.includes('[]')) {
                        context[param] = [];
                    } else {
                        context[param] = undefined;
                    }
                }
            }
        }
    }

    return context;
}

export function mergePropsWithDefaults(jsxProps: any, compiledComponent: CompiledMDX): any {
    const mergedProps = { ...jsxProps };
    const parameterTypes = compiledComponent.metadata?.parameterTypes;

    if (!parameterTypes) {
        return mergedProps;
    }

    // For each parameter that's not required and not provided in JSX props, add default value
    for (const paramType of parameterTypes) {
        if (!paramType.required && !jsxProps.hasOwnProperty(paramType.name)) {
            mergedProps[paramType.name] = getDefaultValueForType(paramType.type);
        }
    }

    return mergedProps;
}

export function getDefaultValueForType(type: string): any {
    if (type === 'boolean') {
        return false;
    } else if (type.includes('[]')) {
        return [];
    } else if (type === 'string') {
        return '';
    } else if (type === 'number') {
        return 0;
    } else {
        return undefined;
    }
}

export async function executeTypeScript(typescript: string, context: RenderContext): Promise<any> {
    if (!typescript.trim()) {
        return {};
    }

    try {
        // Extract imports and resolve them
        const imports = extractImports(typescript);
        const resolvedImports = await resolveImports(imports);

        // Create a safe execution environment with resolved imports
        const safeContext = createSafeContext(context, typescript, resolvedImports);

        // Remove import statements as they can't be executed in this context
        const executableCode = removeImports(typescript);

        if (!executableCode.trim()) {
            return {};
        }

        // Build the function that executes TypeScript and returns variables
        const variableNames = extractVariableNames(executableCode);
        const returnStatement = variableNames.length > 0
            ? `return { ${variableNames.map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(', ')} };`
            : 'return {};';

        const functionBody = `
        ${executableCode}
        ${returnStatement}
      `;

        // Create async function to support await
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
        const func = new AsyncFunction(...Object.keys(safeContext), functionBody);
        return await func(...Object.values(safeContext)) || {};
    } catch (error) {
        throw new Error(`TypeScript execution failed: ${error}`);
    }
}

export function createSafeContext(context: RenderContext, typescript?: string, resolvedImports?: any): any {
    // Extract variable names from TypeScript to avoid conflicts
    const declaredVars = typescript ? extractVariableNames(typescript) : [];

    // Create context without declared variables to avoid conflicts
    const filteredContext = Object.entries(context)
        .filter(([key]) => !declaredVars.includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Create a safe execution context with common utilities
    return {
        ...filteredContext,
        ...(resolvedImports || {}),
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

export function extractImports(code: string): string[] {
    const lines = code.split('\n');
    const imports: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ')) {
            imports.push(trimmed);
        }
    }

    return imports;
}

export async function resolveImports(imports: string[]): Promise<any> {
    const resolvedImports: any = {};

    for (const importLine of imports) {
        try {
            // Parse the import statement
            const importMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
            if (importMatch) {
                const [, namedImports, modulePath] = importMatch;
                const importNames = namedImports.split(',').map(name => name.trim());

                // Resolve the module path
                const resolvedModule = await resolveModule(modulePath);
                if (resolvedModule) {
                    // Add each named import to the resolved imports
                    for (const importName of importNames) {
                        if (resolvedModule[importName]) {
                            resolvedImports[importName] = resolvedModule[importName];
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to resolve import: ${importLine}`, error);
        }
    }

    return resolvedImports;
}

export async function resolveModule(modulePath: string): Promise<any> {
    try {
        // Handle relative imports
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            // For now, we'll use a simple require approach
            // In a real implementation, you might want to use dynamic imports
            const fs = require('fs');
            const path = require('path');

            // Try to find the module file
            const possibleExtensions = ['.ts', '.js', '.mjs'];
            let resolvedPath = null;

            for (const ext of possibleExtensions) {
                const fullPath = path.resolve(modulePath + ext);
                try {
                    if (fs.existsSync(fullPath)) {
                        resolvedPath = fullPath;
                        break;
                    }
                } catch (error) {
                    // Continue to next extension
                }
            }

            if (resolvedPath) {
                // Use require to load the module
                delete require.cache[require.resolve(resolvedPath)];
                return require(resolvedPath);
            }
        }

        // For absolute imports or node_modules, try require
        try {
            return require(modulePath);
        } catch (error) {
            // Module not found
            return null;
        }
    } catch (error) {
        console.warn(`Failed to resolve module: ${modulePath}`, error);
        return null;
    }
}

export function removeImports(code: string): string {
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

export function extractVariableNames(typescript: string): string[] {
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

export function processInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
): string {
    let processedContent = content;

    for (const interpolation of interpolations) {
        try {
            const value = evaluateExpression(interpolation.expression, context);
            const stringValue = valueToString(value);
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

export function processConditionalBlocks(
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
            const shouldRender = evaluateExpression(block.condition, context);
            let blockContent = shouldRender ? block.content : '';

            // Process any interpolations within the conditional block content
            if (blockContent && shouldRender) {
                // Process escape sequences first (convert \n to actual newlines)
                blockContent = processEscapeSequences(blockContent);

                // Normalize indentation within the conditional block
                blockContent = normalizeIndentation(blockContent.trim());
                blockContent = processInterpolations(blockContent, interpolations, context, errors);
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

export function processTernaryExpressions(
    content: string,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
    context: any,
    errors: string[]
): string {
    let processedContent = content;

    for (let i = 0; i < ternaryExpressions.length; i++) {
        const ternary = ternaryExpressions[i];
        const placeholder = `__TERNARY_${i}__`;

        try {
            // Evaluate the condition
            const conditionResult = evaluateExpression(ternary.condition, context);

            // Choose the appropriate value based on the condition
            const selectedValue = conditionResult ? ternary.trueValue : ternary.falseValue;

            // Process any interpolations within the selected value
            let processedValue = selectedValue;
            if (processedValue && typeof processedValue === 'string') {
                // Remove wrapping parentheses if they exist
                processedValue = processedValue.trim();
                if (processedValue.startsWith('(') && processedValue.endsWith(')')) {
                    processedValue = processedValue.slice(1, -1).trim();
                }

                // Process escape sequences first (convert \n to actual newlines)
                processedValue = processEscapeSequences(processedValue);

                // Normalize indentation within the ternary value
                processedValue = normalizeIndentation(processedValue);

                // Extract interpolations from the ternary value
                const ternaryInterpolations: Array<{ placeholder: string; expression: string }> = [];
                processedValue = processedValue.replace(
                    /\{\{\s*([^}]+)\s*\}\}/g,
                    (match, expression) => {
                        const interpolationPlaceholder = `__INTERPOLATION_${ternaryInterpolations.length}__`;
                        ternaryInterpolations.push({
                            placeholder: interpolationPlaceholder,
                            expression: expression.trim()
                        });
                        return interpolationPlaceholder;
                    }
                );

                // Process the interpolations found in the ternary value
                processedValue = processInterpolations(processedValue, ternaryInterpolations, context, errors);
            }

            // Replace placeholder and normalize line spacing
            const lines = processedContent.split('\n');
            const updatedLines = lines.map(line => {
                if (line.includes(placeholder)) {
                    // Replace the placeholder and remove any excess leading whitespace
                    return line.replace(placeholder, processedValue).replace(/^\s{8}/, '');
                }
                return line;
            });
            processedContent = updatedLines.join('\n');
        } catch (error) {
            errors.push(`Ternary expression error in "${ternary.condition}": ${error}`);
            processedContent = processedContent.replace(placeholder, '');
        }
    }

    return processedContent;
}

export function evaluateExpression(expression: string, context: any): any {
    try {
        // Create function with safe context
        const func = new Function(...Object.keys(context), `return (${expression})`);
        return func(...Object.values(context));
    } catch (error) {
        throw new Error(`Expression evaluation failed: ${error}`);
    }
}

export function processEscapeSequences(content: string): string {
    // Convert literal escape sequences to actual characters
    return content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
}

export function normalizeIndentation(content: string): string {
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

export function valueToString(value: any): string {
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

export async function processJSXElements(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[],
    originalProps: any = {}
): Promise<string> {
    // Find JSX elements like <Component prop={value} />
    const jsxElementRegex = /<(\w+)([^/>]*)\/>/g;
    let processedContent = content;

    const jsxElements: Array<{ match: string; componentName: string; props: string }> = [];
    let match;

    // First pass: collect all JSX elements
    while ((match = jsxElementRegex.exec(content)) !== null) {
        jsxElements.push({
            match: match[0],
            componentName: match[1],
            props: match[2]
        });
    }

    // Second pass: process each JSX element
    for (const jsxElement of jsxElements) {
        try {
            const rendered = await renderJSXElement(jsxElement, jsxExpressions, context, originalProps);
            processedContent = processedContent.replace(jsxElement.match, rendered);
        } catch (error) {
            errors.push(`JSX element error in "${jsxElement.match}": ${error}`);
            processedContent = processedContent.replace(jsxElement.match, `<${jsxElement.componentName}:ERROR>`);
        }
    }
    return processedContent;
}

export async function processJSXExpressions(
    content: string,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    errors: string[]
): Promise<string> {
    let processedContent = content;

    for (const jsxExpr of jsxExpressions) {
        try {
            // Evaluate the JSX expression
            const result = await evaluateJSXExpression(jsxExpr.expression, context);
            const stringValue = jsxResultToString(result);

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

export async function evaluateJSXExpression(expression: string, context: any): Promise<any> {
    try {
        // Check if this is a ternary expression first
        if (expression.includes('?')) {
            return await evaluateTernaryExpression(expression, context);
        }

        // Check if this is a .map() expression for arrays
        if (expression.includes('.map(')) {
            return await evaluateMapExpression(expression, context);
        }

        // For other JSX expressions, evaluate normally
        const func = new Function(...Object.keys(context), `return (${expression})`);
        return func(...Object.values(context));
    } catch (error) {
        throw new Error(`JSX expression evaluation failed: ${error}`);
    }
}

export async function evaluateTernaryExpression(expression: string, context: any): Promise<any> {
    // Parse ternary expressions like: items.length === 0 ? "Empty" : items.map(...)
    // We need to find the outermost ternary operator, not nested ones
    let parenCount = 0;
    let questionIndex = -1;
    let colonIndex = -1;

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '?' && parenCount === 0) {
            questionIndex = i;
            break;
        }
    }

    if (questionIndex === -1) {
        throw new Error(`No ternary operator found in expression: ${expression}`);
    }

    // Find the matching colon
    for (let i = questionIndex + 1; i < expression.length; i++) {
        const char = expression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === ':' && parenCount === 0) {
            colonIndex = i;
            break;
        }
    }

    if (colonIndex === -1) {
        throw new Error(`No matching colon found in ternary expression: ${expression}`);
    }

    const condition = expression.substring(0, questionIndex).trim();
    const trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
    const falseValue = expression.substring(colonIndex + 1).trim();

    // Evaluate the condition
    const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
    const conditionResult = conditionFunc(...Object.values(context));

    // Choose the appropriate value based on the condition
    const selectedExpression = conditionResult ? trueValue : falseValue;

    // If the selected expression contains JSX or map, evaluate it appropriately
    if (selectedExpression.includes('.map(')) {
        return await evaluateMapExpression(selectedExpression, context);
    } else if (selectedExpression.includes('<') && selectedExpression.includes('>')) {
        return await evaluateTernaryJSXExpression(selectedExpression, context);
    } else {
        // Simple value (like "Empty") - remove quotes if present
        return selectedExpression.replace(/^["']|["']$/g, '');
    }
}

export async function evaluateMapExpression(expression: string, context: any): Promise<string> {
    // Parse expressions like: items.map((item, index) => <ListItem item={item} />)
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
            // Check if this is a ternary expression with JSX components
            if (elementExpr.includes('?')) {
                // Handle ternary expressions like: ordered ? <OlItem item={item} index={index} /> : <UlItem item={item} />
                // First, resolve any placeholders in the expression with actual values
                let resolvedExpr = elementExpr;
                resolvedExpr = resolvedExpr.replace(/__JSX_EXPRESSION_0__/g, 'item');
                resolvedExpr = resolvedExpr.replace(/__JSX_EXPRESSION_1__/g, 'index');
                resolvedExpr = resolvedExpr.replace(/__JSX_EXPRESSION_2__/g, 'item');

                return await evaluateTernaryJSXExpression(resolvedExpr, iterationContext);
            } else {
                // Handle direct JSX components
                return await renderJSXComponent(elementExpr, iterationContext);
            }
        }

        // For regular expressions, evaluate them
        const elemFunc = new Function(...Object.keys(iterationContext), `return (${elementExpr})`);
        return elemFunc(...Object.values(iterationContext));
    }));

    return results.join('\n');
}

export async function evaluateTernaryJSXExpression(expression: string, context: any): Promise<string> {
    // Parse ternary expressions like: ordered ? <OlItem item={item} index={index} /> : <UlItem item={item} />
    const ternaryMatch = expression.match(/^(.+)\s*\?\s*(.+)\s*:\s*(.+)$/);

    if (!ternaryMatch) {
        throw new Error(`Invalid ternary expression: ${expression}`);
    }

    const [, condition, trueValue, falseValue] = ternaryMatch;

    // Evaluate the condition
    const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
    const conditionResult = conditionFunc(...Object.values(context));

    // Choose the appropriate JSX component based on the condition
    const selectedExpression = conditionResult ? trueValue.trim() : falseValue.trim();

    // Render the selected JSX component with proper context
    return await renderJSXComponent(selectedExpression, context);
}

export async function renderJSXElement(
    jsxElement: { match: string; componentName: string; props: string },
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
    context: any,
    originalProps: any = {}
): Promise<string> {
    const { componentName, props } = jsxElement;

    // Parse props - handle both direct expressions and placeholders
    // Match both {value} and placeholder patterns
    const propMatches = props.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/g) || [];
    const propValues: any = {};

    for (const propMatch of propMatches) {
        // Handle both {value} and placeholder patterns
        const matchResult = propMatch.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/) || [];
        const propName = matchResult[1];
        const propExpr = matchResult[2] || matchResult[3]; // Either from {value} or placeholder

        if (propName && propExpr) {
            try {
                // Check if this is a placeholder (like __JSX_EXPRESSION_0__)
                const placeholderMatch = jsxExpressions.find(expr => expr.placeholder === propExpr);
                if (placeholderMatch) {
                    // Evaluate the original expression
                    const result = await evaluateJSXExpression(placeholderMatch.expression, context);
                    propValues[propName] = result;
                } else {
                    // Direct expression evaluation
                    const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                    propValues[propName] = propFunc(...Object.values(context));
                }
            } catch (error) {
                // Skip invalid prop expressions
            }
        }
    }

    // Handle boolean props without ={} syntax (default to true)
    const booleanProps = props.match(/\b(\w+)(?=\s|$)/g) || [];
    for (const booleanProp of booleanProps) {
        // Skip if this prop is already handled by the ={} syntax
        const isAlreadyHandled = propMatches.some((propMatch: string) =>
            propMatch.includes(`${booleanProp}=`)
        );
        if (!isAlreadyHandled) {
            propValues[booleanProp] = true;
        }
    }

    // Check if we have the component in our registry
    if (componentRegistry[componentName]) {
        try {
            // Merge JSX props with original props (original props take precedence)
            const mergedProps = { ...propValues, ...originalProps };


            // Merge with default values from component metadata
            const finalProps = mergePropsWithDefaults(mergedProps, componentRegistry[componentName]);
            const componentResult = await renderComponent(componentRegistry[componentName], context, finalProps);
            return componentResult.content;
        } catch (error) {
            throw new Error(`Component execution failed: ${error}`);
        }
    }

    // Fallback rendering for common components
    if (componentName === 'ListItem' && propValues.item) {
        return `- ${propValues.item}`;
    }

    // Fallback representation
    return `<${componentName} ${Object.entries(propValues).map(([k, v]) => `${k}="${v}"`).join(' ')} />`;
}

export async function renderJSXComponent(jsxElement: string, context: any): Promise<string> {
    // Parse JSX like: <ListItem item={item} /> or <OlItem item=__JSX_EXPRESSION_0__ index=__JSX_EXPRESSION_1__ />
    const componentMatch = jsxElement.match(/<(\w+)([^/>]*)\/>/);

    if (!componentMatch) {
        return jsxElement; // Return as-is if we can't parse it
    }

    const [, componentName, props] = componentMatch;

    // Parse props - handle both {expression} and placeholder patterns
    const propMatches = props.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/g) || [];
    const propValues: any = {};

    for (const propMatch of propMatches) {
        // Handle both {value} and placeholder patterns
        const matchResult = propMatch.match(/(\w+)=(?:\{([^}]+)\}|([^}\s]+))/) || [];
        const propName = matchResult[1];
        const propExpr = matchResult[2] || matchResult[3]; // Either from {value} or placeholder

        if (propName && propExpr) {
            try {
                // Check if this is a placeholder (like __JSX_EXPRESSION_0__)
                if (propExpr.startsWith('__JSX_EXPRESSION_') && propExpr.endsWith('__')) {
                    // This is a placeholder, evaluate it directly from context
                    const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                    propValues[propName] = propFunc(...Object.values(context));
                } else {
                    // Direct expression evaluation
                    const propFunc = new Function(...Object.keys(context), `return (${propExpr})`);
                    propValues[propName] = propFunc(...Object.values(context));
                }
            } catch (error) {
                // Skip invalid prop expressions
            }
        }
    }

    // Check if we have the component in our registry
    if (componentRegistry[componentName]) {
        try {
            // Merge JSX props with default values from component metadata
            const mergedProps = mergePropsWithDefaults(propValues, componentRegistry[componentName]);
            const componentResult = await renderComponent(componentRegistry[componentName], {}, mergedProps);
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

export function jsxResultToString(result: any): string {
    if (result === null || result === undefined) {
        return '';
    }
    if (Array.isArray(result)) {
        return result.map(item => valueToString(item)).join('\n');
    }
    return valueToString(result);
}

export async function renderComponent(compiled: CompiledMDX, context: RenderContext = {}, props: any = {}): Promise<RenderResult> {
    const errors: string[] = [];
    let processedContent = compiled.template;

    try {
        // Merge props into context for function parameters
        const propsContext = createPropsContext(compiled.functionParams || [], props, compiled.metadata?.parameterTypes);
        const mergedContext = { ...context, ...propsContext };

        // Execute TypeScript to get runtime values (now supports async)
        const runtimeContext = await executeTypeScript(compiled.typescript, mergedContext);
        const fullContext = { ...mergedContext, ...runtimeContext };

        // Handle multiple return statements if they exist
        if (compiled.returnStatements && compiled.returnStatements.length > 0) {
            processedContent = await processMultipleReturnStatements(
                compiled.returnStatements,
                fullContext,
                errors
            );
        } else {
            // Fall back to single template processing for backward compatibility
            // Process conditional blocks first (they may contain interpolations)
            processedContent = processConditionalBlocks(
                processedContent,
                compiled.conditionalBlocks,
                compiled.interpolations,
                fullContext,
                errors
            );

            // Process any remaining interpolations
            processedContent = processInterpolations(
                processedContent,
                compiled.interpolations,
                fullContext,
                errors
            );

            // Process ternary expressions
            processedContent = processTernaryExpressions(
                processedContent,
                compiled.ternaryExpressions || [],
                fullContext,
                errors
            );

            // Process JSX elements first (like <Component prop={value} />) before expressions
            processedContent = await processJSXElements(
                processedContent,
                compiled.jsxExpressions || [],
                fullContext,
                errors,
                props
            );

            // Process remaining JSX expressions (like array.map())
            processedContent = await processJSXExpressions(
                processedContent,
                compiled.jsxExpressions || [],
                fullContext,
                errors
            );
        }

    } catch (error) {
        errors.push(`Rendering error: ${error}`);
    }

    // Clean up extra whitespace and normalize spacing
    processedContent = processedContent
        .split('\n')
        .map(line => line.trimEnd()) // Remove trailing spaces
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
        .trim(); // Remove leading/trailing whitespace

    return {
        content: processedContent,
        errors
    };
}