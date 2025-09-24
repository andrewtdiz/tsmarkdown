/**
 * Direct Renderer
 *
 * This module provides direct rendering capabilities that bypass TypeScript compilation.
 * Instead of compiling to TypeScript and then executing, it directly renders the return
 * of a provided function with props using the existing parser and renderer components.
 */

import { parseTSmd, ParsedTSmd } from '../parser';
import { compile, CompiledTSmd } from '../compiler';
import { render } from '../renderer';
import { createSafeContext } from './typescript-runtime';
import { __tsm } from '../runtime/tsm-runtime';
import { processInterpolations } from './render-utils';

export interface DirectRenderOptions {
    /** Base path for resolving imports/dependencies */
    basePath?: string;
    /** Custom context to merge with props */
    context?: Record<string, any>;
    /** Whether to skip TypeScript execution entirely */
    skipTypeScriptExecution?: boolean;
}

export interface DirectRenderResult {
    /** The rendered output content */
    content: string;
    /** Any errors that occurred during rendering */
    errors: string[];
    /** Metadata about the rendering process */
    metadata: {
        functionName: string;
        propsUsed: string[];
        executionTime: number;
    };
}

/**
 * Converts a function string and props directly to a ParsedTSmd structure
 */
export function functionToParsedTSmd(functionString: string, props: Record<string, any> = {}): ParsedTSmd {
    // Parse the function content using the existing parser
    return parseTSmd(functionString);
}

/**
 * Direct renderer that bypasses TypeScript compilation
 */
export class DirectRenderer {
    private options: DirectRenderOptions;

    constructor(options: DirectRenderOptions = {}) {
        this.options = {
            skipTypeScriptExecution: true,
            ...options
        };
    }

    /**
     * Renders a function directly with props, bypassing TypeScript compilation
     */
    async render(functionString: string, props: Record<string, any> = {}): Promise<DirectRenderResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
            // Step 1: Parse the function using existing parser
            const parsed = parseTSmd(functionString);
            console.log('DEBUG: parsed.typescript:', JSON.stringify(parsed.typescript));
            console.log('DEBUG: parsed.markdown:', JSON.stringify(parsed.markdown));

            // Step 2: Compile to CompiledTSmd (this still generates TypeScript but we won't execute it)
            const compiled = compile(parsed);
            console.log('DEBUG: compiled.template:', JSON.stringify(compiled.template));
            console.log('DEBUG: compiled.interpolations:', compiled.interpolations);

            // Step 3: Extract and execute variable declarations to get runtime values
            const runtimeValues = await this.executeVariableDeclarations(parsed.typescript, {
                ...this.options.context,
                ...props
            });

            // Step 4: Create execution context with props and runtime values
            const context = createSafeContext({
                ...this.options.context,
                ...props,
                ...runtimeValues
            }, compiled.typescript);

            // Add runtime functions
            context.__tsm = __tsm;
            context.Math = Math;

            // Step 5: Process the template directly with the resolved variables
            const renderResult = await this.renderTemplate(compiled, { ...context, ...runtimeValues }, props);

