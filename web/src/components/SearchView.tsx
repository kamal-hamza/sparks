'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FlexSearch from 'flexsearch';

interface NoteIndexItem {
    id: number;
    slug: string;
    title: string;
    tags: string[];
    content: string;
    [key: string]: any; // FlexSearch DocumentData constraint
}

export function SearchView() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const [results, setResults] = useState<NoteIndexItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Use a ref to hold the FlexSearch index
    const indexRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && !isLoaded) {
            indexRef.current = new FlexSearch.Document({
                document: {
                    id: "id",
                    index: ["title", "content", "tags"],
                    store: ["slug", "title", "content", "tags"]
                },
                tokenize: "forward",
            });

            fetch('/api/notes/search-index.json')
                .then(res => res.json())
                .then((data: NoteIndexItem[]) => {
                    data.forEach(item => {
                        indexRef.current?.add(item);
                    });
                    setIsLoaded(true);
                })
                .catch(err => console.error("Failed to fetch search index:", err));
        }
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, isLoaded]);

    useEffect(() => {
        if (!query.trim() || !indexRef.current || !isLoaded) {
            setResults([]);
            setSelectedIndex(0);
            return;
        }

        // Perform search
        const searchResults = indexRef.current.search(query, 8, { enrich: true });

        // Deduplicate and flatten results from different fields (title, content, tags)
        const uniqueResultsMap = new Map<number, NoteIndexItem>();
        searchResults.forEach((fieldResult: any) => {
            fieldResult.result.forEach((doc: any) => {
                if (!uniqueResultsMap.has(doc.id)) {
                    uniqueResultsMap.set(doc.id, doc.doc as NoteIndexItem);
                }
            });
        });

        const finalResults = Array.from(uniqueResultsMap.values()).slice(0, 8);
        setResults(finalResults);
        setSelectedIndex(0);
    }, [query, isLoaded]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            const selectedMatch = results[selectedIndex];
            setIsOpen(false);
            router.push(`/notes/${selectedMatch.slug}`);
        }
    };

    const HighlightSnippet = ({ text, search, isSelected }: { text: string; search: string; isSelected: boolean }) => {
        if (!search.trim()) return <span>{text.substring(0, 80)}...</span>;

        const terms = search.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
        if (terms.length === 0) return <span>{text.substring(0, 80)}...</span>;

        const lowerText = text.toLowerCase();
        let bestIdx = -1;
        let bestTerm = "";

        for (const term of terms) {
            const idx = lowerText.indexOf(term);
            if (idx !== -1) {
                bestIdx = idx;
                bestTerm = term;
                break;
            }
        }

        if (bestIdx === -1) return <span>{text.substring(0, 80)}...</span>;

        const start = Math.max(0, bestIdx - 40);
        const end = Math.min(text.length, bestIdx + bestTerm.length + 40);
        let excerpt = text.substring(start, end);

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
        const parts = excerpt.split(regex);

        return (
            <span>
                {start > 0 && "..."}
                {parts.map((part, i) => {
                    if (terms.some(t => t === part.toLowerCase())) {
                        return <mark key={i} className={`bg-transparent font-bold ${isSelected ? "text-amber-700 dark:text-amber-400" : "text-amber-600 dark:text-amber-500"}`}>{part}</mark>;
                    }
                    return <span key={i}>{part}</span>;
                })}
                {end < text.length && "..."}
            </span>
        );
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="group flex flex-col mb-6 bg-transparent w-full text-left"
            >
                <div className="flex items-center gap-2 px-3 py-1.5 w-full text-[0.85rem] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100/50 hover:bg-zinc-200/50 dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50 rounded-lg transition-all border border-zinc-200/50 dark:border-zinc-800/80">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    Search
                    <kbd className="hidden sm:inline-block border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded px-1.5 ml-auto text-[10px] font-mono text-zinc-400">⌘K</kbd>
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Blurry translucent backdrop matching Quartz */}
                    <div
                        className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Minimalist Command Palette */}
                    <div
                        className="relative w-full max-w-2xl bg-white dark:bg-[#1e1e20] rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
                        onKeyDown={handleKeyDown}
                    >
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-[0.95rem] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-medium"
                                placeholder="Search..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 uppercase tracking-widest"
                            >
                                esc
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            {query.trim() && results.length === 0 ? (
                                <div className="py-12 text-center text-[0.85rem] text-zinc-500">
                                    No results found for "{query}".
                                </div>
                            ) : (
                                <ul className="p-2 space-y-0.5">
                                    {results.map((note, index) => {
                                        const isSelected = index === selectedIndex;
                                        return (
                                            <li key={note.slug}>
                                                <Link
                                                    href={`/notes/${note.slug}`}
                                                    onClick={() => setIsOpen(false)}
                                                    onMouseMove={() => setSelectedIndex(index)}
                                                    className={`block px-3 py-2.5 rounded-lg transition-colors ${isSelected
                                                        ? "bg-amber-50 dark:bg-amber-500/10"
                                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center w-full gap-4">
                                                        <div className={`text-[0.9rem] font-medium truncate shrink-0 max-w-[40%] ${isSelected ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                                                            {note.title}
                                                        </div>
                                                        {note.content && (
                                                            <div className={`text-[0.75rem] truncate text-right flex-1 ${isSelected ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                                                                <HighlightSnippet text={note.content} search={query} isSelected={isSelected} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
