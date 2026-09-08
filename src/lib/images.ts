import imageManifest from '../../R2_IMAGES.json';
export function imageUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('/') || path.startsWith('https://')) return path;
  const base = import.meta.env.PUBLIC_IMAGE_BASE_URL || imageManifest.publicBaseUrl;
  if (!base) throw new Error(`PUBLIC_IMAGE_BASE_URL is required for R2 image: ${path}`);
  return `${base.replace(/\/$/, '')}/${path}`;
}
