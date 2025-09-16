export function toList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}
