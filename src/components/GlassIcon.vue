<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
 <svg class="glass-glyph" width="30" height="30" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
  <g v-if="name === 'folder'">
   <path opacity=".55" d="M4 6h8l3 3h12a2 2 0 0 1 2 2v14H3V8a2 2 0 0 1 1-2Z"/>
   <path d="M3 12h26l-2 14H5Z"/>
   <path class="glyph-edge" d="M4 12.5h24"/>
  </g>
  <g v-else-if="name === 'pets'">
   <ellipse cx="6.5" cy="13" rx="3.1" ry="4.1" transform="rotate(-22 6.5 13)"/>
   <ellipse cx="12.2" cy="6.8" rx="3" ry="4" transform="rotate(-10 12.2 6.8)"/>
   <ellipse cx="20" cy="6.8" rx="3" ry="4" transform="rotate(10 20 6.8)"/>
   <ellipse cx="25.5" cy="13" rx="3.1" ry="4.1" transform="rotate(22 25.5 13)"/>
   <path d="M16 14c-3.4 0-4.5 3.1-7.2 5.7-4.4 4.2-1.7 8.8 2 7.7 3.8-1.2 6.6-1.2 10.4 0 3.7 1.1 6.4-3.5 2-7.7C20.5 17.1 19.4 14 16 14Z"/>
  </g>
  <g v-else-if="name === 'daily'">
   <path class="glyph-stroke" opacity=".7" d="M9 4v3m6-4v4m6-3v3"/>
   <path class="glyph-stroke" d="M24 12h2a4 4 0 0 1 0 8h-2"/>
   <path d="M5 11h19v10a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6Z"/>
   <path class="glyph-edge" d="M6 12h17"/>
   <path class="glyph-stroke" opacity=".55" d="M4 29h22"/>
  </g>
  <g v-else-if="name === 'travel'">
   <path opacity=".65" d="m3 7 9-3v23l-9 3Zm18-3 8 3v23l-8-3Z"/>
   <path d="m12 4 9 3v23l-9-3Z"/>
   <path class="glyph-edge" d="M12 5v21M21 8v21"/>
  </g>
  <g v-else-if="name === 'code'" class="glyph-stroke">
   <path d="m10 8-7 8 7 8m12-16 7 8-7 8"/>
   <path opacity=".65" d="m19 4-6 24"/>
  </g>
  <g v-else-if="name === 'about'">
   <circle cx="16" cy="9" r="6"/>
   <path opacity=".85" d="M5 27a11 11 0 0 1 22 0v2H5Z"/>
   <path class="glyph-edge" d="M7.5 22a10 10 0 0 1 17 0"/>
  </g>
 </svg>
</template>
