import type { FullStackPlugin } from './types';

/**
 * Utility for Next.js/React applications to easily extract all 
 * React components from the active plugins to feed into rehype-react.
 */
export function extractReactComponents(plugins: FullStackPlugin[]): Record<string, any> {
    return plugins.reduce((acc, plugin) => {
        if (plugin.render?.reactComponents) {
            return { ...acc, ...plugin.render.reactComponents };
        }
        return acc;
    }, {});
}
