import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const recipes = defineCollection({
  loader: glob({ base: './src/content/recipes', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    folderPath: z.array(z.string()).default([]),
    sourcePath: z.string(),
  }),
});

export const collections = { recipes };
