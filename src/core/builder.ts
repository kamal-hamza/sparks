import * as path from 'node:path';
import { Feed } from 'feed';
import { findMarkdownFiles, readFile, writeFile, prepareOutputDirectory } from './io';
import { parseMultiple, buildBacklinks } from './parser';
import { defaultPlugins } from '../plugins/index';
import { filePathToSlug } from '../util/utils';
import type { NoteContent, ParserOptions, GraphData, LinkType, FullStackPlugin } from './types';

export interface GlobalIndexEntry {
    slug: string;
    title: string;
    tags: string[];
    date?: string;
    excerpt?: string;
    readingTime?: number;
}

export interface BatchProcessOptions {
    vaultPath: string;
    outputPath: string;
    strict?: boolean;
    plugins?: FullStackPlugin[];
}

/**
 * Orchestrates parsing all markdown files in a vault and writing the JSON outputs.
 */
export async function processVault(options: BatchProcessOptions): Promise<void> {
    const { vaultPath, outputPath, strict } = options;
    const startTime = Date.now();

    console.log(`Scanning vault at: ${vaultPath}`);
    const files = await findMarkdownFiles(vaultPath);
    console.log(`Found ${files.length} markdown files.`);

    // Read all files
    const fileContents = await Promise.all(
        files.map(async (filePath) => {
            // Create a relative path from the vault root
            const relativePath = path.relative(vaultPath, filePath);
            return {
                filePath: relativePath,
                content: await readFile(filePath),
            };
        })
    );

    // Parse all files
    const parserOptions: Required<ParserOptions> = {
        basePath: '',
        extractToc: true,
        generateExcerpt: true,
        excerptLength: 200,
        computeStats: true,
        validateLinks: strict ?? false,
        availableSlugs: new Set(fileContents.map(f => filePathToSlug(f.filePath, ''))),
        strict: strict ?? false,
        slugify: (fp) => filePathToSlug(fp, ''),
        plugins: options.plugins && options.plugins.length > 0 ? options.plugins : defaultPlugins,
    };

    console.log('Parsing markdown files...');
    const notes = await parseMultiple(fileContents, parserOptions);

    // Build backlinks (mutates notes array)
    buildBacklinks(notes);

    // Pre-compute Local Graphs (Depth of 1)
    console.log('🕸️ Pre-computing local graphs...');
    for (const note of notes) {
        // Collect all unique slugs connected to this note (outbound and inbound)
        const neighborSlugs = new Set([...note.links, ...(note.backlinks || [])]);

        // Find the actual note objects for those neighbors to get their titles and frontmatter
        const neighborNotes = notes.filter(n => neighborSlugs.has(n.slug));

        // Build the mini-graph
        note.localGraph = {
            nodes: [
                {
                    id: note.slug,
                    label: (note.frontmatter.title as string) || note.slug,
                    metadata: Object.keys(note.frontmatter).length > 0 ? note.frontmatter : undefined,
                },
                ...neighborNotes.map(n => ({
                    id: n.slug,
                    label: (n.frontmatter.title as string) || n.slug,
                    metadata: Object.keys(n.frontmatter).length > 0 ? n.frontmatter : undefined,
                }))
            ],
            edges: [
                ...note.links.map(targetSlug => ({
                    source: note.slug,
                    target: targetSlug,
                    type: 'wikilink' as any,
                })),
                ...(note.backlinks || []).map(sourceSlug => ({
                    source: sourceSlug,
                    target: note.slug,
                    type: 'wikilink' as any,
                }))
            ]
        };
    }

    // Prepare output directory
    console.log(`Preparing output directory: ${outputPath}`);
    await prepareOutputDirectory(outputPath);

    // Generate and write individual note JSONs
    for (const note of notes) {
        const notePath = path.join(outputPath, `${note.slug}.json`);
        await writeFile(notePath, JSON.stringify(note, null, 2));
    }

    // Generate Global Index
    const globalIndex: GlobalIndexEntry[] = notes.map((note) => {
        // Ensure tags are an array of strings
        let tags: string[] = [];
        if (Array.isArray(note.frontmatter.tags)) {
            tags = note.frontmatter.tags.map(String);
        } else if (typeof note.frontmatter.tags === 'string') {
            tags = [note.frontmatter.tags];
        }

        return {
            slug: note.slug,
            title: (note.frontmatter.title as string) || note.slug,
            tags,
            date: note.frontmatter.date as string | undefined,
            excerpt: note.excerpt,
            readingTime: note.stats.readingTime,
        };
    });

    await writeFile(
        path.join(outputPath, 'index.json'),
        JSON.stringify(globalIndex, null, 2)
    );

    // Generate Aliases / Redirects mapping
    const aliasesData: Record<string, string> = {};
    for (const note of notes) {
        if (note.frontmatter.aliases) {
            let aliases: string[] = [];
            if (Array.isArray(note.frontmatter.aliases)) {
                aliases = note.frontmatter.aliases.map(String);
            } else if (typeof note.frontmatter.aliases === 'string') {
                aliases = [note.frontmatter.aliases];
            }

            for (const alias of aliases) {
                // Ensure alias is treated as a slug-like path
                const aliasSlug = options.plugins?.find(p => p.name === 'wikilink')
                    ? filePathToSlug(alias, '')
                    : alias.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w\-\/]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

                // Map the alias to the canonical slug
                aliasesData[`/${aliasSlug}`] = `/${note.slug}`;
            }
        }
    }

    await writeFile(
        path.join(outputPath, 'aliases.json'),
        JSON.stringify(aliasesData, null, 2)
    );

    // Generate Graph Data struct
    const graphData: GraphData = {
        nodes: notes.map((note) => ({
            id: note.slug,
            label: (note.frontmatter.title as string) || note.slug,
            metadata: Object.keys(note.frontmatter).length > 0 ? note.frontmatter : undefined,
        })),
        edges: [],
    };

    // Populate graph edges
    for (const note of notes) {
        // note.links contains the final slugified targets
        for (const targetSlug of note.links) {
            if (parserOptions.availableSlugs.has(targetSlug)) {
                graphData.edges.push({
                    source: note.slug,
                    target: targetSlug,
                    type: 'wikilink' as any, // Type assertion since LinkType doesn't directly map easily here
                });
            }
        }
    }

    await writeFile(
        path.join(outputPath, 'graph.json'),
        JSON.stringify(graphData, null, 2)
    );

    // Generate RSS Feed
    console.log('📰 Generating RSS feed...');
    const publishedNotes = notes
        .filter(note => {
            // Filter for published notes (either has published: true or has a date)
            return note.frontmatter.published === true || note.frontmatter.date;
        })
        .sort((a, b) => {
            // Sort by date descending
            const dateA = a.frontmatter.date ? new Date(a.frontmatter.date as string).getTime() : 0;
            const dateB = b.frontmatter.date ? new Date(b.frontmatter.date as string).getTime() : 0;
            return dateB - dateA;
        });

    const feed = new Feed({
        title: 'Sparks Notes',
        description: 'A collection of interconnected notes',
        id: 'https://example.com/',
        link: 'https://example.com/',
        language: 'en',
        favicon: 'https://example.com/favicon.ico',
        copyright: `All rights reserved ${new Date().getFullYear()}`,
        updated: publishedNotes.length > 0 && publishedNotes[0]?.frontmatter.date 
            ? new Date(publishedNotes[0].frontmatter.date as string)
            : new Date(),
        generator: 'Sparks',
        feedLinks: {
            rss2: 'https://example.com/rss.xml',
        },
    });

    for (const note of publishedNotes) {
        feed.addItem({
            title: (note.frontmatter.title as string) || note.slug,
            id: `https://example.com/${note.slug}`,
            link: `https://example.com/${note.slug}`,
            description: note.excerpt || '',
            content: note.excerpt || '',
            date: note.frontmatter.date ? new Date(note.frontmatter.date as string) : new Date(),
            author: note.frontmatter.author ? [{
                name: note.frontmatter.author as string
            }] : undefined,
        });
    }

    await writeFile(path.join(outputPath, 'rss.xml'), feed.rss2());

    // Generate Sitemap
    console.log('🗺️  Generating sitemap...');
    const sitemapEntries = notes
        .filter(note => {
            // Include notes that are published or have a date
            return note.frontmatter.published === true || note.frontmatter.date;
        })
        .map(note => {
            const lastmod = note.frontmatter.date 
                ? new Date(note.frontmatter.date as string).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            return `  <url>
    <loc>https://example.com/${note.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;

    await writeFile(path.join(outputPath, 'sitemap.xml'), sitemap);

    const duration = Date.now() - startTime;
    console.log(`Successfully processed ${notes.length} notes in ${duration}ms!`);
    console.log(`  - Generated ${publishedNotes.length} RSS entries`);
    console.log(`  - Generated ${sitemapEntries.length} sitemap entries`);
}
