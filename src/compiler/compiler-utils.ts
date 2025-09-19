import { ParsedMDX } from "../parser";

export interface DependencyInfo {
    modulePath: string;
    defaultImport?: string;
    namedImports: string[];
    namespaceImport?: string;
    isTypeOnly: boolean;
    isSideEffect: boolean;
    originalImport: string;
}

export function extractDependencies(imports: string[]): string[] {
    const dependencies: string[] = [];

    for (const importLine of imports) {
        // Check if this is a TypeScript module import (ends with .ts, .tsx, .js, .jsx)
        const modulePathMatch = importLine.match(/from\s*['"]([^'"]+)['"]/);
        if (modulePathMatch) {
            const modulePath = modulePathMatch[1];

            // Skip TypeScript/JavaScript module imports - these are handled by the TypeScript runtime
            if (modulePath.endsWith('.ts') || modulePath.endsWith('.tsx') ||
                modulePath.endsWith('.js') || modulePath.endsWith('.jsx') ||
                modulePath.endsWith('.json') || modulePath.endsWith('.yaml') ||
                modulePath.endsWith('.yml') || modulePath.endsWith('.css') ||
                modulePath.endsWith('.md') || modulePath.endsWith('.txt')) {
                continue; // Skip TypeScript/asset imports
            }

            // Prohibit MDX imports
            if (modulePath.endsWith('.mdx')) {
                throw new Error('Cannot import MDX files directly. Use TypeScript entry points instead.');
            }

            // For imports without extensions, we need to check if they're MDX components
            // Check if the path doesn't end with a file extension
            const hasFileExtension = /\.\w+$/.test(modulePath);
            if (!hasFileExtension) {
                // This could be an MDX component import, so we'll extract the dependencies
                // The component loading system will handle resolving the actual file
                // Extract default and named imports as dependencies
                const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
                if (defaultMatch) {
                    dependencies.push(defaultMatch[1]);
                }

                // Extract named imports
                const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
                if (namedMatch) {
                    const namedImports = namedMatch[1]
                        .split(',')
                        .map(name => name.trim().split(' as ')[0]) // Handle aliases
                        .filter(Boolean);
                    dependencies.push(...namedImports);
                }
                continue;
            }
        }

        // Only extract dependencies for non-TypeScript imports (legacy component system)
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

export function compileTypeScript(parsed: ParsedMDX): string {
    // Combine imports, props interface, and typescript code (without generating stub functions)
    const imports = parsed.imports.join('\n');
    const propsInterface = parsed.propsInterface || '';
    const typescript = parsed.typescript;

    const parts = [imports, propsInterface, typescript].filter(Boolean);
    return parts.join('\n\n').trim();
}

export function generateTypedFunction(parsed: ParsedMDX): string {
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

export function compileTemplate(markdown: string): string {
    // For now, return markdown as-is
    // Later we'll add more sophisticated template compilation
    return markdown;
}

export function parseImportStatement(importLine: string): DependencyInfo {
    const result: DependencyInfo = {
        modulePath: '',
        namedImports: [],
        isTypeOnly: false,
        isSideEffect: false,
        originalImport: importLine
    };

    // Check for type-only imports
    if (importLine.includes('import type')) {
        result.isTypeOnly = true;
    }

    // Extract module path
    const modulePathMatch = importLine.match(/from\s*['"]([^'"]+)['"]/);
    if (modulePathMatch) {
        result.modulePath = modulePathMatch[1];
    } else {
        // Side-effect import (no from clause)
        result.isSideEffect = true;
        const sideEffectMatch = importLine.match(/import\s*['"]([^'"]+)['"]/);
        if (sideEffectMatch) {
            result.modulePath = sideEffectMatch[1];
        }
        return result;
    }

    // Extract default import
    const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
    if (defaultMatch) {
        result.defaultImport = defaultMatch[1];
    }

    // Extract named imports (including aliases)
    const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
    if (namedMatch) {
        const namedImports = namedMatch[1]
            .split(',')
            .map(name => name.trim())
            .filter(Boolean);
        result.namedImports = namedImports;
    }

    // Extract namespace import
    const namespaceMatch = importLine.match(/import\s*\*\s+as\s+(\w+)\s+from/);
    if (namespaceMatch) {
        result.namespaceImport = namespaceMatch[1];
    }

    return result;
}

function isTypeScriptOrAssetImport(modulePath: string): boolean {
    return modulePath.endsWith('.ts') ||
        modulePath.endsWith('.tsx') ||
        modulePath.endsWith('.cts') ||
        modulePath.endsWith('.mts') ||
        modulePath.endsWith('.js') ||
        modulePath.endsWith('.jsx') ||
        modulePath.endsWith('.json') ||
        modulePath.endsWith('.yaml') ||
        modulePath.endsWith('.yml') ||
        modulePath.endsWith('.css') ||
        modulePath.endsWith('.md') ||
        modulePath.endsWith('.txt');
}
