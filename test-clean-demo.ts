import { parseMDX } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

async function showcase(title: string, mdxCode: string, props = {}, context = {}, basePath?: string) {
  console.log('\n' + '🚀'.repeat(30));
  console.log(`✨ ${title}`);
  console.log('🚀'.repeat(30));

  if (Object.keys(props).length > 0) {
    console.log('\n📦 Props:');
    console.log(JSON.stringify(props, null, 2));
  }

  console.log('\n📝 MDX Code:');
  console.log(mdxCode);

  console.log('\n🎯 Rendered Output:');
  console.log('─'.repeat(50));

  try {
    const parsed = parseMDX(mdxCode);
    const compiled = compile(parsed);
    const result = await render(compiled, context, props, basePath);

    console.log(result.content);

    console.log('─'.repeat(50));
    if (result.errors?.length > 0) {
      console.log('⚠️ Errors:', result.errors);
    } else {
      console.log('✅ Perfect!');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  // 1. Basic interpolation
  await showcase("Basic Interpolation",
    `function Greeting() {
    const name = "Better-MDX";
    const emoji = "🎉";

    return (
      # Hello {{ name }}! {{ emoji }}

      Welcome to the future of dynamic content!
    )
  }`);

  // 2. Props support
  await showcase("Props Support",
    `function Profile({ user }) {
    const greeting = "Welcome";

    return (
      # {{ greeting }}, {{ user.name }}!

      **Role:** {{ user.role }}
      **Level:** {{ user.level }}

      You're doing great! 🌟
    )
  }`, {
    user: {
      name: "Alice",
      role: "Developer",
      level: "Senior"
    }
  });

  // 3. Conditional rendering
  await showcase("Conditional Rendering",
    `function Status() {
    const isOnline = true;
    const hasMessages = false;

    return (
      # System Status

      {isOnline && (
        ✅ Online and ready!
      )}

      {!isOnline && (
        ❌ System offline
      )}

      {hasMessages && (
        📨 You have new messages
      )}

      {!hasMessages && (
        📭 No new messages
      )}
    )
  }`);

  // 4. Shopping list with components
  await showcase("Component Integration",
    `import { ListItem } from "./ListItem";

  function Shopping({ items }) {
    const count = items.length;

    return (
      # Shopping List

      **Total items:** {{ count }}

      {items.map((item, index) => <ListItem item={item} />)}

      Happy shopping! 🛒
    )
  }`, {
    items: ["Coffee", "Cookies", "Croissants", "Cake"]
  }, {}, './mdx');

  // 5. Real-world blog example
  await showcase("Blog Post Example",
    `function BlogPost() {
    const title = "10 Tips for Better Code";
    const author = "Jane Smith";
    const date = "March 2024";
    const tags = ["coding", "tips", "productivity"];

    return (
      # {{ title }}

      **By {{ author }}** • {{ date }}

      **Tags:** {{ tags.join(" • ") }}

      ## Introduction

      Writing clean, maintainable code is essential for any developer.
      Here are my top recommendations for improving your coding skills.

      *Keep reading to discover proven techniques that will transform
      your development workflow!*

      ---
      👍 Found this helpful? Share with your team!
    )
  }`);

  // 6. Dashboard with authentication
  await showcase("User Dashboard",
    `function Dashboard() {
    const { user, isAuthenticated } = getUserState();

    return (
      # Welcome to Your Dashboard

      {isAuthenticated && (
        Hello {{ user.name }}! 👋

        **Account:** {{ user.type }}
        **Projects:** {{ user.projectCount }}

        {user.type === 'premium' && (
          🎯 **Premium User** - All features unlocked!
        )}

        {user.type === 'basic' && (
          📈 **Basic Plan** - Upgrade for more features
        )}
      )}

      {!isAuthenticated && (
        🔐 Please sign in to access your dashboard.

        [Login] [Register]
      )}
    )
  }`, {}, {
    getUserState: () => ({
      user: {
        name: "Bob Wilson",
        type: "premium",
        projectCount: 12
      },
      isAuthenticated: true
    })
  });
}

// Run the main function
main().catch(console.error);