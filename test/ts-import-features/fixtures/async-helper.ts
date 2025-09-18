export async function getAsyncData(): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => resolve('resolved data'), 10);
    });
}
