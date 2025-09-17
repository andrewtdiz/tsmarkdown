import { parseMDX } from "./src/parser";
import { compileMDX } from "./src/compiler";
import { executeMDXTemplate } from "./src/template-engine";


function runExample(title: string, description: string, mdxContent: string, context?: any, props?: any, basePath?: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 ${title}`);
  console.log('='.repeat(80));
  console.log(`📝 ${description}`);
  console.log('\n📋 MDX Source Code:');
  console.log('─'.repeat(50));
  console.log(mdxContent);
  console.log('─'.repeat(50));

  if (props && Object.keys(props).length > 0) {
    console.log('\n📦 Props passed to component:');
    console.log(JSON.stringify(props, null, 2));
  }

  if (context && Object.keys(context).length > 0) {
    console.log('\n🌍 External context:');
    console.log(JSON.stringify(context, null, 2));
  }

  console.log('\n🎯 Rendered Output:');
  console.log('─'.repeat(50));

  try {
    const parsed = parseMDX(mdxContent);
    const compiled = compileMDX(parsed);
    const result = executeMDXTemplate(compiled, context || {}, props, basePath);

    console.log(result.content);
    console.log('─'.repeat(50));

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No errors - rendered successfully!');
    }

    // Show parsing details
    console.log('\n🔍 Technical Details:');
    console.log(`   Function: ${parsed.functionName}`);
    console.log(`   Parameters: [${parsed.functionParams.join(', ')}]`);
    console.log(`   Dependencies: [${compiled.dependencies.join(', ')}]`);
    console.log(`   Interpolations: ${parsed.interpolations.length}`);
    console.log(`   Conditional blocks: ${parsed.conditionalBlocks.length}`);
    console.log(`   JSX expressions: ${parsed.jsxExpressions.length}`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Example 1: Basic Blog Post with Dynamic Content
runExample(
  "Blog Post with Dynamic Content",
  "A simple blog post component that uses interpolation to display dynamic content",
  `
function BlogPost() {
  const title = "Getting Started with Better-MDX";
  const author = "Development Team";
  const publishDate = "2024-01-15";
  const readTime = 5;

  return (
    # {{ title }}

    **By {{ author }}** • Published {{ publishDate }} • {{ readTime }} min read

    Welcome to Better-MDX! This framework combines the power of TypeScript
    with the simplicity of Markdown to create dynamic, interactive content.

    ## Features

    - ✨ TypeScript integration
    - 🔄 Dynamic content rendering
    - 📝 Clean Markdown syntax
    - 🎯 Component-based architecture

    *Thank you for reading!*
  )
}
  `.trim()
);

// Example 2: User Dashboard with Conditional Content
runExample(
  "User Dashboard with Conditional Content",
  "Shows conditional rendering based on user authentication and role",
  `
function UserDashboard() {
  const { user, isLoggedIn } = getAuthState();

  return (
    # Welcome to Your Dashboard

    {isLoggedIn && (
      ## Hello, {{ user.name }}! 👋

      **Account type:** {{ user.role }}
      **Member since:** {{ user.joinDate }}

      {user.role === 'admin' && (
        ### Admin Panel
        🛠️ You have administrative privileges.

        - Manage users
        - View analytics
        - System settings
      )}

      {user.role === 'user' && (
        ### Your Account
        📊 Here's your account overview:

        - Profile settings
        - Billing information
        - Usage statistics
      )}
    )}

    {!isLoggedIn && (
      ## Please Sign In

      🔐 You need to sign in to access your dashboard.

      [Sign In Button]
    )}
  )
}
  `.trim(),
  {
    getAuthState: () => ({
      user: {
        name: "Alice Johnson",
        role: "admin",
        joinDate: "March 2023"
      },
      isLoggedIn: true
    })
  }
);

// Example 3: Product Catalog with Array Mapping
runExample(
  "Product Catalog with Array Mapping",
  "Demonstrates array mapping without external components - pure template logic",
  String.raw`
function ProductCatalog() {
  const products = [
    { id: 1, name: "Wireless Headphones", price: 199.99, rating: 4.5, inStock: true },
    { id: 2, name: "Smart Watch", price: 299.99, rating: 4.2, inStock: true },
    { id: 3, name: "Bluetooth Speaker", price: 79.99, rating: 4.8, inStock: false },
    { id: 4, name: "Laptop Stand", price: 49.99, rating: 4.1, inStock: true }
  ];

  const inStockCount = products.filter(p => p.inStock).length;
  const totalValue = products.reduce((sum, p) => sum + p.price, 0);
  const formattedTotal = totalValue.toFixed(2);

  return (
    # 🛍️ Product Catalog

    **{{ products.length }}** total products • **{{ inStockCount }}** in stock
    **Total catalog value:** ${{ formattedTotal }}

    ## Available Products

    {{ products.map(product =>
      '### ' + product.name + '\\n' +
      '**Price:** $' + product.price + '\\n' +
      '**Rating:** ⭐ ' + product.rating + '/5\\n' +
      '**Status:** ' + (product.inStock ? '✅ In Stock' : '❌ Out of Stock') + '\\n'
    ).join('\\n') }}

    ---
    *Prices subject to change. Check individual product pages for current availability.*
  )
}
  `.trim()
);

// Example 4: Component with Props and External Data
runExample(
  "Team Member Profile with Props",
  "Shows how props are passed to components and used in templates",
  `
function TeamMemberProfile({ member, showContact = false }) {
  const yearsExperience = new Date().getFullYear() - member.startYear;
  const skillsList = member.skills.join(', ');

  return (
    # 👤 {{ member.name }}

    **{{ member.role }}** at {{ member.company }}

    ## About
    {{ member.bio }}

    ## Experience
    🗓️ **{{ yearsExperience }} years** in the field
    🎯 **Specializes in:** {{ skillsList }}

    ## Recent Projects
    {{ member.projects.map(project =>
      '- **' + project.name + '** (' + project.year + ') - ' + project.description
    ).join('\\n') }}

    {showContact && (
      ## Contact Information
      📧 **Email:** {{ member.email }}
      🔗 **LinkedIn:** {{ member.linkedin }}
    )}

    {!showContact && (
      *Contact information available upon request.*
    )}
  )
}
  `.trim(),
  {},
  {
    member: {
      name: "Sarah Chen",
      role: "Senior Frontend Developer",
      company: "TechCorp Inc.",
      bio: "Passionate developer with expertise in React, TypeScript, and modern web technologies. Loves creating user-friendly interfaces and mentoring junior developers.",
      startYear: 2019,
      email: "sarah.chen@techcorp.com",
      linkedin: "linkedin.com/in/sarahchen",
      skills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS"],
      projects: [
        {
          name: "E-commerce Platform",
          year: "2023",
          description: "Led frontend development for a scalable e-commerce solution"
        },
        {
          name: "Design System",
          year: "2023",
          description: "Created company-wide component library and design tokens"
        },
        {
          name: "Analytics Dashboard",
          year: "2022",
          description: "Built real-time analytics dashboard with interactive charts"
        }
      ]
    },
    showContact: true
  }
);

// Example 5: Shopping List with Component Integration
runExample(
  "Shopping List with Component Integration",
  "Uses imported ListItem components to render a dynamic shopping list",
  `
import { ListItem } from "./ListItem";

function ShoppingList({ items, listName }) {
  const totalItems = items.length;
  const completedItems = items.filter(item => item.completed).length;
  const remainingItems = totalItems - completedItems;

  return (
    # 🛒 {{ listName }}

    **Progress:** {{ completedItems }}/{{ totalItems }} items completed

    {remainingItems > 0 && (
      📝 **{{ remainingItems }}** items left to get!
    )}

    {remainingItems === 0 && (
      🎉 **All done!** Shopping complete.
    )}

    ## Items

    {items.map((item, index) => <ListItem item={item.name + (item.completed ? ' ✅' : ' ⏳')} />)}

    ---
    *Tap items to mark as completed*
  )
}
  `.trim(),
  {},
  {
    listName: "Weekly Groceries",
    items: [
      { name: "Fresh Vegetables", completed: true },
      { name: "Organic Milk", completed: false },
      { name: "Whole Grain Bread", completed: true },
      { name: "Greek Yogurt", completed: false },
      { name: "Free-range Eggs", completed: false },
      { name: "Olive Oil", completed: true }
    ]
  },
  './mdx'
);

// Example 6: API Data Visualization
runExample(
  "API Data Visualization",
  "Shows complex data processing and conditional rendering for API responses",
  `
function APIDataDashboard() {
  const { data, loading, error } = fetchUserStats();

  return (
    # 📊 User Statistics Dashboard

    {loading && (
      ## ⏳ Loading...

      Please wait while we fetch your latest statistics.
    )}

    {error && (
      ## ❌ Error Loading Data

      **Error:** {{ error.message }}

      Please try refreshing the page or contact support.
    )}

    {!loading && !error && data && (
      ## 📈 Your Stats

      ### Overview
      - **Total Users:** {{ data.users.total.toLocaleString() }}
      - **Active Users:** {{ data.users.active.toLocaleString() }}
      - **Growth Rate:** {{ data.users.growthRate }}%

      ### Performance Metrics
      {{ data.metrics.map(metric =>
        '- **' + metric.name + ':** ' + metric.value + ' ' + metric.unit +
        (metric.trend > 0 ? ' 📈 (+' + metric.trend + '%)' :
         metric.trend < 0 ? ' 📉 (' + metric.trend + '%)' : ' ➡️ (0%)')
      ).join('\\n') }}

      ### Top Regions
      {{ data.regions.slice(0, 5).map((region, index) =>
        (index + 1) + '. **' + region.name + '** - ' + region.users.toLocaleString() + ' users'
      ).join('\\n') }}

      {data.users.growthRate > 10 && (
        ## 🚀 Excellent Growth!

        Your platform is experiencing exceptional growth this month!
      )}
    )}
  )
}
  `.trim(),
  {
    fetchUserStats: () => ({
      data: {
        users: {
          total: 125847,
          active: 89234,
          growthRate: 15.3
        },
        metrics: [
          { name: "Page Views", value: "2.4M", unit: "", trend: 12.5 },
          { name: "Session Duration", value: "4.2", unit: "min", trend: -2.1 },
          { name: "Bounce Rate", value: "28", unit: "%", trend: -5.8 },
          { name: "Conversion Rate", value: "3.7", unit: "%", trend: 8.2 }
        ],
        regions: [
          { name: "North America", users: 45230 },
          { name: "Europe", users: 38471 },
          { name: "Asia Pacific", users: 28945 },
          { name: "South America", users: 8934 },
          { name: "Africa", users: 4267 }
        ]
      },
      loading: false,
      error: null
    })
  }
);

// Example 7: Newsletter Template with Complex Logic
runExample(
  "Newsletter Template with Complex Logic",
  "A newsletter template showing advanced templating with nested conditions and data processing",
  `
function NewsletterTemplate({ edition, articles, subscriber }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const featuredArticles = articles.filter(a => a.featured);
  const regularArticles = articles.filter(a => !a.featured);
  const totalReadTime = articles.reduce((sum, a) => sum + a.readTime, 0);

  return (
    # 📧 {{ edition.name }} - Issue #{{ edition.number }}

    **{{ currentDate }}** • {{ articles.length }} articles • {{ totalReadTime }} min read

    Hello {{ subscriber.firstName }}! 👋

    Welcome to this week's edition. We've curated {{ articles.length }}
    amazing articles just for you.

    {featuredArticles.length > 0 && (
      ## ⭐ Featured Articles

      {{ featuredArticles.map(article =>
        '### ' + article.title + '\\n' +
        '*By ' + article.author + ' • ' + article.readTime + ' min read*\\n\\n' +
        article.excerpt + '\\n\\n' +
        '[Read more →](' + article.url + ')\\n'
      ).join('\\n') }}
    )}

    {regularArticles.length > 0 && (
      ## 📚 More Great Reads

      {{ regularArticles.map(article =>
        '- **' + article.title + '** by ' + article.author + ' (' + article.readTime + ' min)\\n  ' +
        article.excerpt.substring(0, 100) + '...'
      ).join('\\n\\n') }}
    )}

    ---

    ## 🎯 Personalized for You

    Based on your interests in **{{ subscriber.interests.join(', ') }}**,
    we think you'll especially enjoy:

    {{ articles.filter(a =>
        subscriber.interests.some(interest =>
          a.tags.includes(interest)
        )
      ).slice(0, 3).map(article =>
        '- ' + article.title + ' (matches: ' +
        article.tags.filter(tag => subscriber.interests.includes(tag)).join(', ') + ')'
      ).join('\\n') }}

    {subscriber.premium && (
      ## 💎 Premium Content

      As a premium subscriber, you get exclusive access to our in-depth guides and expert interviews.

      *Thank you for supporting our work!*
    )}

    ---

    *You're receiving this because you subscribed to {{ edition.name }}.
    [Unsubscribe](unsubscribe-link) • [Manage preferences](preferences-link)*
  )
}
  `.trim(),
  {},
  {
    edition: {
      name: "Tech Weekly",
      number: 142
    },
    subscriber: {
      firstName: "Alex",
      interests: ["React", "TypeScript", "AI"],
      premium: true
    },
    articles: [
      {
        title: "The Future of React: Server Components Deep Dive",
        author: "Jane Smith",
        readTime: 8,
        featured: true,
        excerpt: "Server Components are revolutionizing how we build React apps. Learn about the benefits, challenges, and implementation strategies.",
        url: "https://example.com/react-server-components",
        tags: ["React", "SSR", "Performance"]
      },
      {
        title: "TypeScript 5.0: New Features and Breaking Changes",
        author: "Mike Johnson",
        readTime: 12,
        featured: true,
        excerpt: "TypeScript 5.0 brings significant improvements to developer experience and performance. Here's what you need to know.",
        url: "https://example.com/typescript-5",
        tags: ["TypeScript", "JavaScript", "Tools"]
      },
      {
        title: "AI in Web Development: Practical Applications",
        author: "Sarah Davis",
        readTime: 6,
        featured: false,
        excerpt: "Explore how AI tools are changing web development workflows and boosting productivity.",
        url: "https://example.com/ai-web-dev",
        tags: ["AI", "Productivity", "Tools"]
      },
      {
        title: "Building Scalable APIs with GraphQL",
        author: "Tom Wilson",
        readTime: 10,
        featured: false,
        excerpt: "Learn best practices for designing and implementing GraphQL APIs that scale.",
        url: "https://example.com/graphql-apis",
        tags: ["GraphQL", "Backend", "APIs"]
      }
    ]
  }
);

console.log('\n' + '='.repeat(80));
console.log('🎉 All examples completed!');
console.log('='.repeat(80));
console.log('\n💡 Key features demonstrated:');
console.log('   ✅ Props support with destructuring');
console.log('   ✅ Template interpolation {{ }}');
console.log('   ✅ Conditional rendering with {condition && (...)}');
console.log('   ✅ Array mapping and data processing');
console.log('   ✅ Component imports and rendering');
console.log('   ✅ Complex expressions and computations');
console.log('   ✅ External context and API data integration');
console.log('\n🚀 Better-MDX is ready for production use!');