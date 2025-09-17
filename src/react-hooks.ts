import { useState, useEffect, useCallback, useMemo } from 'react';
import { MDXParser } from './parser';
import { MDXCompiler } from './compiler';
import { ClientRenderer, RenderedResult } from './client-renderer';
import { TemplateExecutionEngine } from './template-engine';

export interface UseMDXComponentOptions {
  source?: string;
  filename?: string;
  context?: Record<string, any>;
  componentRegistry?: Record<string, React.ComponentType<any>>;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface MDXComponentState {
  content: string;
  metadata: RenderedResult['metadata'];
  isLoading: boolean;
  error: string | null;
  errors: string[];
  lastUpdated: Date | null;
}

export interface MDXComponentActions {
  refresh: () => Promise<void>;
  updateSource: (newSource: string) => Promise<void>;
  updateContext: (newContext: Record<string, any>) => Promise<void>;
  registerComponent: (name: string, component: React.ComponentType<any>) => void;
  registerComponents: (components: Record<string, React.ComponentType<any>>) => void;
}

/**
 * React hook for rendering MDX content with live updates
 */
export function useMDXComponent(options: UseMDXComponentOptions = {}): MDXComponentState & MDXComponentActions {
  const [state, setState] = useState<MDXComponentState>({
    content: '',
    metadata: {},
    isLoading: false,
    error: null,
    errors: [],
    lastUpdated: null
  });

  const [source, setSource] = useState(options.source || '');
  const [context, setContext] = useState(options.context || {});
  const [componentRegistry, setComponentRegistry] = useState(options.componentRegistry || {});

  // Create instances
  const parser = useMemo(() => new MDXParser(), []);
  const compiler = useMemo(() => new MDXCompiler(), []);
  const engine = useMemo(() => new TemplateExecutionEngine(), []);
  const renderer = useMemo(() => new ClientRenderer({
    componentRegistry,
    globalContext: context
  }), [componentRegistry, context]);

  /**
   * Process MDX source and update state
   */
  const processMDX = useCallback(async (mdxSource: string, mdxContext: Record<string, any>) => {
    if (!mdxSource.trim()) {
      setState(prev => ({
        ...prev,
        content: '',
        metadata: {},
        error: null,
        errors: [],
        lastUpdated: new Date()
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Parse and compile
      const parsed = parser.parse(mdxSource);
      const compiled = compiler.compile(parsed);

      // Execute template
      const executionResult = await engine.execute(compiled, mdxContext);

      // Get metadata from content
      const metadata = renderer.extractMetadata(executionResult.content);

      setState(prev => ({
        ...prev,
        content: executionResult.content,
        metadata: metadata,
        errors: executionResult.errors,
        error: null,
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
        lastUpdated: new Date()
      }));
    }
  }, [parser, compiler, engine, renderer]);

  /**
   * Refresh the component with current source and context
   */
  const refresh = useCallback(async () => {
    await processMDX(source, context);
  }, [source, context, processMDX]);

  /**
   * Update the MDX source
   */
  const updateSource = useCallback(async (newSource: string) => {
    setSource(newSource);
    await processMDX(newSource, context);
  }, [context, processMDX]);

  /**
   * Update the context
   */
  const updateContext = useCallback(async (newContext: Record<string, any>) => {
    setContext(newContext);
    await processMDX(source, newContext);
  }, [source, processMDX]);

  /**
   * Register a single component
   */
  const registerComponent = useCallback((name: string, component: React.ComponentType<any>) => {
    setComponentRegistry(prev => ({ ...prev, [name]: component }));
  }, []);

  /**
   * Register multiple components
   */
  const registerComponents = useCallback((components: Record<string, React.ComponentType<any>>) => {
    setComponentRegistry(prev => ({ ...prev, ...components }));
  }, []);

  // Initial processing
  useEffect(() => {
    if (source) {
      processMDX(source, context);
    }
  }, []); // Only run on mount

  // Auto-refresh functionality
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(refresh, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, refresh]);

  // Update renderer when registry or context changes
  useEffect(() => {
    renderer.registerComponents(componentRegistry);
    renderer.setGlobalContext(context);
  }, [componentRegistry, context, renderer]);

  return {
    ...state,
    refresh,
    updateSource,
    updateContext,
    registerComponent,
    registerComponents
  };
}

/**
 * Hook for loading MDX from a remote source (API endpoint)
 */
export function useMDXFromAPI(apiEndpoint: string, options: Omit<UseMDXComponentOptions, 'source'> = {}) {
  const [source, setSource] = useState('');
  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mdx = useMDXComponent({ ...options, source });

  const loadFromAPI = useCallback(async () => {
    setIsLoadingSource(true);
    setLoadError(null);

    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data?.source) {
        setSource(data.data.source);
      } else {
        throw new Error(data.error || 'Invalid API response');
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingSource(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    loadFromAPI();
  }, [loadFromAPI]);

  return {
    ...mdx,
    isLoadingSource,
    loadError,
    reloadSource: loadFromAPI
  };
}

/**
 * Hook for managing multiple MDX components
 */
export function useMDXCollection(sources: Record<string, string>, options: Omit<UseMDXComponentOptions, 'source'> = {}) {
  const [components, setComponents] = useState<Record<string, MDXComponentState>>({});

  useEffect(() => {
    const processAll = async () => {
      const parser = new MDXParser();
      const compiler = new MDXCompiler();
      const engine = new TemplateExecutionEngine();
      const renderer = new ClientRenderer({
        componentRegistry: options.componentRegistry,
        globalContext: options.context
      });

      const results: Record<string, MDXComponentState> = {};

      for (const [key, source] of Object.entries(sources)) {
        try {
          const parsed = parser.parse(source);
          const compiled = compiler.compile(parsed);
          const executionResult = await engine.execute(compiled, options.context || {});
          const metadata = renderer.extractMetadata(executionResult.content);

          results[key] = {
            content: executionResult.content,
            metadata: metadata,
            isLoading: false,
            error: null,
            errors: executionResult.errors,
            lastUpdated: new Date()
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results[key] = {
            content: '',
            metadata: {},
            isLoading: false,
            error: errorMessage,
            errors: [errorMessage],
            lastUpdated: new Date()
          };
        }
      }

      setComponents(results);
    };

    processAll();
  }, [sources, options.context, options.componentRegistry]);

  return components;
}
