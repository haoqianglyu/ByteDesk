<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Locale } from '../lib/i18n';
import type { createPhoneScene } from '../lib/phoneScene';
import { phoneScreenStyle } from '../lib/phoneModel';
type Screenshot = { src: string; alt: string; title: string; description: string; width: number; height: number };
const props = defineProps<{ locale: Locale; screenshots: Screenshot[] }>();
const zh = computed(() => props.locale === 'zh');
const selected = ref(0), ready = ref(false), failed = ref(false), visible = ref(false);
const current = computed(() => props.screenshots[selected.value]!);
const host = ref<HTMLElement>();
let scene: ReturnType<typeof createPhoneScene> | undefined;
let alive = true, cleanup = () => {};
function select(index: number) { selected.value = (index + props.screenshots.length) % props.screenshots.length; }
function next() { select(selected.value + 1); }
function fail() { failed.value = true; ready.value = false; scene?.dispose(); scene = undefined; }
watch(selected, () => scene?.screenshot(current.value.src));
onMounted(() => {
  const element = host.value!;
  const syncTheme = () => scene?.appearance(document.documentElement.dataset.theme === 'dark');
  const theme = new MutationObserver(syncTheme);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let loading = false;
  const observer = new IntersectionObserver(async ([entry]) => {
    visible.value = !!entry?.isIntersecting;
    scene?.visible(visible.value);
    if (!visible.value || loading || scene || failed.value) return;
    loading = true;
    try {
      const { createPhoneScene } = await import('../lib/phoneScene');
      if (!alive) return;
      scene = createPhoneScene(element, current.value.src, next, fail);
      syncTheme(); scene.visible(visible.value); ready.value = true;
    } catch { if (alive) fail(); }
  }, { threshold: .05 });
  observer.observe(element);
  cleanup = () => { theme.disconnect(); observer.disconnect(); };
});
onUnmounted(() => { alive = false; cleanup(); scene?.dispose(); });
</script>

<template>
  <section class="zoji-phone" :style="phoneScreenStyle" :aria-label="zh ? 'Zoji 立体手机展示' : 'Zoji interactive phone'">
    <div class="phone-stage" :data-ready="ready" :data-visible="visible" :data-screen="selected + 1">
      <span class="phone-orbit" aria-hidden="true" />
      <div ref="host" class="phone-renderer" :tabindex="ready ? 0 : -1" role="group"
        :aria-label="zh ? '拖动或按左右方向键旋转手机，点击屏幕或按回车切换界面' : 'Drag or use arrow keys to rotate. Click the screen or press Enter for the next screenshot.'"
        @keydown.left.prevent="scene?.rotate(-1)" @keydown.right.prevent="scene?.rotate(1)" @keydown.enter.prevent="next" />
      <button v-if="!ready" class="phone-static" @click="next" :aria-label="zh ? '点击手机切换界面' : 'Click phone for next screenshot'">
        <span class="phone-static-screen"><img :src="current.src" :alt="current.alt" width="1320" height="2868" fetchpriority="high" /></span>
      </button>
      <span class="phone-hint">{{ ready ? (zh ? '拖动旋转 · 点击屏幕切换' : 'Drag to rotate · Tap screen to explore') : (zh ? '点击下方切换界面' : 'Choose a screen below') }}</span>
      <button v-if="ready" class="phone-reset" @click="scene?.reset()" :aria-label="zh ? '复位手机角度' : 'Reset phone angle'">↺</button>
    </div>
    <div class="phone-navigation" role="group" :aria-label="zh ? '选择 App 界面' : 'Choose an app screen'">
      <button class="phone-step" @click="select(selected - 1)" :aria-label="zh ? '手机上一个界面' : 'Previous phone screen'">←</button>
      <button v-for="(shot, index) in screenshots" :key="shot.src" class="phone-dot" :aria-pressed="selected === index" :aria-label="shot.title" :title="shot.title" @click="select(index)">{{ String(index + 1).padStart(2, '0') }}</button>
      <button class="phone-step" @click="next" :aria-label="zh ? '手机下一个界面' : 'Next phone screen'">→</button>
    </div>
    <div class="phone-caption" aria-live="polite" aria-atomic="true"><strong>{{ current.title }}</strong><p>{{ current.description }}</p></div>
  </section>
