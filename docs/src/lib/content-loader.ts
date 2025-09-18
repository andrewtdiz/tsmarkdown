import matter from 'gray-matter';
import Markdoc from '@markdoc/markdoc';
import { markdocConfig } from './markdoc-config';

export interface ContentData {
    content: any;
    frontmatter: any;
    rawContent: string;
}

// Global content cache
let contentCache: Record<string, ContentData> = {};
let cacheInitialized = false;

// Initialize content cache by loading all content
async function initializeContentCache() {
    if (cacheInitialized) return;

    const paths = [
        '/welcome',
        '/about',
        '/component-examples',
        '/first-mdx',
        '/frontmatter-examples',
        '/installation',
        '/overview',
        '/quick-start',
        '/test-markdoc-rendering'
    ];

    try {
        const promises = paths.map(async (path) => {
            const url = typeof window !== 'undefined'
                ? `/api/content?path=${encodeURIComponent(path)}`
                : `http://localhost:3000/api/content?path=${encodeURIComponent(path)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();

                // Parse and transform markdown on client side
                const ast = Markdoc.parse(data.rawContent);
                const content = Markdoc.transform(ast, {
                    ...markdocConfig,
                    variables: {
                        frontmatter: data.frontmatter
                    }
                });

                contentCache[path] = {
                    content,
                    frontmatter: data.frontmatter,
                    rawContent: data.rawContent
                };
            }
        });

        await Promise.all(promises);
        cacheInitialized = true;
        console.log('✅ Content cache initialized with', Object.keys(contentCache).length, 'documents');
    } catch (error) {
        console.error('❌ Error initializing content cache:', error);
    }
}

// Synchronous version using pre-loaded content cache
export function loadMarkdownContentSync(path: string): ContentData {
    // Handle root path
    const contentPath = path === '/' ? '/welcome' : path;

    if (!cacheInitialized) {
        throw new Error('Content cache not initialized. Call initializeContentCache() first.');
    }

    const content = contentCache[contentPath];
    if (!content) {
        throw new Error(`Content not found: ${path}`);
    }

    return content;
}

// Export the initialization function
export { initializeContentCache };

// Keep the async version for backward compatibility
export async function loadMarkdownContent(path: string): Promise<ContentData> {
    try {
        // Remove leading slash and convert to file path
        const filePath = path === '/' ? 'welcome.md' : path.slice(1) + '.md';

        // Fetch the raw markdown content
        const response = await fetch(`/content/${filePath}`);
        if (!response.ok) {
            throw new Error(`Content not found: ${path}`);
        }

        const fileContent = await response.text();
        const { data: frontmatter, content: markdownContent } = matter(fileContent);

        return {
            content: null, // Will be set by Markdoc parsing
            frontmatter,
            rawContent: markdownContent
        };
    } catch (error) {
        throw new Error(`Failed to load content for path: ${path}`);
    }
}

export function getAvailableContentPaths(): string[] {
    // Return list of available content paths
    return [
        '/',
        '/welcome',
        '/about',
        '/component-examples',
        '/first-mdx',
        '/frontmatter-examples',
        '/installation',
        '/overview',
        '/quick-start',
        '/test-markdoc-rendering'
    ];
}
