import React from 'react';
import { CompiledMDX } from './compiler';

export interface MDXComponentProps {
  [key: string]: any;
}

export interface ComponentRegistry {
  [componentName: string]: React.ComponentType<any>;
}

export class ReactMDXIntegrator {
  private componentRegistry: ComponentRegistry = {};

  registerComponent(name: string, component: React.ComponentType<any>) {
    this.componentRegistry[name] = component;
  }

  registerComponents(components: ComponentRegistry) {
    Object.assign(this.componentRegistry, components);
  }

  createMDXComponent(compiled: CompiledMDX): React.ComponentType<MDXComponentProps> {
    const MDXComponent: React.ComponentType<MDXComponentProps> = (props) => {
      // Execute the TypeScript code to get runtime values
      const runtimeContext = this.executeTypeScript(compiled.typescript, props);

      // Process template with interpolations and conditionals
      const processedContent = this.processTemplate(
        compiled.template,
        compiled.interpolations,
        compiled.conditionalBlocks,
        runtimeContext
      );

      // Render markdown with React components
      return this.renderMarkdown(processedContent);
    };

    // Set display name for debugging
    MDXComponent.displayName = compiled.metadata.functionName || 'MDXComponent';

    return MDXComponent;
  }

  private executeTypeScript(typescript: string, props: MDXComponentProps): any {
    try {
      // Create a safe execution context
      const context = {
        ...props,
        React,
        ...this.componentRegistry
      };

      // Execute TypeScript code in context
      const func = new Function(...Object.keys(context), `
        ${typescript}
        return {
          ${this.extractVariableNames(typescript).map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(',\n  ')}
        };
      `);

      return func(...Object.values(context));
    } catch (error) {
      console.warn('Error executing TypeScript in MDX component:', error);
      return {};
    }
  }

  private extractVariableNames(typescript: string): string[] {
    // Extract variable names from const/let declarations
    const variableRegex = /(?:const|let|var)\s+(\w+)/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(typescript)) !== null) {
      variables.push(match[1]);
    }

    // Extract destructured variables
    const destructureRegex = /(?:const|let|var)\s*\{\s*([^}]+)\s*\}/g;
    while ((match = destructureRegex.exec(typescript)) !== null) {
      const destructuredVars = match[1]
        .split(',')
        .map(v => v.trim().split(':')[0].trim())
        .filter(Boolean);
      variables.push(...destructuredVars);
    }

    return variables;
  }

  private processTemplate(
    template: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    context: any
  ): string {
    let processedTemplate = template;

    // Process interpolations
    for (const interpolation of interpolations) {
      try {
        const value = this.evaluateExpression(interpolation.expression, context);
        processedTemplate = processedTemplate.replace(
          interpolation.placeholder,
          String(value ?? '')
        );
      } catch (error) {
        console.warn(`Error evaluating interpolation: ${interpolation.expression}`, error);
        processedTemplate = processedTemplate.replace(interpolation.placeholder, '');
      }
    }

    // Process conditional blocks
    for (let i = 0; i < conditionalBlocks.length; i++) {
      const block = conditionalBlocks[i];
      const placeholder = `__CONDITIONAL_${i}__`;

      try {
        const shouldRender = this.evaluateExpression(block.condition, context);
        const content = shouldRender ? block.content : '';
        processedTemplate = processedTemplate.replace(placeholder, content);
      } catch (error) {
        console.warn(`Error evaluating condition: ${block.condition}`, error);
        processedTemplate = processedTemplate.replace(placeholder, '');
      }
    }

    return processedTemplate;
  }

  private evaluateExpression(expression: string, context: any): any {
    try {
      const func = new Function(...Object.keys(context), `return ${expression}`);
      return func(...Object.values(context));
    } catch (error) {
      console.warn(`Error evaluating expression: ${expression}`, error);
      return undefined;
    }
  }

  private renderMarkdown(content: string): React.ReactElement {
    // Simple markdown to React conversion
    // In a full implementation, you'd use a markdown parser like marked or remark
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('# ')) {
        elements.push(React.createElement('h1', { key: i }, line.substring(2)));
      } else if (line.startsWith('## ')) {
        elements.push(React.createElement('h2', { key: i }, line.substring(3)));
      } else if (line.startsWith('### ')) {
        elements.push(React.createElement('h3', { key: i }, line.substring(4)));
      } else if (line.trim()) {
        elements.push(React.createElement('p', { key: i }, line));
      }
    }

    return React.createElement('div', {}, ...elements);
  }
}