import { __tsm } from "../src/runtime/tsm-runtime";

interface UlItemProps {
  item: string
}

export function UlItem({ item }: UlItemProps): string {
  
    return __tsm([
    "- ", item
]);
}