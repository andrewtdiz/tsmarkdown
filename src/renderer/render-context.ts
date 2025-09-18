import { resolve } from 'path';
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

export const componentRegistry: ComponentRegistry = {};

export async function loadDependencies(dependencies: string[], basePath: string, errors: string[]): Promise<void> {
    for (const componentName of dependencies) {
        if (!componentRegistry[componentName]) {
            try {
                // Try to find the component file
                const componentPath = await resolveComponentPath(componentName, basePath);
                if (componentPath) {
                    const componentContent = await Bun.file(componentPath).text();
                    const parsed = parseMDX(componentContent);
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
        resolve(basePath, `${componentName}.mdx`),
        resolve(basePath, `${componentName}.tsx`),
        resolve(basePath, `${componentName}.ts`),
        resolve(basePath, componentName, 'index.mdx'),
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
