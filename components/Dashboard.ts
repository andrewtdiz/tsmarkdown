export function Dashboard({ title, showHeader }: { title?: string, showHeader?: boolean }) {
    return `# Dashboard
    Content
    ${title ?? 'No title'}
    ${showHeader ?? 'No showHeader'}
    `
}
