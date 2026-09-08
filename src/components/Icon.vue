<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
 lab: 'M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 16h10M10 18h.01M14 14h.01',
 projects: 'M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3',
 home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z',
 grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
 search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 code: 'm8 5-7 7 7 7m8-14 7 7-7 7M14 3l-4 18',
 pets: 'M8 15c-4 2-4 7 0 6l4-1 4 1c4 1 4-4 0-6l-2-2h-4zM8 8c-3 0-3-6 0-6s3 6 0 6Zm8 0c-3 0-3-6 0-6s3 6 0 6ZM3 13c-2 0-3-5-1-5s4 5 1 5Zm18 0c-3 0-1-5 1-5s1 5-1 5Z',
 daily: 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M6 2v2m4-2v2m4-2v2',
 travel: 'm3 3 7 2 4-2 7 2v16l-7-2-4 2-7-2ZM10 5v16m4-18v16',
 sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
 moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
 system: 'M3 3h18v14H3zM8 21h8m-4-4v4',
 arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'M19 12H5m6-6-6 6 6 6',
 chevron: 'm9 5 7 7-7 7', close: 'm6 6 12 12M6 18 18 6',
 expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
 rss: 'M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M4 20h.01',
 about: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 folder: 'M3 5h6l2 3h10v12H3Z', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v5l3 2',
 globe: 'M3 12h18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 0c-6 5-6 13 0 18m0-18c6 5 6 13 0 18',
 check: 'm4 12 5 5L20 6', pin: 'm9 3 9 0-2 7 4 4-6 0-5 7 0-7-5 0 4-4z',
 image: 'M3 3h18v18H3Zm0 14 6-6 4 4 3-3 5 5M16 7h.01',
 terminal: 'm4 6 6 6-6 6m9 0h7', link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m2 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
 wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0m-3 4h.01',
 battery: 'M2 6h17v12H2ZM22 10v4M5 9h11v6H5z',
 heart: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 15 8 15S25 10 20 5Z',
 tag: 'M3 3h8l10 10-8 8L3 11ZM7 7h.01',
 copy: 'M9 9h12v12H9ZM5 15H3V3h12v2',
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.folder" /></svg></template>
