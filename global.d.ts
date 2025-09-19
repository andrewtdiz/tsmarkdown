declare module "*.mdx" {
    import { ComponentType } from "react";
    const MDXComponent: ComponentType<any>;
    export default MDXComponent;
}