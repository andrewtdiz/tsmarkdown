import { test, expect, describe } from 'bun:test';
import {
    ExactTSMDTestRunner,
    createTSmdTest,
    createTSmdTestSuite
} from '../../src/testing';

describe('TS Markdown Features', () => {
    const runner = new ExactTSMDTestRunner();

    describe('Code and Syntax Highlighting', () => {
        test('should render inline code correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/code-syntax-highlighting.tsmd').text();
            const testCase = createTSmdTest(
                'Code and syntax highlighting - inline code',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .withSourceFile(import.meta.dir + '/code-syntax-highlighting.tsmd')
                .expectExactLines(
                    '# Code and Syntax Highlighting',
                    '',
                    '## Inline Code',
                    '',
                    'This is `inline code` with backticks.',
                    '',
                    'You can have multiple `inline code snippets` in the same paragraph.',
                    '',
                    '## Code Blocks',
                    '',
                    'Here\'s a simple code block:',
                    '',
                    '```',
                    'function hello() {',
                    '    console.log("Hello, world!");',
                    '}',
                    '```',
                    '',
                    '## Syntax Highlighted Code Blocks',
                    '',
                    'JavaScript code:',
                    '',
                    '```javascript',
                    'function greet(name) {',
                    '    return `Hello, ${name}!`;',
                    '}',
                    '',
                    'const message = greet("World");',
                    'console.log(message);',
                    '```',
                    '',
                    'TypeScript code:',
                    '',
                    '```typescript',
                    'interface User {',
                    '    name: string;',
                    '    age: number;',
                    '}',
                    '',
                    'function createUser(name: string, age: number): User {',
                    '    return { name, age };',
                    '}',
                    '```',
                    '',
                    'Python code:',
                    '',
                    '```python',
                    'def fibonacci(n):',
                    '    if n <= 1:',
                    '        return n',
                    '    return fibonacci(n-1) + fibonacci(n-2)',
                    '',
                    'print(fibonacci(10))',
                    '```',
                    '',
                    '## Mixed Content',
                    '',
                    'You can mix `inline code` with regular text and code blocks:',
                    '',
                    '```bash',
                    'npm install tsmarkdown',
                    '```',
                    '',
                    'Then use it in your project with `import { parseTSmd } from \'tsmarkdown\'`.'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Text Formatting', () => {
        test('should render bold, italic, and strikethrough text correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/text-formatting.tsmd').text();
            const testCase = createTSmdTest(
                'Text formatting - bold, italic, strikethrough',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .withSourceFile(import.meta.dir + '/text-formatting.tsmd')
                .expectExactLines(
                    '# Text Formatting',
                    '',
                    '## Bold Text',
                    '',
                    'This is **bold text** using double asterisks.',
                    '',
                    'This is also __bold text__ using double underscores.',
                    '',
                    '## Italic Text',
                    '',
                    'This is *italic text* using single asterisks.',
                    '',
                    'This is also _italic text_ using single underscores.',
                    '',
                    '## Strikethrough Text',
                    '',
                    'This is ~~strikethrough text~~ using double tildes.',
                    '',
                    '## Combined Formatting',
                    '',
                    'You can combine formatting:',
                    '',
                    '- ***Bold and italic*** using triple asterisks',
                    '- **_Bold and italic_** using mixed symbols',
                    '- **Bold with *italic* inside**',
                    '- *Italic with **bold** inside*',
                    '- ~~Strikethrough with **bold**~~',
                    '- ~~Strikethrough with *italic*~~',
                    '- ***~~Bold, italic, and strikethrough~~***',
                    '',
                    '## Inline Code with Formatting',
                    '',
                    'You can use `inline code` with **bold** and *italic* text.',
                    '',
                    '## Mixed Paragraphs',
                    '',
                    'This paragraph has **bold text** and *italic text*.',
                    '',
                    'This paragraph has ~~strikethrough~~ and `inline code`.',
                    '',
                    'This paragraph combines ***all formatting*** including `code`.'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Simple Tables', () => {
        test('should render tables correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/simple-tables.tsmd').text();
            const testCase = createTSmdTest(
                'Simple tables - basic and formatted',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Simple Tables',
                    '',
                    '## Basic Table',
                    '',
                    '| Name | Age | City |',
                    '|------|-----|------|',
                    '| Alice | 25 | New York |',
                    '| Bob | 30 | London |',
                    '| Charlie | 35 | Tokyo |',
                    '',
                    '## Table with Alignment',
                    '',
                    '| Left Aligned | Center Aligned | Right Aligned |',
                    '|:-------------|:--------------:|--------------:|',
                    '| Left | Center | Right |',
                    '| Text | Text | Text |',
                    '',
                    '## Table with Empty Cells',
                    '',
                    '| Name | Age | City | Country |',
                    '|------|-----|------|---------|',
                    '| Alice | 25 | New York | USA |',
                    '| Bob | | London | UK |',
                    '| Charlie | 35 | | Japan |',
                    '',
                    '## Table with Special Characters',
                    '',
                    '| Symbol | Name | Description |',
                    '|--------|------|-------------|',
                    '| * | Asterisk | Used for emphasis |',
                    '| ` | Backtick | Used for code |',
                    '| ** | Bold | Double asterisk |',
                    '| ~~ | Strikethrough | Double tilde |',
                    '',
                    '## Table with Code',
                    '',
                    '| Language | Example |',
                    '|----------|---------|',
                    '| JavaScript | `console.log("Hello")` |',
                    '| Python | `print("Hello")` |',
                    '| HTML | `<div>Hello</div>` |',
                    '',
                    '## Table with Links',
                    '',
                    '| Website | Description |',
                    '|---------|-------------|',
                    '| [Google](https://google.com) | Search engine |',
                    '| [GitHub](https://github.com) | Code repository |',
                    '| [MDN](https://developer.mozilla.org) | Web documentation |'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Links', () => {
        test('should render various link types correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/links.tsmd').text();
            const testCase = createTSmdTest(
                'Links - basic, reference, and formatted',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Links',
                    '',
                    '## Basic Links',
                    '',
                    'This is a [link to Google](https://google.com).',
                    '',
                    'Here\'s a [link to GitHub](https://github.com) for code repositories.',
                    '',
                    '## Links with Titles',
                    '',
                    'This link has a [title attribute](https://example.com "This is a title").',
                    '',
                    '## Reference Links',
                    '',
                    'This is a [reference link][1] and this is [another reference][ref].',
                    '',
                    '[1]: https://example.com',
                    '[ref]: https://github.com "GitHub Repository"',
                    '',
                    '## Auto Links',
                    '',
                    'Visit https://example.com for more information.',
                    '',
                    'Send an email to user@example.com for support.',
                    '',
                    '## Links with Formatting',
                    '',
                    'This is a **[bold link](https://example.com)**.',
                    '',
                    'This is an *italic link* to [GitHub](https://github.com).',
                    '',
                    '## Links in Lists',
                    '',
                    '- [Home](https://example.com)',
                    '- [About](https://example.com/about)',
                    '- [Contact](https://example.com/contact)',
                    '',
                    '## Links in Tables',
                    '',
                    '| Page | URL |',
                    '|------|-----|',
                    '| Home | [example.com](https://example.com) |',
                    '| About | [About Page](https://example.com/about) |',
                    '',
                    '## Links with Special Characters',
                    '',
                    '- [Link with spaces](https://example.com/path with spaces)',
                    '- [Link with query](https://example.com/search?q=test)',
                    '- [Link with fragment](https://example.com/page#section)',
                    '',
                    '## Relative Links',
                    '',
                    '- [Local file](./local-file.md)',
                    '- [Parent directory](../parent.md)',
                    '- [Root file](/root-file.md)'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Block Quotes', () => {
        test('should render block quotes correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/block-quotes.tsmd').text();
            const testCase = createTSmdTest(
                'Block quotes - simple, nested, and formatted',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Block Quotes',
                    '',
                    '## Simple Block Quote',
                    '',
                    '> This is a simple block quote.',
                    '> ',
                    '> It can span multiple lines.',
                    '',
                    '## Block Quote with Attribution',
                    '',
                    '> The best way to predict the future is to invent it.',
                    '> ',
                    '> — Alan Kay',
                    '',
                    '## Nested Block Quotes',
                    '',
                    '> This is the outer quote.',
                    '> ',
                    '> > This is a nested quote inside the outer quote.',
                    '> > It can have multiple levels.',
                    '',
                    '## Block Quote with Formatting',
                    '',
                    '> This block quote contains **bold text** and *italic text*.',
                    '> ',
                    '> It also has `inline code` and [links](https://example.com).',
                    '',
                    '## Block Quote with Lists',
                    '',
                    '> Here\'s a block quote with a list:',
                    '> ',
                    '> 1. First item',
                    '> 2. Second item',
                    '> 3. Third item',
                    '',
                    '## Block Quote with Code',
                    '',
                    '> Here\'s a code block inside a quote:',
                    '> ',
                    '> ```javascript',
                    '> function example() {',
                    '>     return "Hello, world!";',
                    '> }',
                    '> ```',
                    '',
                    '## Multiple Block Quotes',
                    '',
                    '> First quote',
                    '',
                    '> Second quote',
                    '',
                    '> Third quote'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Task Lists (Checkboxes)', () => {
        test('should render task lists correctly', async () => {
            const contents = await Bun.file(import.meta.dir + '/task-lists.tsmd').text();
            const testCase = createTSmdTest(
                'Task lists - checkboxes and nested',
                contents
            )
                .withContext({ basePath: import.meta.dir })
                .expectExactLines(
                    '# Task Lists (Checkboxes)',
                    '',
                    '## Simple Task List',
                    '',
                    '- [x] Completed task',
                    '- [ ] Incomplete task',
                    '- [x] Another completed task',
                    '- [ ] Another incomplete task',
                    '',
                    '## Task List with Mixed Content',
                    '',
                    '- [x] **Bold completed task**',
                    '- [ ] *Italic incomplete task*',
                    '- [x] Task with `inline code`',
                    '- [ ] Task with [link](https://example.com)',
                    '',
                    '## Nested Task Lists',
                    '',
                    '- [x] Main task',
                    '  - [x] Sub-task 1',
                    '  - [ ] Sub-task 2',
                    '    - [x] Sub-sub-task 1',
                    '    - [ ] Sub-sub-task 2',
                    '- [ ] Another main task',
                    '  - [x] Sub-task 3',
                    '  - [ ] Sub-task 4',
                    '',
                    '## Task List with Numbers',
                    '',
                    '1. [x] First numbered task',
                    '2. [ ] Second numbered task',
                    '3. [x] Third numbered task',
                    '',
                    '## Task List with Long Descriptions',
                    '',
                    '- [x] This is a completed task with a very long description that spans multiple lines and contains detailed information about what needs to be done.',
                    '- [ ] This is an incomplete task with a very long description that spans multiple lines and contains detailed information about what needs to be done.',
                    '',
                    '## Task List with Code Blocks',
                    '',
                    '- [x] Implement the following function:',
                    '  ```javascript',
                    'function greet(name) {',
                    '    return `Hello, ${name}!`;',
                    '}',
                    '```',
                    '- [ ] Add error handling to the function above',
                    '',
                    '## Task List with Tables',
                    '',
                    '- [x] Create a table with the following structure:',
                    '  | Name | Status |',
                    '  |------|--------|',
                    '  | Task 1 | Done |',
                    '  | Task 2 | Pending |',
                    '- [ ] Update the table with more data'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });

    describe('Markdown Feature Integration', () => {
        test('should handle markdown features without interfering with TS Markdown syntax', async () => {
            const contents = await Bun.file(import.meta.dir + '/markdown-integration.tsmd').text();
            const testCase = createTSmdTest(
                'Markdown integration with TS Markdown features',
                contents
            )
                .withContext({ basePath: import.meta.dir, userName: 'Developer' })
                .expectExactLines(
                    '# Welcome Developer!',
                    '',
                    'This document demonstrates that **markdown formatting** works alongside TS Markdown features.',
                    '',
                    '## Code Examples',
                    '',
                    'Here\'s some `inline code` and a code block:',
                    '',
                    '```javascript',
                    'function greet(name) {',
                    '    return `Hello, ${name}!`;',
                    '}',
                    '```',
                    '',
                    '## Links and Tables',
                    '',
                    'Visit [TS Markdown](https://tsmarkdown.dev) for more information.',
                    '',
                    '| Feature | Status |',
                    '|---------|--------|',
                    '| Interpolation | ✅ Working |',
                    '| Conditionals | ✅ Working |',
                    '| Markdown | ✅ Working |',
                    '',
                    '> This block quote shows that all features work together seamlessly.'
                )
                .build();

            const result = await runner.runTestCase(testCase);
            expect(result.passed).toBe(true);
        });
    });
});
