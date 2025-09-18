import React from 'react';
import { useLocation } from 'react-router-dom';
import Markdoc from '@markdoc/markdoc';
import { Header } from './Header';
import { DynamicSidebar } from './DynamicSidebar';
import { PageActions } from './PageActions';
import { sidebar } from '../sidebar';
import markdownComponents from './markdown';
import { loadMarkdownContentSync } from '../lib/content-loader';
import { parseAndTransformMarkdown } from '../lib/markdoc-config';

export function DocumentationLayout() {
    const location = useLocation();
    const currentPath = location.pathname;

    const renderContent = () => {
        if (currentPath === '/') {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    Welcome to Better-MDX Documentation
                </div>
            );
        }

        try {
            // Load and process content synchronously
            const { frontmatter, rawContent } = loadMarkdownContentSync(currentPath);
            const { content } = parseAndTransformMarkdown(rawContent, frontmatter);

            // Update document title
            if (frontmatter?.title) {
                document.title = `${frontmatter.title} - Better-MDX Documentation`;
            }

            return (
                <div>
                    {/* Page Header with Title and Description */}
                    {frontmatter && (
                        <div className="mb-8 pb-6 border-b border-border">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                                {frontmatter.title}
                            </h1>
                            {frontmatter.description && (
                                <p className="text-xl text-muted-foreground leading-7">
                                    {frontmatter.description}
                                </p>
                            )}
                            {frontmatter.date && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Last updated: {new Date(frontmatter.date).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Page Actions */}
                    {frontmatter && rawContent && (
                        <PageActions
                            title={frontmatter.title}
                            description={frontmatter.description}
                            content={rawContent}
                            frontmatter={frontmatter}
                        />
                    )}

                    {Markdoc.renderers.react(content, React, { components: markdownComponents })}
                </div>
            );
        } catch (err) {
            return (
                <div className="text-center py-8">
                    <div className="text-red-500 mb-4">
                        Error: {err instanceof Error ? err.message : 'Failed to load content'}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="h-screen w-screen bg-background flex flex-col">
            {/* Header */}
            <Header />

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex gap-12 w-full max-w-7xl mx-auto py-8">
                    {/* Dynamic Sidebar Navigation */}
                    <DynamicSidebar sections={sidebar} />

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="prose prose-slate dark:prose-invert max-w-none 
                            prose-headings:scroll-m-20 prose-headings:tracking-tight prose-headings:text-foreground
                            prose-h1:text-4xl prose-h1:font-extrabold prose-h1:lg:text-5xl prose-h1:first:mt-0
                            prose-h2:text-3xl prose-h2:font-semibold prose-h2:border-b prose-h2:pb-2 prose-h2:first:mt-0
                            prose-h3:text-2xl prose-h3:font-semibold prose-h3:first:mt-0
                            prose-h4:text-xl prose-h4:font-semibold prose-h4:first:mt-0
                            prose-h5:text-lg prose-h5:font-semibold prose-h5:first:mt-0
                            prose-h6:text-base prose-h6:font-semibold prose-h6:first:mt-0
                            prose-p:leading-7 prose-p:text-foreground/90 prose-p:[&:not(:first-child)]:mt-6
                            prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-foreground/80 prose-blockquote:mt-6
                            prose-code:relative prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-semibold prose-code:text-foreground
                            prose-pre:mb-4 prose-pre:mt-6 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted prose-pre:p-4
                            prose-pre:code:bg-transparent prose-pre:code:px-0 prose-pre:code:py-0 prose-pre:code:font-mono prose-pre:code:text-sm prose-pre:code:text-foreground
                            prose-ul:my-6 prose-ul:ml-6 prose-ul:list-disc prose-ul:[&>li]:mt-2
                            prose-ol:my-6 prose-ol:ml-6 prose-ol:list-decimal prose-ol:[&>li]:mt-2
                            prose-li:text-foreground/90
                            prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:underline-offset-4 prose-a:hover:text-primary/80 prose-a:transition-colors
                            prose-strong:text-foreground prose-strong:font-semibold
                            prose-em:text-foreground/80 prose-em:italic
                            prose-img:rounded-lg prose-img:border prose-img:border-border
                            prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-foreground/60 prose-figcaption:mt-2">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
