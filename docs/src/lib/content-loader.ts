import matter from 'gray-matter';

export interface ContentData {
    content: any;
    frontmatter: any;
    rawContent: string;
}

// Synchronous version for when content is pre-loaded
export function loadMarkdownContentSync(path: string): ContentData {
    try {
        // Remove leading slash and convert to file path
        const filePath = path === '/' ? 'welcome.md' : path.slice(1) + '.md';

        // For synchronous loading, we'll need to use a different approach
        // This assumes content is available in a global object or imported statically
        const contentMap = (window as any).__CONTENT_MAP__ || {};
        const fileContent = contentMap[filePath];

        if (!fileContent) {
            throw new Error(`Content not found: ${path}`);
        }

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
        '/quick-start'
    ];
}
