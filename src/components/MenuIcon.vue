<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 19 });
</script>
<template>
 <svg class="menu-glyph" :width="name === 'battery' ? size * 1.35 : size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <g v-if="name === 'wifi'" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">
   <path d="M2.5 8.2a15.1 15.1 0 0 1 19 0M6 12.1a9.5 9.5 0 0 1 12 0M9.3 15.9a4.3 4.3 0 0 1 5.4 0"/>
   <circle cx="12" cy="19.3" r="1.3" fill="currentColor" stroke="none"/>
  </g>
  <g v-else-if="name === 'battery'">
   <rect x="1" y="6.5" width="19" height="11" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".75"/>
   <rect x="3.4" y="8.8" width="13.8" height="6.4" rx="1.3" fill="currentColor"/>
   <path d="M22 10v4" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" opacity=".8"/>
  </g>
  <g v-else-if="name === 'globe'" stroke="currentColor" stroke-width="1.6">
   <circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/>
   <path d="M3 12h18M5 6.5c4 2 10 2 14 0M5 17.5c4-2 10-2 14 0" opacity=".65"/>
  </g>
  <g v-else-if="name === 'sun'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
   <circle cx="12" cy="12" r="4.1" fill="currentColor" fill-opacity=".15"/>
   <path d="M12 1.7v2m0 16.6v2M1.7 12h2m16.6 0h2M4.7 4.7l1.4 1.4m11.8 11.8 1.4 1.4M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4"/>
  </g>
  <path v-else-if="name === 'moon'" d="M20.6 14.3A8.8 8.8 0 0 1 9.7 3.4 9 9 0 1 0 20.6 14.3Z" fill="currentColor"/>
  <g v-else stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
   <rect x="2.5" y="3.5" width="19" height="13" rx="2.5"/><path d="M12 17v3.5m-4.5 0h9"/>
   <path d="M5 6h7v8H5Z" fill="currentColor" stroke="none" opacity=".6"/>
  </g>
 </svg>
</template>
