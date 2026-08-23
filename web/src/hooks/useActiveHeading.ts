'use client';

import { useEffect, useState, useRef } from 'react';

export function useActiveHeading(itemIds: string[]) {
    const [activeId, setActiveId] = useState<string>('');
    const headingsRef = useRef<Record<string, IntersectionObserverEntry>>({});

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    headingsRef.current[entry.target.id] = entry;
                });

                // Find the highest visible heading
                const visibleHeadings = Object.values(headingsRef.current).filter(
                    (entry) => entry.isIntersecting
                );

                if (visibleHeadings.length > 0) {
                    // Sort descending by position on screen to find the top-most visible heading
                    const sorted = visibleHeadings.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                    setActiveId(sorted[0].target.id);
                } else {
                    // If no heading is intersecting (we scrolled past), find the closest one above the viewport
                    const allEntries = Object.values(headingsRef.current);
                    const pastHeadings = allEntries.filter(entry => entry.boundingClientRect.top < 0);

                    if (pastHeadings.length > 0) {
                        const sorted = pastHeadings.sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);
                        setActiveId(sorted[0].target.id);
                    }
                }
            },
            {
                rootMargin: '-50px 0px -40% 0px', // Trigger when header passes upper half of screen
            }
        );

        itemIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [itemIds]);

    return activeId;
}
