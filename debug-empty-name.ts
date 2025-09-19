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

console.log('Testing component rendering with empty name...');

const testCase = createExactMDXTest(
    'Debug empty name test',
    mdx
)
    .withContext({ name: '' })
    .expectExactLines(
        'Invalid name.'
    )
    .build();

const runner = new ExactMDXTestRunner();
runner.runTestCase(testCase).then(result => {
    console.log('Test result:', JSON.stringify(result, null, 2));
}).catch(error => {
    console.error('Test error:', error);
});
