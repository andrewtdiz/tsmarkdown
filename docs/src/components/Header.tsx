import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon } from 'lucide-react';

interface HeaderProps {
    showNavigation?: boolean;
}

export function Header({ showNavigation = true }: HeaderProps) {
    const navigate = useNavigate();

    const themeToggle = useTheme();

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
                            TS Markdown
                        </Button>
                    </div>
                    {showNavigation && (
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                className='text-md text-foreground/80 font-normal'
                                onClick={() => navigate('/welcome')}
                            >
                                 Docs
                            </Button>
                            <Button
                                variant="ghost"
                                className='text-md text-foreground/80 font-normal'
                                onClick={() => navigate('/about')}
                            >
                                About
                            </Button>
                            <Button
                                variant="ghost"
                                className='text-lg text-foreground/80 font-normal'
                                onClick={() => themeToggle.setTheme(themeToggle.theme === 'dark' ? 'light' : 'dark')}
                            >
                                {themeToggle.theme === 'dark' ? <SunIcon className='w-4 h-4' /> : <MoonIcon className='w-4 h-4' />}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
