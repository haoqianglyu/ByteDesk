<script setup lang="ts">
import BrandMark from './BrandMark.vue';
defineProps<{ kind: 'lab' | 'projects'; slug?: string }>();
</script>
<template>
 <div v-if="slug === 'logo-study'" class="work-preview preview-logo" aria-hidden="true"><BrandMark :size="135"/><span class="preview-coordinate">FORM · LIGHT · SPACE / 002</span></div>
 <div v-else-if="kind === 'lab'" class="work-preview preview-glass" aria-hidden="true"><div class="preview-orb"></div><div class="preview-glass-card"><span>EXPERIMENT / 001</span><strong>A little<br/>curiosity.</strong><span>◌ &nbsp; GLASS STUDY</span></div><span class="preview-coordinate">BLUR · LIGHT · COLOR</span></div>
 <div v-else class="work-preview preview-desktop" aria-hidden="true"><div class="preview-mini-window"><div class="preview-mini-toolbar"><i></i><i></i><i></i><span>ByteDesk</span></div><div class="preview-mini-body"><div class="preview-mini-sidebar"><span></span><span></span><span></span><span></span></div><div class="preview-mini-content"><strong>A home for<br/>code and ideas.</strong><div class="preview-mini-landscape"></div><div class="preview-mini-lines"><i></i><i></i><i></i></div></div></div></div><span class="preview-coordinate">A PERSONAL SPACE / 2026</span></div>
</template>
