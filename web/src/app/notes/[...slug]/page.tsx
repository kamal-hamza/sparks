import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AstRenderer from '@/components/sparks/AstRenderer';
import { TableOfContents } from '@/components/TableOfContents';
import { GraphView } from '@/components/GraphView';
import { SearchView } from '@/components/SearchView';

interface NoteIndexItem {
    slug: string;
    title: string;
    tags: string[];
}

export async function generateStaticParams() {
    const indexPath = path.join(process.cwd(), 'public', 'api', 'notes', '_index.json');
    try {
        const data = await fs.readFile(indexPath, 'utf-8');
        const notes: NoteIndexItem[] = JSON.parse(data);

        return notes
            .filter((note) => note && note.slug)
            .map((note) => ({
                slug: note.slug.split('/'),
            }));
    } catch (error) {
        console.error("Failed to build static params:", error);
        return [];
    }
}

export default async function NotePage({ params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = await params;
    const slugPath = resolvedParams.slug.join('/');
    const jsonPath = path.join(process.cwd(), 'public', 'api', 'notes', `${slugPath}.json`);

    let noteData;
    try {
        const data = await fs.readFile(jsonPath, 'utf-8');
        noteData = JSON.parse(data);
    } catch (error) {
        return notFound();
    }

    const { title } = noteData.frontmatter || {};
    const { readingTime } = noteData.stats || {};
    const { tableOfContents } = noteData;
    const { localGraph } = noteData;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans py-16 px-6 md:px-12 lg:px-24 flex justify-center gap-16">

            {/* Main Content Column */}
            <main className="w-full max-w-[65ch] flex flex-col shrink-[4]">
                {/* Navigation Breadcrumb / Back Link */}
                <nav className="mb-8 text-sm font-medium flex justify-between items-center">
                    <Link href="/notes" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2 transition-colors w-fit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to notes
                    </Link>
                </nav>

                {/* Note Header Details */}
                <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 leading-tight">
                        {title || noteData.slug || "Untitled Note"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500">
                        {readingTime && (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {readingTime} min read
                            </span>
                        )}

                        {noteData.tags?.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap ml-2">
                                {noteData.tags.map((tag: string) => (
                                    <span key={tag} className="bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* Render the core Markdown AST onto the screen */}
                <AstRenderer ast={noteData.contentAst} />

                {/* Backlinks Section */}
                {noteData.backlinks && noteData.backlinks.length > 0 && (
                    <section className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Backlinks</h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {noteData.backlinks.map((slug: string) => {
                                const title = slug.split('/').pop()?.replace(/-/g, ' ') || slug;
                                return (
                                    <li key={slug}>
                                        <Link href={`/notes/${slug}`} className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <div className="font-medium text-amber-600 dark:text-amber-500 capitalize">{title}</div>
                                            <div className="text-xs text-zinc-500 mt-1 truncate">{slug}</div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}
            </main>

            {/* Right Sidebar */}
            <aside className="w-[300px] shrink-0 sticky top-16 h-[calc(100vh-8rem)] hidden xl:flex flex-col gap-10 overflow-y-auto pb-10 custom-scrollbar pr-4">
                <SearchView />

                {localGraph && localGraph.nodes?.length > 0 && (
                    <GraphView data={localGraph} />
                )}

                {tableOfContents && tableOfContents.length > 0 && (
                    <TableOfContents items={tableOfContents} />
                )}
            </aside>
        </div>
    );
}
