# Recipe Ingest Workflow

Use `content/ingest/` for recipe inputs that are not ready to be public recipes yet.

This includes emailed recipe text, scanned recipe cards, handwritten pages, cookbook photos, family notes, PDFs, and temporary transcription work.

## Folder Layout

```text
content/ingest/
├── incoming-scans/      # New scanned cards, clippings, handwritten pages, cookbook pages
├── incoming-photos/     # Food photos or process photos
├── incoming-documents/  # PDFs, notes, emails, web exports, supporting documents
├── working-notes/       # Transcription notes, uncertainty lists, temporary context
├── submissions/         # Saved copies of emailed recipe submissions when useful
└── processed/           # Inputs that were converted and archived
```

Raw files can start here with their original filenames. Once processed, long-term copies should move into `content/resources/`, and finished recipes should live under `content/recipes/`.

## Email Submission Flow

Family members submit recipes from the public `/add-recipe/` page by sending an email with recipe text, source details, notes, and any scans or photos.

When an email arrives:

1. Save scans, photos, or attached documents into the matching `incoming-*` folder.
2. Save useful email text or context into `working-notes/` or `submissions/`.
3. Transcribe and format the recipe manually.
4. Move permanent resource files into `content/resources/`.
5. Publish the finished recipe under `content/recipes/`.

## Manual Ingest Steps

1. Put new input files in the matching `content/ingest/incoming-*` folder.
2. Group files that belong to the same recipe.
3. For multipage scans, sort pages by original file timestamp or visible page order.
4. Transcribe the recipe as closely as practical. Preserve original wording where it matters.
5. Create the recipe Markdown file in `content/recipes/<category>/<recipe-slug>.md`.
6. Move archived scan copies into `content/resources/archived-scans/<category>/`.
7. Move food or process images into `content/resources/recipe-images/<category>/`.
8. Move supporting PDFs, notes, or references into `content/resources/documents/...`.
9. Add recipe links to archived scans or resource files in the recipe `### References` section.
10. Move the original incoming files to `content/ingest/processed/` if they no longer need active work.
11. Run `npm run build`.

## Naming Rules

Use the recipe title as the stable slug. Filenames should be lowercase and hyphen-separated.

```text
content/recipes/soups-stews/tortilla-soup.md
content/resources/archived-scans/soups-stews/tortilla-soup.jpg
content/resources/archived-scans/soups-stews/tortilla-soup-02.jpg
content/resources/recipe-images/soups-stews/tortilla-soup.jpg
```

For multipage recipes, use the first page as the base filename and suffix later pages with `-02`, `-03`, and so on.

## Transcription Rules

- Do not invent missing amounts, temperatures, or steps.
- If text is unclear, write a short note such as `[unclear: amount]` in `working-notes/`, then resolve it before publishing when possible.
- Keep public recipe sections concise: `Ingredients`, `Instructions`, `Notes`, and `References`.
- Preserve family context in `source` and tags instead of adding long source explanations to every recipe body.
- Use normal Markdown links, not Obsidian wiki links.

## Source And Family Links

Use source names registered in:

```text
apps/site/src/lib/sources.ts
```

Recognized source names link automatically on the website and appear on the Family Sources page.

Examples:

```yaml
source: Carol Sheridan
source: Jane Burchard
source: Bill Burchard
source: Courtney Sheridan; from Jane Burchard
```

If a recipe introduces a new family source, add that person once in `apps/site/src/lib/sources.ts`. Include `treeGroup` when the person should appear in the family tree.

## Final Checklist

- Recipe lives under `content/recipes/<category>/`.
- Recipe frontmatter includes `title`, `source`, `status`, and useful tags.
- Original scans are archived under `content/resources/archived-scans/<category>/`.
- Recipe images are under `content/resources/recipe-images/<category>/`.
- Supporting documents are under `content/resources/documents/`.
- Recipe references use relative links to `../../resources/...`.
- `npm run build` passes.
