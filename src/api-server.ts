import { parseMDX } from './parser';
import { compileMDX } from './compiler';
import { ClientRenderer } from './client-renderer';
import { executeMDXTemplate } from './template-engine';
import { HotModuleReplacer, HMRConfig } from './hmr';
import * as fs from 'fs';
import * as path from 'path';

export interface APIServerConfig {
  port?: number;
  mdxDirectory?: string;
  cacheEnabled?: boolean;
  allowedOrigins?: string[];
  enableHMR?: boolean;
  hmrDebounceMs?: number;
}

export interface CompileRequest {
  source: string;
  filename?: string;
  context?: Record<string, any>;
}

export interface RenderRequest {
  source?: string;
  filename?: string;
  context?: Record<string, any>;
  compiled?: any; // Pre-compiled content
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class MDXAPIServer {
  private renderer: ClientRenderer;
  private hmr?: HotModuleReplacer;
  private config: Required<APIServerConfig>;
  private cache: Map<string, any> = new Map();

  constructor(config: APIServerConfig = {}) {
    this.renderer = new ClientRenderer();

    this.config = {
      port: config.port || 3000,
      mdxDirectory: config.mdxDirectory || './mdx',
      cacheEnabled: config.cacheEnabled !== false,
      allowedOrigins: config.allowedOrigins || ['*'],
      enableHMR: config.enableHMR !== false,
      hmrDebounceMs: config.hmrDebounceMs || 150
    };

    // Initialize HMR if enabled
    if (this.config.enableHMR) {
      this.hmr = new HotModuleReplacer({
        rootDir: this.config.mdxDirectory,
        port: this.config.port,
        debounceMs: this.config.hmrDebounceMs,
        enableSSE: true,
        verbose: process.env.NODE_ENV === 'development'
      });

      // Clear cache when files are updated
      this.hmr.on('hmr:update', () => {
        this.clearCache();
      });
    }
  }

  /**
   * Compile MDX source to JSON format
   */
  async compile(request: CompileRequest): Promise<APIResponse> {
    try {
      const cacheKey = this.getCacheKey('compile', request.source, request.context);

      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        return {
          success: true,
          data: this.cache.get(cacheKey)
        };
      }

      const parsed = parseMDX(request.source);
      const compiled = compileMDX(parsed);

      const result = {
        compiled,
        filename: request.filename,
        timestamp: new Date().toISOString()
      };

      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Compilation failed: ${error.message}`
      };
    }
  }

  /**
   * Render MDX to markdown content
   */
  async render(request: RenderRequest): Promise<APIResponse> {
    try {
      const cacheKey = this.getCacheKey('render', request.source || JSON.stringify(request.compiled), request.context);

      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        return {
          success: true,
          data: this.cache.get(cacheKey)
        };
      }

      let compiled;
      if (request.compiled) {
        compiled = request.compiled;
      } else if (request.source) {
        const parsed = parseMDX(request.source);
        compiled = compileMDX(parsed);
      } else {
        return {
          success: false,
          error: 'Either source or compiled content must be provided'
        };
      }

      const rendered = await this.renderer.render(compiled, request.context);

      const result = {
        ...rendered,
        filename: request.filename,
        timestamp: new Date().toISOString()
      };

      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Rendering failed: ${error.message}`
      };
    }
  }

  /**
   * Execute MDX with template engine
   */
  async execute(request: RenderRequest): Promise<APIResponse> {
    try {
      let compiled;
      if (request.compiled) {
        compiled = request.compiled;
      } else if (request.source) {
        const parsed = parseMDX(request.source);
        compiled = compileMDX(parsed);
      } else {
        return {
          success: false,
          error: 'Either source or compiled content must be provided'
        };
      }

      const executionResult = await executeMDXTemplate(compiled, request.context || {});

      return {
        success: true,
        data: {
          content: executionResult.content,
          errors: executionResult.errors,
          filename: request.filename,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Execution failed: ${error.message}`
      };
    }
  }

  /**
   * Load MDX file from filesystem
   */
  async loadFile(filename: string): Promise<APIResponse> {
    try {
      const filePath = path.join(this.config.mdxDirectory, filename);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filename}`
        };
      }

      const source = fs.readFileSync(filePath, 'utf-8');

      return {
        success: true,
        data: {
          source,
          filename,
          path: filePath,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load file: ${error.message}`
      };
    }
  }

  /**
   * List available MDX files
   */
  async listFiles(): Promise<APIResponse> {
    try {
      if (!fs.existsSync(this.config.mdxDirectory)) {
        return {
          success: true,
          data: { files: [] }
        };
      }

      const files = fs.readdirSync(this.config.mdxDirectory)
        .filter(file => file.endsWith('.mdx'))
        .map(file => ({
          name: file,
          path: path.join(this.config.mdxDirectory, file),
          stats: fs.statSync(path.join(this.config.mdxDirectory, file))
        }));

      return {
        success: true,
        data: { files }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list files: ${error.message}`
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Start HMR watcher
   */
  startHMR(): void {
    if (this.hmr) {
      this.hmr.startWatching();
    }
  }

  /**
   * Stop HMR watcher
   */
  stopHMR(): void {
    if (this.hmr) {
      this.hmr.stopWatching();
    }
  }

  /**
   * Get HMR client script for injection into HTML
   */
  getHMRClientScript(): string {
    return this.hmr?.getClientScript() || '';
  }

  /**
   * Get HMR SSE middleware
   */
  getHMRMiddleware() {
    return this.hmr?.getSSEMiddleware() || ((req: any, res: any, next: any) => next());
  }

  /**
   * HTTP server endpoints - Express.js style handlers
   */
  getExpressHandlers() {
    return {
      // POST /api/mdx/compile
      compile: async (req: any, res: any) => {
        const result = await this.compile(req.body);
        res.status(result.success ? 200 : 400).json(result);
      },

      // POST /api/mdx/render
      render: async (req: any, res: any) => {
        const result = await this.render(req.body);
        res.status(result.success ? 200 : 400).json(result);
      },

      // POST /api/mdx/execute
      execute: async (req: any, res: any) => {
        const result = await this.execute(req.body);
        res.status(result.success ? 200 : 400).json(result);
      },

      // GET /api/mdx/files
      listFiles: async (req: any, res: any) => {
        const result = await this.listFiles();
        res.status(result.success ? 200 : 500).json(result);
      },

      // GET /api/mdx/files/:filename
      loadFile: async (req: any, res: any) => {
        const result = await this.loadFile(req.params.filename);
        res.status(result.success ? 200 : 404).json(result);
      },

      // DELETE /api/mdx/cache
      clearCache: (req: any, res: any) => {
        this.clearCache();
        res.json({ success: true, message: 'Cache cleared' });
      },

      // GET /api/mdx/cache/stats
      cacheStats: (req: any, res: any) => {
        const stats = this.getCacheStats();
        res.json({ success: true, data: stats });
      },

      // GET /api/mdx/hmr/status
      hmrStatus: (req: any, res: any) => {
        if (!this.hmr) {
          res.json({ success: false, error: 'HMR not enabled' });
          return;
        }

        const status = this.hmr.getCompilationStatus();
        res.json({
          success: true,
          data: {
            enabled: true,
            status,
            config: {
              rootDir: this.config.mdxDirectory,
              debounceMs: this.config.hmrDebounceMs
            }
          }
        });
      },

      // POST /api/mdx/hmr/recompile
      hmrRecompile: (req: any, res: any) => {
        if (!this.hmr) {
          res.status(400).json({ success: false, error: 'HMR not enabled' });
          return;
        }

        this.hmr.recompileAll();
        res.json({ success: true, message: 'Recompilation triggered' });
      },

      // GET /api/mdx/hmr/client.js
      hmrClientScript: (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.send(this.getHMRClientScript());
      }
    };
  }

  private getCacheKey(operation: string, content: string, context?: Record<string, any>): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${operation}:${Buffer.from(content + contextStr).toString('base64').substring(0, 32)}`;
  }
}

// Factory function
export function createAPIServer(config?: APIServerConfig): MDXAPIServer {
  return new MDXAPIServer(config);
}

// Express.js integration helper
export function setupExpressRoutes(app: any, server: MDXAPIServer, basePath: string = '/api/mdx') {
  const handlers = server.getExpressHandlers();

  // Core API endpoints
  app.post(`${basePath}/compile`, handlers.compile);
  app.post(`${basePath}/render`, handlers.render);
  app.post(`${basePath}/execute`, handlers.execute);
  app.get(`${basePath}/files`, handlers.listFiles);
  app.get(`${basePath}/files/:filename`, handlers.loadFile);
  app.delete(`${basePath}/cache`, handlers.clearCache);
  app.get(`${basePath}/cache/stats`, handlers.cacheStats);

  // HMR endpoints
  app.get(`${basePath}/hmr/status`, handlers.hmrStatus);
  app.post(`${basePath}/hmr/recompile`, handlers.hmrRecompile);
  app.get(`${basePath}/hmr/client.js`, handlers.hmrClientScript);

  // HMR SSE middleware (catch-all for HMR endpoints)
  app.use(server.getHMRMiddleware());
}