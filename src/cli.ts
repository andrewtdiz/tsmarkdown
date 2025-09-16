#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, watchFile, unwatchFile } from 'fs';
import { resolve, dirname, basename, join, extname } from 'path';
import { MDXParser } from './parser';
import { MDXCompiler } from './compiler';
import { TemplateExecutionEngine } from './template-engine';
import { MDXAPIServer } from './api-server';
import { MDXTypeChecker } from './type-checker';

interface CLIOptions {
  verbose?: boolean;
  output?: string;
  watch?: boolean;
  port?: number;
  help?: boolean;
  typecheck?: boolean;
}

class BetterMDXCLI {
  private parser = new MDXParser();
  private compiler = new MDXCompiler();
  private engine = new TemplateExecutionEngine();
  private typeChecker = new MDXTypeChecker();
  private apiServer?: MDXAPIServer;
  private watchedFiles: Set<string> = new Set();

  async run() {
    const args = process.argv.slice(2);
    const { command, options, positional } = this.parseArgs(args);

    if (options.help || !command) {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'init':
          await this.initProject(positional[0]);
          break;
        case 'dev':
          await this.startDevServer(positional[0], options);
          break;
        case 'build':
          await this.buildProject(positional[0], options);
          break;
        case 'compile':
          await this.compileFile(positional[0], options);
          break;
        case 'execute':
          await this.executeFile(positional[0], options);
          break;
        case 'serve':
          await this.serveProject(options);
          break;
        case 'watch':
          await this.watchFiles(positional[0], options);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): { command: string; options: CLIOptions; positional: string[] } {
    const options: CLIOptions = {};
    const positional: string[] = [];
    let command = '';

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('-')) {
        switch (arg) {
          case '--verbose':
          case '-v':
            options.verbose = true;
            break;
          case '--output':
          case '-o':
            options.output = args[++i];
            break;
          case '--watch':
          case '-w':
            options.watch = true;
            break;
          case '--port':
          case '-p':
            options.port = parseInt(args[++i]) || 3000;
            break;
          case '--help':
          case '-h':
            options.help = true;
            break;
          case '--typecheck':
          case '-t':
            options.typecheck = true;
            break;
        }
      } else if (!command) {
        command = arg;
      } else {
        positional.push(arg);
      }
    }

