import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Button } from "../ui/button";
import remarkGfm from "remark-gfm";
import { Checkbox } from "../ui/checkbox";

const components = {
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
        <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props}>
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
    a: ({ children, ...props }: any) => (
        <Button variant="link" className="px-0 text-md text-blue-500"{...props}>
            {children}
        </Button>
    ),
    input: ({ children, ...props }: any) => {
        console.log(children, props);
        return (
            <Checkbox className="mr-2" {...props}>
                {children}
            </Checkbox>
        )
    },
};

function Md({ markdown }: { markdown: string }) {
    return (
        <ReactMarkdown
        
        components={components}
        remarkPlugins={[remarkBreaks, remarkGfm]}
    >
        {markdown}
    </ReactMarkdown>
    );
}

export default Md;