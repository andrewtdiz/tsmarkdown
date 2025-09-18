export function useBrowserAPI(): string {
    // Simulate browser API check
    if (typeof window === 'undefined') {
        return 'fallback';
    }
    return 'browser';
}
