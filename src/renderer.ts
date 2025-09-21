import { CompiledMDX } from './compiler';
import {
  RenderContext,
  loadDependencies,
  renderComponent,
  RenderResult
} from './renderer/render-utils';

// Export direct rendering functionality
export {
  DirectRenderer,
  renderDirect,
  renderDirectSimple,
  type DirectRenderOptions,
  type DirectRenderResult
} from './renderer/direct-renderer';

export type RenderedResult = RenderResult;

// Backward compatibility alias
export const renderMDX = render;

export async function render(compiled: CompiledMDX, context: RenderContext = {}, props: any = {}, basePath?: string): Promise<RenderedResult> {
  const errors: string[] = [];

  try {
    if (basePath) {
      await loadDependencies(compiled.dependencies, basePath, errors);
    }

    // Add basePath to context for component resolution
    const contextWithBasePath = { ...context, basePath };

    const result = await renderComponent(compiled, contextWithBasePath, props);

    return {
      content: result.content,
      errors: [...errors, ...result.errors]
    };

  } catch (error) {
    errors.push(`Rendering error: ${error}`);
    return {
      content: '',
      errors
    };
  }
}
