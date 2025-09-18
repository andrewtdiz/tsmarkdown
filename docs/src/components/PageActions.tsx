import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, Check } from 'lucide-react';

interface PageActionsProps {
    title: string;
    description: string;
    content: string;
    frontmatter: any;
}

export function PageActions({ title, description, content, frontmatter }: PageActionsProps) {
    const [copied, setCopied] = useState(false);

    const generateMarkdown = () => {
        // Create a clean markdown version of the content
        const frontmatterLines = ['---'];
        frontmatterLines.push(`title: ${title}`);
        frontmatterLines.push(`description: ${description}`);

        if (frontmatter.date) {
            frontmatterLines.push(`date: ${frontmatter.date}`);
        }
        if (frontmatter.author) {
            frontmatterLines.push(`author: ${frontmatter.author}`);
        }
        if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
            frontmatterLines.push(`tags: [${frontmatter.tags.join(', ')}]`);
        }
        if (frontmatter.version) {
            frontmatterLines.push(`version: ${frontmatter.version}`);
        }
        if (frontmatter.published !== undefined) {
            frontmatterLines.push(`published: ${frontmatter.published}`);
        }

        frontmatterLines.push('---');
        frontmatterLines.push('');
        frontmatterLines.push(`# ${title}`);
        frontmatterLines.push('');
        frontmatterLines.push(description);
        frontmatterLines.push('');
        frontmatterLines.push(content);

        return frontmatterLines.join('\n');
    };

    const copyAsMarkdown = async () => {
        try {
            const markdown = generateMarkdown();
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const askChatGPT = () => {
        const url = window.location.href;
        const prompt = `I'm looking at the documentation for ts markdown: ${url}.
Help me understand how to use it. Be ready to explain concepts, give examples, or help debug based on it.`;

        const chatGPTUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
        window.open(chatGPTUrl, '_blank');
    };

    return (
        <div className="w-full flex justify-end items-center gap-1 pt-3 pb-1">
            <Button
                variant="ghost"
                size="sm"
                onClick={copyAsMarkdown}
                className="flex items-center rounded-md text-foreground/70 font-normal hover:text-foreground h-6! gap-2"
            >
                {copied ? (
                    <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy className="h-4 w-4" />
                        Copy as Markdown
                    </>
                )}
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={askChatGPT}
                className="flex items-center rounded-md text-foreground/70 font-normal hover:text-foreground h-6! gap-2"
            >
                <MessageSquare className="h-4 w-4" />
                Ask ChatGPT
            </Button>
        </div>
    );
}