</template>

<style>
.zoji-phone{min-width:0;align-self:center;padding-bottom:20px}
.phone-stage{height:430px;position:relative;isolation:isolate;border-radius:20px;background:radial-gradient(ellipse at 50% 45%,#d1e9df80,transparent 67%)}
.phone-orbit{position:absolute;bottom:25px;left:18%;right:18%;height:22px;border-radius:50%;background:#254d3d25;filter:blur(12px);pointer-events:none}
.phone-renderer{position:absolute;inset:0;cursor:grab;touch-action:none;outline-offset:-3px;z-index:1}.phone-renderer:active{cursor:grabbing}
.phone-renderer>canvas,.phone-css-layer{position:absolute!important;inset:0;display:block;pointer-events:none!important}
.phone-css-layer *{pointer-events:none!important}.phone-screen-surface{width:320px;height:var(--phone-screen-height);overflow:hidden;border-radius:var(--phone-screen-radius);background:#ecfaf4;backface-visibility:hidden}
.phone-screen-surface img,.phone-static-screen img{position:absolute;max-width:none!important;width:var(--phone-image-width)!important;height:var(--phone-image-height)!important;left:var(--phone-image-left);top:var(--phone-image-top);object-fit:fill;user-select:none}
.phone-hint{position:absolute;bottom:0;left:0;right:0;pointer-events:none;text-align:center;font-size:10px;color:var(--zoji-muted);z-index:2}
.phone-reset{position:absolute;right:5px;bottom:25px;width:28px;height:28px;border:1px solid #7c9f9233;background:#ffffff50;border-radius:50%;color:var(--zoji-ink);font-size:19px;z-index:3}
.phone-static{position:absolute;left:50%;top:50%;width:180px;aspect-ratio:var(--phone-body-ratio);transform:translate(-50%,-53%) rotate(-4deg);border:0;border-radius:var(--phone-body-radius);background:#101215;box-shadow:inset 0 0 0 1px #d6d8da,3px 4px 0 #a5a9ae,15px 18px 25px #244b3c20;padding:0;z-index:2;overflow:hidden}
.phone-static-screen{position:absolute;display:block;inset:var(--phone-screen-inset-y) var(--phone-screen-inset-x);overflow:hidden;border-radius:var(--phone-static-radius);background:#ecfaf4}
.phone-navigation{display:flex;gap:3px;justify-content:center;align-items:center;margin:16px auto 0;max-width:300px}
.phone-navigation button{display:grid;place-items:center;border-radius:50%;width:29px;height:29px;flex-shrink:0;font:10px monospace;color:var(--zoji-muted);border:1px solid transparent}
.phone-navigation button:hover{background:#659f8c15}.phone-navigation button[aria-pressed=true]{background:#28675c;color:#fff;box-shadow:0 2px 6px #1e51402a}.phone-navigation .phone-step{font-size:15px}
.phone-caption{text-align:center;margin:12px auto 0;max-width:320px;min-height:73px;color:var(--zoji-ink)}.phone-caption strong{font-size:12px;font-weight:600}.phone-caption p{font-size:11px;line-height:1.7;margin-top:6px;color:var(--zoji-muted)}
.zoji-hero:has(.zoji-phone){grid-template-columns:1.05fr 1fr;gap:22px;padding-top:18px}.zoji-hero:has(.zoji-phone) .zoji-hero-copy{align-self:center}
[data-theme=dark] .phone-stage{background:radial-gradient(ellipse at 50% 45%,#68998730,transparent 67%)}[data-theme=dark] .phone-reset{background:#203c3480}
@container content (max-width:850px){.zoji-hero:has(.zoji-phone){grid-template-columns:1fr}.phone-stage{height:460px}.zoji-phone{width:100%;max-width:430px;justify-self:center}.zoji-hero:has(.zoji-phone) .zoji-hero-copy{padding-bottom:0}.phone-caption{min-height:60px}}
@container content (max-width:460px){.phone-stage{height:400px}.phone-navigation{gap:0}.phone-navigation button{width:27px;height:27px}.phone-caption p{font-size:11px}.phone-static{width:160px}}
</style>
