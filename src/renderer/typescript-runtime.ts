import { RenderContext } from './render-context';
import { loadAsset } from './asset-loader';
import path, { resolve } from 'path';

export async function executeTypeScript(typescript: string, context: RenderContext): Promise<any> {
    if (!typescript.trim()) {
        return {};
    }

    try {
        // Extract imports and resolve them
        const imports = extractImports(typescript);
        const resolvedImports = await resolveImports(imports, context.basePath, context.aliasMap);

        // Create a safe execution environment with resolved imports
        const safeContext = createSafeContext(context, typescript, resolvedImports);

        // Extract executable code - either standalone code or function body
        const executableCode = extractExecutableCode(typescript);

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

export async function executeCompiledFunction(typescript: string, context: RenderContext): Promise<string> {
    if (!typescript.trim()) {
        return '';
    }

    try {
        // Extract imports and resolve them
        const imports = extractImports(typescript);
        const resolvedImports = await resolveImports(imports, context.basePath, context.aliasMap);

        // Create a safe execution environment with resolved imports
        const safeContext = createSafeContext(context, typescript, resolvedImports);

        // Import the TSM runtime
        const { __tsm } = await import('../runtime/tsm-runtime');

        // Add runtime to the context
        safeContext.__tsm = __tsm;

        // Extract the function name and parameters
        const functionMatch = typescript.match(/export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*string\s*\{\s*([\s\S]*)\s*\}/);
        if (!functionMatch) {
            throw new Error('Could not parse compiled function');
        }

        const [, functionName, params, functionBody] = functionMatch;

        // Extract parameter names - handle destructured parameters like { name }
        const paramNames: string[] = [];
        if (params.trim().startsWith('{') && params.trim().includes('}')) {
            // Destructured parameters like { name }: MiniComponentProps
            // Find the end of the destructuring part (before the type annotation)
            const destructuringEnd = params.indexOf('}');
            const destructuredParams = params.slice(1, destructuringEnd); // Remove { and }
            const paramParts = destructuredParams.split(',');
            for (const part of paramParts) {
                const paramName = part.trim().split(':')[0].trim();
                if (paramName) {
                    paramNames.push(paramName);
                }
            }
        } else {
            // Regular parameters
            paramNames.push(...params.split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean));
        }

        // Debug logging (can be removed in production)
        // console.log('Function params:', params);
        // console.log('Context keys:', Object.keys(context));
        // console.log('Context name value:', context.name);
        // console.log('Extracted param names:', paramNames);

        // Create the function with proper parameter binding
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

        // For destructured parameters, create a function that takes a single parameter
        let func: Function;
        if (params.trim().startsWith('{') && params.trim().includes('}')) {
            // Create a function that takes a single parameter and destructures it
            // Extract just the destructuring part without the type annotation
            const destructuringEnd = params.indexOf('}');
            const destructuringPart = params.slice(0, destructuringEnd + 1); // Include the }
            const destructuredFunctionBody = `const ${destructuringPart} = arguments[0]; const __tsm = arguments[1]; ${functionBody}`;
            func = new AsyncFunction(destructuredFunctionBody);
        } else {
            // For regular parameters, use the extracted parameter names
            // Include runtime as the last parameter
            const bodyWithRuntime = `const __tsm = arguments[${paramNames.length}]; ${functionBody}`;
            func = new AsyncFunction(...paramNames, bodyWithRuntime);
        }

        // Get parameter values from context
        // For destructured parameters, we need to pass an object with just the expected properties
        let paramValues: any[];
        if (params.trim().startsWith('{') && params.trim().includes('}')) {
            // For destructured parameters, create an object with just the expected properties
            const destructuredObject: any = {};
            for (const paramName of paramNames) {
                destructuredObject[paramName] = context[paramName];
            }
            paramValues = [destructuredObject, __tsm];
            // console.log('Destructured object:', destructuredObject);
        } else {
            // For regular parameters, pass individual values plus runtime
            paramValues = [...paramNames.map(name => context[name]), __tsm];
        }

        // Execute the function and return the result
        const result = await func(...paramValues);
        return result || '';
    } catch (error) {
        throw new Error(`Compiled function execution failed: ${error}`);
    }
}

export function extractExecutableCode(typescript: string): string {
    // Check if this is a complete function declaration
    const functionMatch = typescript.match(/export\s+function\s+\w+\s*\([^)]*\)\s*:\s*string\s*\{\s*([\s\S]*)\s*\}/);

    if (functionMatch) {
        // This is a complete function, extract the body
        const functionBody = functionMatch[1].trim();

        // Remove the final return statement (it contains the template literal)
        // We only want the TypeScript code before the return statement
        const lines = functionBody.split('\n');
        const codeLines = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('return __tsm') || trimmed.startsWith('return `') || trimmed.startsWith('return"')) {
                // Stop at the return statement - we don't want to execute the template literal
                break;
            }
            codeLines.push(line);
        }

        return codeLines.join('\n').trim();
    }

    // Fallback to the original behavior for standalone code
    return removeImports(typescript);
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

