import { CompiledMDX } from './compiler';
import { TemplateExecutionEngine } from './template-engine';

export interface ClientRendererOptions {
  componentRegistry?: Record<string, React.ComponentType<any>>;
  globalContext?: Record<string, any>;
}

export interface RenderedResult {
  content: string;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
  };
  errors: string[];
}

export class ClientRenderer {
  private engine: TemplateExecutionEngine;
  private componentRegistry: Record<string, React.ComponentType<any>>;
  private globalContext: Record<string, any>;

  constructor(options: ClientRendererOptions = {}) {
    this.engine = new TemplateExecutionEngine();
    this.componentRegistry = options.componentRegistry || {};
    this.globalContext = options.globalContext || {};
  }

  /**
   * Render compiled MDX content on the client side
   */
  async render(compiledContent: CompiledMDX, context: Record<string, any> = {}): Promise<RenderedResult> {
    try {
      // Merge global context with provided context
      const fullContext = {
        ...this.globalContext,
        ...context,
        // Add component registry to context for React integration
        components: this.componentRegistry
      };

      // Execute the template with the merged context
      const executionResult = await this.engine.execute(compiledContent, fullContext);

      return {
        content: executionResult.content,
        metadata: this.extractMetadata(executionResult.content),
        errors: executionResult.errors
      };
    } catch (error) {
      return {
        content: '',
        metadata: {},
        errors: [`Client rendering failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Register React components for use in MDX
   */
  registerComponent(name: string, component: React.ComponentType<any>): void {
    this.componentRegistry[name] = component;
  }

  /**
   * Register multiple components at once
   */
  registerComponents(components: Record<string, React.ComponentType<any>>): void {
    this.componentRegistry = { ...this.componentRegistry, ...components };
  }

  /**
   * Set global context variables available to all renders
   */
  setGlobalContext(context: Record<string, any>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }


  /**
   * Extract metadata from rendered content
   */
  extractMetadata(content: string): { title?: string; description?: string; tags?: string[] } {
    const metadata: { title?: string; description?: string; tags?: string[] } = {};

    // Extract title from first H1
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    // Extract description from first paragraph after title
    const lines = content.split('\n').filter(line => line.trim());
    const titleIndex = lines.findIndex(line => line.startsWith('# '));
    if (titleIndex >= 0 && titleIndex + 1 < lines.length) {
      const nextLine = lines[titleIndex + 1];
      if (!nextLine.startsWith('#') && nextLine.length > 0) {
        metadata.description = nextLine.substring(0, 150).trim();
      }
    }

    // Extract tags from content (look for #tag patterns)
    const tagMatches = content.match(/#([a-zA-Z]\w*)/g);
    if (tagMatches) {
      metadata.tags = [...new Set(tagMatches.map(tag => tag.substring(1)))];
    }

    return metadata;
  }
}

// Factory function for easy instantiation
export function createClientRenderer(options?: ClientRendererOptions): ClientRenderer {
  return new ClientRenderer(options);
}

// Browser-friendly export
declare global {
  interface Window {
    BetterMDX?: {
      ClientRenderer: typeof ClientRenderer;
      createClientRenderer: typeof createClientRenderer;
    };
  }
}

// Auto-register on window if in browser environment
if (typeof window !== 'undefined') {
  window.BetterMDX = {
    ClientRenderer,
    createClientRenderer
  };
}