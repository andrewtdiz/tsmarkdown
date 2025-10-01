export interface CodeProtection {
    placeholder: string;
    content: string;
}

/**
 * Protects code blocks and inline code from TSmd parsing
 * This prevents { } syntax inside code from being treated as JavaScript expressions
 */
export function protectCodeBlocks(content: string): { protectedContent: string; codeBlocks: CodeProtection[] } {
    const codeBlocks: CodeProtection[] = [];
    let protectedContent = content;

    // First, protect code blocks (```...```)
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    protectedContent = protectedContent.replace(codeBlockRegex, (match, language, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({
            placeholder,
            content: match // Store the entire match including ``` markers
        });
        return placeholder;
    });

    // Then, protect inline code (`...`)
    const inlineCodeRegex = /`([^`\n]+)`/g;
    protectedContent = protectedContent.replace(inlineCodeRegex, (match, code) => {
        const placeholder = `__INLINE_CODE_${codeBlocks.length}__`;
        codeBlocks.push({
            placeholder,
            content: match // Store the entire match including backticks
        });
        return placeholder;
    });

    return { protectedContent, codeBlocks };
}
