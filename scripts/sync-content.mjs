import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const contentRoot = path.join(repoRoot, 'content');

const recipesRoot = path.join(contentRoot, 'recipes');
const resourceDir = path.join(contentRoot, 'resources');

const target = {
  name: 'Astro',
  contentRoot: path.join(repoRoot, 'apps', 'site', 'src', 'content', 'recipes'),
  publicResources: path.join(repoRoot, 'apps', 'site', 'public', 'resources'),
};

const titleCase = (value) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
  if (!markdown.startsWith('---\n')) {
    return { frontmatter: {}, body: markdown };
  }

  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    body: markdown.slice(match[0].length),
  };
};

const yamlScalar = (value) => JSON.stringify(String(value));

const serializeFrontmatter = (frontmatter) => {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        continue;
      }

      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${yamlScalar(item)}`);
      }
      continue;
    }

    lines.push(`${key}: ${yamlScalar(value)}`);
  }

  lines.push('---', '');
  return lines.join('\n');
};

const rewriteResourceLinks = (markdown) =>
  markdown.replace(/\]\(((?:\.\.\/)+(?:Resources|resources)\/([^)]+))\)/g, '](/resources/$2)');

const extractTitle = (markdown, fallback) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1].trim() || titleCase(fallback);
};

const removeFirstH1 = (markdown) => markdown.replace(/^#\s+.+\n+/, '');

const prepRecipeMarkdown = (source, sourcePath, category, folderPath, fallbackTitle) => {
  const { frontmatter: sourceFrontmatter, body: sourceBody } = splitFrontmatter(source);
  const title = sourceFrontmatter.title
    ? String(sourceFrontmatter.title)
    : extractTitle(sourceBody, fallbackTitle);
  const body = rewriteResourceLinks(removeFirstH1(sourceBody.trimStart())).trimStart();
  const {
    title: _title,
    category: _category,
    folderPath: _folderPath,
    sourcePath: _sourcePath,
    ...recipeFrontmatter
  } = sourceFrontmatter;
  const frontmatter = serializeFrontmatter({
    title,
    category,
    ...recipeFrontmatter,
    folderPath,
    sourcePath,
  });

  return `${frontmatter}${body}`;
};

const toPosixPath = (...parts) => parts.filter(Boolean).join('/');

const collectMarkdownFiles = async (absoluteDir, relativeDir = '') => {
  const entries = await readdir(path.join(absoluteDir, relativeDir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(absoluteDir, entryRelativePath)));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name) === '.md') {
      files.push(entryRelativePath);
    }
  }

  return files;
};

const collectRecipeDirs = async () => {
  const entries = await readdir(recipesRoot, { withFileTypes: true });
  const recipeDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const files = await collectMarkdownFiles(path.join(recipesRoot, entry.name));
    if (files.length > 0) recipeDirs.push(entry.name);
  }

  return recipeDirs.sort((a, b) => a.localeCompare(b));
};

const collectRecipes = async (recipeDirs) => {
  const recipes = [];

  for (const dir of recipeDirs) {
    const absoluteDir = path.join(recipesRoot, dir);
    const files = await collectMarkdownFiles(absoluteDir);

    for (const file of files) {
      const pathParts = file.split(path.sep);
      const folderParts = pathParts.slice(0, -1);
      const fileName = pathParts.at(-1);
      const sourcePath = toPosixPath('content', 'recipes', dir, ...pathParts);
      const sourceAbsolutePath = path.join(absoluteDir, file);
      const category = titleCase(dir);
      const categorySlug = slugify(dir);
      const folderPath = folderParts.map(titleCase);
      const slugParts = folderParts.map(slugify);
      const fileSlug = `${slugify(path.basename(fileName, '.md'))}.md`;
      const targetPathParts = [...slugParts, fileSlug];
      const fallbackTitle = path.basename(fileName, '.md');

      recipes.push({
        sourcePath,
        sourceAbsolutePath,
        category,
        categorySlug,
        folderPath,
        targetPathParts,
        fallbackTitle,
      });
    }
  }

  return recipes.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
};

const syncResources = async () => {
  await rm(target.publicResources, { recursive: true, force: true });
  await mkdir(target.publicResources, { recursive: true });
  await cp(resourceDir, target.publicResources, { recursive: true });
};

const syncRecipes = async (recipes) => {
  await mkdir(target.contentRoot, { recursive: true });
  const existingEntries = await readdir(target.contentRoot, { withFileTypes: true });

  for (const entry of existingEntries) {
    if (entry.isDirectory()) {
      await rm(path.join(target.contentRoot, entry.name), { recursive: true, force: true });
    }
  }

  for (const recipe of recipes) {
    const source = await readFile(recipe.sourceAbsolutePath, 'utf8');
    const output = prepRecipeMarkdown(
      source,
      recipe.sourcePath,
      recipe.category,
      recipe.folderPath,
      recipe.fallbackTitle,
    );
    const targetPath = path.join(target.contentRoot, recipe.categorySlug, ...recipe.targetPathParts);
    const targetDir = path.dirname(targetPath);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, output);
  }
};

const recipeDirs = await collectRecipeDirs();
const recipes = await collectRecipes(recipeDirs);

await syncRecipes(recipes);
await syncResources();
console.log(`Synced ${recipes.length} recipes and resources for ${target.name}.`);
