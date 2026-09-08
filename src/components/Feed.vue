<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import Icon from './Icon.vue';
import BrandMark from './BrandMark.vue';
import { ui, dateLabel, type Locale, type Category } from '../lib/i18n';
import type { PostCard } from '../lib/content';
const props = defineProps<{ locale: Locale; posts: PostCard[]; category?: Category }>();
const t = computed(() => ui(props.locale));
const view = ref<'grid' | 'list'>('grid');
const tag = ref('');
onMounted(() => { tag.value = new URLSearchParams(window.location.search).get('tag') || ''; });
const tags = computed(() => [...new Set(props.posts.filter(p => !props.category || p.category === props.category).flatMap(p => p.tags))].slice(0, 7));
const visible = computed(() => props.posts.filter(p => (!props.category || p.category === props.category) && (!tag.value || p.tags.includes(tag.value))));
const featured = computed(() => props.posts.find(p => p.featured) ?? props.posts[0]);
const href = (p: PostCard) => `/${props.locale}/posts/${p.slug}/`;
</script>
<template>
 <div class="feed">
  <header class="feed-heading"><div><p class="eyebrow">{{ category ? 'THE COLLECTION' : 'A LITTLE CODE, A LITTLE LIFE' }}</p><h1>{{ category ? t[category] : t.tagline }}</h1><p class="feed-subtitle">{{ category ? t.categoryDescription[category] : t.subtitle }}</p></div><span class="heading-stamp"><Icon v-if="category" :name="category" :size="26"/><BrandMark v-else :size="25"/></span></header>
  <section v-if="!category && featured && !tag" class="featured-layout" :aria-label="t.featured">
   <a :href="href(featured)" class="featured-story"><img v-if="featured.cover" :src="featured.cover" :alt="featured.coverAlt || featured.title" width="1200" height="800" fetchpriority="high"/><div class="featured-shade"></div><div class="featured-top"><span class="glass-pill"><Icon name="pin" :size="13"/>{{ t.featured }}</span><span class="sample-on-photo">{{ t.sample }}</span></div><div class="featured-copy"><span class="featured-category">{{ t[featured.category] }} <span> / </span>{{ dateLabel(featured.date, locale) }}</span><h2>{{ featured.title }}</h2><p>{{ featured.description }}</p></div><span class="featured-arrow"><Icon name="arrow" :size="23"/></span></a>
   <aside class="desktop-note"><div class="note-top"><span class="note-dot"></span>{{ t.note }}<span>↗</span></div><div class="note-scribble">Hello,<br/>world<span>.</span></div><p>{{ t.noteText }}</p><div class="note-bottom"><span>ByteDesk</span><Icon name="heart" :size="17"/></div></aside>
  </section>
  <nav v-if="!category" class="home-work-links" :aria-label="t.create"><a :href="`/${locale}/lab/`"><Icon name="lab" class="color-lab" :size="23"/><span><strong>{{ t.lab }}</strong><small>{{ locale === 'zh' ? '新奇想法，动手试试' : 'Ideas to play with' }}</small></span><Icon name="arrow" :size="17"/></a><a :href="`/${locale}/projects/`"><Icon name="projects" class="color-projects" :size="23"/><span><strong>{{ t.projects }}</strong><small>{{ locale === 'zh' ? '做过的作品，持续生长' : 'Things made, and growing' }}</small></span><Icon name="arrow" :size="17"/></a></nav>
  <section class="stories-section" :aria-label="category ? t[category] : t.recent">
   <div class="section-heading"><h2>{{ category ? t.all : t.recent }}<span>{{ visible.length.toString().padStart(2, '0') }}</span></h2><div class="view-switch"><button :aria-label="t.viewGrid" :aria-pressed="view === 'grid'" :class="{ chosen: view === 'grid' }" @click="view = 'grid'"><Icon name="grid" :size="16"/></button><button :aria-label="t.viewList" :aria-pressed="view === 'list'" :class="{ chosen: view === 'list' }" @click="view = 'list'"><Icon name="list" :size="18"/></button></div></div>
   <div class="tag-filter" v-if="category"><button @click="tag = ''" :class="{ active: !tag }">{{ t.all }}</button><button v-for="item in tags" @click="tag = tag === item ? '' : item" :class="{ active: tag === item }">{{ item }}</button></div>
   <div :class="['post-grid', { 'post-list': view === 'list' }]">
    <article v-for="post in visible" :key="post.slug" class="post-card"><a :href="href(post)" class="card-link"><div class="card-visual"><img v-if="post.cover" :src="post.cover" :alt="post.coverAlt || post.title" loading="lazy" width="1200" height="800"/><div v-else class="code-cover"><div class="mini-code-toolbar"><i></i><i></i><i></i><span>hello-world.vue</span></div><div class="code-cover-content"><span class="code-purple">const</span> life = <span class="code-blue">reactive</span>({<br/>&nbsp;&nbsp;code: <span class="code-green">'with curiosity'</span>,<br/>&nbsp;&nbsp;days: <span class="code-green">'with intention'</span><br/>})</div><span class="code-cover-mark">&lt;/&gt;</span></div><span class="card-sample" v-if="post.sample">{{ t.sample }}</span></div><div class="card-content"><div class="card-meta"><span :class="`color-${post.category}`"><Icon :name="post.category" :size="13"/>{{ t[post.category] }}</span><span>{{ dateLabel(post.date, locale) }}</span></div><h3>{{ post.title }}</h3><p>{{ post.description }}</p><div class="card-bottom"><span># {{ post.tags[0] }}</span><Icon name="arrow" :size="17"/></div></div></a></article>
   </div>
   <div v-if="!visible.length" class="empty-state"><Icon name="folder" :size="38"/><h3>{{ t.noEntries }}</h3><button v-if="tag" class="text-button" @click="tag = ''">{{ t.clear }}</button></div>
  </section>
  <footer class="feed-footer"><span>⌘</span>{{ t.footer }}<span>✳</span></footer>
 </div>
</template>
