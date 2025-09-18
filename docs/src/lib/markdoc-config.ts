import Markdoc from '@markdoc/markdoc';
import heading from '../../schema/heading.markdoc.js';
import * as components from '../components/markdown';

/** @type {import('@markdoc/markdoc').Config} */
export const markdocConfig = {
    nodes: {
        heading
    },
    tags: {
        callout: {
            render: 'Callout',
            attributes: {
                type: {
                    type: String,
                    default: 'note',
                    matches: ['note', 'check', 'warning', 'error', 'tip']
                },
                title: {
                    type: String
                }
            }
        }
    }
};

export function parseAndTransformMarkdown(markdownContent: string, frontmatter: any = {}) {
    const ast = Markdoc.parse(markdownContent);
    const content = Markdoc.transform(ast, markdocConfig);

    return {
        content,
        frontmatter
    };
}
