import React from 'react';

export const SparksCheckbox = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        type="checkbox"
        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all cursor-pointer mr-2 mt-1 align-middle disabled:opacity-50"
        {...props}
    />
);

export const SparksEmbed = ({ 'data-source': dataSource, children, ...props }: any) => {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(dataSource || '');

    if (isImage) {
        return (
            <span className="block my-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50" {...props}>
                <img src={dataSource} alt={children?.[0]?.props?.children || "Embedded content"} className="max-w-full h-auto object-cover" />
            </span>
        );
    }

    return (
        <span className="block my-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60" {...props}>
            <div className="flex flex-col gap-1 relative pl-3 border-l-2 border-emerald-500/50">
                <span className="text-[0.65rem] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Embedded Media</span>
                <a href={dataSource} className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold text-base transition-colors">
                    {children || dataSource}
                </a>
            </div>
        </span>
    );
};

export const SparksMermaid = ({ chart, ...props }: any) => (
    <div className="my-6 p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/50 rounded-lg text-sm font-mono overflow-auto" {...props}>
        <div className="text-[0.65rem] uppercase text-blue-600 font-bold mb-3 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Mermaid Diagram
        </div>
        <pre className="text-gray-700 dark:text-gray-300">{chart}</pre>
    </div>
);

export const SparksPseudocode = ({ children, ...props }: any) => (
    <div className="my-6 p-4 border border-purple-200 bg-purple-50/50 dark:bg-purple-900/10 dark:border-purple-900/50 rounded-lg text-sm font-mono overflow-auto" {...props}>
        <div className="text-[0.65rem] uppercase text-purple-600 font-bold mb-3 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Pseudocode
        </div>
        <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {children}
        </div>
    </div>
);

export const SparksExcalidraw = ({ source, ...props }: any) => (
    <div className="my-6 p-6 border border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-900/50 rounded-lg flex flex-col items-center justify-center min-h-[160px]" {...props}>
        <div className="text-orange-600 dark:text-orange-400 font-bold tracking-wide flex flex-col items-center gap-2">
            <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Excalidraw Map: {source}
        </div>
    </div>
);

export const SparksFootnoteRef = ({ 'data-footnote-id': id, children, ...props }: any) => (
    <sup className="mx-0.5" {...props}>
        <a href={`#footnote-${id}`} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 decoration-emerald-500/30 font-medium hover:underline underline-offset-2">
            {children}
        </a>
    </sup>
);

export const SparksCodeGroup = ({ children, ...props }: any) => (
    <div className="my-6 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm" {...props}>
        <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 flex gap-2">
            <div className="flex gap-1.5 items-center max-w-fit opacity-50 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
            </div>
            Code Group
        </div>
        <div className="[&>pre]:my-0 [&>pre]:rounded-none [&>pre]:border-0 [&>pre]:bg-gray-50/50 dark:[&>pre]:bg-gray-900/50">
            {children}
        </div>
    </div>
);

export const SparksFootnotesGroup = ({ children, ...props }: any) => (
    <div className="my-8 pt-6 mt-10 border-t border-gray-200 dark:border-gray-800" {...props}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Footnotes
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 pl-2 border-l-2 border-gray-100 dark:border-gray-800/50">
            {children}
        </div>
    </div>
);

export const SparksDirective = ({ name, attributes, children, ...props }: any) => (
    <div className="my-4 p-4 border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg" {...props}>
        <div className="text-xs font-mono text-gray-500 mb-2">
            Directive: <span className="font-bold text-emerald-600 dark:text-emerald-400">{name || 'unknown'}</span>
        </div>
        <div className="text-gray-800 dark:text-gray-200">
            {children}
            {!children && <span className="italic text-gray-400">No content provided</span>}
        </div>
    </div>
);

