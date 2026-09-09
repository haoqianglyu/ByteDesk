<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import type { WalineInstance } from '@waline/client';
import '@waline/client/waline.css';
import type { Locale } from '../lib/i18n';

const props = defineProps<{ locale: Locale; translationKey: string; serverURL: string }>();
const host = ref<HTMLElement>();
const state = ref<'loading' | 'ready' | 'error'>('loading');
const text = computed(() => props.locale === 'zh' ? {
 title: '聊聊这篇文章',
 hint: '无需注册，填写昵称即可留言。邮箱选填，不会公开。评论审核后显示。',
 loading: '正在加载评论…',
 error: '评论暂时无法加载，请稍后重试。',
 retry: '重新加载',
 placeholder: '有什么想法，欢迎分享。',
} : {
 title: 'Join the conversation',
 hint: 'No account needed. Add your name to comment. Email is optional and stays private. Comments appear after moderation.',
 loading: 'Loading comments…',
 error: 'Comments could not load. Please try again.',
 retry: 'Try again',
 placeholder: 'Share a thought about this story.',
});
let instance: WalineInstance | null = null;
let disposed = false;

async function load() {
 state.value = 'loading';
 try {
  const { init } = await import('@waline/client');
  if (disposed || !host.value) return;
  instance?.destroy();
  instance = init({
   el: host.value,
   serverURL: props.serverURL,
   // Both translations use the canonical Chinese route, which also works in notification links.
   path: `/zh/posts/${props.translationKey}/`,
   lang: props.locale === 'zh' ? 'zh-CN' : 'en-US',
   locale: { placeholder: text.value.placeholder },
   meta: ['nick', 'mail'],
   requiredMeta: ['nick'],
   login: 'enable',
   dark: 'html[data-theme="dark"]',
   wordLimit: 2000,
   pageSize: 10,
   imageUploader: false,
   search: false,
   emoji: false,
   texRenderer: false,
   highlighter: false,
   pageview: false,
   comment: false,
   noRss: true,
  });
  state.value = instance ? 'ready' : 'error';
 } catch {
  if (!disposed) state.value = 'error';
 }
}

onMounted(load);
onUnmounted(() => { disposed = true; instance?.destroy(); });
</script>

<template>
 <section class="article-comments" aria-labelledby="comments-title">
  <h2 id="comments-title">{{ text.title }}</h2>
  <p class="comments-hint">{{ text.hint }}</p>
  <div v-if="state !== 'ready'" class="comments-status" role="status">
   <p>{{ state === 'error' ? text.error : text.loading }}</p>
   <button v-if="state === 'error'" type="button" @click="load">{{ text.retry }}</button>
  </div>
  <div ref="host" class="comments-widget" />
 </section>
</template>

<style scoped>
.article-comments {
 margin-top: 32px;
 padding-top: 28px;
 border-top: 1px solid var(--line);
 --waline-font-size: 14px;
 --waline-theme-color: var(--accent);
 --waline-active-color: var(--accent);
 --waline-color: var(--text);
 --waline-light-grey: var(--muted);
 --waline-dark-grey: var(--secondary);
 --waline-bg-color: var(--surface);
 --waline-bg-color-light: var(--sidebar);
 --waline-bg-color-hover: var(--hover);
 --waline-border-color: var(--line);
 --waline-disable-bg-color: var(--sidebar);
 --waline-disable-color: var(--muted);
 --waline-bq-color: var(--line);
 --waline-info-bg-color: var(--sidebar);
 --waline-info-color: var(--muted);
}
.article-comments h2 { font-size: 21px; font-weight: 600; }
.comments-hint { margin: 9px 0 22px; font-size: 13px; line-height: 1.8; color: var(--secondary); }
.comments-status { padding: 22px 0; font-size: 13px; color: var(--muted); }
.comments-status button { margin-top: 12px; color: var(--accent); text-decoration: underline; }
.comments-widget { min-width: 0; }
.comments-widget :deep(textarea:focus-visible) { outline: 2px solid var(--accent); outline-offset: -2px; }
.comments-widget :deep(.wl-power) { font-size: 11px; }
</style>
