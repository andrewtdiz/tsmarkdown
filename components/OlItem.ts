import { __tsm } from "../src/runtime/tsm-runtime";

interface OlItemProps {
    item: string;
    index: number
  }
  
  export function OlItem({ item, index }: OlItemProps): string {
    
      return __tsm([
      index + 1, ". ", item
  ]);
}