export async function resolveImports(imports: string[], basePath?: string, aliasMap?: Record<string, string>): Promise<any> {
    const resolvedImports: any = {};

    for (const importLine of imports) {
        try {
            // Parse the import statement - handle both named and default imports
            const namedImportMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
            const defaultImportMatch = importLine.match(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/);

            if (namedImportMatch) {
                const [, namedImports, modulePath] = namedImportMatch;
                const importNames = namedImports.split(',').map(name => name.trim());

                // Resolve the module path
                const resolvedModule = await resolveModule(modulePath, basePath, aliasMap);
                if (resolvedModule) {
                    // Add each named import to the resolved imports
                    for (const importName of importNames) {
                        if (resolvedModule[importName]) {
                            resolvedImports[importName] = resolvedModule[importName];
                        }
                    }
                }
            } else if (defaultImportMatch) {
                const [, importName, modulePath] = defaultImportMatch;

                // Resolve the module path
                const resolvedModule = await resolveModule(modulePath, basePath, aliasMap);
                if (resolvedModule) {
                    // For default imports, use the default export or the entire module
                    resolvedImports[importName] = resolvedModule.default || resolvedModule;
                }
            }
        } catch (error) {
            console.warn(`Failed to resolve import: ${importLine}`, error);
        }
    }

    return resolvedImports;
}

export async function resolveModule(modulePath: string, basePath?: string, aliasMap?: Record<string, string>): Promise<any> {
    try {
        // Handle alias resolution first
        if (aliasMap) {
            for (const [alias, aliasPath] of Object.entries(aliasMap)) {
                if (modulePath.startsWith(alias)) {
                    // Replace the alias with the actual path
                    const remainingPath = modulePath.slice(alias.length);
                    const resolvedPath = aliasPath + remainingPath;
                    // Recursively resolve the aliased path
                    return await resolveModule(resolvedPath, basePath, aliasMap);
                }
            }
        }

        // Handle relative imports
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            // Resolve relative to basePath if provided
            const resolvedBasePath = basePath ? path.resolve(basePath) : process.cwd();

            // Try with explicit extension first
            if (modulePath.endsWith('.ts') || modulePath.endsWith('.js') || modulePath.endsWith('.tsx') || modulePath.endsWith('.jsx')) {
                const fullPath = path.resolve(resolvedBasePath, modulePath);
                try {
                    if (await Bun.file(fullPath).exists()) {
                        // Use require to load the module
                        delete require.cache[require.resolve(fullPath)];
                        return require(fullPath);
                    }
                } catch (error) {
                    // Continue to extension search
                }
            }

            // Try with different extensions in order: .tsx, .ts, .js, .jsx
            const possibleExtensions = ['.tsx', '.ts', '.js', '.jsx'];
            let resolvedPath = null;

            for (const ext of possibleExtensions) {
                const fullPath = path.resolve(resolvedBasePath, modulePath + ext);
                try {
                    if (await Bun.file(fullPath).exists()) {
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
