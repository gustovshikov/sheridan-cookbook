# Sheridan Family Cookbook

Markdown-powered family recipe site for `cookbook.cyberhelm.com`.

The project keeps the source of truth in git as plain Markdown and resource files. The public cookbook is fast and mostly prerendered with Astro. Family recipe submissions are handled by email, then reviewed and added to git by the cookbook maintainer.

## Current Shape

```text
.
├── apps/
│   └── site/             # Astro app and public pages
├── content/
│   ├── recipes/          # Source recipe Markdown
│   ├── resources/        # Scans, recipe images, PDFs, reference docs
│   └── ingest/           # Incoming files, emailed submissions, working notes
├── ops/
│   └── docker/           # Static Dockerfile and nginx config
├── scripts/
│   └── sync-content.mjs  # Copies content into the Astro app before builds
├── compose.yaml          # Local/self-hosted static nginx stack
├── package.json          # npm workspace scripts
└── package-lock.json
```

Generated files are intentionally ignored:

- `apps/site/src/content/recipes/`
- `apps/site/public/resources/`
- `apps/site/dist/`
- `apps/site/.astro/`

Do not edit generated recipe content in `apps/site/src/content/recipes/`. Edit source recipes in `content/recipes/`.

## Commands

Install dependencies:

```sh
npm install
```

Sync Markdown recipes and resources into the Astro app:

```sh
npm run sync
```

Run the local development server on `0.0.0.0:4321`:

```sh
npm run dev
```

Build the site:

```sh
npm run build
```

Preview the built static site:

```sh
npm run start
```

Run the nginx container locally:

```sh
docker compose up -d --build --remove-orphans
```

Then open:

```text
http://127.0.0.1:8080
```

Stop the local container stack:

```sh
docker compose down --remove-orphans
```

## How Content Builds

`scripts/sync-content.mjs` bridges git-managed cookbook content and the Astro app.

It does the following:

1. Reads recipes from `content/recipes/`.
2. Preserves recipe frontmatter.
3. Adds generated fields:
   - `category`
   - `folderPath`
   - `sourcePath`
4. Removes the first visible `# Title` from generated site content so recipe pages do not duplicate the title.
5. Rewrites relative links to `content/resources/` into website links under `/resources/...`.
6. Copies `content/resources/` into `apps/site/public/resources/`.

The Astro content collection then reads generated recipes from `apps/site/src/content/recipes/`.

## Public Routes

Public routes:

- `/`
- `/recipes/**`
- `/about/`
- `/family-sources/`
- `/add-recipe/`
- `/search.json`
- `/resources/**`

## Recipe Submissions

Recipe submissions happen by email from `/add-recipe/`:

1. A family member opens `/add-recipe/`.
2. They email the recipe text, family source, notes, and any photos or scans to the submission email.
3. The maintainer transcribes and reviews the recipe.
4. Approved recipes are committed as Markdown under `content/recipes/`.

Set the public submission email in `apps/site/src/lib/site-config.ts`:

```ts
export const siteConfig = {
  name: 'Sheridan Family Cookbook',
  url: 'https://cookbook.cyberhelm.com',
  submissionEmail: 'cookbook@cyberhelm.com',
};
```

After changing the email address, run `npm run build` and redeploy the static site.

## Recipe Files

Each recipe lives under the category folder in `content/recipes/`:

```text
content/recipes/beef/texas-style-smoked-brisket.md
content/recipes/breads/no-knead-maslin-bread.md
content/recipes/seafood/quick-hot-smoked-salmon-portions.md
```

Categories are generated from the first folder under `content/recipes/`:

```text
content/recipes/
├── appetizers/
├── beef/
├── breads/
├── breakfast/
├── chicken/
├── desserts/
├── drinks/
├── pork/
├── preserves/
├── salads/
├── sauces-condiments/
├── seafood/
├── sides/
└── soups-stews/
```

Subfolders are supported. For example, `content/recipes/desserts/cookies/chocolate-chip.md` still belongs to the `Desserts` category, and the subfolder appears in navigation grouping.

### Frontmatter

Start every recipe with YAML frontmatter:

```md
---
title: Smoked Pork Tenderloin
source: Eric Sheridan
status: working recipe
servings: 4-6 servings
prepTime: 15-30 mins
cookTime: About 1 hr
temperature: 225°F
tags:
  - pork
  - smoked
  - smoker
  - weeknight
---
```

