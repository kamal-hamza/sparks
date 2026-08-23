import React from 'react';
import Link from 'next/link';
import { PreviewLink } from '../PreviewLink';

export const A = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isWikilink = props.className?.includes('wikilink');
    const isAssetLink = props.className?.includes('asset-link');
    const isExternalLink = props.href?.startsWith('http');
    const isInternalLink = props.href && !isExternalLink && !props.href.startsWith('#');

    const baseClasses = "font-medium hover:underline underline-offset-4 decoration-current transition-colors";

    // Style differently based on type of link
    let colorClasses = "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"; // Default (external)

    if (isWikilink || isInternalLink) {
        // Quartz style for internal wikilinks
        colorClasses = "text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-300 decoration-amber-500/30";
    } else if (isAssetLink) {
        colorClasses = "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300";
    }

    const className = `${baseClasses} ${colorClasses} ${props.className || ''}`.trim();

    // Internal links use Next.js Link / PreviewLink for client-side routing
    if ((isInternalLink || isWikilink) && !isAssetLink) {
        let href = props.href!;

        // Clean up markdown extensions from standard links
        if (href.endsWith('.md')) {
            href = href.slice(0, -3);
        }

        // Prepend /notes/ to the link destination, handling leading slashes
        if (!href.startsWith('/notes/')) {
            href = href.startsWith('/') ? `/notes${href}` : `/notes/${href}`;
        }

        return (
            <PreviewLink href={href} className={className}>
                {props.children}
            </PreviewLink>
        );
    }

    // External or asset links
    return (
        <a
            className={className}
            {...props}
            target={isExternalLink || isAssetLink ? "_blank" : undefined}
            rel={isExternalLink || isAssetLink ? "noopener noreferrer" : undefined}
        />
    );
};
