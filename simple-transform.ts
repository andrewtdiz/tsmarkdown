import { Transform } from 'jscodeshift';

/**
 * Simple jscodeshift transformation that demonstrates AST manipulation
 * This codemod adds a console.log statement at the beginning of function bodies
 */
const transform: Transform = (fileInfo, api) => {
    const j = api.jscodeshift;
    const source = j(fileInfo.source);

    // Find all function declarations
    source.find(j.FunctionDeclaration).forEach(path => {
        const functionBody = path.value.body;

        // Only process if the function has a block statement body
        if (j.BlockStatement.check(functionBody)) {
            // Create a console.log statement
            const consoleLog = j.expressionStatement(
                j.callExpression(
                    j.memberExpression(
                        j.identifier('console'),
                        j.identifier('log')
                    ),
                    [j.literal(`Function ${path.value.id?.name || 'anonymous'} called`)]
                )
            );

            // Add the console.log as the first statement in the function body
            functionBody.body.unshift(consoleLog);
        }
    });

    return source.toSource({
        quote: 'single',
        trailingComma: true,
    });
};

export default transform;
