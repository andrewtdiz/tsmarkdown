import Markdoc from '@markdoc/markdoc';
import heading from '../../schema/heading.markdoc.js';
import callout from '../../schema/Callout.markdoc.js';
import * as components from '../components/markdown';

/** @type {import('@markdoc/markdoc').Config} */
export const markdocConfig = {
    nodes: {
        heading: heading,
    },
    tags: {
        callout
    },
    // Map HTML elements to React components
    elements: {
        h1: { render: 'h1', attributes: {} },
        h2: { render: 'h2', attributes: {} },
        h3: { render: 'h3', attributes: {} },
        h4: { render: 'h4', attributes: {} },
        h5: { render: 'h5', attributes: {} },
        h6: { render: 'h6', attributes: {} },
        p: { render: 'p', attributes: {} },
        blockquote: { render: 'blockquote', attributes: {} },
        code: { render: 'code', attributes: {} },
        pre: { render: 'pre', attributes: {} },
        ul: { render: 'ul', attributes: {} },
        ol: { render: 'ol', attributes: {} },
        li: { render: 'li', attributes: {} },
        a: { render: 'a', attributes: { href: { type: String } } },
        strong: { render: 'strong', attributes: {} },
        em: { render: 'em', attributes: {} },
        table: { render: 'table', attributes: {} },
        thead: { render: 'thead', attributes: {} },
        tbody: { render: 'tbody', attributes: {} },
        tr: { render: 'tr', attributes: {} },
        th: { render: 'th', attributes: {} },
        td: { render: 'td', attributes: {} },
        hr: { render: 'hr', attributes: {} },
        img: { render: 'img', attributes: { src: { type: String }, alt: { type: String } } },
        figure: { render: 'figure', attributes: {} },
        figcaption: { render: 'figcaption', attributes: {} }
    }
};