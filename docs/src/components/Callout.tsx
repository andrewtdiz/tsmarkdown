import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CalloutProps {
    type?: 'check' | 'error' | 'note' | 'warning';
    children: React.ReactNode;
}

export function Callout({ type = 'note', children }: CalloutProps) {
    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'check':
                return {
                    border: 'border-green-200 dark:border-green-800',
                    bg: 'bg-green-50 dark:bg-green-950',
                    icon: '✅',
                    title: 'Success'
                };
            case 'error':
                return {
                    border: 'border-red-200 dark:border-red-800',
                    bg: 'bg-red-50 dark:bg-red-950',
                    icon: '❌',
                    title: 'Error'
                };
            case 'warning':
                return {
                    border: 'border-yellow-200 dark:border-yellow-800',
                    bg: 'bg-yellow-50 dark:bg-yellow-950',
                    icon: '⚠️',
                    title: 'Warning'
                };
            case 'note':
            default:
                return {
                    border: 'border-blue-200 dark:border-blue-800',
                    bg: 'bg-blue-50 dark:bg-blue-950',
                    icon: 'ℹ️',
                    title: 'Note'
                };
        }
    };

    const styles = getTypeStyles(type);

    return (
        <Card className={cn('my-4', styles.border, styles.bg)}>
            <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{styles.icon}</span>
                    <div className="flex-1">
                        <div className="font-semibold text-sm mb-2 text-foreground/80">
                            {styles.title}
                        </div>
                        <div className="text-sm text-foreground/90">
                            {children}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
