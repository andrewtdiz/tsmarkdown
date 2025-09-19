import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Callout } from '../Callout';
import { markdownComponents as advancedComponents } from './components';
import { Copy } from 'lucide-react';

// Heading Components
export const Heading1 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
        className={cn("scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl text-foreground mt-8 mb-4 first:mt-0", className)}
        {...props}
    >
        {children}
    </h1>
);

export const Heading2 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
        className={cn("scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight text-foreground mt-5 mb-2 first:mt-0", className)}
        {...props}
    >
        {children}
    </h2>
);

export const Heading3 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
        className={cn("scroll-m-20 text-lg font-semibold tracking-tight text-foreground mt-5 mb-2", className)}
        {...props}
    >
        {children}
    </h3>
);

export const Heading4 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
        className={cn("scroll-m-20 text-lg font-semibold tracking-tight text-foreground mt-2 mb-1", className)}
        {...props}
    >
        {children}
    </h4>
);

export const Heading5 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5
        className={cn("scroll-m-20 text-lg font-semibold tracking-tight text-foreground mt-2 mb-1", className)}
        {...props}
    >
        {children}
    </h5>
);

export const Heading6 = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
        className={cn("scroll-m-20 text-lg font-semibold tracking-tight text-foreground mt-2 mb-1", className)}
        {...props}
    >
        {children}
    </h6>
);

// Text Components
export const Paragraph = ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
        className={cn("leading-7 text-foreground/90 mt-4 mb-4 first:mt-0", className)}
        {...props}
    >
        {children}
    </p>
);

export const Blockquote = ({ children, className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
        className={cn("mt-6 mb-6 border-l-2 border-border pl-6 italic text-foreground/80", className)}
        {...props}
    >
        {children}
    </blockquote>
);

export const Code = ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
        className={cn("relative rounded bg-transparent! px-[0.3rem] py-[0.2rem] font-mono text-sm text-foreground", className)}
        {...props}
    >
        {children}
    </code>
);

export const CodeBlock = ({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
        className={cn("relative mt-3 mb-3 overflow-x-auto rounded-md border bg-muted/50 p-3", className)}
        {...props}
    >
        <Button variant="ghost" size="sm" className="absolute z-10 top-2 right-2 border h-10 w-10">
            <Copy className="h-4 w-4" />
        </Button>
        {children}
    </pre>
);

// List Components
export const UnorderedList = ({ children, className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
        className={cn("mt-6 mb-6 ml-6 list-disc [&>li]:mt-2", className)}
        {...props}
    >
        {children}
    </ul>
);

export const OrderedList = ({ children, className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
        className={cn("mt-6 mb-6 ml-6 list-decimal [&>li]:mt-2", className)}
        {...props}
    >
        {children}
    </ol>
);

export const ListItem = ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
        className={cn("text-foreground/90 mt-1 mb-1", className)}
        {...props}
    >
        {children}
    </li>
);

// Link and Button Components
export const Link = ({ children, className, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
        className={cn("font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors", className)}
        href={href}
        {...props}
    >
        {children}
    </a>
);

export const MarkdownButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <Button
        className={cn("mt-4", className)}
        {...props}
    >
        {children}
    </Button>
);

// Table Components
export const Table = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="mt-6 mb-6 w-full overflow-y-auto">
        <table
            className={cn("w-full border-collapse border border-border", className)}
            {...props}
        >
            {children}
        </table>
    </div>
);

export const TableHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead
        className={cn("[&_tr]:border-b bg-muted/50", className)}
        {...props}
    >
        {children}
    </thead>
);

export const TableBody = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    >
        {children}
    </tbody>
);

export const TableRow = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        className={cn("m-0 border-t border-border p-0 even:bg-muted/50", className)}
        {...props}
    >
        {children}
    </tr>
);

export const TableHead = ({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
    <th
        className={cn("border border-border px-4 py-2 text-left font-medium text-foreground [&[align=center]]:text-center [&[align=right]]:text-right", className)}
        {...props}
    >
        {children}
    </th>
);

export const TableCell = ({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
    <td
        className={cn("border border-border px-4 py-2 text-left text-foreground [&[align=center]]:text-center [&[align=right]]:text-right", className)}
        {...props}
    >
        {children}
    </td>
);

// Horizontal Rule
export const HorizontalRule = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <Separator className={cn("mt-8 mb-8", className)} {...props} />
);

// Alert Components
export const AlertComponent = ({
    variant = "default",
    title,
    children,
    className,
    ...props
}: {
    variant?: "default" | "destructive";
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Alert className={cn("mt-6 mb-6", className)} variant={variant} {...props}>
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{children}</AlertDescription>
    </Alert>
);

// Card Components for structured content
export const InfoCard = ({ title, children, className, ...props }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Card className={cn("mt-6 mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950", className)} {...props}>
        {title && (
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 dark:text-blue-200">{title}</CardTitle>
            </CardHeader>
        )}
        <CardContent className="text-sm text-blue-700 dark:text-blue-300">
            {children}
        </CardContent>
    </Card>
);

export const WarningCard = ({ title, children, className, ...props }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Card className={cn("mt-6 mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950", className)} {...props}>
        {title && (
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">{title}</CardTitle>
            </CardHeader>
        )}
        <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
            {children}
        </CardContent>
    </Card>
);

export const ErrorCard = ({ title, children, className, ...props }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Card className={cn("mt-6 mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950", className)} {...props}>
        {title && (
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 dark:text-red-200">{title}</CardTitle>
            </CardHeader>
        )}
        <CardContent className="text-sm text-red-700 dark:text-red-300">
            {children}
        </CardContent>
    </Card>
);

export const SuccessCard = ({ title, children, className, ...props }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <Card className={cn("mt-6 mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950", className)} {...props}>
        {title && (
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800 dark:text-green-200">{title}</CardTitle>
            </CardHeader>
        )}
        <CardContent className="text-sm text-green-700 dark:text-green-300">
            {children}
        </CardContent>
    </Card>
);

// Badge Components
export const InlineBadge = ({ children, variant = "secondary", className, ...props }: {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
}) => (
    <Badge variant={variant} className={cn("mx-1", className)} {...props}>
        {children}
    </Badge>
);

// Export all components as a single object for ReactMarkdown
export const markdownComponents = {
    // Headings - ReactMarkdown uses lowercase keys
    h1: Heading1,
    h2: Heading2,
    h3: Heading3,
    h4: Heading4,
    h5: Heading5,
    h6: Heading6,

    // Text elements
    p: Paragraph,
    blockquote: Blockquote,
    code: Code,
    pre: CodeBlock,

    // Lists
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,

    // Interactive elements
    a: Link,
    button: MarkdownButton,

    // Tables
    table: Table,
    thead: TableHeader,
    tbody: TableBody,
    tr: TableRow,
    th: TableHead,
    td: TableCell,

    hr: HorizontalRule,

    // Standard HTML elements - use React components
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <p className='inline font-semibold' {...props}>{children}</p>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <em {...props}>{children}</em>
    ),
    img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <img src={src} alt={alt} className="rounded-lg border border-border" {...props} />
    ),
    figure: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <figure {...props}>{children}</figure>
    ),
    figcaption: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <figcaption className="text-center text-sm text-foreground/60 mt-2" {...props}>
            {children}
        </figcaption>
    ),

    // Custom components
    Alert: AlertComponent,
    Callout,
    InfoCard,
    WarningCard,
    ErrorCard,
    SuccessCard,
    Badge: InlineBadge,

    // Advanced components
    ...advancedComponents,
};

export default markdownComponents;
