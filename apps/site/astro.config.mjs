import { defineConfig } from 'astro/config';

const archivedScansInNewTabs = () => {
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'element' &&
      node.tagName === 'a' &&
      typeof node.properties?.href === 'string' &&
      node.properties.href.startsWith('/resources/archived-scans/')
    ) {
      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  };

  return (tree) => visit(tree);
};

export default defineConfig({
  site: 'https://cookbook.cyberhelm.com',
  markdown: {
    rehypePlugins: [archivedScansInNewTabs],
  },
});
