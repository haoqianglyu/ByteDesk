<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue';
import Icon from './Icon.vue';
import { ui, type Locale } from '../lib/i18n';
const props = defineProps<{ locale: Locale }>();
const t = computed(() => ui(props.locale));
const dialog = ref<HTMLDialogElement>();
const src = ref('');
const alt = ref('');
let previousFocus: HTMLElement | null = null;
const cleanups: (() => void)[] = [];
async function open(image: HTMLImageElement) {
 previousFocus = document.activeElement as HTMLElement;
 src.value = image.dataset.original || image.currentSrc || image.src;
 alt.value = image.alt;
 await nextTick(); dialog.value?.showModal();
}
function restoreFocus() { previousFocus?.focus(); }
function close() { dialog.value?.close(); restoreFocus(); }
onMounted(() => {
 document.querySelectorAll<HTMLButtonElement>('[data-lightbox]').forEach(button => {
  const handler = () => { const image = button.querySelector('img'); if (image) open(image); };
  button.addEventListener('click', handler); cleanups.push(() => button.removeEventListener('click', handler));
 });
 document.querySelectorAll<HTMLImageElement>('.prose img').forEach(image => {
  image.tabIndex = 0; image.setAttribute('role', 'button'); image.setAttribute('aria-label', `${image.alt} — ${t.value.imageHint}`);
  const click = () => open(image);
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(image); } };
  image.addEventListener('click', click); image.addEventListener('keydown', key);
  cleanups.push(() => { image.removeEventListener('click', click); image.removeEventListener('keydown', key); });
 });
 document.querySelectorAll<HTMLPreElement>('.prose pre').forEach(pre => {
  const code = pre.querySelector('code')?.textContent || '';
  const button = document.createElement('button'); button.className = 'copy-code'; button.type = 'button'; button.textContent = t.value.copy; button.setAttribute('aria-live', 'polite');
  let timer: ReturnType<typeof setTimeout>;
  const handler = async () => { try { await navigator.clipboard.writeText(code); button.textContent = t.value.copied; } catch { button.textContent = t.value.copyFailed; } clearTimeout(timer); timer = setTimeout(() => button.textContent = t.value.copy, 2200); };
  button.addEventListener('click', handler); pre.prepend(button);
  cleanups.push(() => { clearTimeout(timer); button.remove(); });
 });
});
onUnmounted(() => cleanups.forEach(fn => fn()));
</script>
<template>
 <dialog ref="dialog" class="image-dialog" @click="(e) => e.target === dialog && close()" @cancel="restoreFocus" :aria-label="t.imageHint">
  <img v-if="src" :src="src" :alt="alt"/><div class="image-dialog-bar"><span class="image-dialog-caption">{{ alt }}</span><a :href="src" target="_blank" rel="noopener noreferrer">{{ t.original }} ↗</a><button :aria-label="t.imageClose" @click="close"><Icon name="close" :size="22"/></button></div>
 </dialog>
</template>
