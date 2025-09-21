/**
 * Direct Rendering Example
 *
 * This example demonstrates how to use the new direct rendering architecture
 * that bypasses TypeScript compilation and renders functions directly with props.
 */

import {
    renderDirect,
    renderDirectSimple,
    DirectRenderer,
    adaptFunctionWithProps,
    type FunctionWithProps
} from '../src/index';

// Example 1: Simple direct rendering
async function example1_SimpleDirectRendering() {
    console.log('=== Example 1: Simple Direct Rendering ===');

    const functionString = `
    function Greeting({ name, age }) {
      return (
        # Hello {name}!

        You are {age} years old.

        (* This is a template with **bold** text and *italic* text *)
      );
    }
  `;

    const props = {
        name: "Alice",
        age: 30
    };

    try {
        const result = await renderDirectSimple(functionString, props);
        console.log('Rendered output:');
        console.log(result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 1b: Test the exact same format as the failing tests
async function example1b_TestFormat() {
    console.log('=== Example 1b: Test Format (like failing tests) ===');

    const functionString = `
    function BasicTest() {
      const greeting = 'Hello';
      const name = 'World';

      return (
        # {{ greeting }} {{ name }}!
      )
    }
  `;

    const props = {};

    try {
        const result = await renderDirectSimple(functionString, props);
        console.log('Rendered output:');
        console.log(result);
        console.log('Length:', result.length);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 2: Using DirectRenderer class
async function example2_DirectRendererClass() {
    console.log('\n=== Example 2: DirectRenderer Class ===');

    const renderer = new DirectRenderer({
        basePath: process.cwd(),
        context: { currentDate: new Date().toISOString() }
    });

    const functionString = `
    function BlogPost({ title, author, tags }) {
      const publishedDate = new Date().toLocaleDateString();

      return (
        # {title}

        By {author} on {publishedDate}

        ## Tags
        {tags.map(tag => (\`Tag: \${tag}\`)).join(', ')}

        ---
        Generated at: {currentDate}
      );
    }
  `;

    const props = {
        title: "Getting Started with Better-MDX",
        author: "Jane Doe",
        tags: ["tutorial", "mdx", "typescript"]
    };

    try {
        const result = await renderer.render(functionString, props);
        console.log('Render result:');
        console.log(result.content);
        console.log('Metadata:', result.metadata);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 3: Function with props adapter
async function example3_FunctionPropsAdapter() {
    console.log('\n=== Example 3: Function Props Adapter ===');

    const functionWithProps: FunctionWithProps = {
        functionString: `
      function ProductCard({ product, showPrice }) {
        return (
          # {product.name}

          {product.description}

          {showPrice && (
            Price: \${product.price}
          )}

          {product.inStock ? (
            In Stock
          ) : (
            Out of Stock
          )}
        );
      }
    `,
        props: {
            product: {
                name: "Wireless Headphones",
                description: "High-quality wireless headphones with noise cancellation",
                price: 199.99,
                inStock: true
            },
            showPrice: true
        },
        functionName: "ProductCard"
    };

    try {
        const adapted = adaptFunctionWithProps(functionWithProps);
        console.log('Adapted ParsedMDX function name:', adapted.functionName);

        // Now render using the adapted structure
        const renderer = new DirectRenderer();
        const result = await renderer.render(functionWithProps.functionString, functionWithProps.props);
        console.log('Rendered output:');
        console.log(result.content);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 4: Multiple functions rendering
async function example4_MultipleFunctions() {
    console.log('\n=== Example 4: Multiple Functions ===');

    const functions = [
        {
            name: "Header",
            content: `
        function Header({ siteTitle, navigation }) {
          return (
            # {siteTitle}

            Navigation: {navigation.join(' | ')}
          );
        }
      `
        },
        {
            name: "Footer",
            content: `
        function Footer({ copyrightYear, companyName }) {
          return (
            ---
            © {copyrightYear} {companyName}. All rights reserved.
          );
        }
      `
        }
    ];

    const props = {
        siteTitle: "My Awesome Site",
        navigation: ["Home", "About", "Contact"],
        copyrightYear: 2024,
        companyName: "Acme Corp"
    };

    try {
        const renderer = new DirectRenderer();
        const results = await renderer.renderMultiple(functions, props);

        console.log('All results:');
        Object.entries(results).forEach(([name, result]) => {
            console.log(`\n--- ${name} ---`);
            console.log(result.content);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 5: Comparison with old vs new approach
async function example5_Comparison() {
    console.log('\n=== Example 5: Old vs New Architecture Comparison ===');

    const functionString = `
    function UserProfile({ user, settings }) {
      const displayName = user.firstName + ' ' + user.lastName;
      const isPremium = user.subscription === 'premium';

      return (
        # {displayName}'s Profile

        Email: {user.email}

        {isPremium && (
          **Premium Member** ⭐
        )}

        Settings:
        - Theme: {settings.theme}
        - Notifications: {settings.notifications ? 'Enabled' : 'Disabled'}
      );
    }
  `;

    const props = {
        user: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            subscription: "premium"
        },
        settings: {
            theme: "dark",
            notifications: true
        }
    };

    // New direct approach
    console.log('Using NEW direct rendering:');
    try {
        const startTime = Date.now();
        const result = await renderDirect(functionString, props);
        const endTime = Date.now();

        console.log('✓ Success!');
        console.log('Execution time:', endTime - startTime, 'ms');
        console.log('Output length:', result.content.length, 'characters');
        console.log('Function name:', result.metadata.functionName);
    } catch (error) {
        console.error('✗ Error:', error);
    }

    // Traditional approach (if available)
    console.log('\nUsing TRADITIONAL compilation + rendering:');
    try {
        const startTime = Date.now();
        // This would use the full compilation pipeline
        // const result = await compileAndRender(functionString, props);
        const endTime = Date.now();

        console.log('Execution time:', endTime - startTime, 'ms');
        console.log('(Traditional approach would compile TypeScript first)');
    } catch (error) {
        console.error('✗ Error:', error);
    }
}

// Run all examples
async function runAllExamples() {
    await example1_SimpleDirectRendering();
    await example1b_TestFormat();
    await example2_DirectRendererClass();
    await example3_FunctionPropsAdapter();
    await example4_MultipleFunctions();
    await example5_Comparison();

    console.log('\n🎉 All examples completed!');
}

// Export for use in other modules
export {
    example1_SimpleDirectRendering,
    example1b_TestFormat,
    example2_DirectRendererClass,
    example3_FunctionPropsAdapter,
    example4_MultipleFunctions,
    example5_Comparison,
    runAllExamples
};

// Run if this file is executed directly
if (require.main === module) {
    runAllExamples().catch(console.error);
}
