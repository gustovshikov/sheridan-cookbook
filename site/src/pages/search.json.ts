import { getCollection } from 'astro:content';

const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET() {
  const recipes = (await getCollection('recipes')).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );

  return new Response(
    JSON.stringify(
      recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.data.title,
        category: recipe.data.category,
        folderPath: recipe.data.folderPath,
        sourcePath: recipe.data.sourcePath,
        url: `/recipes/${recipe.id}/`,
        content: stripMarkdown(recipe.body),
      })),
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
}
