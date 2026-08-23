'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFloating, useInteractions, useHover, useFocus, useRole, useDismiss, offset, flip, shift, autoUpdate } from '@floating-ui/react';

interface PreviewData {
    title: string;
    excerpt?: string;
}

export function PreviewLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [offset(10), flip(), shift()],
        whileElementsMounted: autoUpdate,
        placement: 'top',
    });

    const hover = useHover(context, { delay: { open: 400, close: 100 } });
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'tooltip' });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    // Extract slug from href (e.g., /notes/linear-algebra)
    const slug = href.replace(/^\/notes\//, '');

    useEffect(() => {
        if (isOpen && !previewData && !isLoading && slug) {
            setIsLoading(true);

            // if we are fetching a directory level, we need to fetch its standard JSON file
            let cleanSlug = slug.endsWith('/') ? slug.slice(0, -1) : slug;
            if (cleanSlug.endsWith('/index')) {
                cleanSlug = cleanSlug.slice(0, -6);
            }
            if (cleanSlug === '') cleanSlug = 'index'; // Fallback for root

            const targetUrl = `/api/notes/${cleanSlug}.json`;

            fetch(targetUrl)
                .then(async (res) => {
                    if (!res.ok) throw new Error("Preview not found");
                    return res.json();
                })
                .then(data => {
                    if (data && data.frontmatter) {
                        setPreviewData({
                            title: data.frontmatter.title || slug,
                            excerpt: data.excerpt
                        });
                    }
                })
                .catch(err => {
                    console.error("Failed to load preview for", slug, err);
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, slug, previewData, isLoading]);

    return (
        <>
            <Link
                href={href}
                className={className}
                ref={refs.setReference}
                {...getReferenceProps()}
            >
                {children}
            </Link>

            {isOpen && (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="z-[200] w-64 md:w-80 bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-md rounded-xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden"
                >
                    <div className="p-4">
                        {isLoading ? (
                            <div className="animate-pulse flex flex-col gap-2">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
                                <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-full mt-2"></div>
                                <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-5/6"></div>
                            </div>
                        ) : previewData ? (
                            <div className="flex flex-col gap-1.5 focus:outline-none">
                                <h4 className="text-[0.95rem] font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                                    {previewData.title}
                                </h4>
                                {previewData.excerpt && (
                                    <p className="text-[0.8rem] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed mt-1">
                                        {previewData.excerpt}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-500 italic">Preview not available</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
