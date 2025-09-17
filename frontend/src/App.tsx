'use client'

import React from "react";
import { Button } from "../src/components/ui/button";
import { Checkbox } from "../src/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../src/components/ui/tooltip";
import { Separator } from "../src/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "node_modules/remark-gfm/lib";
import remarkBreaks from "remark-breaks";
import Display from '../src/components/Display'
import { ReactMDXIntegrator } from "../../src/react-integration";
import type { CompiledMDX } from "../../src/compiler";
import { useQuery } from "react-query";
import "./index.css";

import TestExample from './mdx/generated/TestExample.json';
import { render } from "../../src/renderer";

console.log(TestExample);

export function App() {
  const { data: mdxComponent, isLoading, error } = useQuery(
    'mdx-component',
    async () => {
      try {
        // Load the pre-compiled JSON file from the dist directory
        const result1 = await render(JSON.parse(JSON.stringify(TestExample)), {}, {
          items: ["Apple", "Banana", "Cherry"],
        }, "./mdx");
        return result1.content;
      } catch (err) {
        console.error('Error loading MDX component:', err);
        throw err;
      }
    }
  );

  const components = {
    a: ({ children, ...props }: any) => {
      return (
        <Button variant="link" onClick={() => { }} className="px-0 py-0! h-8! p-0! text-md text-blue-500" >
          {children}
        </Button>
      )
    },
    h1: ({ children, ...props }: any) => (
      <h1 className="text-4xl font-bold text-foreground mb-4 mt-8" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-3xl font-semibold text-foreground mb-3 mt-6" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-2xl font-medium text-foreground mb-2 mt-5" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-xl font-medium text-foreground mb-1 mt-4" {...props}>
        {children}
      </h4>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-base leading-relaxed text-foreground" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside space-y-1 mb-4 ml-4" {...props}>
        {children}
      </ul>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-foreground mb-0 pb-0" {...props}>
        {children}
      </li>
    ),
    u: ({ children, ...props }: any) => (
      <p className="underline" {...props}>
        {children}
      </p>
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
    input: ({ children, ...props }: any) => (
      <Checkbox className="mr-2" {...props}>
        {children}
      </Checkbox>
    ),
    code: ({ children, className, node, ...props }: any) => {
      const content = String(children).replace(/\n$/, '');
      const buttonMatch = content.match(/^<button(?:\s+id="([^"]*)")?>(.*?)<\/button>$/);

      if (buttonMatch) {
        const buttonId = buttonMatch[1];
        const buttonText = buttonMatch[2];

        const ButtonComponent = (
          <Button
            variant="outline"
            className="mx-1 my-1"
            onClick={() => {
              console.log(`Button clicked: ${buttonText}${buttonId ? ` (id: ${buttonId})` : ''}`);
            }}
            id={buttonId}
            {...props}
          >
            {buttonText}
          </Button>
        );

        if (buttonId) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {ButtonComponent}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{buttonId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return ButtonComponent;
      }

      return (
        <code {...props} className={className}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex relative flex-1 min-h-0">

        <div className="absolute top-0 left-0 px-6 py-4 h-auto flex-shrink-0">
          {/* {path !== "home" && (
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              ← Back
            </Button>
          )} */}
        </div>
        <div className="flex-1 flex py-4 flex-col max-w-1/2 min-h-0">
          <h2 className="text-lg text-center text-center!  font-semibold px-4 pb-4 text-foreground flex-shrink-0">MDX Component</h2>
          <div className="flex-1 overflow-auto px-4 max-w-[100%] prose prose-lg w-full text-left min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading content...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-destructive">Error loading content</p>
                  <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
                </div>
              </div>
            ) : mdxComponent ? (
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={components}
                >
                  {mdxComponent}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-px bg-border flex-shrink-0"></div>

        <div className="flex-1 flex py-4 flex-col min-h-0">
          <h2 className="text-lg font-semibold text-center! px-4 pb-4 text-foreground flex-shrink-0">Raw JSON</h2>
          <Separator />
          <div className="flex-1 overflow-auto bg-muted p-6 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading content...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-destructive">Error loading content</p>
                  <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-left text-sm text-foreground">
                {mdxComponent}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}