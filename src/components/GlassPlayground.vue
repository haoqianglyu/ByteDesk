<script setup lang="ts">
import { ref } from 'vue';
import type { Locale } from '../lib/i18n';
const props = defineProps<{ locale: Locale }>();
const blur = ref(16), opacity = ref(18), hue = ref(265);
const colors = [{ value: 265, zh: '鸢尾紫', en: 'Iris' }, { value: 195, zh: '湖水蓝', en: 'Lagoon' }, { value: 25, zh: '落日橙', en: 'Sunset' }];
function reset() { blur.value = 16; opacity.value = 18; hue.value = 265; }
</script>
<template>
 <div class="glass-playground">
  <div class="glass-stage" :style="{ '--glass-blur': `${blur}px`, '--glass-alpha': opacity / 100, '--glass-hue': hue }">
   <div class="glass-stage-grid" aria-hidden="true"></div><div class="glass-stage-orb" aria-hidden="true"></div><span class="glass-stage-caption">BYTEDESK / MATERIAL STUDY</span>
   <div class="live-glass"><span>001 — {{ locale === 'zh' ? '材质实验' : 'MATERIAL STUDY' }}</span><h2>{{ locale === 'zh' ? '让光，透进来。' : 'Let the light in.' }}</h2><p>{{ locale === 'zh' ? '同一张卡片，不同的感受。' : 'One card. A different feeling.' }}</p><div><span>◌</span><span>{{ locale === 'zh' ? '保持好奇' : 'STAY CURIOUS' }} ↗</span></div></div>
  </div>
  <form class="glass-controls" @submit.prevent>
   <div class="glass-control-title"><h2>{{ locale === 'zh' ? '试着调一调' : 'Make it your own' }}</h2><button type="button" @click="reset">{{ locale === 'zh' ? '重置' : 'Reset' }}</button></div>
   <label for="glass-blur">{{ locale === 'zh' ? '背景模糊' : 'Background blur' }}<output for="glass-blur">{{ blur }} px</output></label><input id="glass-blur" type="range" min="0" max="36" v-model.number="blur"/>
   <label for="glass-opacity">{{ locale === 'zh' ? '玻璃不透明度' : 'Glass opacity' }}<output for="glass-opacity">{{ opacity }}%</output></label><input id="glass-opacity" type="range" min="5" max="65" v-model.number="opacity"/>
   <fieldset><legend>{{ locale === 'zh' ? '光的颜色' : 'Color of the light' }}</legend><div class="glass-swatches"><button v-for="color in colors" :key="color.value" type="button" :aria-pressed="hue === color.value" @click="hue = color.value"><i :style="{ background: `hsl(${color.value} 65% 65%)` }"></i>{{ props.locale === 'zh' ? color.zh : color.en }}</button></div></fieldset>
   <p>{{ locale === 'zh' ? '用滑块或键盘方向键调整，实时观察卡片后的色彩与网格。' : 'Use the sliders or arrow keys and watch the colors and grid behind the card.' }}</p>
  </form>
 </div>
</template>
