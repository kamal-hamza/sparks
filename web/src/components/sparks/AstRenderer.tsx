import React from 'react';
import * as prod from 'react/jsx-runtime';
import { unified } from 'unified';
import rehypeReact from 'rehype-react';

// 1. Import all registered components
import { markdownComponents } from './index';

const production = { Fragment: prod.Fragment, jsx: (prod as any).jsx, jsxs: (prod as any).jsxs };

export interface AstRendererProps {
    ast: any;
    /**
     * Optional record of custom components to override or extend the default ones.
     * Evaluated against both standard HTML tags and custom elements like <sparks-callout>.
     */
    customComponents?: Record<string, React.ComponentType<any>>;
}

export default function AstRenderer({ ast, customComponents }: AstRendererProps) {
    // 2. Merge user-provided components over our rich default set
    const mergedComponents = {
        ...markdownComponents,
        // Optional globally injected overrides (e.g. standard <img> tag modifications)
        'img': (props: any) => <img {...props} className="rounded-lg shadow-md" loading="lazy" />,
        ...customComponents
    };

    // 3. Compile the JSON AST into a React node tree
    const processor = unified()
        .use(rehypeReact, {
            ...production,
            components: mergedComponents
        } as any);

    // Evaluate the AST directly into a React Element
    const reactContent = processor.stringify(ast);

    return <div className="prose dark:prose-invert">{reactContent as React.ReactNode}</div>;
}
