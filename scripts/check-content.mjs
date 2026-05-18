import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const recipesRoot = path.join(repoRoot, 'content', 'recipes');
const requiredFields = ['title', 'source', 'status', 'tags'];
const generatedFields = ['category', 'folderPath', 'sourcePath'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const issues = [];

const relative = (filePath) => path.relative(repoRoot, filePath).split(path.sep).join('/');

const addIssue = (filePath, message) => {
  issues.push(`${relative(filePath)}: ${message}`);
};

const collectMarkdownFiles = async (absoluteDir, relativeDir = '') => {
  const entries = await readdir(path.join(absoluteDir, relativeDir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(absoluteDir, entryRelativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(absoluteDir, entryRelativePath));
    }
  }

  return files.sort((a, b) => relative(a).localeCompare(relative(b)));
};

const parseYamlScalar = (value) => {
  const trimmed = value.trim();

  if (trimmed === '[]') return [];

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
};

const parseFrontmatter = (frontmatter) => {
  const data = {};
  let currentArrayKey = null;

  for (const line of frontmatter.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentArrayKey) {
      data[currentArrayKey].push(parseYamlScalar(listItem[1]));
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyValue) {
      currentArrayKey = null;
      continue;
    }

    const [, key, rawValue = ''] = keyValue;
    const value = rawValue.trim();

    if (value === '') {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }

    data[key] = parseYamlScalar(value);
    currentArrayKey = null;
  }

  return data;
};

const splitFrontmatter = (markdown) => {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return { frontmatter: null, body: markdown };
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    body: markdown.slice(match[0].length),
  };
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeLinkTarget = (rawTarget, filePath) => {
  const trimmed = rawTarget.trim();

  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1);
  }

  const targetWithOptionalTitle = trimmed.match(/^(\S+)(?:\s+["'][^"']*["'])?$/);
  if (!targetWithOptionalTitle) {
    addIssue(filePath, `Markdown link target contains spaces; encode spaces as %20: ${trimmed}`);
    return null;
  }

  return targetWithOptionalTitle[1];
};

const checkMarkdownLinks = (filePath, markdown) => {
  const linkPattern = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;

  if (markdown.includes('[[') || markdown.includes(']]')) {
    addIssue(filePath, 'Obsidian wiki links are not supported; use normal Markdown links.');
  }

  for (const match of markdown.matchAll(linkPattern)) {
    const target = normalizeLinkTarget(match[1], filePath);
    if (!target) continue;

    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) {
      continue;
    }

    if (target.startsWith('/')) {
      addIssue(filePath, `Use repo-relative Markdown links in source recipes, not site-root links: ${target}`);
      continue;
    }

    const targetPath = target.split('#')[0].split('?')[0];
    let decodedTargetPath = targetPath;

    try {
      decodedTargetPath = decodeURI(targetPath);
    } catch {
      addIssue(filePath, `Link target is not valid URI encoding: ${target}`);
      continue;
    }

    if (/(^|\/)Resources\//.test(decodedTargetPath)) {
      addIssue(filePath, `Use lowercase content/resources links, not Resources: ${target}`);
    }

    const resolvedPath = path.resolve(path.dirname(filePath), decodedTargetPath);
    const relativeResolvedPath = path.relative(repoRoot, resolvedPath);

    if (relativeResolvedPath.startsWith('..') || path.isAbsolute(relativeResolvedPath)) {
      addIssue(filePath, `Link escapes the repository: ${target}`);
      continue;
    }

    if (!existsSync(resolvedPath)) {
      addIssue(filePath, `Local Markdown link target does not exist: ${target}`);
    }
  }
};

const checkRecipePath = (filePath) => {
  const pathParts = relative(filePath).split('/');
  const recipePathParts = pathParts.slice(2);

  for (const part of recipePathParts) {
    const value = part.endsWith('.md') ? part.slice(0, -3) : part;
    if (!slugPattern.test(value)) {
      addIssue(filePath, `Recipe path segment should be lowercase kebab-case: ${part}`);
    }
  }
};

const recipes = await collectMarkdownFiles(recipesRoot);
const routes = new Map();
const titles = new Map();

if (recipes.length === 0) {
  issues.push('content/recipes: no recipe Markdown files found.');
}

for (const filePath of recipes) {
  checkRecipePath(filePath);

  const markdown = await readFile(filePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(markdown);

  if (!frontmatter) {
    addIssue(filePath, 'Missing YAML frontmatter block.');
    checkMarkdownLinks(filePath, markdown);
    continue;
  }

  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      addIssue(filePath, `Missing required frontmatter field: ${field}`);
      continue;
    }

    if (field === 'tags') {
      if (!Array.isArray(frontmatter.tags) || frontmatter.tags.length === 0) {
        addIssue(filePath, 'Frontmatter field tags must be a non-empty YAML list.');
      }
      continue;
    }

    if (typeof frontmatter[field] !== 'string' || frontmatter[field].trim() === '') {
      addIssue(filePath, `Frontmatter field ${field} must be a non-empty string.`);
    }
  }

  for (const field of generatedFields) {
    if (field in frontmatter) {
      addIssue(filePath, `Do not add generated field to source recipes: ${field}`);
    }
  }

  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();

  if (!h1) {
    addIssue(filePath, 'Recipe body should include a visible # Title heading.');
  } else if (title && h1 !== title) {
    addIssue(filePath, `Frontmatter title and # heading differ: "${title}" vs "${h1}"`);
  }

  if (title) {
    const existing = titles.get(title);
    if (existing) {
      addIssue(filePath, `Duplicate recipe title also used by ${relative(existing)}: ${title}`);
    } else {
      titles.set(title, filePath);
    }
  }

  const recipeRelativePath = relative(filePath).split('/').slice(2);
  const categorySlug = slugify(recipeRelativePath[0]);
  const folderSlugs = recipeRelativePath.slice(1, -1).map(slugify);
  const fileSlug = slugify(path.basename(recipeRelativePath.at(-1), '.md'));
  const route = ['recipes', categorySlug, ...folderSlugs, fileSlug].join('/');
  const existingRoute = routes.get(route);

  if (existingRoute) {
    addIssue(filePath, `Duplicate generated recipe route also used by ${relative(existingRoute)}: /${route}/`);
  } else {
    routes.set(route, filePath);
  }

  checkMarkdownLinks(filePath, markdown);
}

if (issues.length > 0) {
  console.error(`Content checks failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Content checks passed: ${recipes.length} recipes validated.`);
