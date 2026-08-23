import React from 'react';
import { H1, H2, H3, H4, H5, H6, Paragraph, Blockquote, HR } from './Typography';
import { UL, OL, LI } from './Lists';
import { A } from './Links';
import { Pre, Code } from './Code';
import { SparksCallout } from './Callout';
import {
    SparksCheckbox,
    SparksEmbed,
    SparksMermaid,
    SparksPseudocode,
    SparksExcalidraw,
    SparksCodeGroup,
    SparksFootnoteRef,
    SparksFootnotesGroup,
    SparksDirective
} from './Interactive';

/**
 * A comprehensive mapping from standard HTML and custom Sparks elements
 * to their respective React components, beautifully styled with TailwindCSS 
 * inspired by the Obsidian Quartz theme.
 * 
 * Pass these to MDXProvider or unified/rehype-react to render Markdown AST.
 */
export const markdownComponents = {
    // Standard Markdown Typography & Structure
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,
    p: Paragraph,
    blockquote: Blockquote,
    hr: HR,

    // Lists
    ul: UL,
    ol: OL,
    li: LI,

    // Links
    a: A,

    // Code & Syntax Highlighting
    pre: Pre,
    code: Code,

    // Custom Sparks Elements from our Plugins
    'sparks-callout': SparksCallout,
    'sparks-checkbox': SparksCheckbox,
    'sparks-embed': SparksEmbed,
    'sparks-mermaid': SparksMermaid,
    'sparks-pseudocode': SparksPseudocode,
    'sparks-excalidraw': SparksExcalidraw,
    'sparks-code-group': SparksCodeGroup,
    'sparks-footnote-ref': SparksFootnoteRef,
    'sparks-footnotes-group': SparksFootnotesGroup,

    // Fallbacks or specialized handling can be added here
    'sparks-directive': SparksDirective,

    // Fallbacks or specialized handling can be added here
};

// Also export the individual components so they can be extended or imported directly
export {
    H1, H2, H3, H4, H5, H6, Paragraph, Blockquote, HR,
    UL, OL, LI,
    A,
    Pre, Code,
    SparksCallout,
    SparksCheckbox, SparksEmbed, SparksMermaid, SparksPseudocode, SparksExcalidraw, SparksCodeGroup, SparksFootnoteRef, SparksFootnotesGroup, SparksDirective
};
