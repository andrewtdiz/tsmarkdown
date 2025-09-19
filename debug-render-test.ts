import { createExactMDXTest, ExactMDXTestRunner } from './src/exact-testing-utilities';

const mdx = `function SimpleMultipleReturns({ name }: { name: string}) {
    if (name === "") {
        return (
            Invalid name.
        )
    }

    return (
        # User Dashboard
        Welcome back, {{ name }}!
        
        ## Your Account
        Status: Active
        Last login: Today
    )
}`;

console.log('Testing component rendering...');

const testCase = createExactMDXTest(
    'Debug render test',
    mdx
)
    .withContext({ name: 'John' })
    .expectExactLines(
        'User Dashboard',
        'Welcome back, John!',
        'Your Account',
        'Status: Active',
        'Last login: Today'
    )
    .build();

const runner = new ExactMDXTestRunner();
runner.runTestCase(testCase).then(result => {
    console.log('Test result:', JSON.stringify(result, null, 2));
}).catch(error => {
    console.error('Test error:', error);
});
