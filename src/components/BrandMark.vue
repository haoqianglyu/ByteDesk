<script setup lang="ts">
import mark from '../../public/brand/bytedesk-mark.svg?raw';
import tile from '../../public/brand/bytedesk-icon.svg?raw';
withDefaults(defineProps<{ size?: number | string; variant?: 'mono' | 'tile' }>(), { size: 24, variant: 'mono' });
</script>
<template>
 <span class="brand-mark" aria-hidden="true" :style="{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }" v-html="variant === 'tile' ? tile : mark"></span>
</template>
<style>
.brand-mark{display:inline-flex;vertical-align:middle;flex-shrink:0;line-height:0}
.brand-mark>svg,.about-avatar .brand-mark>svg{display:block;width:100%;height:100%;overflow:visible}
.profile-icon:has(.brand-mark){background:none;box-shadow:0 3px 8px #173c7720}
.about-avatar:has(.brand-mark){background:none;box-shadow:0 10px 25px #365f9920;border-radius:24px}
</style>
