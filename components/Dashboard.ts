import { __tsm } from "../src/runtime/tsm-runtime";

export function Dashboard(props?: { title?: string, showHeader?: boolean }) {
    const { title, showHeader } = props || {};
    return __tsm(["# Dashboard", '\n',
    "Content", '\n',
    title ?? 'No title', '\n', 
    showHeader ? __tsm(['No showHeader', '\n',
        "With some more content", '\n',
    ]) : null
    ])
}
