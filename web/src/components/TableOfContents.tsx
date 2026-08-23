'use client';
import React, { useMemo } from 'react';
import { useActiveHeading } from '@/hooks/useActiveHeading';

interface TocItem {
    depth: number;
    text: string;
    slug: string;
    children: TocItem[];
}

interface TableOfContentsProps {
    items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
    // Flatten items to get all slugs for the observer
    const itemIds = useMemo(() => {
        const ids: string[] = [];
        const extractIds = (items: TocItem[]) => {
            items.forEach((item) => {
                ids.push(item.slug);
                if (item.children) {
                    extractIds(item.children);
                }
            });
        };
        extractIds(items);
        return ids;
    }, [items]);

    const activeId = useActiveHeading(itemIds);

    if (!items || items.length === 0) return null;

    return (
        <div className="w-full flex flex-col mt-6">
            <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-zinc-500/80 mb-3 pl-2">
                Table of Contents
            </h3>
            <nav className="text-[0.85rem] relative">
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <ul className="flex flex-col">
                    {items.map((item) => (
                        <TocNode key={item.slug} item={item} activeId={activeId} />
                    ))}
                </ul>
            </nav>
        </div>
    );
}

function TocNode({ item, activeId }: { item: TocItem; activeId: string }) {
    // Quartz indents based on depth cleanly using padding inline, rather than nested left-borders
    const indentMap: Record<number, string> = {
        1: 'pl-4',
        2: 'pl-4',
        3: 'pl-7',
        4: 'pl-10',
        5: 'pl-12',
        6: 'pl-14',
    };
    const indentClass = indentMap[item.depth] || 'pl-4';

    // Check if this node or any of its children are active
    const isActive = item.slug === activeId;

    return (
        <li className="relative group">
            {/* Decorative active border indicator */}
            <span className={`absolute left-0 top-0 bottom-0 w-[2px] z-10 transition-colors ${isActive ? 'bg-amber-500' : 'bg-transparent group-hover:bg-amber-500/50'}`} />

            <a
                href={`#${item.slug}`}
                className={`block py-1.5 transition-colors truncate ${indentClass} ${isActive ? 'text-amber-600 dark:text-amber-500 font-medium' : 'text-zinc-500 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-500'}`}
                title={item.text}
            >
                {item.text}
            </a>

            {item.children && item.children.length > 0 && (
                <ul className="flex flex-col">
                    {item.children.map((child) => (
                        <TocNode key={child.slug} item={child} activeId={activeId} />
                    ))}
                </ul>
            )}
        </li>
    );
}
