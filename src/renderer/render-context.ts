import { resolve } from 'path';
import { CompiledTSmd, compile } from '../compiler';
import { parseTSmd } from '../parser';

export interface RenderContext {
    [key: string]: any;
}

export interface ComponentRegistry {
    [componentName: string]: CompiledTSmd;
}

export interface RenderResult {
    content: string;
    errors: string[];
}

export const componentRegistry: ComponentRegistry = {};

export async function loadDependencies(dependencies: string[], basePath: string, errors: string[]): Promise<void> {
    for (const componentName of dependencies) {
        if (!componentRegistry[componentName]) {
            try {
                // Try to find the component file
                const componentPath = await resolveComponentPath(componentName, basePath);
                if (componentPath) {
                    const componentContent = await Bun.file(componentPath).text();
                    const parsed = parseTSmd(componentContent);
                    const compiled = compile(parsed);
                    componentRegistry[componentName] = compiled;

                    // Recursively load dependencies of this component
                    if (compiled.dependencies && compiled.dependencies.length > 0) {
                        await loadDependencies(compiled.dependencies, basePath, errors);
                    }
                }
            } catch (error) {
                errors.push(`Failed to load component ${componentName}: ${error}`);
            }
        }
    }
}

export async function resolveComponentPath(componentName: string, basePath: string): Promise<string | null> {
    // Try different possible paths for the component
    const possiblePaths = [
        resolve(basePath, `${componentName}.tsmd`),
        resolve(basePath, `${componentName}.tsx`),
        resolve(basePath, `${componentName}.ts`),
        resolve(basePath, componentName, 'index.tsmd'),
        resolve(basePath, componentName, 'index.tsx'),
        resolve(basePath, componentName, 'index.ts'),
    ];

    for (const path of possiblePaths) {
        try {
            await Bun.file(path).exists(); // Test if file exists
            return path;
        } catch (error) {
            // Continue to next path
        }
    }

    return null;
}

export function createPropsContext(functionParams: string[], props: any, parameterTypes?: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>): RenderContext {
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
                    // Use the actual default value if it exists, otherwise provide a default based on type
                    if (paramType.defaultValue !== undefined) {
                        // Parse the default value from the string representation
                        if (paramType.defaultValue === 'true') {
                            context[param] = true;
                        } else if (paramType.defaultValue === 'false') {
                            context[param] = false;
                        } else if (paramType.defaultValue.startsWith('"') && paramType.defaultValue.endsWith('"')) {
                            context[param] = paramType.defaultValue.slice(1, -1); // Remove quotes
                        } else if (!isNaN(Number(paramType.defaultValue))) {
                            context[param] = Number(paramType.defaultValue);
                        } else {
                            context[param] = paramType.defaultValue;
                        }
                    } else {
                        // For optional parameters without explicit default, provide a default value based on type
                        if (paramType.type === 'boolean') {
                            context[param] = false;
                        } else if (paramType.type.includes('[]')) {
                            context[param] = [];
                        } else {
                            context[param] = undefined;
                        }
                    }
                } else if (paramType && paramType.required) {
                    // For required parameters that are missing, provide a default value based on type
                    // This prevents JavaScript evaluation errors when the parameter is accessed
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

export function mergePropsWithDefaults(jsxProps: any, compiledComponent: CompiledTSmd): any {
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
