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
