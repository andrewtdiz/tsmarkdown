import { createExactMDXTest, ExactMDXTestRunner } from '../exact-testing-utilities';

async function debugTaskLists() {
    console.log('=== Debugging Task Lists Test ===\n');

    // Read the MDX file
    const mdxContent = await Bun.file('/Users/andrewdizenzo/better-mdx/test/markdown-features/task-lists.mdx').text();
    console.log('MDX Content:');
    console.log(mdxContent);
    console.log('\n' + '='.repeat(50) + '\n');

    // Create the test case
    const testCase = createExactMDXTest(
        'Task lists - checkboxes and nested',
        mdxContent
    )
        .withContext({ basePath: '/Users/andrewdizenzo/better-mdx/test/markdown-features' })
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

    console.log('Test Case Created');
    console.log('Expected lines:', testCase.expected?.exactLines?.length || 0);
    console.log('Expected content preview:', testCase.expected?.exactLines?.slice(0, 5) || []);
    console.log('\n' + '='.repeat(50) + '\n');

    // Run the test
    const runner = new ExactMDXTestRunner();
    const result = await runner.runTestCase(testCase);

    console.log('Test Result:');
    console.log('Passed:', result.passed);
    console.log('Error:', result.error);
    console.log('Actual line count:', result.actualLines?.length || 0);
    console.log('Expected line count:', testCase.expected?.exactLines?.length || 0);

    if (result.actualLines) {
        console.log('\nActual content:');
        result.actualLines.forEach((line, i) => {
            console.log(`${i + 1}: ${line}`);
        });
    }

    if (result.error) {
        console.log('\nError details:', result.error);
    }

    // Show more debug information
    console.log('\n=== Debug Details ===');
    console.log('Executed content:', result.details?.executed?.content);
    console.log('Rendered content:', result.details?.rendered);
    console.log('Compiled content:', result.details?.compiled);
    console.log('Parsed content:', result.details?.parsed);
}

// Run the debug function
debugTaskLists().catch(console.error);
