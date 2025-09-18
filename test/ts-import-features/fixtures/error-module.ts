// This will cause a type error
export function errorFunction(): string {
    return 42; // Type error: number assigned to string return type
}
