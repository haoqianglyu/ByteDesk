<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import BrandMark from './BrandMark.vue';
import type { Locale } from '../lib/i18n';
import type { createLogoScene } from '../lib/logoScene';
const props = defineProps<{ locale: Locale }>();
const zh = computed(() => props.locale === 'zh');
const host = ref<HTMLElement>();
const ready = ref(false), failed = ref(false), expanded = ref(false), metal = ref(false), playing = ref(true);
const reduced = ref(false), dark = ref(false), visible = ref(false);
let scene: ReturnType<typeof createLogoScene> | undefined;
let alive = true;
let cleanup = () => {};
function expand() { expanded.value = !expanded.value; }
function reset() { expanded.value = false; scene?.reset(); }
function fail() { failed.value = true; ready.value = false; scene?.dispose(); scene = undefined; }
watch([dark, metal], () => scene?.appearance(dark.value, metal.value));
watch([playing, reduced], () => scene?.motion(playing.value, reduced.value));
watch(expanded, value => scene?.expand(value));
onMounted(() => {
  const element = host.value!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => { reduced.value = motion.matches; };
  const syncTheme = () => { dark.value = document.documentElement.dataset.theme === 'dark'; };
  syncMotion(); syncTheme();
  motion.addEventListener('change', syncMotion);
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let loading = false;
  const observer = new IntersectionObserver(async ([entry]) => {
    visible.value = !!entry?.isIntersecting;
    scene?.visible(visible.value);
    if (!visible.value || loading || scene || failed.value) return;
    loading = true;
    try {
      const { createLogoScene } = await import('../lib/logoScene');
      if (!alive) return;
      scene = createLogoScene(element, expand, fail);
      scene.appearance(dark.value, metal.value);
      scene.motion(playing.value, reduced.value);
      scene.visible(visible.value);
      ready.value = true;
    } catch { if (alive) fail(); }
  }, { threshold: .05 });
  observer.observe(element);
  cleanup = () => { observer.disconnect(); themeObserver.disconnect(); motion.removeEventListener('change', syncMotion); };
});
onUnmounted(() => { alive = false; cleanup(); scene?.dispose(); });
</script>

<template>
  <section class="logo-study" :aria-label="zh ? 'ByteDesk 立体 Logo 实验' : 'ByteDesk 3D logo study'">
    <div class="logo-stage" :data-ready="ready" :data-visible="visible" :data-material="metal ? 'metal' : 'glass'">
      <div ref="host" class="logo-canvas" :tabindex="ready ? 0 : -1" role="group"
        :aria-label="zh ? '立体 Logo。拖动或按左右方向键旋转，按回车展开。' : '3D logo. Drag or use left and right arrow keys to rotate. Press Enter to separate.'"
        @keydown.left.prevent="scene?.rotate(-1)" @keydown.right.prevent="scene?.rotate(1)" @keydown.enter.prevent="expand" />
      <div v-if="!ready" class="logo-static"><BrandMark :size="150" /><span v-if="failed">{{ zh ? '当前设备显示静态预览' : 'Static preview on this device' }}</span></div>
      <div class="logo-stage-label"><span>BYTEDESK / FORM STUDY</span><span>002</span></div>
      <div class="logo-stage-footer"><span>{{ metal ? (zh ? '02 / 拉丝银' : '02 / Satin silver') : (zh ? '01 / 冰蓝玻璃' : '01 / Ice glass') }}</span><span v-if="ready">{{ zh ? '拖动旋转 · 点击展开' : 'Drag to rotate · Click to separate' }}</span></div>
    </div>
    <div class="logo-controls">
      <div class="logo-materials" role="group" :aria-label="zh ? '材质' : 'Material'">
        <button :disabled="!ready" :aria-pressed="!metal" @click="metal = false"><i class="glass-swatch" />{{ zh ? '玻璃' : 'Glass' }}</button>
        <button :disabled="!ready" :aria-pressed="metal" @click="metal = true"><i class="metal-swatch" />{{ zh ? '金属' : 'Metal' }}</button>
      </div>
      <div class="logo-actions">
        <button :disabled="!ready" :aria-pressed="expanded" @click="expand">{{ expanded ? (zh ? '合拢' : 'Reassemble') : (zh ? '展开' : 'Separate') }}</button>
        <button v-if="!reduced" :disabled="!ready" :aria-pressed="!playing" @click="playing = !playing">{{ playing ? (zh ? '暂停浮动' : 'Pause motion') : (zh ? '继续浮动' : 'Resume motion') }}</button>
        <button :disabled="!ready" @click="reset">{{ zh ? '复位' : 'Reset' }}</button>
      </div>
    </div>
    <p class="logo-theme-note">{{ zh ? '光线随桌面的深浅主题变化。两片之间，留一点想象的空间。' : 'Light follows your desktop theme. A little room for imagination, between the pieces.' }}</p>
  </section>
</template>

<style>
.logo-study{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surface)}
.logo-stage{height:420px;position:relative;background:#edf3f7;color:#527083;overflow:hidden;isolation:isolate}
.logo-canvas{position:absolute;inset:0;cursor:grab;outline-offset:-4px}
.logo-canvas:active{cursor:grabbing}.logo-canvas canvas{display:block;width:100%;height:100%;touch-action:none}
.logo-stage-label,.logo-stage-footer{pointer-events:none;position:absolute;left:24px;right:24px;display:flex;justify-content:space-between;gap:16px;font:10px monospace;letter-spacing:1px}
.logo-stage-label{top:22px}.logo-stage-footer{bottom:22px;font-size:11px;letter-spacing:0}
.logo-static{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:25px;color:#86b4d5;background:radial-gradient(ellipse,#d6e8f6,transparent 65%)}
.logo-static .brand-mark{transform:rotate(-8deg);filter:drop-shadow(8px 14px 3px #8da7bf33)}.logo-static>span{font-size:12px}
.logo-controls{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap;padding:18px 22px 10px}
.logo-materials,.logo-actions{display:flex;gap:5px;align-items:center}.logo-materials{padding:3px;border-radius:10px;background:var(--hover);border:1px solid var(--line)}
.logo-controls button{display:flex;gap:7px;align-items:center;font-size:12px;padding:8px 11px;border:1px solid transparent;border-radius:7px;color:var(--secondary);white-space:nowrap}
.logo-controls button:hover{background:var(--hover)}.logo-controls button[aria-pressed=true]{background:var(--selection);color:var(--accent);border-color:var(--line)}.logo-controls button:disabled{opacity:.45;cursor:default}
.logo-controls i{width:13px;height:13px;border-radius:50%;border:1px solid #7e9db74d}.glass-swatch{background:linear-gradient(135deg,#f7fbff,#77b1dc)}.metal-swatch{background:linear-gradient(135deg,#f3f4f5,#8997a4,#e9eef3)}
.logo-theme-note{padding:0 24px 18px;font-size:11px;line-height:1.8;color:var(--muted)}
[data-theme=dark] .logo-stage{background:#102437;color:#9eb9cf}[data-theme=dark] .logo-static{background:radial-gradient(ellipse,#193f60,transparent 65%);color:#a4d7fa}
@container content (max-width:600px){.logo-stage{height:340px}.logo-controls{padding:14px 14px 10px;gap:10px}.logo-stage-label,.logo-stage-footer{left:16px;right:16px;font-size:9px}.logo-theme-note{padding:0 17px 16px}.logo-controls button{padding:8px}.logo-actions{flex-wrap:wrap}}
</style>
