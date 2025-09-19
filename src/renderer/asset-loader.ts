import path, { resolve } from 'path';
import { readFileSync } from 'fs';

export interface AssetLoadResult {
    success: boolean;
    data?: any;
    error?: string;
}

export async function loadAsset(modulePath: string, basePath?: string): Promise<AssetLoadResult> {
    try {
        // Handle ?raw suffix for text files
        const isRawImport = modulePath.includes('?raw');
        const cleanPath = modulePath.replace('?raw', '');

        // Resolve the full path
        const fullPath = resolveAssetPath(cleanPath, basePath);
        if (!fullPath) {
            return {
                success: false,
                error: `Module not found: ${modulePath}`
            };
        }

        // Check if file exists
        const file = Bun.file(fullPath);
        if (!(await file.exists())) {
            return {
                success: false,
                error: `File not found: ${fullPath}`
            };
        }

        // Load based on file extension
        const extension = path.extname(cleanPath).toLowerCase();

        switch (extension) {
            case '.json':
                return await loadJsonAsset(file, isRawImport);
            case '.yaml':
            case '.yml':
                return await loadYamlAsset(file, isRawImport);
            case '.css':
                return await loadCssAsset(file, isRawImport, fullPath);
            case '.md':
            case '.txt':
                return await loadTextAsset(file, isRawImport);
            default:
                return {
                    success: false,
                    error: `Unsupported file extension: ${extension}`
                };
        }
    } catch (error) {
        return {
            success: false,
            error: `Failed to load asset: ${error}`
        };
    }
}

function resolveAssetPath(modulePath: string, basePath?: string): string | null {
    try {
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            // Relative import
            const resolvedBasePath = basePath ? path.resolve(basePath) : process.cwd();
            return path.resolve(resolvedBasePath, modulePath);
        } else {
            // Absolute import or node_modules
            return path.resolve(modulePath);
        }
    } catch (error) {
        return null;
    }
}

async function loadJsonAsset(file: any, isRawImport: boolean): Promise<AssetLoadResult> {
    try {
        if (isRawImport) {
            const content = await file.text();
            return {
                success: true,
                data: content
            };
        } else {
            const content = await file.text();
            const parsed = JSON.parse(content);
            return {
                success: true,
                data: parsed
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `Invalid JSON format: ${error}`
        };
    }
}

async function loadYamlAsset(file: any, isRawImport: boolean): Promise<AssetLoadResult> {
    try {
        const content = await file.text();

        if (isRawImport) {
            return {
                success: true,
                data: content
            };
        } else {
            // Simple YAML parser for basic cases
            const parsed = parseSimpleYaml(content);
            return {
                success: true,
                data: parsed
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `Invalid YAML format: ${error}`
        };
    }
}

async function loadCssAsset(file: any, isRawImport: boolean, fullPath: string): Promise<AssetLoadResult> {
    try {
        const content = await file.text();

        if (isRawImport) {
            return {
                success: true,
                data: content
            };
        } else {
            // Check if it's a CSS module (ends with .module.css)
            if (fullPath.includes('.module.css')) {
                const cssModule = parseCssModule(content);
                return {
                    success: true,
                    data: cssModule
                };
            } else {
                return {
                    success: false,
                    error: 'Global CSS imports are not supported'
                };
            }
        }
    } catch (error) {
        return {
            success: false,
            error: `Failed to load CSS: ${error}`
        };
    }
}

async function loadTextAsset(file: any, isRawImport: boolean): Promise<AssetLoadResult> {
    try {
        const content = await file.text();

        if (isRawImport) {
            return {
                success: true,
                data: content
            };
        } else {
            return {
                success: false,
                error: 'Text files require ?raw suffix'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `Failed to load text file: ${error}`
        };
    }
}

function parseSimpleYaml(content: string): any {
    // Simple YAML parser for basic key-value pairs
    const lines = content.split('\n');
    const result: any = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                let parsedValue = trimmed.substring(colonIndex + 1).trim();
                let value;

                // Parse boolean values
                if (parsedValue === 'true') {
                    value = true;
                } else if (parsedValue === 'false') {
                    value = false;
                } else if (!isNaN(Number(parsedValue))) {
                    value = Number(value);
                }

                result[key] = value;
            }
        }
    }

    return result;
}

function parseCssModule(content: string): Record<string, string> {
    // Simple CSS module parser that generates class names
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.includes('{')) {
            const className = trimmed.split('{')[0].trim().replace('.', '');
            if (className) {
                // Generate a simple hash-based class name
                const hash = Math.random().toString(36).substring(2, 8);
                result[className] = `${className}_${hash}`;
            }
        }
    }

    return result;
}
