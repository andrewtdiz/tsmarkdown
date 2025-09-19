export interface MiniComponentProps {
    name: string;
}

export function MiniComponent({ name }: MiniComponentProps): string {
    const excited = name.toUpperCase();
    return `(
  # Inline Demo
  This is rendering **${excited}**!`;
}

// Test the function
console.log("Testing generated TypeScript:");
console.log(MiniComponent({ name: "MDX" }));
console.log(MiniComponent({ name: "Better MDX" }));