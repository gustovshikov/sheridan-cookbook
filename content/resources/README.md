# Recipe Resources

Use `content/resources/` for files that support recipes but are not themselves recipe Markdown files.

During `npm run sync` and `npm run build`, this folder is copied to:

```text
apps/site/public/resources/
```

Astro then includes those files in the built website under:

```text
/resources/
```

## Folder Layout

```text
content/resources/
├── archived-scans/       # Permanent copies of original recipe scans
├── recipe-images/        # Food photos and process images used by recipes
└── documents/
    ├── recipe-references/     # Recipe-specific PDFs, notes, plans, source docs
    ├── family-sources/        # Family history or source notes
    ├── ingredient-references/ # Ingredient sourcing and substitution notes
    └── general/               # Other cookbook support documents
```

Use recipe category folders under `archived-scans/`, `recipe-images/`, and `documents/recipe-references/` so resources stay aligned with `content/recipes/`.

## Archived Scans

Archived scans are the long-term reference copy of original recipe cards, handwritten pages, clippings, or cookbook pages.

Use category folders and recipe slugs:

```text
content/resources/archived-scans/breads/banana-bread.jpg
content/resources/archived-scans/soups-stews/tortilla-soup.jpg
content/resources/archived-scans/soups-stews/tortilla-soup-02.jpg
```

For multipage scans:

- Order pages by original scan timestamp or visible page order.
- Use the first page as the base filename.
- Suffix later pages with `-02`, `-03`, and so on.

## Recipe Images

Recipe images are display or process photos, not archival source scans.

```text
content/resources/recipe-images/breads/no-knead-maslin-bread.jpg
content/resources/recipe-images/beef/texas-style-smoked-brisket-sliced.jpg
```

Use the recipe slug as the base filename. Add a short suffix for multiple images.

## Documents

Use `documents/recipe-references/<category>/` for files tied to a recipe. If a recipe has several supporting documents, make a subfolder with the recipe slug.

```text
content/resources/documents/recipe-references/breads/no-knead-maslin-bread/ingredient-notes.md
content/resources/documents/ingredient-references/flour-sourcing.md
content/resources/documents/family-sources/jane-burchard.md
```

## Linking From Recipes

Use relative Markdown links from recipe files.

From a category recipe such as `content/recipes/breads/banana-bread.md`:

```md
[Original scan](../../resources/archived-scans/breads/banana-bread.jpg)
[Ingredient notes](../../resources/documents/recipe-references/breads/no-knead-maslin-bread/ingredient-notes.md)
```

The sync script rewrites those links to `/resources/...` for the website.

Archived scan links open in a new browser tab on the website so the original scan can be checked without leaving the recipe page.

## Resource Checklist

- File is stored under the correct resource type.
- File path uses lowercase hyphenated recipe slugs where practical.
- Multipage scans use `-02`, `-03`, and later suffixes.
- Public recipes link to the resource from `### References`.
- `npm run build` passes and the generated website link opens.
