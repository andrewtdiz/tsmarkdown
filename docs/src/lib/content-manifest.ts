import { readFileSync } from 'fs';
import { join } from 'path';
import Markdoc from '@markdoc/markdoc';
import * as yaml from 'js-yaml';

// Content manifest that maps paths to parsed Markdoc ASTs with frontmatter
export const contentManifest: Record<string, { ast: any; frontmatter: any; rawContent: string }> = {};

// Parse frontmatter from content string
function parseFrontmatter(content: string): { content: string; frontmatter: any } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { content, frontmatter: {} };
    }

    const frontmatterText = match[1];
    const contentWithoutFrontmatter = match[2];

    try {
        const frontmatter = yaml.load(frontmatterText) || {};
        return { content: contentWithoutFrontmatter, frontmatter };
    } catch (error) {
        console.warn('Failed to parse frontmatter:', error);
        return { content, frontmatter: {} };
    }
}

// Initialize content manifest by parsing all markdown files
export function initializeContentManifest() {
    const contentDir = join(process.cwd(), 'content');

    // Define all content files and their routes
    const contentFiles = [
        { file: 'welcome.md', route: '/welcome' },
        { file: 'about.md', route: '/about' },
        { file: 'frontmatter-examples.md', route: '/frontmatter-examples' },
        { file: 'overview.md', route: '/overview' },
        { file: 'installation.md', route: '/installation' },
        { file: 'quick-start.md', route: '/quick-start' },
        { file: 'first-tsm.md', route: '/first-tsm' }
    ];

    try {
        for (const { file, route } of contentFiles) {
            const filePath = join(contentDir, file);
            const rawContent = readFileSync(filePath, 'utf-8');
            const { content, frontmatter } = parseFrontmatter(rawContent);
            contentManifest[route] = {
                ast: Markdoc.parse(content),
                frontmatter,
                rawContent: content // Store the content without frontmatter
            };
        }

        console.log('✅ Content manifest initialized with', Object.keys(contentManifest).length, 'documents');
    } catch (error) {
        console.error('❌ Error initializing content manifest:', error);
    }
}

// Get content by path (returns both AST and frontmatter)
export function getContent(path: string) {
    return contentManifest[path] || null;
}

// Get just the AST for a content path
export function getContentAST(path: string) {
    const content = contentManifest[path];
    return content ? content.ast : null;
}

// Get frontmatter for a content path
export function getContentFrontmatter(path: string) {
    const content = contentManifest[path];
    return content ? content.frontmatter : {};
}

// List all available content paths
export function getContentPaths() {
    return Object.keys(contentManifest);
}

// Get all content metadata (title, description, etc.) for navigation
export function getAllContentMetadata() {
    const metadata: Record<string, { title: string; description: string; route: string }> = {};

    for (const [route, content] of Object.entries(contentManifest)) {
        metadata[route] = {
            title: content.frontmatter.title || 'Untitled',
            description: content.frontmatter.description || '',
            route
        };
    }

    return metadata;
}
