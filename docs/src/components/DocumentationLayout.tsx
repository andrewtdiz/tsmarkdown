import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { DynamicSidebar } from './DynamicSidebar';
import { PageActions } from './PageActions';
import { MarkdownRenderer } from './MarkdownRenderer';
import { sidebar } from '../sidebar';
import { loadMarkdownContentSync } from '../lib/content-loader';

export function DocumentationLayout() {
    const location = useLocation();
    const currentPath = location.pathname;

    const renderContent = () => {
        if (currentPath === '/') {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    Welcome to TS Markdown Documentation
                </div>
            );
        }

        try {
            // Load content synchronously
            const { frontmatter, rawContent } = loadMarkdownContentSync(currentPath);

            // Update document title
            if (frontmatter?.title) {
                document.title = `${frontmatter.title} - TS Markdown Documentation`;
            }

            return (
                <div>
                    {/* Page Header with Title and Description */}
                    {frontmatter && (
                        <div className="mb-6 pb-6 border-b border-border">
                            {/* Page Actions */}
                            {frontmatter && rawContent && (
                                <PageActions
                                    title={frontmatter.title}
                                    description={frontmatter.description}
                                    content={rawContent}
                                    frontmatter={frontmatter}
                                />
                            )}

                            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                                {frontmatter.title}
                            </h1>
                            {frontmatter.description && (
                                <p className="text-xl font-normal leading-7">
                                    {frontmatter.description}
                                </p>
                            )}
                        </div>
                    )}


                    {/* Render markdown with ReactMarkdown */}
                    <MarkdownRenderer content={rawContent} />
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
                <div className="flex gap-12 w-full max-w-7xl mx-auto">
                    {/* Dynamic Sidebar Navigation */}
                    <DynamicSidebar sections={sidebar} />

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="w-[90%]">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
