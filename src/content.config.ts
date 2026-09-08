import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(), description: z.string(),
    locale: z.enum(['zh', 'en']), translationKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.enum(['pets', 'daily', 'travel', 'code']),
    date: z.coerce.date(), tags: z.array(z.string()).default([]),
    cover: z.string().optional(), coverAlt: z.string().optional(),
    featured: z.boolean().default(false), draft: z.boolean().default(false),
    sample: z.boolean().default(false), minutes: z.number().default(3),
    place: z.object({ id: z.string(), name: z.string(), region: z.string(), longitude: z.number().min(-180).max(180), latitude: z.number().min(-85).max(85) }).optional(),
  }),
});
export const collections = { posts };
