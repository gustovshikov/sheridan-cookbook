import { getCollection } from 'astro:content';

export const getNavRecipes = async () => {
  const recipes = (await getCollection('recipes')).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.data.title,
    category: recipe.data.category,
    folderPath: recipe.data.folderPath,
    sourcePath: recipe.data.sourcePath,
    url: `/recipes/${recipe.id}/`,
  }));
};
