import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AstRenderer from '@/components/sparks/AstRenderer';
import { SearchView } from '@/components/SearchView';
import { TableOfContents } from '@/components/TableOfContents';
import { GraphView } from '@/components/GraphView';

export default async function NotesIndexPage() {
    const jsonPath = path.join(process.cwd(), 'public', 'api', 'notes', `index.json`);

    let noteData;
    try {
        const data = await fs.readFile(jsonPath, 'utf-8');
        noteData = JSON.parse(data);
    } catch (error) {
        console.error("Failed to load /notes index note:", error);
        return notFound();
    }

    const { title } = noteData.frontmatter || {};
    const { tableOfContents, localGraph } = noteData;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans py-16 px-6 md:px-12 lg:px-24 flex justify-center gap-16">

            {/* Main Content Column */}
            <main className="w-full max-w-[65ch] flex flex-col shrink-[4]">
                <nav className="mb-8 text-sm font-medium flex justify-between items-center">
                    <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2 transition-colors w-fit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to home
                    </Link>
                </nav>

                <header className="mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2 leading-tight">
                            {title || "Digital Garden"}
                        </h1>
                        <p className="text-zinc-500 text-sm">Welcome to my little corner of the internet.</p>
                    </div>
                    {/* Only show on mobile, desktop has right sidebar */}
                    <div className="xl:hidden">
                        <SearchView />
                    </div>
                </header>

                {/* Render the core Markdown AST onto the screen */}
                <AstRenderer ast={noteData.contentAst} />
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
