<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { SolarScene } from '../lib/solarScene';
import { wallpapers, type AnimatedWallpaper } from '../lib/wallpapers';
const props = defineProps<{ paused: boolean; obscured: boolean; focused: boolean; locale: 'zh' | 'en'; variant: AnimatedWallpaper }>();
const selected = computed(() => wallpapers.find(item => item.id === props.variant)!);
const host = ref<HTMLElement>();
const state = ref('loading');
let scene: SolarScene | undefined, cancelled = false;
const controller = new AbortController();
function sync() { scene?.setState(props.paused, props.obscured, props.focused); }
watch(() => [props.paused, props.obscured, props.focused], sync);
onMounted(async () => {
 try {
  if (props.variant === 'campfire') {
   const { createCampfireScene } = await import('../lib/campfireScene');
   if (cancelled || !host.value) return;
   scene = await createCampfireScene(host.value, value => { state.value = value; }, controller.signal);
  } else if (props.variant !== 'solar') {
   const { createEarthScene } = await import('../lib/earthScene');
   if (cancelled || !host.value) return;
   scene = await createEarthScene(host.value, value => { state.value = value; }, controller.signal, props.variant === 'earth-night' ? 'night' : 'day');
  } else {
   const { createSolarScene } = await import('../lib/solarScene');
   if (cancelled || !host.value) return;
   scene = createSolarScene(host.value, value => { state.value = value; });
  }
  if (cancelled) { scene.dispose(); return; }
  sync();
 } catch (error) {
  if (cancelled) return;
  console.error(`Failed to load ${props.variant} wallpaper`, error);
  state.value = 'fallback';
 }
});
onUnmounted(() => { cancelled = true; controller.abort(); scene?.dispose(); });
</script>
<template>
 <div class="solar-wallpaper" :class="{ 'earth-wallpaper': variant !== 'solar' }" :data-state="state" :data-wallpaper="variant">
  <div ref="host" class="solar-canvas" :class="{ 'is-ready': state !== 'loading' && state !== 'fallback' }" aria-hidden="true"></div>
  <Transition name="solar-caption"><div v-if="focused" class="solar-caption">
   <span class="solar-eyebrow">{{ variant === 'campfire' ? 'B Y T E D E S K / A F T E R D A R K' : 'B Y T E D E S K / O B S E R V A T O R Y' }}</span>
   <strong>{{ locale === 'zh' ? selected.titleZh : selected.titleEn }}</strong>
   <span>{{ locale === 'zh' ? selected.descriptionZh : selected.descriptionEn }}<template v-if="state === 'paused'"> · {{ locale === 'zh' ? '已暂停' : 'Paused' }}</template></span>
   <span v-if="state === 'loading'" role="status">{{ locale === 'zh' ? '正在加载壁纸…' : 'Loading wallpaper…' }}</span>
   <span v-if="state === 'fallback'" role="status">{{ locale === 'zh' ? '暂时无法加载动态壁纸，可切换其他壁纸。' : 'This wallpaper is unavailable. You can select another wallpaper.' }}</span>
  </div></Transition>
 </div>
</template>
<style>
.desktop-shell.has-solar{isolation:isolate;min-height:100dvh}
.desktop-shell.has-solar > .desktop-wallpaper{background:#02040b;filter:none}
.solar-wallpaper{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 20% 49%,#694119 0,transparent 24%),radial-gradient(ellipse at 70% 10%,#10152d,transparent 60%),#02040b}
.earth-wallpaper{background:radial-gradient(ellipse at 65% 55%,#051327,transparent 45%),#010207}
.solar-canvas{position:absolute;inset:0;opacity:0;transition:opacity 1.4s ease}
.solar-canvas.is-ready{opacity:1}
.solar-canvas canvas{display:block;width:100%;height:100%}
.solar-caption{position:absolute;left:5%;top:78px;display:flex;flex-direction:column;gap:12px;color:#bdc8dc;font-size:11px;letter-spacing:.12em;text-shadow:0 2px 20px #000;pointer-events:none}
.solar-caption .solar-eyebrow{font-size:9px;color:#8496af;letter-spacing:.04em}
.solar-caption strong{font-size:clamp(21px,2.3vw,28px);font-weight:300;letter-spacing:.12em;color:#e4e9f2}
.solar-caption-enter-active,.solar-caption-leave-active{transition:opacity .5s ease}
.solar-caption-enter-from,.solar-caption-leave-to{opacity:0}
.has-solar .menu-bar{background:#0a101b85;border-bottom-color:#ffffff13}
.has-solar .dock{background:#869bb62c;border-color:#ccdfff45;box-shadow:0 8px 30px #0005,inset 0 1px 0 #ffffff30}
@media(max-width:600px){.solar-caption{top:83px;left:7%;right:7%;font-size:9px}.solar-caption .solar-eyebrow{font-size:7px}.solar-caption strong{font-size:23px}.desktop-shell.has-solar > .desktop-wallpaper{position:fixed}}
@media(prefers-reduced-motion:reduce){.solar-canvas,.solar-caption-enter-active,.solar-caption-leave-active{transition:none}}
</style>
