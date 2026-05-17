import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const vaultRoot = repoRoot;

const recipesRoot = path.join(vaultRoot, 'recipes');
const resourceDir = path.join(vaultRoot, 'Resources');

const target = {
  name: 'Astro',
  contentRoot: path.join(repoRoot, 'site', 'src', 'content', 'recipes'),
  publicResources: path.join(repoRoot, 'site', 'public', 'resources'),
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

const yamlString = (value) => JSON.stringify(value);

const rewriteResourceLinks = (markdown) =>
  markdown.replace(/\]\(((?:\.\.\/)+Resources\/([^)]+))\)/g, '](/resources/$2)');

const stripExistingFrontmatter = (markdown) =>
  markdown.startsWith('---\n') ? markdown.replace(/^---\n[\s\S]*?\n---\n?/, '') : markdown;

const extractTitle = (markdown, fallback) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1].trim() || titleCase(fallback);
};

const removeFirstH1 = (markdown) => markdown.replace(/^#\s+.+\n+/, '');

const prepRecipeMarkdown = (source, sourcePath, category, folderPath, fallbackTitle) => {
  const withoutFrontmatter = stripExistingFrontmatter(source);
  const title = extractTitle(withoutFrontmatter, fallbackTitle);
  const body = rewriteResourceLinks(removeFirstH1(withoutFrontmatter)).trimStart();
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `category: ${yamlString(category)}`,
    `folderPath: ${yamlString(folderPath)}`,
    `sourcePath: ${yamlString(sourcePath)}`,
    '---',
    '',
  ].join('\n');

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
      const sourcePath = toPosixPath('recipes', dir, ...pathParts);
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