            return {
                content: renderResult.content,
                errors: [...errors, ...renderResult.errors],
                metadata: {
                    functionName: parsed.functionName,
                    propsUsed: Object.keys(props),
                    executionTime: Date.now() - startTime
                }
            };

        } catch (error) {
            errors.push(`Direct rendering failed: ${error}`);
            return {
                content: '',
                errors,
                metadata: {
                    functionName: 'unknown',
                    propsUsed: [],
                    executionTime: Date.now() - startTime
                }
            };
        }
    }

    /**
     * Renders multiple functions directly with shared props
     */
    async renderMultiple(functions: Array<{ name: string; content: string }>, props: Record<string, any> = {}): Promise<Record<string, DirectRenderResult>> {
        const results: Record<string, DirectRenderResult> = {};

        for (const func of functions) {
            const renderer = new DirectRenderer(this.options);
            results[func.name] = await renderer.render(func.content, props);
        }

        return results;
    }

    /**
     * Execute variable declarations to get runtime values
     */
    private async executeVariableDeclarations(typescript: string, context: Record<string, any>): Promise<Record<string, any>> {
        if (!typescript.trim()) {
            return {};
        }

        try {
            console.log('DEBUG: executeVariableDeclarations - typescript:', typescript);

            // Extract variable declarations from the TypeScript code
            const variableDeclarations = this.extractVariableDeclarations(typescript);

            console.log('DEBUG: variableDeclarations:', variableDeclarations);

            if (!variableDeclarations.trim()) {
                return {};
            }

            const variableNames = this.getVariableNames(variableDeclarations);
            console.log('DEBUG: variableNames:', variableNames);

            // Create a code block that declares the variables and returns them
            const code = `
        ${variableDeclarations}
        return { ${variableNames.join(', ')} };
      `;

            console.log('DEBUG: executing code:', code);

            // Import the executeTypeScript function
            const { executeTypeScript } = await import('./typescript-runtime');
            const result = await executeTypeScript(code, context);

            console.log('DEBUG: execution result:', result);

            return result || {};
        } catch (error) {
            console.error('DEBUG: Variable declaration execution failed:', error);
            throw new Error(`Variable declaration execution failed: ${error}`);
        }
    }

    /**
     * Extract variable declarations from TypeScript code
     */
    private extractVariableDeclarations(typescript: string): string {
        const lines = typescript.split('\n');
        const declarations: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            // Extract const, let, var declarations
            if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
                declarations.push(line);
            }
        }

        return declarations.join('\n');
    }

    /**
     * Get variable names from variable declarations
     */
    private getVariableNames(declarations: string): string[] {
        const names: string[] = [];

        // Simple regex to extract variable names from declarations
        // Matches patterns like: const variableName = value;
        const regex = /(?:const|let|var)\s+(\w+)/g;
        let match;

        while ((match = regex.exec(declarations)) !== null) {
            names.push(match[1]);
        }

        return names;
    }

    /**
     * Render template directly with context (without TypeScript execution)
     */
    private async renderTemplate(compiled: CompiledTSmd, context: Record<string, any>, props: Record<string, any>): Promise<{ content: string; errors: string[] }> {
        try {
            console.log('DEBUG: renderTemplate - template:', compiled.template);
            console.log('DEBUG: renderTemplate - context:', context);

            // Start with the compiled template
            let content = compiled.template;

            // Process interpolations using the context
            const errors: string[] = [];
            content = processInterpolations(content, compiled.interpolations, context, errors);

            console.log('DEBUG: renderTemplate - after interpolations:', content);

            // For now, return the content as-is
            // TODO: Handle conditional blocks and other template processing

            return { content, errors };
        } catch (error) {
            return {
                content: '',
                errors: [`Template rendering failed: ${error}`]
            };
        }
    }

    /**
     * Evaluate a simple expression in the context
     */
    private evaluateExpression(expression: string, context: Record<string, any>): any {
        try {
            // Simple variable lookup
            if (context.hasOwnProperty(expression)) {
                return context[expression];
            }

            // Handle basic expressions like "user.name"
            if (expression.includes('.')) {
                const parts = expression.split('.');
                let value = context;
                for (const part of parts) {
                    if (value && typeof value === 'object' && part in value) {
                        value = value[part];
                    } else {
                        return undefined;
                    }
                }
                return value;
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }
}

/**
 * Convenience function for direct rendering
 */
export async function renderDirect(functionString: string, props: Record<string, any> = {}, options: DirectRenderOptions = {}): Promise<DirectRenderResult> {
    const renderer = new DirectRenderer(options);
    return renderer.render(functionString, props);
}

/**
 * Convenience function for direct rendering without TypeScript execution
 * This creates a minimal execution context that skips TypeScript entirely
 */
export async function renderDirectSimple(functionString: string, props: Record<string, any> = {}): Promise<string> {
    try {
        const parsed = parseTSmd(functionString);

        // Create a minimal context with just the props
        const context = {
            ...props,
            __tsm,
            Math
        };

        // Compile and render
        const compiled = compile(parsed);
        const renderResult = await render(compiled, context, props);

        return renderResult.content;
    } catch (error) {
        throw new Error(`Direct rendering failed: ${error}`);
    }
}
