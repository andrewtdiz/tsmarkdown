import { plugin } from "bun";

const myPlugin = {
  name: "CustomLoader",
  setup(build) {
    // Example: intercept `.yaml` files
    build.onResolve({ filter: /\.yaml$/, namespace: "file" }, args => {
      return {
        path: args.path,
        namespace: "yaml"
      };
    });

    build.onLoad({ filter: /\.yaml$/, namespace: "yaml" }, async (args) => {
      const text = await Bun.file(args.path).text();
      // parse YAML however you want (e.g. js-yaml)
      const parsed = /* parse text to object */;
      return {
        loader: "json", // could choose "object", "json", etc.
        contents: `export default ${JSON.stringify(parsed)}`,
      };
    });
  },
};

// Then during build
await Bun.build({
  entrypoints: ["./test-loader.ts"],
  outdir: "./dist",
  plugins: [myPlugin],
});