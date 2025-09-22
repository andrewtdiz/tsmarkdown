import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    ExternalLink,
    Github,
    Download,
    ArrowRight
} from 'lucide-react';

// Enhanced Callout with icons
interface EnhancedCalloutProps {
    type?: 'check' | 'error' | 'note' | 'warning' | 'tip';
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export const EnhancedCallout = ({ type = 'note', title, children, className }: EnhancedCalloutProps) => {
    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'check':
                return {
                    icon: CheckCircle,
                    border: 'border-green-200 dark:border-green-800',
                    bg: 'bg-green-50 dark:bg-green-950',
                    text: 'text-green-800 dark:text-green-200',
                    iconColor: 'text-green-600 dark:text-green-400',
                    title: 'Success'
                };
            case 'error':
                return {
                    icon: XCircle,
                    border: 'border-red-200 dark:border-red-800',
                    bg: 'bg-red-50 dark:bg-red-950',
                    text: 'text-red-800 dark:text-red-200',
                    iconColor: 'text-red-600 dark:text-red-400',
                    title: 'Error'
                };
            case 'warning':
                return {
                    icon: AlertTriangle,
                    border: 'border-yellow-200 dark:border-yellow-800',
                    bg: 'bg-yellow-50 dark:bg-yellow-950',
                    text: 'text-yellow-800 dark:text-yellow-200',
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                    title: 'Warning'
                };
            case 'tip':
                return {
                    icon: Info,
                    border: 'border-purple-200 dark:border-purple-800',
                    bg: 'bg-purple-50 dark:bg-purple-950',
                    text: 'text-purple-800 dark:text-purple-200',
                    iconColor: 'text-purple-600 dark:text-purple-400',
                    title: 'Tip'
                };
            case 'note':
            default:
                return {
                    icon: Info,
                    border: 'border-blue-200 dark:border-blue-800',
                    bg: 'bg-blue-50 dark:bg-blue-950',
                    text: 'text-blue-800 dark:text-blue-200',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    title: 'Note'
                };
        }
    };

    const config = getTypeConfig(type);
    const IconComponent = config.icon;

    return (
        <Alert className={cn('my-6', config.border, config.bg)}>
            <IconComponent className={cn('h-4 w-4', config.iconColor)} />
            <AlertTitle className={cn(config.text)}>
                {title || config.title}
            </AlertTitle>
            <AlertDescription className={cn('text-sm', config.text)}>
                {children}
            </AlertDescription>
        </Alert>
    );
};

// Feature Card Component
interface FeatureCardProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    badge?: string;
    className?: string;
    children?: React.ReactNode;
}

export const FeatureCard = ({ title, description, icon, badge, className, children }: FeatureCardProps) => (
    <Card className={cn('h-full', className)}>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
                {badge && <Badge variant="secondary">{badge}</Badge>}
            </div>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && (
            <CardContent>
                {children}
            </CardContent>
        )}
    </Card>
);

// Code Example Component
interface CodeExampleProps {
    title?: string;
    description?: string;
    code: string;
    language?: string;
    className?: string;
}

export const CodeExample = ({ title, description, code, language = 'typescript', className }: CodeExampleProps) => (
    <Card className={cn('my-6', className)}>
        {(title || description) && (
            <CardHeader>
                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
        )}
        <CardContent>
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4">
                <code className="font-mono text-sm text-foreground">
                    {code}
                </code>
            </pre>
        </CardContent>
    </Card>
);

// Action Card Component
interface ActionCardProps {
    title: string;
    description: string;
    action: {
        label: string;
        href?: string;
        onClick?: () => void;
        variant?: 'default' | 'secondary' | 'outline';
        icon?: React.ReactNode;
    };
    className?: string;
}

export const ActionCard = ({ title, description, action, className }: ActionCardProps) => (
    <Card className={cn('my-6', className)}>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter>
            {action.href ? (
                <Button asChild variant={action.variant || 'default'}>
                    <a href={action.href} className="flex items-center gap-2">
                        {action.icon}
                        {action.label}
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </Button>
            ) : (
                <Button
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                    className="flex items-center gap-2"
                >
                    {action.icon}
                    {action.label}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            )}
        </CardFooter>
    </Card>
);

// Step Component
interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const Step = ({ number, title, children, className }: StepProps) => (
    <div className={cn('flex gap-4 my-6', className)}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
            {number}
        </div>
        <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">{title}</h4>
            <div className="text-foreground/90">{children}</div>
        </div>
    </div>
);

// Tabs Component (simple version)
interface TabsProps {
    children: React.ReactNode;
    className?: string;
}

export const Tabs = ({ children, className }: TabsProps) => (
    <div className={cn('my-6', className)}>
        {children}
    </div>
);

interface TabProps {
    label: string;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

export const Tab = ({ label, active, onClick, className }: TabProps) => (
    <button
        onClick={onClick}
        className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            active
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground/60 hover:text-foreground hover:border-border',
            className
        )}
    >
        {label}
    </button>
);

// Export all components
export const markdownComponents = {
    EnhancedCallout,
    FeatureCard,
    CodeExample,
    ActionCard,
    Step,
    Tabs,
    Tab,
};

