<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import Icon from './Icon.vue';
import type { Locale } from '../lib/i18n';
type Screenshot = { src: string; alt: string; title: string; description: string; width: number; height: number };
const props = defineProps<{ locale: Locale; screenshots: Screenshot[] }>();
const selected = ref(0);
const current = computed(() => props.screenshots[selected.value]);
const track = ref<HTMLElement>();
const dialog = ref<HTMLDialogElement>();
const enlarged = ref(0);
let trigger: HTMLButtonElement | null = null;
function slide(direction: number) {
 const el = track.value;
 if (!el) return;
 const slide = el.querySelector<HTMLElement>('.app-gallery-slide');
 const width = (slide?.getBoundingClientRect().width || 240) + 16;
 const next = Math.max(0, Math.min(props.screenshots.length - 1, selected.value + direction));
 el.scrollTo({ left: next * width, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function updateSelected() {
 const el = track.value;
 const slide = el?.querySelector<HTMLElement>('.app-gallery-slide');
 if (!el || !slide) return;
 selected.value = Math.max(0, Math.min(props.screenshots.length - 1, Math.round(el.scrollLeft / (slide.getBoundingClientRect().width + 16))));
}
async function open(index: number, event: MouseEvent) {
 enlarged.value = index; trigger = event.currentTarget as HTMLButtonElement;
 await nextTick(); dialog.value?.showModal();
}
function close() { dialog.value?.close(); }
function restoreFocus() { trigger?.focus({ preventScroll: true }); }
</script>
<template>
 <section class="app-gallery" :aria-label="locale === 'zh' ? 'Zoji 应用截图' : 'Zoji app screenshots'">
  <div class="app-gallery-heading"><div><p class="eyebrow">A CLOSER LOOK</p><h2>{{ locale === 'zh' ? '看见日常的每一面。' : 'A closer look at everyday care.' }}</h2></div><div class="app-gallery-controls"><button :disabled="selected === 0" @click="slide(-1)" :aria-label="locale === 'zh' ? '上一张截图' : 'Previous screenshot'"><Icon name="back" :size="18"/></button><button :disabled="selected === screenshots.length - 1" @click="slide(1)" :aria-label="locale === 'zh' ? '下一张截图' : 'Next screenshot'"><Icon name="arrow" :size="18"/></button></div></div>
  <div ref="track" class="app-gallery-track" tabindex="0" :aria-label="locale === 'zh' ? '横向滚动查看截图，点击可放大' : 'Scroll horizontally through screenshots; click to enlarge'" @scroll.passive="updateSelected" @keydown.left.prevent="slide(-1)" @keydown.right.prevent="slide(1)">
   <button v-for="(shot,index) in screenshots" :key="shot.src" class="app-gallery-slide" @click="open(index,$event)" :aria-label="`${shot.title} — ${locale === 'zh' ? '点击放大' : 'Enlarge screenshot'}`"><img :src="shot.src" :alt="shot.alt" :width="shot.width" :height="shot.height" loading="lazy"/><span><b>{{ String(index + 1).padStart(2,'0') }}</b>{{ shot.title }}<Icon name="expand" :size="13"/></span></button>
  </div>
  <div class="app-gallery-caption"><p>{{ current?.description }}</p><span>{{ String(selected + 1).padStart(2,'0') }} / {{ String(screenshots.length).padStart(2,'0') }}</span></div>
  <dialog ref="dialog" class="zoji-image-dialog" @click="e => e.target === dialog && close()" @close="restoreFocus" :aria-label="locale === 'zh' ? '应用截图大图' : 'Enlarged app screenshot'">
   <button class="zoji-image-close" @click="close" :aria-label="locale === 'zh' ? '关闭大图' : 'Close image'"><Icon name="close"/></button>
   <img v-if="screenshots[enlarged]" :src="screenshots[enlarged].src" :alt="screenshots[enlarged].alt" :width="screenshots[enlarged].width" :height="screenshots[enlarged].height"/>
  </dialog>
 </section>
</template>
