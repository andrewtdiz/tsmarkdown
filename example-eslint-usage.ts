// Example: How to use the new ESLint integration features

import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  parseForESLint, 
  validateForESLint, 
  extractTypeInfo,
  locateComponent,
  splitComponent,
  validateComponentStructure
} from './src/parser/parser-utils';

/**
 * Example 1: Basic ESLint parsing
 */
function exampleBasicESLintParsing() {
    console.log('=== Example 1: Basic ESLint Parsing ===');
    
    const source = `
  async function MyComponent() {
    const user = { name: "John", age: 30 };
    const isAdult = user.age >= 18;
    
    return (
      # User Profile
      Name: {{ user.name }}
      {{ isAdult ? "Adult" : "Minor" }}
    )
  }`;
  
    // Parse for ESLint
    const result = parseForESLint(source, {
      includeMarkdownStub: true,
      fileName: 'MyComponent.bmdx'
    });
  
    if (result.success) {
      console.log('✅ Successfully parsed for ESLint');
      console.log('AST type:', result.ast?.type);
      console.log('Function name:', result.ast?.body?.[0]?.id?.name);
    } else {
      console.log('❌ Failed to parse:', result.diagnostics);
    }
  }

/**
 * Example 2: Component validation
 */
function exampleComponentValidation() {
    console.log('\n=== Example 2: Component Validation ===');
    
    const source = `
  async function ValidComponent() {
    const data = await fetchData();
    
    return (
      # Data Display
      {{ data.title }}
    )
  }`;
  
    const validation = validateComponentStructure(source);
    
    if (validation.isValid) {
      console.log('✅ Component structure is valid');
      console.log('Function name:', validation.component?.functionName);
      console.log('TypeScript prelude length:', validation.split?.tsPrelude.length);
      console.log('Markdown body length:', validation.split?.markdownBody.length);
    } else {
      console.log('❌ Component structure is invalid:', validation.diagnostics);
    }
  }

/**
 * Example 3: Type extraction
 */
function exampleTypeExtraction() {
    console.log('\n=== Example 3: Type Extraction ===');
    
    const source = `
  interface User {
    name: string;
    age: number;
  }
  
  type Status = 'active' | 'inactive';
  
  async function TypedComponent() {
    const user: User = { name: "Alice", age: 25 };
    const status: Status = 'active';
    
    return (
      # User: {{ user.name }}
      Status: {{ status }}
    )
  }`;
  
    const typeInfo = extractTypeInfo(source);
    
    if (typeInfo.success) {
      console.log('✅ Type extraction successful');
      console.log('Types found:', typeInfo.types);
      console.log('Interfaces found:', typeInfo.interfaces);
    } else {
      console.log('❌ Type extraction failed:', typeInfo.diagnostics);
    }
  }

/**
 * Example 4: Real file processing
 */
function exampleRealFileProcessing() {
    console.log('\n=== Example 4: Real File Processing ===');
    
    try {
      const filePath = join(__dirname, 'bmdx', 'SimpleComponent.bmdx');
      const source = readFileSync(filePath, 'utf-8');
      
      // Validate the component
      const validation = validateForESLint(source);
      
      if (validation.canParse) {
        console.log('✅ File can be parsed for ESLint');
        
        // Parse for ESLint
        const result = parseForESLint(source, {
          includeMarkdownStub: true,
          fileName: 'SimpleComponent.bmdx'
        });
        
        if (result.success) {
          console.log('✅ Successfully parsed real file');
          console.log('AST has', result.ast?.body?.length, 'statements');
          
          // Extract type information
          const typeInfo = extractTypeInfo(source);
          console.log('Types/interfaces found:', typeInfo.types.length + typeInfo.interfaces.length);
        }
      } else {
        console.log('❌ File cannot be parsed:', validation.diagnostics);
      }
    } catch (error) {
      console.log('❌ Error processing file:', error);
    }
  }

function exampleIntegrationWithExistingPipeline() {
    console.log('\n=== Example 5: Integration with Existing Pipeline ===');
    
    const source = `
  async function IntegratedComponent() {
    const items = ['Apple', 'Banana', 'Orange'];
    const showList = true;
    
    return (
      # Shopping List
      {{ showList && (
        Items: {{ items.join(', ') }}
      ) }}
    )
  }`;
  
    // First, use the new ESLint functionality
    const validation = validateComponentStructure(source);
    
    if (validation.isValid && validation.split) {
      console.log('✅ Component structure validated');
      
      // Then, use the existing markdown processing pipeline
      const { parseContent } = require('./src/parser/parser-utils');
      
      // Process the markdown body with existing pipeline
      const context = {
        interpolations: [],
        conditionalBlocks: [],
        ternaryExpressions: [],
        jsxExpressions: []
      };
      
      const processedMarkdown = parseContent(validation.split.markdownBody, context);
      console.log('✅ Markdown processed with existing pipeline');
      console.log('Processed length:', processedMarkdown.length);
      
      // Both systems work together!
      console.log('✅ Integration successful - both systems work together');
    }
  }


// Run all examples
function runExamples() {
    console.log('Better MDX ESLint Integration Examples\n');
    
    exampleBasicESLintParsing();
    exampleComponentValidation();
    exampleTypeExtraction();
    exampleRealFileProcessing();
    exampleIntegrationWithExistingPipeline();
    
    console.log('\n🎉 All examples completed!');
    console.log('\nKey benefits of the ESLint integration:');
    console.log('• ✅ TypeScript syntax checking for component logic');
    console.log('• ✅ Type extraction and interface discovery');
    console.log('• ✅ ESLint-compatible AST generation');
    console.log('• ✅ Opt-in functionality - no breaking changes');
    console.log('• ✅ Works alongside existing markdown processing');
  }
  
  runExamples();