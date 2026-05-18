import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const distRoot = path.join(repoRoot, 'apps', 'site', 'dist');
const issues = [];
const htmlCache = new Map();

const relative = (filePath) => path.relative(repoRoot, filePath).split(path.sep).join('/');

const addIssue = (filePath, message) => {
  issues.push(`${relative(filePath)}: ${message}`);
};

const collectHtmlFiles = async (absoluteDir, relativeDir = '') => {
  const entries = await readdir(path.join(absoluteDir, relativeDir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absoluteDir, entryRelativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(path.join(absoluteDir, entryRelativePath));
    }
  }

  return files.sort((a, b) => relative(a).localeCompare(relative(b)));
};

const readHtml = (filePath) => {
  if (!htmlCache.has(filePath)) {
    htmlCache.set(filePath, readFileSync(filePath, 'utf8'));
  }

  return htmlCache.get(filePath);
};

const localTargetFor = (currentFile, rawPath) => {
  if (!rawPath) return currentFile;

  let decodedPath = rawPath;
  try {
    decodedPath = decodeURI(rawPath);
  } catch {
    return null;
  }

  const absolutePath = decodedPath.startsWith('/')
    ? path.join(distRoot, decodedPath)
    : path.resolve(path.dirname(currentFile), decodedPath);

  if (existsSync(absolutePath)) {
    return absolutePath;
  }

  const indexPath = path.join(absolutePath, 'index.html');
  if (existsSync(indexPath)) {
    return indexPath;
  }

  return absolutePath;
};

const idsForHtml = (filePath) => {
  const html = readHtml(filePath);
  const ids = new Set();

  for (const match of html.matchAll(/\b(?:id|name)="([^"]+)"/g)) {
    ids.add(match[1]);
  }

  return ids;
};

if (!existsSync(distRoot)) {
  console.error('Built site not found at apps/site/dist. Run npm run build before npm run test:links.');
  process.exit(1);
}

const htmlFiles = await collectHtmlFiles(distRoot);

if (htmlFiles.length === 0) {
  console.error('No built HTML files found in apps/site/dist. Run npm run build before npm run test:links.');
  process.exit(1);
}

for (const filePath of htmlFiles) {
  const html = readHtml(filePath);

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const rawUrl = match[1];

    if (/^(https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(rawUrl)) {
      continue;
    }

    if (/\s/.test(rawUrl)) {
      addIssue(filePath, `Local href/src contains unencoded whitespace: ${rawUrl}`);
      continue;
    }

    const hashIndex = rawUrl.indexOf('#');
    const pathAndQuery = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
    const fragment = hashIndex >= 0 ? rawUrl.slice(hashIndex + 1).split('?')[0] : '';
    const pathPart = pathAndQuery.split('?')[0];
    const targetPath = localTargetFor(filePath, pathPart);

    if (!targetPath) {
      addIssue(filePath, `Local href/src is not valid URI encoding: ${rawUrl}`);
      continue;
    }

    const targetIsHtml = targetPath.endsWith('.html') || existsSync(path.join(targetPath, 'index.html'));
    const resolvedHtmlTarget = targetPath.endsWith('.html') ? targetPath : path.join(targetPath, 'index.html');

    if (pathPart && !existsSync(targetPath) && !existsSync(resolvedHtmlTarget)) {
      addIssue(filePath, `Local href/src target does not exist: ${rawUrl}`);
      continue;
    }

    if (!fragment || !targetIsHtml || !existsSync(resolvedHtmlTarget)) {
      continue;
    }

    let decodedFragment = fragment;
    try {
      decodedFragment = decodeURIComponent(fragment);
    } catch {
      addIssue(filePath, `Fragment is not valid URI encoding: ${rawUrl}`);
      continue;
    }

    if (!idsForHtml(resolvedHtmlTarget).has(decodedFragment)) {
      addIssue(filePath, `Fragment target does not exist: ${rawUrl}`);
    }
  }
}

if (issues.length > 0) {
  console.error(`Built link checks failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Built link checks passed: ${htmlFiles.length} HTML files validated.`);