Current fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `title` | Yes | Display title used by pages, cards, and search. |
| `source` | Recommended | Concise recipe source. Prefer registered family names when applicable. |
| `status` | Recommended | Recipe maturity, such as `working recipe`, `tested`, `family favorite`, `needs testing`, `transcribed scan`. |
| `servings` | Recommended | Yield or batch size. |
| `prepTime` | Recommended | Prep, rest, or setup time. |
| `cookTime` | Recommended | Cook, bake, smoke, chill, or ferment time. |
| `temperature` | Optional | Oven, smoker, grill, or target temperature. |
| `tags` | Recommended | Search and organization terms. |

Do not add `category`, `folderPath`, or `sourcePath` to source recipe files. The sync script generates those.

### Body Format

Keep the visible `# Title` in the source Markdown so the file reads well in editors. The sync script removes that first heading from generated web content.

Use concise sections:

```md
# Recipe Title

**Prep time:** 15 mins | **Cook time:** 45 mins | **Temp:** 350°F

### Ingredients

- Ingredient amount and name

### Instructions

1. **Step name:** Clear action.

### Notes

- Optional substitutions, storage, scaling, or family notes.

### References

- [Original scan](../../resources/archived-scans/breads/banana-bread.jpg)
```

Use normal Markdown links. Do not use Obsidian wiki links.

## Sources And Family Links

Family source data lives in:

```text
apps/site/src/lib/sources.ts
```

When a recipe `source` contains a registered source name, the site links that source to `/family-sources/`.

Keep recipe `source` values short:

```yaml
source: Carol Sheridan
source: Courtney Sheridan; from Jane Burchard
source: Carol Sheridan; from Nellie Lustgraaf
```

Put relationship details in `apps/site/src/lib/sources.ts`, not in every recipe.

Useful source-related tags:

```yaml
tags:
  - carol-sheridan
  - jane-burchard
  - bill-burchard
  - sheridan-family
  - family-favorite
```

## Resources

Supporting files live under `content/resources/`.

```text
content/resources/
├── archived-scans/
├── recipe-images/
└── documents/
    ├── recipe-references/
    ├── family-sources/
    ├── ingredient-references/
    └── general/
```

Use category folders for scans and recipe images:

```text
content/resources/archived-scans/breads/banana-bread.jpg
content/resources/archived-scans/soups-stews/tortilla-soup.jpg
content/resources/archived-scans/soups-stews/tortilla-soup-02.jpg
content/resources/recipe-images/breads/no-knead-maslin-bread.jpg
```

From a recipe file, link to resources with paths relative to `content/recipes/<category>/`:

```md
[Original scan](../../resources/archived-scans/breads/banana-bread.jpg)
```

The sync script rewrites these to `/resources/...` for the website.

See `content/resources/README.md` for resource naming details.

## Ingest Workflow

New unprocessed scans, photos, and documents start in `content/ingest/`.

```text
content/ingest/
├── incoming-scans/
├── incoming-photos/
├── incoming-documents/
├── working-notes/
├── submissions/
└── processed/
```

Use `/add-recipe/` for public email-based submission instructions. Use `content/ingest/README.md` for manual ingest and transcription guidance after recipes or scans arrive.

## Docker Self-Hosting

The Compose stack runs:

- `sheridan-cookbook-nginx`: static nginx site built from `apps/site/dist/`.

Docker resources:

- Compose project: `sheridan-cookbook`
- Site image: `sheridan-cookbook-site:local`
- Network: `sheridan-cookbook-network`

Example local run:

```sh
export COOKBOOK_HTTP_PORT=8080
docker compose up -d --build
```

See `ops/docker/README.md` for Docker-specific notes.

## Maintenance Checklist

Before publishing changes:

```sh
npm run build
docker compose config
```

For a local container smoke test:

```sh
docker compose up -d --build --remove-orphans
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/add-recipe/
curl -I http://127.0.0.1:8080/search.json
docker compose down --remove-orphans
```

Expected checks:

- `/` returns `200`.
- `/add-recipe/` returns `200`.
- `/search.json` returns recipe JSON.
- `/resources/...` serves copied files.
