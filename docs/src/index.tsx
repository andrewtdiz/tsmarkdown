import { serve } from "bun";
import index from "./index.html";
import Markdoc from '@markdoc/markdoc';
import { initializeContentManifest, getContent, getContentAST, getContentFrontmatter, getAllContentMetadata } from './lib/content-manifest';

// Initialize content manifest on server startup
initializeContentManifest();

// Import schema files
import callout from '../schema/Callout.markdoc.js';
import heading from '../schema/heading.markdoc.js';

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

    "/api/content": {
      async GET(req) {
        const url = new URL(req.url);
        const path = url.searchParams.get('path') || '/welcome';

        const content = getContent(path);

        if (!content) {
          return Response.json({ error: 'Content not found' }, { status: 404 });
        }

        // Only return raw markdown content and frontmatter
        return Response.json({
          frontmatter: content.frontmatter,
          rawContent: content.rawContent
        });
      }
    },

    "/api/content-metadata": {
      async GET(req) {
        const metadata = getAllContentMetadata();
        return Response.json(metadata);
      }
    },

    "/content/:filename": {
      async GET(req) {
        const filename = req.params.filename;
        const content = getContent(`/${filename.replace('.md', '')}`);

        if (!content) {
          return Response.json({ error: 'Content not found' }, { status: 404 });
        }

        return new Response(content.rawContent, {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      }
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
