import { readFileSync } from 'fs';
import { join } from 'path';
import { parseForESLint, validateForESLint, extractTypeInfo } from './src/parser/eslint-parser';

function testESLintParser() {
    console.log('Testing ESLint Parser...\n');

    // Test with SimpleComponent.bmdx
    const simpleComponentPath = join(__dirname, 'bmdx', 'SimpleComponent.bmdx');
    const simpleComponentSource = readFileSync(simpleComponentPath, 'utf-8');

    console.log('=== Testing SimpleComponent.bmdx ===');

    // Test validation
    const validation = validateForESLint(simpleComponentSource);
    console.log('Can parse for ESLint:', validation.canParse);
    console.log('Validation diagnostics:', validation.diagnostics);

    if (validation.canParse) {
        // Test full parsing
        const parseResult = parseForESLint(simpleComponentSource, {
            includeMarkdownStub: true,
            fileName: 'SimpleComponent.bmdx'
        });

        console.log('\nParse result:');
        console.log('  Success:', parseResult.success);
        console.log('  Has AST:', !!parseResult.ast);
        console.log('  TypeScript prelude length:', parseResult.tsPrelude?.length || 0);
        console.log('  Markdown body length:', parseResult.markdownBody?.length || 0);
        console.log('  Diagnostics:', parseResult.diagnostics);

        if (parseResult.ast) {
            console.log('\nAST info:');
            console.log('  Type:', parseResult.ast.type);
            console.log('  Body length:', parseResult.ast.body?.length || 0);

            // Show first few statements
            if (parseResult.ast.body && parseResult.ast.body.length > 0) {
                console.log('  First statement type:', parseResult.ast.body[0].type);
                if (parseResult.ast.body[0].type === 'FunctionDeclaration') {
                    console.log('  Function name:', parseResult.ast.body[0].id?.name);
                }
            }
        }
        // Test type extraction
        const typeInfo = extractTypeInfo(simpleComponentSource);
        console.log('\nType extraction:');
        console.log('  Success:', typeInfo.success);
        console.log('  Types found:', typeInfo.types);
        console.log('  Interfaces found:', typeInfo.interfaces);
        console.log('  Diagnostics:', typeInfo.diagnostics);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test with ConditionalExample.bmdx
    const conditionalPath = join(__dirname, 'bmdx', 'ConditionalExample.bmdx');
    const conditionalSource = readFileSync(conditionalPath, 'utf-8');

    console.log('=== Testing ConditionalExample.bmdx ===');

    const conditionalValidation = validateForESLint(conditionalSource);
    console.log('Can parse for ESLint:', conditionalValidation.canParse);
    console.log('Validation diagnostics:', conditionalValidation.diagnostics);

    if (conditionalValidation.canParse) {
        const conditionalParse = parseForESLint(conditionalSource, {
            includeMarkdownStub: false,
            fileName: 'ConditionalExample.bmdx'
        });

        console.log('Parse success:', conditionalParse.success);
        console.log('Has AST:', !!conditionalParse.ast);
        console.log('Diagnostics:', conditionalParse.diagnostics);
    }

    console.log('\nESLint Parser test completed!');
}

testESLintParser();