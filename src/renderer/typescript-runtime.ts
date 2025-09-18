import { RenderContext } from './render-context';

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
