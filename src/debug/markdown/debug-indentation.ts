import { normalizeIndentation } from '../../renderer/string-helpers';

function debugIndentation() {
  console.log('=== Debugging Indentation Normalization ===\n');

  const content = `    # Task Lists (Checkboxes)

    ## Simple Task List

    - [x] Completed task
    - [ ] Incomplete task
    - [x] Another completed task
    - [ ] Another incomplete task

    ## Task List with Mixed Content

    - [x] **Bold completed task**
    - [ ] *Italic incomplete task*
    - [x] Task with \`inline code\`
    - [ ] Task with [link](https://example.com)

    ## Nested Task Lists

    - [x] Main task
      - [x] Sub-task 1
      - [ ] Sub-task 2
        - [x] Sub-sub-task 1
        - [ ] Sub-sub-task 2
    - [ ] Another main task
      - [x] Sub-task 3
      - [ ] Sub-task 4

    ## Task List with Numbers

    1. [x] First numbered task
    2. [ ] Second numbered task
    3. [x] Third numbered task

    ## Task List with Long Descriptions

    - [x] This is a completed task with a very long description that spans multiple lines and contains detailed information about what needs to be done.
    - [ ] This is an incomplete task with a very long description that spans multiple lines and contains detailed information about what needs to be done.

    ## Task List with Code Blocks

    - [x] Implement the following function:
      \`\`\`javascript
      function greet(name) {
          return \`Hello, \${name}!\`;
      }
      \`\`\`
    - [ ] Add error handling to the function above

    ## Task List with Tables

    - [x] Create a table with the following structure:
      | Name | Status |
      |------|--------|
      | Task 1 | Done |
      | Task 2 | Pending |
    - [ ] Update the table with more data`;

  console.log('Original content:');
  console.log(content);
  console.log('\n' + '='.repeat(50) + '\n');

  const normalized = normalizeIndentation(content);

  console.log('Normalized content:');
  console.log(normalized);
  console.log('\n' + '='.repeat(50) + '\n');

  // Let's analyze the indentation levels
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  const indentLevels = nonEmptyLines.map(line => line.match(/^(\s*)/)?.[1].length ?? 0);

  console.log('Indentation analysis:');
  console.log('Non-empty lines:', nonEmptyLines.length);
  console.log('Indentation levels:', indentLevels);

  // Count indentation levels
  const indentCounts = indentLevels.reduce((acc, level) => {
    if (level > 0) {
      acc[level] = (acc[level] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  console.log('Indentation counts:', indentCounts);

  // Find the most common non-zero indentation
  let targetIndent = 0;
  if (Object.keys(indentCounts).length > 0) {
    targetIndent = parseInt(Object.keys(indentCounts).reduce((a, b) =>
      indentCounts[parseInt(a)] > indentCounts[parseInt(b)] ? a : b
    ));
  }

  console.log('Target indent:', targetIndent);
}

// Run the debug function
debugIndentation();
