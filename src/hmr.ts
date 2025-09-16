import { EventEmitter } from 'events';
import { readFileSync, existsSync, watchFile, unwatchFile, Stats } from 'fs';
import { resolve, relative } from 'path';
import { MDXParser } from './parser';
import { MDXCompiler } from './compiler';
import { TemplateExecutionEngine } from './template-engine';

export interface HMRConfig {
  rootDir: string;
  port: number;
  debounceMs?: number;
  enableSSE?: boolean;
  verbose?: boolean;
}

export interface HMRUpdate {
  type: 'mdx-update' | 'mdx-error' | 'mdx-reload';
  file: string;
  timestamp: number;
  content?: string;
  compiled?: any;
  error?: string;
  dependencies?: string[];
}

export interface HMRClient {
  id: string;
  response: any; // Express response object for SSE
  subscriptions: Set<string>;
}

export class HotModuleReplacer extends EventEmitter {
  private config: Required<HMRConfig>;
  private parser = new MDXParser();
  private compiler = new MDXCompiler();
  private engine = new TemplateExecutionEngine();
  private watchedFiles = new Map<string, Stats>();
  private clients = new Map<string, HMRClient>();
  private fileContents = new Map<string, string>();
  private compiledCache = new Map<string, any>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: HMRConfig) {
    super();
    this.config = {
      debounceMs: 150,
      enableSSE: true,
      verbose: false,
      ...config
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle process exit to cleanup watchers
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Start watching MDX files in the configured directory
   */
  public startWatching(patterns: string[] = ['**/*.mdx']): void {
    console.log(`🔥 Starting HMR watcher for ${this.config.rootDir}`);

    // Find all MDX files matching patterns
    const files = this.findFiles(patterns);

    for (const filePath of files) {
      this.watchFile(filePath);
    }

    if (this.config.verbose) {
      console.log(`👀 Watching ${files.length} MDX files for changes`);
    }

    this.emit('hmr:started', { fileCount: files.length });
  }

  /**
   * Stop watching all files and cleanup
   */
  public stopWatching(): void {
    console.log('🛑 Stopping HMR watcher...');

    for (const filePath of this.watchedFiles.keys()) {
      this.unwatchFile(filePath);
    }

    this.cleanup();
    this.emit('hmr:stopped');
  }

  /**
   * Register an Express middleware for Server-Sent Events
   */
  public getSSEMiddleware() {
    return (req: any, res: any, next: any) => {
      if (req.path === '/hmr' || req.path === '/__better-mdx-hmr__') {
        // Set up SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        const clientId = this.generateClientId();
        const client: HMRClient = {
          id: clientId,
          response: res,
          subscriptions: new Set()
        };

        this.clients.set(clientId, client);

        // Send initial connection message
        this.sendSSE(client, {
          type: 'hmr-connected',
          clientId,
          timestamp: Date.now()
        });

        if (this.config.verbose) {
          console.log(`🔌 HMR client connected: ${clientId}`);
        }

        // Handle client disconnect
        req.on('close', () => {
          this.clients.delete(clientId);
          if (this.config.verbose) {
            console.log(`🔌 HMR client disconnected: ${clientId}`);
          }
        });

        return;
      }

      next();
    };
  }

  /**
   * Get client-side script for HMR functionality
   */
  public getClientScript(): string {
    return `
<script>
(function() {
  let eventSource;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  function connect() {
    eventSource = new EventSource('/__better-mdx-hmr__');

    eventSource.onopen = function() {
      console.log('🔥 Better-MDX HMR connected');
      reconnectAttempts = 0;
    };

    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      handleHMRUpdate(data);
    };

    eventSource.onerror = function() {
      console.log('🔥 Better-MDX HMR connection lost');
      eventSource.close();

      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connect, 1000 * reconnectAttempts);
      }
    };
  }

  function handleHMRUpdate(update) {
    console.log('🔄 Better-MDX HMR update:', update.type, update.file);

    switch (update.type) {
      case 'mdx-update':
        handleMDXUpdate(update);
        break;
      case 'mdx-error':
        handleMDXError(update);
        break;
      case 'mdx-reload':
        window.location.reload();
        break;
    }
  }

  function handleMDXUpdate(update) {
    // Notify any Better-MDX React components about the update
    if (window.__BETTER_MDX_HMR__) {
      window.__BETTER_MDX_HMR__.notifyUpdate(update);
    }

    // Flash indicator to show update
    showUpdateIndicator();
  }

  function handleMDXError(update) {
    console.error('❌ Better-MDX compilation error:', update.error);

    // Show error overlay
    showErrorOverlay(update);
  }

  function showUpdateIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      transition: opacity 0.3s;
    \`;
    indicator.textContent = '🔥 Better-MDX Updated';

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => document.body.removeChild(indicator), 300);
    }, 2000);
  }

  function showErrorOverlay(update) {
    // Remove existing overlay
    const existing = document.getElementById('better-mdx-error-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'better-mdx-error-overlay';
    overlay.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 14px;
      z-index: 10001;
      padding: 20px;
      overflow: auto;
    \`;

    overlay.innerHTML = \`
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="color: #f85149; margin-top: 0;">Better-MDX Compilation Error</h2>
        <p><strong>File:</strong> \${update.file}</p>
        <pre style="background: #1a1a1a; padding: 16px; border-radius: 4px; overflow: auto;">\${update.error}</pre>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #0366d6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 16px;
        ">Close</button>
      </div>
    \`;

    document.body.appendChild(overlay);
  }

  // Initialize HMR connection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }

  // Set up global HMR API
  window.__BETTER_MDX_HMR__ = {
    subscribers: new Set(),
    notifyUpdate: function(update) {
      this.subscribers.forEach(callback => callback(update));
    },
    subscribe: function(callback) {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }
  };
})();
</script>
    `;
  }

  private watchFile(filePath: string): void {
    const resolvedPath = resolve(this.config.rootDir, filePath);

    if (!existsSync(resolvedPath) || this.watchedFiles.has(resolvedPath)) {
      return;
    }

    // Store initial file stats
    const stats = require('fs').statSync(resolvedPath);
    this.watchedFiles.set(resolvedPath, stats);

    // Read and cache initial content
    try {
      const content = readFileSync(resolvedPath, 'utf-8');
      this.fileContents.set(resolvedPath, content);

      // Pre-compile the file
      this.compileFile(resolvedPath, content);
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error);
    }

    // Set up file watcher
    watchFile(resolvedPath, { interval: 100 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        this.handleFileChange(resolvedPath);
      }
    });

    if (this.config.verbose) {
      console.log(`👀 Watching: ${relative(this.config.rootDir, resolvedPath)}`);
    }
  }

  private unwatchFile(filePath: string): void {
    unwatchFile(filePath);
    this.watchedFiles.delete(filePath);
    this.fileContents.delete(filePath);
    this.compiledCache.delete(filePath);

    // Clear any pending debounce timers
    const timer = this.debounceTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(filePath);
    }
  }

  private handleFileChange(filePath: string): void {
    // Debounce file changes to avoid excessive recompilation
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processFileChange(filePath);
      this.debounceTimers.delete(filePath);
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  private async processFileChange(filePath: string): Promise<void> {
    const relativePath = relative(this.config.rootDir, filePath);

    try {
      const newContent = readFileSync(filePath, 'utf-8');
      const previousContent = this.fileContents.get(filePath);

      // Skip if content hasn't actually changed
      if (newContent === previousContent) {
        return;
      }

      this.fileContents.set(filePath, newContent);

      if (this.config.verbose) {
        console.log(`📝 File changed: ${relativePath}`);
      }

      // Compile the updated file
      const compiled = await this.compileFile(filePath, newContent);

      const update: HMRUpdate = {
        type: 'mdx-update',
        file: relativePath,
        timestamp: Date.now(),
        content: newContent,
        compiled,
        dependencies: this.extractDependencies(newContent)
      };

      // Emit update event
      this.emit('hmr:update', update);

      // Send to SSE clients
      this.broadcastUpdate(update);

    } catch (error) {
      console.error(`❌ HMR compilation error in ${relativePath}:`, error);

      const errorUpdate: HMRUpdate = {
        type: 'mdx-error',
        file: relativePath,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };

      this.emit('hmr:error', errorUpdate);
      this.broadcastUpdate(errorUpdate);
    }
  }

  private async compileFile(filePath: string, content: string): Promise<any> {
    const parsed = this.parser.parse(content);
    const compiled = this.compiler.compile(parsed);

    this.compiledCache.set(filePath, compiled);

    return compiled;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // Extract import statements
    const importMatches = content.match(/^import .* from ['"]([^'"]+)['"];?$/gm);
    if (importMatches) {
      for (const match of importMatches) {
        const moduleMatch = match.match(/from ['"]([^'"]+)['"]$/);
        if (moduleMatch) {
          dependencies.push(moduleMatch[1]);
        }
      }
    }

    return dependencies;
  }

  private broadcastUpdate(update: HMRUpdate): void {
    if (!this.config.enableSSE) {
      return;
    }

    for (const client of this.clients.values()) {
      this.sendSSE(client, update);
    }

    if (this.config.verbose) {
      console.log(`📡 Broadcasted ${update.type} to ${this.clients.size} clients`);
    }
  }

  private sendSSE(client: HMRClient, data: any): void {
    try {
      client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Client likely disconnected, remove it
      this.clients.delete(client.id);
    }
  }

  private generateClientId(): string {
    return `hmr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private findFiles(patterns: string[]): string[] {
    const { readdirSync, statSync } = require('fs');
    const { join } = require('path');
    const files: string[] = [];

    const findInDirectory = (dir: string, pattern: RegExp): void => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            findInDirectory(fullPath, pattern);
          } else if (pattern.test(item)) {
            files.push(relative(this.config.rootDir, fullPath));
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    // Convert glob patterns to regex (simplified)
    for (const pattern of patterns) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');
      const regex = new RegExp(regexPattern);

      findInDirectory(this.config.rootDir, regex);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private cleanup(): void {
    for (const filePath of this.watchedFiles.keys()) {
      unwatchFile(filePath);
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.watchedFiles.clear();
    this.fileContents.clear();
    this.compiledCache.clear();
    this.debounceTimers.clear();
    this.clients.clear();
  }

  /**
   * Get current file compilation status
   */
  public getCompilationStatus(): { [key: string]: { compiled: boolean; error?: string } } {
    const status: { [key: string]: { compiled: boolean; error?: string } } = {};

    for (const [filePath, content] of this.fileContents.entries()) {
      const relativePath = relative(this.config.rootDir, filePath);
      status[relativePath] = {
        compiled: this.compiledCache.has(filePath)
      };
    }

    return status;
  }

  /**
   * Force recompilation of all watched files
   */
  public recompileAll(): void {
    console.log('🔄 Force recompiling all watched files...');

    for (const filePath of this.watchedFiles.keys()) {
      this.processFileChange(filePath);
    }
  }
}