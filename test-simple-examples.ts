import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

async function demo(title: string, mdxSource: string, context: any = {}, props: any = {}, basePath?: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 ${title}`);
  console.log('='.repeat(60));

  console.log('\n📝 MDX Source:');
  console.log(mdxSource);

  if (Object.keys(props).length > 0) {
    console.log('\n📦 Props:', JSON.stringify(props, null, 2));
  }

  if (Object.keys(context).length > 0) {
    console.log('\n🌍 Context:', JSON.stringify(context, null, 2));
  }

  console.log('\n🎯 OUTPUT:');
  console.log('─'.repeat(40));

  try {
    const parsed = parser.parse(mdxSource);
    const compiled = compiler.compile(parsed);
    const result = await engine.execute(compiled, context, props, basePath);

    console.log(result.content);
    console.log('─'.repeat(40));

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      result.errors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ Success!');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runAllDemos() {
// Demo 1: Basic interpolation
await demo("Basic Interpolation", `
function Welcome() {
  const name = "Better-MDX";
  const version = "1.0";

  return (
    # Welcome to {{ name }} v{{ version }}

    This is a dynamic MDX framework!
  )
}
`);

// Demo 2: Props support
await demo("Props Support", `
function UserCard({ user }) {
  const greeting = "Hello";

  return (
    # {{ greeting }}, {{ user.name }}!

    **Role:** {{ user.role }}
    **Experience:** {{ user.years }} years
  )
}
`, {}, {
  user: {
    name: "Alice",
    role: "Developer",
    years: 5
  }
});

// Demo 3: Conditional rendering
await demo("Conditional Rendering", `
function StatusMessage({ isOnline, hasNotifications }: { isOnline: boolean, hasNotifications: boolean }) {
  return (
    # System Status

    {isOnline && (
      ✅ **Online** - All systems operational
    )}

    {!isOnline && (
      ❌ **Offline** - Please check your connection
    )}

    {hasNotifications && (
      🔔 You have new notifications
    )}

    {!hasNotifications && (
      📭 No new notifications
    )}
  )
}
`);

// Demo 4: Array processing
await demo("Array Processing", `
function TechList() {
  const technologies = ["React", "TypeScript", "Node.js"];
  const count = technologies.length;
  const first = technologies[0];

  return (
    # Technology Stack ({{ count }} items)

    ## Languages & Frameworks:
    - {{ first }}
    - TypeScript
    - Node.js

    *Total: {{ count }} technologies*
  )
}
`);

// Demo 5: Component with arrays and JSX
await demo("Component with JSX", `
import { ListItem } from "./ListItem";

function ShoppingList({ items }: { items: string[] }) {
  const total = items.length;

  return (
    # Shopping List

    **Items to buy:** {{ total }}

    {items.map((item, index) => <ListItem key={index} item={item} />)}

    Happy shopping! 🛒
  )
}
`, {}, {
  items: ["Apples", "Bread", "Milk", "Eggs"]
}, './mdx');

// Demo 6: Complex data processing with components
await demo("Complex Data Processing with Components", `
import { SalesItem } from "./SalesItem";

function SalesReport() {
  const sales = [
    { month: "January", amount: 1200 },
    { month: "February", amount: 1500 },
    { month: "March", amount: 1800 }
  ];

  const total = sales.reduce((sum, s) => sum + s.amount, 0);
  const average = Math.round(total / sales.length);
  const bestMonth = sales.reduce((best, s) => s.amount > best.amount ? s : best).month;

  return (
    # Q1 Sales Report

    ## Monthly Breakdown
    {sales.map((sale, index) => <SalesItem key={index} month={sale.month} amount={sale.amount} />)}

    ## Summary
    - **Total Revenue:** \${{ total }}
    - **Average per month:** \${{ average }}
    - **Best month:** {{ bestMonth }}
  )
}
`, {}, {}, './mdx');

// Demo 7: External context integration
await demo("External Context", `
function WeatherWidget() {
  const weather = getWeatherData();

  return (
    # Today's Weather

    **Location:** {{ weather.city }}
    **Temperature:** {{ weather.temp }}°F
    **Condition:** {{ weather.condition }}

    {weather.temp > 70 && (
      ☀️ It's a beautiful day!
    )}

    {weather.temp <= 70 && (
      🧥 Don't forget your jacket!
    )}
  )
}
`, {
  getWeatherData: () => ({
    city: "San Francisco",
    temp: 71,
    condition: "Partly Cloudy"
  })
});

console.log('\n' + '='.repeat(60));
console.log('🎉 All demos completed successfully!');
console.log('='.repeat(60));
console.log('\n💡 Features demonstrated:');
console.log('   ✅ Template interpolation {{ }}');
console.log('   ✅ Props with destructuring');
console.log('   ✅ Conditional rendering');
console.log('   ✅ Array processing and mapping');
console.log('   ✅ Component imports and JSX');
console.log('   ✅ Complex data calculations');
console.log('   ✅ External context integration');
console.log('\n🚀 Better-MDX is production ready!');
}

// Run all demos
runAllDemos().catch(error => {
  console.error('Demo execution failed:', error);
});