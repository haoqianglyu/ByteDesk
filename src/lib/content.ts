import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale, Category } from './i18n';
import { imageUrl } from './images';
export { imageUrl } from './images';
export type Post = CollectionEntry<'posts'>;
export type PostCard = { title: string; description: string; slug: string; category: Category; date: string; tags: string[]; cover?: string; coverAlt?: string; featured: boolean; sample: boolean; minutes: number; sourceLocale: Locale; place?: { id: string; name: string; region: string; longitude: number; latitude: number } };
export const postUrl = (locale: Locale, key: string) => `/${locale}/posts/${key}/`;
export async function publishedPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
export function forLocale(posts: Post[], locale: Locale) {
  const keys = [...new Set(posts.map(p => p.data.translationKey))];
  return keys.map(key => posts.find(p => p.data.translationKey === key && p.data.locale === locale) ?? posts.find(p => p.data.translationKey === key)!).sort((a,b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function card(post: Post): PostCard {
  const d = post.data;
  return { title: d.title, description: d.description, slug: d.translationKey, category: d.category, date: d.date.toISOString(), tags: d.tags, cover: imageUrl(d.cover), coverAlt: d.coverAlt, featured: d.featured, sample: d.sample, minutes: d.minutes, sourceLocale: d.locale, place: d.place };
}
