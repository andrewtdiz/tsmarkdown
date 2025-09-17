import { CompiledMDX } from './compiler';
import {
  RenderContext,
  loadDependencies,
  renderComponent,
  RenderResult
} from './renderer/render-utils';

export type RenderedResult = RenderResult;

export async function render(compiled: CompiledMDX, context: RenderContext = {}, props: any = {}, basePath?: string): Promise<RenderedResult> {
  const errors: string[] = [];

  try {
    if (basePath) {
      loadDependencies(compiled.dependencies, basePath, errors);
    }

    const result = await renderComponent(compiled, context, props);

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
