import { serve } from "bun";
import index from "./index.html";
import { createAPIServer } from "../../src/api-server";

// Create MDX API server
const mdxApiServer = createAPIServer({
  port: 3000,
  mdxDirectory: "../mdx",
  cacheEnabled: true,
  enableHMR: true
});

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // MDX API endpoints
    "/api/mdx/files": async (req) => {
      const result = await mdxApiServer.listFiles();
      return Response.json(result, { status: result.success ? 200 : 500 });
    },

    "/api/mdx/files/:filename": async (req) => {
      const filename = req.params.filename;
      const result = await mdxApiServer.loadFile(filename);
      return Response.json(result, { status: result.success ? 200 : 404 });
    },

    "/api/mdx/compile": async (req) => {
      const body = await req.json();
      const result = await mdxApiServer.compile(body);
      return Response.json(result, { status: result.success ? 200 : 400 });
    },

    "/api/mdx/render": async (req) => {
      const body = await req.json();
      const result = await mdxApiServer.render(body);
      return Response.json(result, { status: result.success ? 200 : 400 });
    },

    "/api/mdx/execute": async (req) => {
      const body = await req.json();
      const result = await mdxApiServer.execute(body);
      return Response.json(result, { status: result.success ? 200 : 400 });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
