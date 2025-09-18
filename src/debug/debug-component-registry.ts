import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";
import { componentRegistry, loadDependencies } from "../renderer/render-utils";

// Debug component registry loading
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Component Registry ===");

console.log("List compiled dependencies:", listCompiled.dependencies);

// Check registry before loading
console.log("Registry before loading:", Object.keys(componentRegistry));

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

console.log("Registry after loading:", Object.keys(componentRegistry));
console.log("Loading errors:", errors);

// Check if UlItem and OlItem are in the registry
if (componentRegistry["UlItem"]) {
    console.log("UlItem found in registry:", componentRegistry["UlItem"]);
} else {
    console.log("UlItem NOT found in registry");
}

if (componentRegistry["OlItem"]) {
    console.log("OlItem found in registry:", componentRegistry["OlItem"]);
} else {
    console.log("OlItem NOT found in registry");
}
