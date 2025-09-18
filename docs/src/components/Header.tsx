import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

interface HeaderProps {
    showNavigation?: boolean;
}

export function Header({ showNavigation = true }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    return (
        <header className="flex-shrink-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-4">
                <div className="flex items-center max-w-7xl mx-auto justify-between">
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            className="text-2xl font-bold p-0 h-auto hover:bg-transparent"
                            onClick={() => navigate('/')}
                        >
                            Better-MDX Documentation
                        </Button>
                    </div>
                    {showNavigation && (
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                className='text-lg text-foreground/80 font-normal'
                                onClick={() => navigate('/welcome')}
                            >
                                Welcome
                            </Button>
                            <Button
                                variant="ghost"
                                className='text-lg text-foreground/80 font-normal'
                                onClick={() => navigate('/about')}
                            >
                                About
                            </Button>
                            <Button
                                variant="ghost"
                                className='text-lg text-foreground/80 font-normal'
                                onClick={() => navigate('/frontmatter-examples')}
                            >
                                Frontmatter
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
