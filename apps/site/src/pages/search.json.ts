import { getCollection } from 'astro:content';

export const prerender = true;

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
        tags: recipe.data.tags,
        source: recipe.data.source,
        status: recipe.data.status,
        servings: recipe.data.servings,
        prepTime: recipe.data.prepTime,
        cookTime: recipe.data.cookTime,
        temperature: recipe.data.temperature,
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
