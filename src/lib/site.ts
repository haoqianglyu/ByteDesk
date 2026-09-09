// Preview origins must not advertise themselves as the public website.
export function isIndexableSite(site?: URL): boolean {
 if (!site || site.protocol !== 'https:') return false;
 const host = site.hostname.toLowerCase();
 return host !== 'localhost' && host !== '[::1]' && host !== '0.0.0.0'
  && !host.startsWith('127.')
  && !['.localhost', '.local', '.test', '.workers.dev', '.pages.dev'].some(suffix => host.endsWith(suffix));
}
