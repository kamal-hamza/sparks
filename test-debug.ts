import { parseMarkdown } from './packages/core/src/core/parser';
import { defaultPlugins } from './packages/core/src/plugins/index';

const content = 'Link to [[Other Note]] and [[Another Note|Display]].';
const note = await parseMarkdown(content, 'test.md', {
  plugins: defaultPlugins,
});

console.log('Links found:', note.links);
console.log('Link details:', note.linkDetails);
console.log('Content AST type:', note.contentAst.type);
console.log('Content AST children:', note.contentAst.children.length);
