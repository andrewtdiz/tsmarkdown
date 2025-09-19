// Parameter parsing and type inference utilities

export function parseParameters(params: string): string[] {
    const parameters: string[] = [];

    // Handle destructured object parameters like { items, user }
    const destructuredMatch = params.match(/\{\s*([^}]+)\s*\}/);
    if (destructuredMatch) {
        const destructuredParams = destructuredMatch[1]
            .split(',')
            .map(p => p.trim().split(':')[0].trim().split('=')[0].trim()) // Remove type annotations and default values
            .filter(p => p.length > 0);
        parameters.push(...destructuredParams);
    } else {
        // Handle regular parameters
        const regularParams = params
            .split(',')
            .map(p => p.trim().split(':')[0].trim().split('=')[0].trim()) // Remove type annotations and default values
            .filter(p => p.length > 0);
        parameters.push(...regularParams);
    }

    return parameters;
}

export function parseParameterTypes(params: string): Array<{ name: string; type: string; required: boolean; defaultValue?: string }> {
    const parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }> = [];

    // Handle destructured object parameters with type annotations like { month, amount }: { month: string; amount: number }
    const destructuredMatch = params.match(/\{\s*([^}]+)\s*\}(?:\s*:\s*\{\s*([^}]+)\s*\})?/);
    if (destructuredMatch) {
        const destructuredParams = destructuredMatch[1];
        const typeAnnotation = destructuredMatch[2];

        let typeMap: Map<string, { type: string; optional: boolean }> = new Map();

        // If there's a type annotation, parse it
        if (typeAnnotation) {
            const typeProperties = typeAnnotation.split(/[,;]/).map(p => p.trim()).filter(Boolean);
            for (const typeProp of typeProperties) {
                const colonIndex = typeProp.indexOf(':');
                if (colonIndex !== -1) {
                    const typeName = typeProp.substring(0, colonIndex).trim().replace('?', '');
                    const typeValue = typeProp.substring(colonIndex + 1).trim();
                    const isOptional = typeProp.substring(0, colonIndex).includes('?');
                    typeMap.set(typeName, { type: typeValue, optional: isOptional });
                }
            }
        }

        // Parse parameter names
        const properties = destructuredParams.split(',').map(p => p.trim());

        for (const prop of properties) {
            // In destructuring, there shouldn't be type annotations in the parameter names
            const isOptional = prop.includes('?');
            const hasDefaultValue = prop.includes('=');
            const cleanName = prop.replace('?', '').split('=')[0].trim();

            // Extract default value if present
            let defaultValue: string | undefined;
            if (hasDefaultValue) {
                const equalIndex = prop.indexOf('=');
                if (equalIndex !== -1) {
                    defaultValue = prop.substring(equalIndex + 1).trim();
                }
            }

            const typeInfo = typeMap.get(cleanName);
            const inferredType = typeInfo?.type || inferTypeFromUsage(cleanName) || 'any';
            const isTypeOptional = typeInfo?.optional || false;

            parameterTypes.push({
                name: cleanName,
                type: inferredType,
                required: !isOptional && !isTypeOptional && !hasDefaultValue,
                defaultValue
            });
        }
    } else {
        // Handle regular parameters
        const regularParams = params.split(',').map(p => p.trim());

        for (const param of regularParams) {
            const [name, paramType] = param.split(':').map(s => s?.trim());
            const isOptional = name?.includes('?') || false;
            const hasDefaultValue = name?.includes('=') || false;
            const cleanName = name?.replace('?', '').split('=')[0].trim() || '';

            // Extract default value if present
            let defaultValue: string | undefined;
            if (hasDefaultValue && name) {
                const equalIndex = name.indexOf('=');
                if (equalIndex !== -1) {
                    defaultValue = name.substring(equalIndex + 1).trim();
                }
            }

            if (cleanName) {
                parameterTypes.push({
                    name: cleanName,
                    type: paramType || inferTypeFromUsage(cleanName) || 'any',
                    required: !isOptional && !hasDefaultValue,
                    defaultValue
                });
            }
        }
    }

    return parameterTypes;
}

export function inferTypeFromUsage(paramName: string): string {
    // Basic type inference based on common naming patterns
    if (paramName.includes('count') || paramName.includes('amount') || paramName.includes('price') || paramName.includes('score')) {
        return 'number';
    }
    if (paramName.includes('name') || paramName.includes('title') || paramName.includes('text') || paramName.includes('message')) {
        return 'string';
    }
    if (paramName.includes('is') || paramName.includes('has') || paramName.includes('can') || paramName.includes('enabled')) {
        return 'boolean';
    }
    if (paramName.includes('items') || paramName.includes('list') || paramName.includes('array')) {
        return 'any[]';
    }
    return 'any';
}

export function generatePropsInterface(functionName: string, parameterTypes: Array<{ name: string; type: string; required: boolean; defaultValue?: string }>): string {
    if (parameterTypes.length === 0) {
        return '';
    }

    const interfaceName = `${functionName}Props`;
    const properties = parameterTypes.map(param => {
        const optional = param.required ? '' : '?';
        return `  ${param.name}${optional}: ${param.type};`;
    }).join('\n');

    return `interface ${interfaceName} {
${properties}
}`;
}
