"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
    console.log('Better-MDX extension is now active!');
    // Register compile command
    const compileCommand = vscode.commands.registerCommand('better-mdx.compile', async (uri) => {
        const activeEditor = vscode.window.activeTextEditor;
        const fileUri = uri || (activeEditor?.document.uri);
        if (!fileUri || !fileUri.fsPath.endsWith('.mdx')) {
            vscode.window.showErrorMessage('Please select an .mdx file to compile');
            return;
        }
        try {
            const config = vscode.workspace.getConfiguration('better-mdx');
            const outputDir = config.get('compiler.outputDirectory') || './dist';
            // Use the CLI to compile the file
            const terminal = vscode.window.createTerminal('Better-MDX Compile');
            const relativePath = vscode.workspace.asRelativePath(fileUri);
            const outputPath = path.join(outputDir, path.basename(relativePath, '.mdx') + '.json');
            terminal.sendText(`bun run src/cli.ts compile "${relativePath}" --output "${outputPath}"`);
            terminal.show();
            vscode.window.showInformationMessage(`Compiling ${relativePath}...`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to compile: ${error}`);
        }
    });
    // Register execute command
    const executeCommand = vscode.commands.registerCommand('better-mdx.execute', async (uri) => {
        const activeEditor = vscode.window.activeTextEditor;
        const fileUri = uri || (activeEditor?.document.uri);
        if (!fileUri || !fileUri.fsPath.endsWith('.mdx')) {
            vscode.window.showErrorMessage('Please select an .mdx file to execute');
            return;
        }
        try {
            const terminal = vscode.window.createTerminal('Better-MDX Execute');
            const relativePath = vscode.workspace.asRelativePath(fileUri);
            terminal.sendText(`bun run src/cli.ts execute "${relativePath}"`);
            terminal.show();
            vscode.window.showInformationMessage(`Executing ${relativePath}...`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to execute: ${error}`);
        }
    });
    // Register preview command
    const previewCommand = vscode.commands.registerCommand('better-mdx.preview', async (uri) => {
        const activeEditor = vscode.window.activeTextEditor;
        const fileUri = uri || (activeEditor?.document.uri);
        if (!fileUri || !fileUri.fsPath.endsWith('.mdx')) {
            vscode.window.showErrorMessage('Please select an .mdx file to preview');
            return;
        }
        try {
            const config = vscode.workspace.getConfiguration('better-mdx');
            const port = config.get('preview.port') || 3000;
            // Create and show preview panel
            const panel = vscode.window.createWebviewPanel('better-mdx-preview', `Preview: ${path.basename(fileUri.fsPath)}`, vscode.ViewColumn.Beside, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            // Load and compile the MDX file
            const content = fs.readFileSync(fileUri.fsPath, 'utf-8');
            const previewHtml = await generatePreviewHtml(content, fileUri.fsPath);
            panel.webview.html = previewHtml;
            // Set up file watcher for live updates
            const watcher = vscode.workspace.createFileSystemWatcher(fileUri.fsPath);
            watcher.onDidChange(async () => {
                const updatedContent = fs.readFileSync(fileUri.fsPath, 'utf-8');
                const updatedHtml = await generatePreviewHtml(updatedContent, fileUri.fsPath);
                panel.webview.html = updatedHtml;
            });
            panel.onDidDispose(() => {
                watcher.dispose();
            });
            vscode.window.showInformationMessage(`Preview opened for ${path.basename(fileUri.fsPath)}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to preview: ${error}`);
        }
    });
    // Register language server features
    const completionProvider = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'better-mdx' }, new BetterMDXCompletionProvider(), '{', '}');
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('better-mdx');
    const diagnosticsProvider = new BetterMDXDiagnosticsProvider(diagnosticsCollection);
    // Watch for document changes to provide diagnostics
    const documentChangeHandler = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'better-mdx') {
            diagnosticsProvider.updateDiagnostics(event.document);
        }
    });
    const documentOpenHandler = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'better-mdx') {
            diagnosticsProvider.updateDiagnostics(document);
        }
    });
    // Register all disposables
    context.subscriptions.push(compileCommand, executeCommand, previewCommand, completionProvider, diagnosticsCollection, documentChangeHandler, documentOpenHandler);
}
async function generatePreviewHtml(content, filePath) {
    try {
        // Import our Better-MDX modules (this would need to be bundled properly)
        // For now, we'll create a simple preview
        const fileName = path.basename(filePath);
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better-MDX Preview: ${fileName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: var(--vscode-editor-background, #fff);
            color: var(--vscode-editor-foreground, #000);
        }
        .better-mdx-preview {
            border: 1px solid var(--vscode-panel-border, #ddd);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .interpolation {
            background: var(--vscode-textPreformat-background, #f5f5f5);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            color: var(--vscode-textPreformat-foreground, #d73a49);
        }
        .conditional {
            background: var(--vscode-diffEditor-insertedTextBackground, rgba(0, 255, 0, 0.1));
          border-left: 4px solid var(--vscode-diffEditor-insertedTextBorder, #28a745);
            padding: 10px;
            margin: 10px 0;
        }
        .typescript-section {
            background: var(--vscode-textCodeBlock-background, #f8f8f8);
            border: 1px solid var(--vscode-textCodeBlock-background, #e1e4e8);
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 14px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-titleBar-activeForeground, #24292e);
            border-bottom: 1px solid var(--vscode-panel-border, #e1e4e8);
            padding-bottom: 8px;
        }
        code {
            background: var(--vscode-textPreformat-background, #f5f5f5);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        pre {
            background: var(--vscode-textCodeBlock-background, #f8f8f8);
            border: 1px solid var(--vscode-textCodeBlock-background, #e1e4e8);
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
        }
        .error {
            color: var(--vscode-errorForeground, #f85149);
            background: var(--vscode-inputValidation-errorBackground, rgba(248, 81, 73, 0.1));
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 4px solid var(--vscode-inputValidation-errorBorder, #f85149);
        }
    </style>
</head>
<body>
    <h1>Better-MDX Preview: ${fileName}</h1>

    <div class="better-mdx-preview">
        <h2>📄 Source Content</h2>
        <pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>

        <h2>🔍 Detected Features</h2>
        <div id="features">
            <!-- Features will be populated by JavaScript -->
        </div>

        <p><em>Note: Full compilation and execution preview requires running the Better-MDX server. Use the CLI commands for complete functionality.</em></p>
    </div>

    <script>
        // Simple analysis of Better-MDX features
        const content = ${JSON.stringify(content)};
        const featuresDiv = document.getElementById('features');

        const features = [];

        // Check for imports
        const imports = content.match(/^import .*$/gm);
        if (imports) {
            features.push(\`✅ <strong>Imports:</strong> \${imports.length} import statement(s)\`);
        }

        // Check for function declaration
        const functionMatch = content.match(/^function\\s+(\\w+)/m);
        if (functionMatch) {
            features.push(\`✅ <strong>Function:</strong> \${functionMatch[1]}\`);
        }

        // Check for interpolations
        const interpolations = content.match(/\\{\\{[^}]+\\}\\}/g);
        if (interpolations) {
            features.push(\`✅ <strong>Interpolations:</strong> \${interpolations.length} template expression(s)\`);
        }

        // Check for conditionals
        const conditionals = content.match(/\\{[^}]+&&\\s*\\(/g);
        if (conditionals) {
            features.push(\`✅ <strong>Conditionals:</strong> \${conditionals.length} conditional block(s)\`);
        }

        // Check for JSX components
        const jsxComponents = content.match(/<[A-Z]\\w*[^>]*>/g);
        if (jsxComponents) {
            const uniqueComponents = [...new Set(jsxComponents.map(comp => comp.match(/<([A-Z]\\w*)/)[1]))];
            features.push(\`✅ <strong>Components:</strong> \${uniqueComponents.join(', ')}\`);
        }

        if (features.length === 0) {
            features.push('ℹ️ <em>No Better-MDX features detected in this file</em>');
        }

        featuresDiv.innerHTML = '<ul><li>' + features.join('</li><li>') + '</li></ul>';
    </script>
</body>
</html>
    `;
    }
    catch (error) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better-MDX Preview Error</title>
</head>
<body>
    <h1>Preview Error</h1>
    <div class="error">
        Failed to generate preview: ${error}
    </div>
</body>
</html>
    `;
    }
}
class BetterMDXCompletionProvider {
    provideCompletionItems(document, position, token, context) {
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);
        const completions = [];
        // Completion for interpolations
        if (linePrefix.endsWith('{{')) {
            const interpolationCompletion = new vscode.CompletionItem(' expression }}', vscode.CompletionItemKind.Snippet);
            interpolationCompletion.insertText = new vscode.SnippetString(' ${1:expression} }}');
            interpolationCompletion.detail = 'Better-MDX Interpolation';
            interpolationCompletion.documentation = 'Insert a template interpolation expression';
            completions.push(interpolationCompletion);
        }
        // Completion for conditionals
        if (linePrefix.endsWith('{')) {
            const conditionalCompletion = new vscode.CompletionItem('condition && (', vscode.CompletionItemKind.Snippet);
            conditionalCompletion.insertText = new vscode.SnippetString('${1:condition} && (\n  ${2:content}\n)}');
            conditionalCompletion.detail = 'Better-MDX Conditional';
            conditionalCompletion.documentation = 'Insert a conditional rendering block';
            completions.push(conditionalCompletion);
        }
        // Common TypeScript/React completions
        if (position.line === 0 || linePrefix.trim().startsWith('import')) {
            const importCompletion = new vscode.CompletionItem('import { } from', vscode.CompletionItemKind.Module);
            importCompletion.insertText = new vscode.SnippetString('import { ${1:Component} } from \'${2:./components/Component}\';');
            importCompletion.detail = 'Import React Component';
            completions.push(importCompletion);
        }
        return completions;
    }
}
class BetterMDXDiagnosticsProvider {
    constructor(diagnosticsCollection) {
        this.diagnosticsCollection = diagnosticsCollection;
    }
    updateDiagnostics(document) {
        const diagnostics = [];
        const text = document.getText();
        const lines = text.split('\n');
        // Check for common Better-MDX issues
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for unmatched interpolation braces
            const openBraces = (line.match(/\\{\\{/g) || []).length;
            const closeBraces = (line.match(/\\}\\}/g) || []).length;
            if (openBraces !== closeBraces) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(range, 'Unmatched interpolation braces: {{ must be closed with }}', vscode.DiagnosticSeverity.Error);
                diagnostic.source = 'Better-MDX';
                diagnostics.push(diagnostic);
            }
            // Check for malformed conditionals
            if (line.includes('{') && line.includes('&&') && !line.includes('(')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(range, 'Conditional blocks must wrap content in parentheses: {condition && (content)}', vscode.DiagnosticSeverity.Error);
                diagnostic.source = 'Better-MDX';
                diagnostics.push(diagnostic);
            }
            // Check for function structure
            if (line.includes('function') && !line.includes('function ')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(range, 'Function declaration must include space after "function" keyword', vscode.DiagnosticSeverity.Warning);
                diagnostic.source = 'Better-MDX';
                diagnostics.push(diagnostic);
            }
        }
        this.diagnosticsCollection.set(document.uri, diagnostics);
    }
}
function deactivate() {
    console.log('Better-MDX extension is now deactivated');
}
//# sourceMappingURL=extension.js.map