    return { command, options, positional };
  }

  private showHelp() {
    console.log(`
🚀 Better-MDX CLI - Hybrid TypeScript + Markdown Framework

USAGE:
  better-mdx <command> [options] [args]

COMMANDS:
  init [name]           Initialize a new Better-MDX project
  dev [dir]             Start development server with hot reload
  build [dir]           Build project for production
  compile <file>        Compile a single MDX file to JSON
  execute <file>        Execute MDX template with mock context
  serve                 Serve built project
  watch <dir>           Watch directory for changes and recompile

OPTIONS:
  -v, --verbose         Enable verbose output
  -o, --output <dir>    Output directory (default: ./dist)
  -w, --watch           Watch for file changes
  -p, --port <port>     Server port (default: 3000)
  -t, --typecheck       Enable TypeScript type checking
  -h, --help            Show this help message

EXAMPLES:
  better-mdx init my-app              # Create new project
  better-mdx dev                      # Start development server
  better-mdx build                    # Build for production
  better-mdx compile my-file.mdx      # Compile single file
  better-mdx execute my-file.mdx      # Execute with mock data
  better-mdx serve --port 8080        # Serve built project

Visit https://github.com/better-mdx for documentation and examples.
`);
  }

  private async initProject(name?: string) {
    const projectName = name || 'better-mdx-app';
    const projectDir = resolve(projectName);

    if (existsSync(projectDir)) {
      throw new Error(`Directory ${projectName} already exists`);
    }

    console.log(`📁 Creating new Better-MDX project: ${projectName}`);

    // Create directory structure
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(join(projectDir, 'mdx'), { recursive: true });
    mkdirSync(join(projectDir, 'dist'), { recursive: true });
    mkdirSync(join(projectDir, 'src'), { recursive: true });

    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'A Better-MDX project',
      main: 'dist/index.js',
      scripts: {
        dev: 'better-mdx dev',
        build: 'better-mdx build',
        serve: 'better-mdx serve',
        compile: 'better-mdx compile'
      },
      dependencies: {
        'better-mdx': '^1.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      devDependencies: {
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        typescript: '^5.0.0'
      }
    };

    writeFileSync(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create sample MDX file
    const sampleMdx = `import { Button } from './components/Button';

function Welcome() {
  const appName = 'My Better-MDX App';
  const version = '1.0.0';
  const isProduction = false;
  const features = ['TypeScript Integration', 'Dynamic Templates', 'React Components'];

  return (
    # Welcome to {{ appName }}! 🎉

    This is your first Better-MDX file. Version {{ version }}.

    {!isProduction && (
      ## Development Mode 🚧
      You're running in development mode with hot reload enabled.
    )}

    {isProduction && (
      ## Production Ready ✅
      Your app is optimized for production.
    )}

    ## Key Features
    {{ features.map((feature, index) => '- ' + feature).join('\\n') }}

    <Button onClick={() => alert('Hello from Better-MDX!')}>
      Click me!
    </Button>

    ---
    *Built with ❤️ using Better-MDX*
  )
}`;

    writeFileSync(join(projectDir, 'mdx/Welcome.mdx'), sampleMdx);

    // Create TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        jsx: 'react-jsx',
        outDir: './dist'
      },
      include: ['src/**/*', 'mdx/**/*'],
      exclude: ['node_modules', 'dist']
    };

    writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

    // Create sample React component
    const buttonComponent = `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: variant === 'primary' ? '#007bff' : '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}`;

    mkdirSync(join(projectDir, 'src/components'), { recursive: true });
    writeFileSync(join(projectDir, 'src/components/Button.tsx'), buttonComponent);

    console.log(`✅ Created Better-MDX project: ${projectName}`);
    console.log(`
Next steps:
  cd ${projectName}
  bun install
  better-mdx dev
`);
  }

  private async startDevServer(dir?: string, options: CLIOptions = {}) {
    const workingDir = resolve(dir || '.');
    const mdxDir = join(workingDir, 'mdx');
    const port = options.port || 3000;

    if (!existsSync(mdxDir)) {
      throw new Error(`MDX directory not found: ${mdxDir}. Run 'better-mdx init' to create a project.`);
    }

    console.log(`🚀 Starting Better-MDX development server...`);
    console.log(`📁 Working directory: ${workingDir}`);
    console.log(`🔍 Watching MDX files in: ${mdxDir}`);

    // Start API server
    this.apiServer = new MDXAPIServer();
    this.apiServer.startHMR();

    console.log(`🌐 Server running at http://localhost:${port}`);
    console.log(`📊 API endpoints available:`);
    console.log(`  POST /api/compile    - Compile MDX content`);
    console.log(`  POST /api/render     - Render compiled MDX`);
    console.log(`  POST /api/execute    - Execute MDX template`);

    // Watch for file changes
    await this.watchFiles(mdxDir, { ...options, verbose: true });
  }

  private async buildProject(dir?: string, options: CLIOptions = {}) {
    const workingDir = resolve(dir || '.');
    const mdxDir = join(workingDir, 'mdx');
    const outputDir = resolve(options.output || join(workingDir, 'dist'));

    console.log(`🔨 Building Better-MDX project...`);
    console.log(`📁 Source directory: ${mdxDir}`);
    console.log(`📁 Output directory: ${outputDir}`);

    if (!existsSync(mdxDir)) {
      throw new Error(`MDX directory not found: ${mdxDir}`);
    }

    // Create output directory
    mkdirSync(outputDir, { recursive: true });

    // Find all MDX files
    const mdxFiles = this.findMDXFiles(mdxDir);
    console.log(`📄 Found ${mdxFiles.length} MDX files`);

    const manifest = {
      files: [] as Array<{ path: string; compiled: string; metadata: any }>,
      buildTime: new Date().toISOString(),
      version: '1.0.0'
    };

    // Compile each file
    for (const filePath of mdxFiles) {
      try {
        const relativePath = filePath.replace(mdxDir + '/', '');
        const content = readFileSync(filePath, 'utf-8');

        if (options.verbose) {
          console.log(`  🔄 Compiling: ${relativePath}`);
        }

        const parsed = this.parser.parse(content);
        const compiled = this.compiler.compile(parsed);
        const result = await this.engine.execute(compiled, context, props, basePath);

        // Write compiled file
        const outputPath = join(outputDir, relativePath.replace('.mdx', '.json'));
        
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, JSON.stringify(compiled, null, 2));

        manifest.files.push({
          path: relativePath,
          compiled: relativePath.replace('.mdx', '.json'),
          metadata: compiled.metadata
        });

      } catch (error) {
        console.error(`❌ Error compiling ${filePath}:`, error);
      }
    }

    // Write manifest
    writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`✅ Build complete! ${manifest.files.length} files compiled.`);
    console.log(`📊 Manifest written to: ${join(outputDir, 'manifest.json')}`);
  }

  private async compileFile(filePath?: string, options: CLIOptions = {}) {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const fullPath = resolve(filePath);
    const content = readFileSync(fullPath, 'utf-8');

    console.log(`📄 Compiling MDX file: ${fullPath}`);

    const parsed = this.parser.parse(content);
    const compiled = this.compiler.compile(parsed);

    // Type checking if requested
    if (options.typecheck) {
      console.log('\n🔍 Type Checking...');

      const propUsageResult = this.typeChecker.validatePropUsage(compiled);
      const typeCheckResult = this.typeChecker.typeCheck(compiled, fullPath);

      if (!propUsageResult.success) {
        console.log('❌ Prop Usage Errors:');
        propUsageResult.errors.forEach(error => {
          console.log(`  - ${error.message}`);
        });
      }

      if (!typeCheckResult.success) {
        console.log('❌ TypeScript Errors:');
        typeCheckResult.errors.forEach(error => {
          console.log(`  - ${error.file}:${error.line}:${error.column} - ${error.message}`);
        });
      }

      if (propUsageResult.success && typeCheckResult.success) {
        console.log('✅ Type checking passed!');
      }
    }

    if (options.verbose) {
      console.log('\n🔍 Parse Result:');
      console.log(`  Function: ${parsed.functionName}`);
      console.log(`  Imports: ${parsed.imports.length}`);
      console.log(`  Parameters: ${parsed.parameterTypes.map(p => `${p.name}: ${p.type}`).join(', ')}`);
      console.log(`  Interpolations: ${parsed.interpolations.length}`);
      console.log(`  Conditionals: ${parsed.conditionalBlocks.length}`);

      if (parsed.propsInterface) {
        console.log('\n📝 Generated Props Interface:');
        console.log(parsed.propsInterface);
      }
    }

    if (options.output) {
      const outputPath = resolve(options.output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(compiled, null, 2));
      console.log(`💾 Saved to: ${outputPath}`);
    } else {
      console.log('\n🎯 Compiled Output:');
      console.log(JSON.stringify(compiled, null, 2));
    }
  }

  private async executeFile(filePath?: string, options: CLIOptions = {}) {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const fullPath = resolve(filePath);
    const content = readFileSync(fullPath, 'utf-8');

    console.log(`🚀 Executing MDX file: ${fullPath}`);

    const parsed = this.parser.parse(content);
    const compiled = this.compiler.compile(parsed);

    const result = await this.engine.execute(compiled, {
      // Mock context for testing
      useAuth: () => ({
        user: { name: 'Demo User' },
        isLoggedIn: true
      }),
      Button: (props: any) => `<button>${props.children}</button>`
    });

    console.log('\n📄 Executed Content:');
    console.log(result.content);

    if (result.errors.length > 0) {
      console.log('\n⚠️ Execution Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
  }

  private async serveProject(options: CLIOptions = {}) {
    const port = options.port || 3000;

    this.apiServer = new MDXAPIServer({ port });

    console.log(`🌐 Better-MDX server running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down server...');
      process.exit(0);
    });
  }

  private async watchFiles(dir?: string, options: CLIOptions = {}) {
    const watchDir = resolve(dir || './mdx');

    if (!existsSync(watchDir)) {
      throw new Error(`Directory not found: ${watchDir}`);
    }

    console.log(`👀 Watching for changes in: ${watchDir}`);

    const mdxFiles = this.findMDXFiles(watchDir);

    // Watch existing files
    for (const filePath of mdxFiles) {
      this.watchFile(filePath, options);
    }

    console.log(`📡 Watching ${this.watchedFiles.size} files...`);
    console.log('Press Ctrl+C to stop watching');

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping file watcher...');
      for (const filePath of this.watchedFiles) {
        unwatchFile(filePath);
      }
      process.exit(0);
    });
  }

  private watchFile(filePath: string, options: CLIOptions) {
    if (this.watchedFiles.has(filePath)) return;

    this.watchedFiles.add(filePath);

    watchFile(filePath, { interval: 1000 }, async (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        console.log(`📝 File changed: ${filePath}`);
        try {
          await this.compileFile(filePath, { ...options, output: filePath.replace('.mdx', '.json') });
          console.log(`✅ Recompiled successfully`);
        } catch (error) {
          console.error(`❌ Recompilation failed:`, error);
        }
      }
    });
  }

  private findMDXFiles(dir: string): string[] {
    const files: string[] = [];

    function traverse(currentDir: string) {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const itemPath = join(currentDir, item);
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          traverse(itemPath);
        } else if (extname(item) === '.mdx') {
          files.push(itemPath);
        }
      }
    }

    traverse(dir);
    return files;
  }
}

// Run CLI
const cli = new BetterMDXCLI();
cli.run().catch(error => {
  console.error('❌ CLI Error:', error);
  process.exit(1);
});