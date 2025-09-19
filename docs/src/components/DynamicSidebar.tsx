import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from '../lib/utils';
import * as LucideIcons from 'lucide-react';

interface ContentMetadata {
    title: string;
    description: string;
    route: string;
}

interface SidebarLink {
    href: string;
    children: string;
    icon?: string;
}

interface SidebarSection {
    title: string;
    links: SidebarLink[];
}

interface DynamicSidebarProps {
    sections: SidebarSection[];
}

export function DynamicSidebar({ sections }: DynamicSidebarProps) {
    const [contentMetadata, setContentMetadata] = useState<Record<string, ContentMetadata>>({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch('/api/content-metadata');
                if (response.ok) {
                    const metadata = await response.json();
                    setContentMetadata(metadata);
                }
            } catch (error) {
                console.error('Failed to fetch content metadata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, []);

    const getDisplayTitle = (link: SidebarLink): string => {
        const metadata = contentMetadata[link.href];
        return metadata?.title || link.children;
    };

    if (loading) {
        return (
            <aside className="w-64 flex-shrink-0 overflow-y-auto">
                <nav className="space-y-6">
                    <div className="text-muted-foreground text-sm">Loading navigation...</div>
                </nav>
            </aside>
        );
    }

    return (
        <aside className="w-64 flex-shrink-0 py-8 overflow-y-auto">
            <nav className="space-y-6">
                {sections.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-2 text-xs mb-3 uppercase font-normal text-muted-foreground/85 mb-1 leading-tight">
                            {section.title}
                        </h3>
                        <ul className="space-y-1">
                            {section.links.map((link) => {
                                const IconComponent = link.icon ? LucideIcons[link.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }> : null;
                                const displayTitle = getDisplayTitle(link);
                                const isActive = location.pathname === link.href;

                                return (
                                    <li key={link.href}>
                                        <Button
                                            variant={'ghost'}
                                            className={cn(
                                                "w-full justify-start duration-0 font-normal text-foreground/80 hover:text-foreground rounded-md text-left h-auto py-1 px-3 font-normal",
                                                isActive && "text-foreground bg-muted  hover:bg-muted/80!",
                                                !isActive && "hover:bg-transparent"
                                            )}
                                            onClick={() => navigate(link.href)}
                                            title={contentMetadata[link.href]?.description}
                                        >
                                            <div className="flex items-center gap-2">
                                                {IconComponent && <IconComponent className="h-3.5! w-3.5! text-foreground/50!" />}
                                                <span className="truncate">{displayTitle}</span>
                                            </div>
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
