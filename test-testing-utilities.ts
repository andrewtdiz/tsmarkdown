import {
  MDXTestRunner,
  createMDXTest,
  createMDXTestSuite,
  MDXSnapshotTester
} from './src/testing-utilities';

async function demonstrateTestingUtilities() {
  console.log('🧪 Testing Better-MDX Testing Utilities');
  console.log('='.repeat(60));

  const runner = new MDXTestRunner();

  // Create basic test cases
  const basicTests = [
    createMDXTest(
      'Simple Interpolation',
      `
      function Welcome() {
        const name = "Better-MDX";
        return (
          # Hello {{ name }}!
        )
      }`
    ).expectContains('Hello Better-MDX!').build(),

    createMDXTest(
      'Conditional Rendering',
      `
      function StatusMessage() {
        const isOnline = true;
        return (
          # Status
          {isOnline && (
            ✅ System is online
          )}
          {!isOnline && (
            ❌ System is offline
          )}
        )
      }`
    ).expectContains('✅ System is online').expectExcludes('❌ System is offline').build(),

    createMDXTest(
      'Props Support',
      `
      function UserCard({ user }) {
        return (
          # Welcome {{ user.name }}!
          **Role:** {{ user.role }}
        )
      }`
    ).withContext({}, { user: { name: 'Alice', role: 'Developer' } })
     .expectContains('Welcome Alice!', 'Role:** Developer').build(),
  ];

  // Create advanced test cases
  const advancedTests = [
    createMDXTest(
      'Array Processing',
      `
      function TechList() {
        const technologies = ["React", "TypeScript", "Node.js"];
        return (
          # Tech Stack
          {{ technologies.map(tech => "- " + tech).join("\\n") }}
        )
      }`
    ).expectContains('- React', '- TypeScript', '- Node.js').build(),

    createMDXTest(
      'Error Handling - Invalid Syntax',
      `
      function BrokenComponent() {
        const data = "test";
        return (
          # Test {{ unclosedBrace
        )
      }`
    ).expectErrors(['Parsing error']).build(),

    createMDXTest(
      'Component Import (Mock)',
      `
      import { Button } from "./components/Button";

      function App() {
        return (
          # My App
          Click the button below:
          <Button>Click me!</Button>
        )
      }`
    ).expectContains('My App', 'Click me!').build(),
  ];

  // Create test suites
  const basicSuite = createMDXTestSuite('Basic Features')
    .addTests(...basicTests)
    .withSetup(() => {
      console.log('📋 Setting up basic feature tests...');
    })
    .withTeardown(() => {
      console.log('🧹 Cleaning up basic feature tests...');
    })
    .build();

  const advancedSuite = createMDXTestSuite('Advanced Features')
    .addTests(...advancedTests)
    .withSetup(() => {
      console.log('📋 Setting up advanced feature tests...');
    })
    .withTeardown(() => {
      console.log('🧹 Cleaning up advanced feature tests...');
    })
    .build();

  // Run test suites
  const results = await runner.runTestSuites([basicSuite, advancedSuite]);

  // Generate reports
  console.log('\n📊 Generating test reports...');

  // Save JSON report
  runner.saveResults('./test-results/testing-utilities-report.json');

  // Generate HTML report
  runner.generateHTMLReport('./test-results/testing-utilities-report.html');

  // Demonstrate snapshot testing
  console.log('\n📸 Demonstrating Snapshot Testing:');
  const snapshotTester = new MDXSnapshotTester('./test/__snapshots__');

  const snapshotTests = [
    {
      name: 'simple-interpolation',
      input: `
        function Test() {
          const message = "Hello World";
          return (# {{ message }})
        }`
    },
    {
      name: 'conditional-with-props',
      input: `
        function Test({ isLoggedIn }) {
          return (
            {isLoggedIn && (Welcome back!)}
            {!isLoggedIn && (Please log in)}
          )
        }`,
      context: { isLoggedIn: true }
    }
  ];

  for (const test of snapshotTests) {
    const matches = snapshotTester.matchSnapshot(
      test.name,
      test.input,
      test.context || {}
    );
    console.log(`   ${matches ? '✅' : '❌'} ${test.name} snapshot ${matches ? 'matches' : 'differs'}`);
  }

  // Summary
  console.log('\n🎯 Testing Utilities Demonstration Complete!');
  console.log(`   • ${results.length} test cases executed`);
  console.log(`   • ${results.filter(r => r.passed).length} tests passed`);
  console.log(`   • ${results.filter(r => !r.passed).length} tests failed`);
  console.log('   • JSON and HTML reports generated');
  console.log('   • Snapshot testing demonstrated');

  return results;
}

// Run the demonstration
demonstrateTestingUtilities().catch(console.error);