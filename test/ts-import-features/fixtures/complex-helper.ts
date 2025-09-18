export function processData(input: string): string {
    return `processed ${input}`;
}

export function validateData(data: string): boolean {
    return data.length > 0;
}

export function formatResult(valid: boolean): string {
    return valid ? 'formatted result' : 'invalid result';
}
