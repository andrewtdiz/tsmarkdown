import { resolveComponentPath } from "../renderer/render-utils";

const basePath = "./mdx";
const componentName = "OlItem";

console.log("=== Resolve Component Path Debug ===");
console.log("Base path:", basePath);
console.log("Component name:", componentName);

const resolvedPath = resolveComponentPath(componentName, basePath);
console.log("Resolved path:", resolvedPath);

if (resolvedPath) {
  console.log("Component file exists!");
} else {
  console.log("Component file not found!");
}
