// Test how the component scanner handles return content

import { readFileSync } from 'fs';
import { join } from 'path';
import { splitComponent, locateComponent } from './src/parser/component-scanner';

function testReturnContentHandling() {
    console.log('Testing Return Content Handling...\n');

    // Test with the typed component
    const typedComponentPath = join(__dirname, 'test/eslint-migration/typed-component.mdx');
    const typedComponentSource = readFileSync(typedComponentPath, 'utf-8');

    console.log('=== Typed Component Analysis ===');

    // Show the component location
    const component = locateComponent(typedComponentSource);
    console.log('Component found:', !!component);
    if (component) {
        console.log('  Function name:', component.functionName);
        console.log('  Start index:', component.startIndex);
        console.log('  End index:', component.endIndex);
        console.log('  Is default export:', component.isDefaultExport);
    }

    // Show the split
    const split = splitComponent(typedComponentSource);
    console.log('\nComponent split:');
    console.log('  Has valid structure:', split.hasValidStructure);
    console.log('  Return start index:', split.returnStartIndex);
    console.log('  Return end index:', split.returnEndIndex);

    if (split.hasValidStructure) {
        console.log('\n=== TypeScript Prelude ===');
        console.log('Length:', split.tsPrelude.length);
        console.log('Content:');
        console.log(split.tsPrelude);

        console.log('\n=== Markdown Body ===');
        console.log('Length:', split.markdownBody.length);
        console.log('Content:');
        console.log(split.markdownBody);

        console.log('\n=== Analysis ===');
        console.log('TypeScript prelude contains:');
        console.log('  - Interface declaration:', split.tsPrelude.includes('interface User'));
        console.log('  - Type declaration:', split.tsPrelude.includes('type UserRole'));
        console.log('  - Function declaration:', split.tsPrelude.includes('const TypedComponent'));
        console.log('  - Variable declarations:', split.tsPrelude.includes('const user: User'));
        console.log('  - Return statement start:', split.tsPrelude.includes('return ('));

        console.log('\nMarkdown body contains:');
        console.log('  - Headers:', split.markdownBody.includes('# User Profile'));
        console.log('  - Interpolations:', split.markdownBody.includes('{{ user.name }}'));
        console.log('  - Conditionals:', split.markdownBody.includes('{{ isAdmin &&'));
        console.log('  - Ternary expressions:', split.markdownBody.includes('{{ user.isActive ?'));
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test with a simpler component
    const simpleComponentPath = join(__dirname, 'test/eslint-migration/simple-component.mdx');
    const simpleComponentSource = readFileSync(simpleComponentPath, 'utf-8');

    console.log('=== Simple Component Analysis ===');

    const simpleSplit = splitComponent(simpleComponentSource);
    console.log('Has valid structure:', simpleSplit.hasValidStructure);

    if (simpleSplit.hasValidStructure) {
        console.log('\nTypeScript prelude:');
        console.log(simpleSplit.tsPrelude);

        console.log('\nMarkdown body:');
        console.log(simpleSplit.markdownBody);
    }

    console.log('\nReturn content handling test completed!');
}

testReturnContentHandling();
