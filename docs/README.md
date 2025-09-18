# Markdoc + Bun + React + shadcn/ui Template

A modern full-stack template combining Markdoc for content authoring, Bun for fast development, React for the frontend, and shadcn/ui for beautiful components.

## Features

- **Markdoc Integration**: Parse and render Markdoc content with custom components
- **Bun Runtime**: Fast JavaScript runtime for both server and build processes
- **React 19**: Latest React with modern features
- **shadcn/ui Components**: Beautiful, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with typography plugin
- **TypeScript**: Full TypeScript support
- **Hot Reload**: Fast development with HMR

## Quick Start

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
bun dev
```

The server will start at `http://localhost:3000` with hot reload enabled.

### Production Build

```bash
bun run build
```

### Run Production Server

```bash
bun start
```

## Project Structure

```
├── content/                 # Markdoc content files
│   ├── welcome.md
│   └── about.md
├── schema/                  # Markdoc schema definitions
│   ├── Callout.markdoc.js
│   └── heading.markdoc.js
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── Callout.tsx     # Markdoc component
│   ├── lib/                # Utility functions
│   │   ├── utils.ts
│   │   └── content-manifest.ts
│   ├── App.tsx             # Main React app
│   └── index.tsx           # Bun server
└── package.json
```

## Markdoc Integration

### Content Files

Create `.md` files in the `content/` directory. Use Markdoc syntax with custom tags:

```markdown
# Welcome to Markdoc

{% callout type="note" %}
This is a note callout with custom styling.
{% /callout %}

{% callout type="warning" %}
This is a warning callout.
{% /callout %}
```

### Custom Components

Add new Markdoc components by:

1. Creating a schema file in `schema/`
2. Creating a React component in `src/components/`
3. Adding the component to the server config
4. Registering it in the client renderer

### API Endpoints

- `GET /api/markdoc?path=/welcome` - Get transformed Markdoc content
- `GET /api/hello` - Example API endpoint

## Available Scripts

- `bun dev` - Start development server with hot reload
- `bun start` - Start production server
- `bun run build` - Build for production
- `bun run type-check` - Run TypeScript type checking
- `bun run clean` - Clean build artifacts

## Customization

### Adding New Content

1. Add `.md` files to the `content/` directory
2. Update `src/lib/content-manifest.ts` to include new files
3. Add navigation buttons in `App.tsx`

### Styling

The project uses Tailwind CSS with the typography plugin for prose styling. Customize styles in:

- `src/index.css` - Global styles
- `styles/globals.css` - Additional global styles
- Component files - Component-specific styles

### Adding New Markdoc Tags

1. Create schema file in `schema/`
2. Create React component
3. Update server config in `src/index.tsx`
4. Register component in `App.tsx`

## Technologies Used

- [Bun](https://bun.com) - JavaScript runtime and package manager
- [React](https://react.dev) - UI library
- [Markdoc](https://markdoc.dev) - Content authoring framework
- [shadcn/ui](https://ui.shadcn.com) - UI component library
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [TypeScript](https://www.typescriptlang.org) - Type safety

## License

MIT
