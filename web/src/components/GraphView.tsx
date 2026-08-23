'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';

// @ts-ignore
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any;

interface GraphNode {
    id: string;
    label?: string;
    group?: string;
    metadata?: any;
    // Injectable by ForceGraph
    x?: number;
    y?: number;
    val?: number;
}

interface GraphEdge {
    source: string;
    target: string;
    type: string;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface GraphViewProps {
    data: GraphData;
    global?: boolean;
}

export function GraphView({ data, global = false }: { data?: any, global?: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length > 0) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (!data || !data.nodes || data.nodes.length === 0) return null;

    // Map edges to links for react-force-graph
    const formattedData = {
        nodes: data.nodes.map((n: any) => ({ ...n, val: Math.max(1, (data.edges.filter((e: any) => e.source === n.id || e.target === n.id).length || 0)) })),
        links: data.edges.map((e: any) => ({ source: e.source, target: e.target }))
    };

    const handleNodeClick = useCallback((node: any) => {
        router.push(`/notes/${node.id}`);
    }, [router]);

    return (
        <div className={`w-full flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-800/50 ${global ? 'h-[70vh]' : 'mb-4'}`}>
            {!global && (
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-zinc-500/80 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        Graph View
                    </h3>
                    <button
                        onClick={() => router.push('/graph')}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        title="Open Global Graph"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>
                    </button>
                </div>
            )}

            <div ref={containerRef} className={`relative w-full ${global ? 'h-full' : 'h-[250px] cursor-grab active:cursor-grabbing'} bg-transparent overflow-hidden rounded-lg`}>
                <ForceGraph2D
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={formattedData}
                    nodeLabel={(node: any) => node.label || node.id}
                    nodeVal={(node: any) => Math.max(1.5, Math.min(8, Math.sqrt(node.val || 1) * 1.5))}
                    nodeColor={(node: any) => {
                        const isCurrentSlug = pathname === `/notes/${node.id}` || (!global && node.id === pathname.split('/').pop());
                        if (isCurrentSlug) return '#f59e0b'; // amber-500
                        if (node.group === 'tag') return '#8b5cf6'; // violet-500
                        if (node.id === 'index') return '#10b981'; // emerald-500
                        return '#71717a'; // zinc-500
                    }}
                    linkColor={() => '#3f3f46'} // zinc-700
                    linkWidth={1.5}
                    onNodeClick={handleNodeClick}
                    enableZoomPanInteraction={true} // Enable for both local and global
                    enableNodeDrag={true}
                    cooldownTicks={100} // Stop simulation early for stability
                />
            </div>
        </div>
    );
}
