import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

async function demo(title: string, mdxCode: string, props = {}, context = {}) {
  console.log('\n' + '='.repeat(60));
  console.log(`🏗️  ${title}`);
  console.log('='.repeat(60));

  if (Object.keys(props).length > 0) {
    console.log('\n📦 Props:', JSON.stringify(props, null, 2));
  }

  console.log('\n📝 MDX Code:');
  console.log(mdxCode);

  console.log('\n🎯 Rendered Output:');
  console.log('─'.repeat(50));

  try {
    const parsed = parser.parse(mdxCode);
    const compiled = compiler.compile(parsed);
    const result = await engine.execute(compiled, context, props, './mdx');

    console.log(result.content);

    console.log('─'.repeat(50));
    if (result.errors?.length > 0) {
      console.log('⚠️ Errors:', result.errors);
    } else {
      console.log('✅ Clean component architecture!');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Demo 1: Bad approach - string interpolation
console.log('\n❌ BAD APPROACH - String Interpolation:');
demo("Anti-Pattern: Inline String Building", `
function BadSalesReport() {
  const sales = [
    { month: "Jan", amount: 1200 },
    { month: "Feb", amount: 1500 }
  ];

  return (
    # Sales Report

    ## Breakdown (BAD - inline strings)
    {{ sales.map(s => "- **" + s.month + ":** $" + s.amount).join("\\n") }}

    This approach is hard to maintain and not reusable!
  )
}`);

// Demo 2: Good approach - component-based
console.log('\n✅ GOOD APPROACH - Component Architecture:');
demo("Best Practice: Component-Based Architecture", `
import { SalesItem } from "./SalesItem";

function GoodSalesReport() {
  const sales = [
    { month: "Jan", amount: 1200 },
    { month: "Feb", amount: 1500 }
  ];

  return (
    # Sales Report

    ## Breakdown (GOOD - reusable components)
    {sales.map((sale, index) => <SalesItem month={sale.month} amount={sale.amount} />)}

    This approach is maintainable, reusable, and testable!
  )
}`);

// Demo 3: Show the SalesItem component itself
demo("The SalesItem Component", `
function SalesItem({ month, amount }) {
  return (
    - **{{ month }}:** {{ amount }}
  )
}`, {
  month: "March",
  amount: 2500
});

// Demo 4: Advanced component composition
demo("Advanced Component Composition", `
import { ListItem } from "./ListItem";
import { SalesItem } from "./SalesItem";

function Dashboard({ user, sales, tasks }) {
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    # {{ user.name }}'s Dashboard

    ## Recent Sales
    {sales.map((sale, index) => <SalesItem month={sale.month} amount={sale.amount} />)}

    **Total: {{ totalSales }}**

    ## Today's Tasks
    {tasks.map((task, index) => <ListItem item={task} />)}
  )
}`, {
  user: { name: "Sarah" },
  sales: [
    { month: "Jan", amount: 1200 },
    { month: "Feb", amount: 1800 }
  ],
  tasks: ["Review reports", "Call client", "Update dashboard"]
});

console.log('\n' + '🎯'.repeat(60));
console.log('🏗️  COMPONENT ARCHITECTURE BENEFITS:');
console.log('🎯'.repeat(60));
console.log('\n✅ Advantages of Component-Based Approach:');
console.log('   🔄 **Reusability** - Components can be used anywhere');
console.log('   🧪 **Testability** - Each component can be tested separately');
console.log('   🛠️  **Maintainability** - Changes in one place affect all uses');
console.log('   📖 **Readability** - Clean, semantic markup');
console.log('   🎯 **Single Responsibility** - Each component has one job');
console.log('\n❌ Problems with String Interpolation:');
console.log('   🍝 **Spaghetti code** - Logic mixed with presentation');
console.log('   🔧 **Hard to maintain** - Changes require finding all instances');
console.log('   🚫 **Not reusable** - String building tied to specific context');
console.log('   🐛 **Error prone** - Easy to make syntax mistakes');
console.log('   🔍 **Hard to debug** - Complex string concatenation');

console.log('\n🚀 Better-MDX promotes clean component architecture!');