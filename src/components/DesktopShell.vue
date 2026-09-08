<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue';
import Icon from './Icon.vue';
import BrandMark from './BrandMark.vue';
import DesktopMenu from './DesktopMenu.vue';
import SolarWallpaper from './SolarWallpaper.vue';
import { savedWallpaper as restoreWallpaper, type Wallpaper } from '../lib/wallpapers';
import { fitWindow, resizeWindow, type WindowRect, type ResizeEdge } from '../lib/windowGeometry';
import GlassIcon from './GlassIcon.vue';
import DockIcon from './DockIcon.vue';
import MenuIcon from './MenuIcon.vue';
import { ui, sectionIds, sectionGroups, sectionHref, type Locale } from '../lib/i18n';
import { showcaseItems } from '../lib/showcase';
import type { PostCard } from '../lib/content';
const props = defineProps<{ locale: Locale; active?: string; alternateHref: string; posts: PostCard[] }>();
const t = computed(() => ui(props.locale));
const theme = ref('system');
const themeMenu = ref(false);
const desktopMenu = ref<InstanceType<typeof DesktopMenu>>();
const expanded = ref(false);
const fullscreen = ref(false);
const hidden = ref(false);

const wallpaper = ref<Wallpaper>('solar');
const wallpaperReady = ref(false);
const solar = computed(() => wallpaper.value !== 'classic');
const solarPaused = ref(false);
function setWallpaper(value: Wallpaper) {
 wallpaper.value = value;
 try { localStorage.setItem('bytedesk-wallpaper', value); } catch {}
}
function viewWallpaper() { hideWindow(); }
function pauseSolar() {
 solarPaused.value = !solarPaused.value;
 try { localStorage.setItem('bytedesk-solar-paused', String(solarPaused.value)); } catch {}
}
const clock = ref('');
const query = ref('');
const searchDialog = ref<HTMLDialogElement>();
const searchInput = ref<HTMLInputElement>();
const searchTrigger = ref<HTMLElement>();
const windowElement = ref<HTMLElement>();
const sidebarElement = ref<HTMLElement>();
const sidebarScrollKey = () => `bytedesk-sidebar-scroll-${innerWidth <= 600 ? 'mobile' : 'desktop'}`;
function saveSidebarScroll() {
 const sidebar = sidebarElement.value;
 if (!sidebar) return;
 try { sessionStorage.setItem(sidebarScrollKey(), JSON.stringify([sidebar.scrollLeft, sidebar.scrollTop])); } catch {}
}
function restoreSidebarScroll() {
 try {
  const position = JSON.parse(sessionStorage.getItem(sidebarScrollKey()) || 'null');
  if (Array.isArray(position) && position.length === 2 && position.every(value => Number.isFinite(value) && value >= 0)) {
   sidebarElement.value?.scrollTo({ left: position[0], top: position[1], behavior: 'instant' });
  }
 } catch {}
}
const geometry = ref<WindowRect | null>(null);
const desktop = ref(true);
const dragging = ref(false);
const resizing = ref(false);
const resizeEdges: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const edgeNames = { n: ['上边', 'top edge'], s: ['下边', 'bottom edge'], e: ['右边', 'right edge'], w: ['左边', 'left edge'], ne: ['右上角', 'top right corner'], nw: ['左上角', 'top left corner'], se: ['右下角', 'bottom right corner'], sw: ['左下角', 'bottom left corner'] };
const windowStyle = computed(() => {
 if (!geometry.value || !desktop.value || expanded.value || fullscreen.value) return {};
 const { left, top, width, height } = geometry.value;
 return { position: 'fixed' as const, left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, transform: 'none' };
});
let gesture: { x: number; y: number; rect: WindowRect; edge?: ResizeEdge; target: HTMLElement; pointerId: number } | null = null;
function desktopBounds() {
 const top = (document.querySelector('.menu-bar')?.getBoundingClientRect().bottom || 30) + 6;
 const bottom = (document.querySelector('.dock')?.getBoundingClientRect().top || innerHeight - 80) - 10;
 return { left: 6, right: innerWidth - 6, top, bottom: Math.max(top + 1, bottom) };
}
function currentRect(): WindowRect {
 const { left, top, width, height } = windowElement.value!.getBoundingClientRect();
 return { left, top, width, height };
}
function saveGeometry() {
 if (geometry.value) try { sessionStorage.setItem('bytedesk-window-geometry', JSON.stringify(geometry.value)); } catch {}
}
function saveWindowMode() {
 try { sessionStorage.setItem('bytedesk-window-mode', fullscreen.value ? 'fullscreen' : expanded.value ? 'zoomed' : 'normal'); } catch {}
}
async function fitNormalWindow() { await nextTick(); if (desktop.value && !fullscreen.value && !expanded.value && geometry.value) { geometry.value = fitWindow(geometry.value, desktopBounds()); saveGeometry(); } }
function toggleExpanded() { endGesture(); expanded.value = !expanded.value; saveWindowMode(); fitNormalWindow(); }
function toggleFullscreen() {
 endGesture(); fullscreen.value = !fullscreen.value;
 themeMenu.value = false;
 saveWindowMode(); fitNormalWindow();
}
function hideWindow() { endGesture(); fullscreen.value = false; hidden.value = true; saveWindowMode(); }
function restoreDefaultWindow() {
 endGesture(); geometry.value = null; expanded.value = false; fullscreen.value = false; hidden.value = false;
 try { sessionStorage.removeItem('bytedesk-window-geometry'); } catch {}
 saveWindowMode();
}
function menuMinimize() { if (hidden.value) hidden.value = false; else hideWindow(); }
function menuZoom() { hidden.value = false; toggleExpanded(); }
async function menuFullscreen() { hidden.value = false; toggleFullscreen(); await nextTick(); windowElement.value?.querySelector<HTMLElement>('.fullscreen-exit')?.focus(); }
function toggleThemeMenu() { desktopMenu.value?.close(); themeMenu.value = !themeMenu.value; }
function resetPosition() {
 endGesture(); desktop.value = innerWidth > 600;
 if (!desktop.value) { fullscreen.value = false; expanded.value = false; saveWindowMode(); }
 else if (geometry.value && !fullscreen.value) { geometry.value = fitWindow(geometry.value, desktopBounds()); saveGeometry(); }
}
function startGesture(event: PointerEvent, edge?: ResizeEdge) {
 if (event.button !== 0 || expanded.value || fullscreen.value || innerWidth <= 600) return;
 if (!edge && (event.target as HTMLElement).closest('button, a, input')) return;
 event.preventDefault();
 const target = event.currentTarget as HTMLElement;
 const rect = fitWindow(currentRect(), desktopBounds());
 geometry.value = rect;
 gesture = { x: event.clientX, y: event.clientY, rect, edge, target, pointerId: event.pointerId };
 target.setPointerCapture(event.pointerId);
 dragging.value = !edge; resizing.value = !!edge;
}
function moveGesture(event: PointerEvent) {
 if (!gesture || event.pointerId !== gesture.pointerId) return;
 const { rect, edge, x, y } = gesture;
 const dx = event.clientX - x, dy = event.clientY - y;
 geometry.value = edge ? resizeWindow(rect, edge, dx, dy, desktopBounds()) : fitWindow({ ...rect, left: rect.left + dx, top: rect.top + dy }, desktopBounds());
}
function endGesture() {
 const active = gesture; gesture = null; dragging.value = false; resizing.value = false;
 if (active?.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
 if (active) saveGeometry();
}
function resizeWithKeyboard(event: KeyboardEvent, edge: ResizeEdge) {
 if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
 event.preventDefault();
 const step = event.shiftKey ? 40 : 10;
 const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
 const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
 geometry.value = resizeWindow(fitWindow(currentRect(), desktopBounds()), edge, dx, dy, desktopBounds());
 saveGeometry();
}
function toolbarDoubleClick(event: MouseEvent) {
 if (!fullscreen.value && !(event.target as HTMLElement).closest('button, a, input') && innerWidth > 600) toggleExpanded();
}
function locationToHome() { window.location.href = `/${props.locale}/`; }
const works = computed(() => showcaseItems(props.locale));
const dockIds = ['daily', 'travel', 'lab', 'projects'] as const;
const searchResults = computed(() => {
 const term = query.value.trim().toLocaleLowerCase();
 const stories = props.posts.map(p => ({ ...p, href: `/${props.locale}/posts/${p.slug}/` }));
 return [...stories, ...works.value].filter(p => !term || `${p.title} ${p.description} ${p.tags.join(' ')} ${t.value[p.category]}`.toLocaleLowerCase().includes(term));
});
function setTheme(value: string) {
 theme.value = value;
 try { localStorage.setItem('bytedesk-theme', value); } catch {}
 const dark = value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
 document.documentElement.dataset.theme = dark ? 'dark' : 'light';
 themeMenu.value = false;
}
async function openSearch() { desktopMenu.value?.close(); themeMenu.value = false; hidden.value = false; searchDialog.value?.showModal(); await nextTick(); searchInput.value?.focus(); }
function closeSearch() { searchDialog.value?.close(); query.value = ''; searchTrigger.value?.focus(); }
function keyboard(e: KeyboardEvent) {
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
 if (e.key === 'Escape') {
  if (themeMenu.value) { themeMenu.value = false; return; }
  if (!document.querySelector('dialog[open]') && fullscreen.value) toggleFullscreen();
 }
}
let timer: ReturnType<typeof setInterval>;
let media: MediaQueryList;
function systemChange() { if (theme.value === 'system') setTheme('system'); }
onMounted(async () => {
 try {
  desktop.value = innerWidth > 600;
  const savedWallpaper = localStorage.getItem('bytedesk-wallpaper');
  wallpaper.value = restoreWallpaper(savedWallpaper);
  solarPaused.value = localStorage.getItem('bytedesk-solar-paused') === 'true';
  const saved = JSON.parse(sessionStorage.getItem('bytedesk-window-geometry') || 'null');
  if (saved && ['left', 'top', 'width', 'height'].every(key => typeof saved[key] === 'number' && Number.isFinite(saved[key])) && saved.width > 0 && saved.height > 0) geometry.value = desktop.value ? fitWindow(saved, desktopBounds()) : saved;
  const mode = sessionStorage.getItem('bytedesk-window-mode');
  fullscreen.value = innerWidth > 600 && mode === 'fullscreen';
  expanded.value = innerWidth > 600 && mode === 'zoomed';
 } catch {}
 wallpaperReady.value = true;
 try { theme.value = localStorage.getItem('bytedesk-theme') || 'system'; localStorage.setItem('bytedesk-locale', props.locale); } catch {}
 const tick = () => { clock.value = new Intl.DateTimeFormat(props.locale === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); };
 tick(); timer = setInterval(tick, 30000); media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', systemChange);
 window.addEventListener('keydown', keyboard);
 window.addEventListener('resize', resetPosition);
 window.addEventListener('pagehide', saveSidebarScroll);
 // Window mode changes its available height; restore after Vue applies that layout.
 await nextTick();
 restoreSidebarScroll();
});
onUnmounted(() => { endGesture(); clearInterval(timer); media?.removeEventListener('change', systemChange); window.removeEventListener('keydown', keyboard); window.removeEventListener('resize', resetPosition); window.removeEventListener('pagehide', saveSidebarScroll); });
</script>
<template>
 <div class="desktop-shell" :class="{ 'is-fullscreen': fullscreen, 'has-solar': solar }" @click.capture="saveSidebarScroll">
 <a class="skip-link" href="#main-content">{{ locale === 'zh' ? '跳到正文' : 'Skip to content' }}</a>
 <div class="desktop-wallpaper"><SolarWallpaper v-if="wallpaperReady && wallpaper !== 'classic'" :key="wallpaper" :variant="wallpaper" :locale="locale" :paused="solarPaused" :obscured="fullscreen" :focused="hidden"/><template v-else-if="wallpaper === 'classic'"><div class="wallpaper-orbit orbit-one" aria-hidden="true"></div><div class="wallpaper-orbit orbit-two" aria-hidden="true"></div></template></div>
 <header class="menu-bar">
  <DesktopMenu ref="desktopMenu" :locale="locale" :hidden="hidden" :expanded="expanded" :desktop="desktop" :wallpaper="wallpaper" :solar-paused="solarPaused" @view-wallpaper="viewWallpaper" @pause-solar="pauseSolar" @wallpaper="setWallpaper" @search="openSearch" @minimize="menuMinimize" @zoom="menuZoom" @fullscreen="menuFullscreen" @reset="restoreDefaultWindow" @opening="themeMenu = false"/>
  <div class="menu-right">
   <a class="language-button" :href="alternateHref" :aria-label="t.language"><MenuIcon name="globe" :size="15"/><span>{{ locale === 'zh' ? 'EN' : '中文' }}</span></a>
   <div class="theme-menu">
    <button class="menu-icon" @click="toggleThemeMenu" :aria-label="t.theme" :aria-expanded="themeMenu"><MenuIcon :name="theme === 'system' ? 'system' : theme === 'dark' ? 'moon' : 'sun'" :size="17"/></button>
    <div v-if="themeMenu" class="theme-options">
     <span>{{ t.theme }}</span><button v-for="mode in (['light','dark','system'] as const)" :key="mode" @click="setTheme(mode)" :aria-pressed="theme === mode"><Icon :name="mode === 'light' ? 'sun' : mode === 'dark' ? 'moon' : 'system'" :size="17"/>{{ t[mode] }}<Icon v-if="theme === mode" name="check" :size="15"/></button>
    </div>
   </div>
   <MenuIcon class="status-symbol" name="wifi" :size="17"/><MenuIcon class="status-symbol" name="battery" :size="21"/>
   <time class="desktop-clock">{{ clock || (locale === 'zh' ? '欢迎回来' : 'Welcome back') }}</time>
  </div>
 </header>
 <nav class="desktop-shortcuts" :aria-label="t.categories"><div v-for="group in sectionGroups" :key="group.label" class="desktop-shortcut-group"><a v-for="section in group.ids" :key="section" :href="sectionHref(locale, section)" class="desktop-shortcut"><span class="desktop-folder"><Icon v-if="section === 'lab' || section === 'projects'" :name="section" :size="26"/><GlassIcon v-else :name="section"/></span><span>{{ t[section] }}</span></a></div></nav>
 <div class="desktop-stage" :class="{ 'is-expanded': expanded, 'is-hidden': hidden }">
  <Transition name="window"><div v-show="!hidden" ref="windowElement" :class="['main-window', { 'is-dragging': dragging, 'is-resizing': resizing }]" :style="windowStyle">
   <template v-if="!expanded && !fullscreen">
    <button v-for="edge in resizeEdges" :key="edge" :class="['window-resize-handle', `resize-${edge}`]" :aria-label="locale === 'zh' ? `拖动${edgeNames[edge][0]}调整窗口大小，或使用方向键` : `Resize from ${edgeNames[edge][1]}; drag or use arrow keys`" @pointerdown.stop="startGesture($event, edge)" @pointermove="moveGesture" @pointerup="endGesture" @pointercancel="endGesture" @lostpointercapture="endGesture" @keydown="resizeWithKeyboard($event, edge)"></button>
   </template>
   <div class="window-toolbar" @pointerdown="startGesture($event)" @pointermove="moveGesture" @pointerup="endGesture" @pointercancel="endGesture" @lostpointercapture="endGesture" @dblclick="toolbarDoubleClick">
    <div class="traffic-lights"><button class="traffic red" :aria-label="t.close" @click="hideWindow"><span>×</span></button><button class="traffic yellow" :aria-label="t.minimize" @click="hideWindow"><span>−</span></button><button class="traffic green" :aria-label="fullscreen ? t.exitFullscreen : t.maximize" :aria-pressed="fullscreen" @click="toggleFullscreen"><svg viewBox="0 0 12 12" aria-hidden="true"><path v-if="fullscreen" d="M1 5h4V1ZM11 7H7v4Z"/><path v-else d="M1 1h4L1 5ZM11 11H7l4-4Z"/></svg></button></div>
    <div class="window-title"><Icon :name="active && sectionIds.includes(active as any) ? active : 'folder'" :size="18"/><span>{{ active && active in t ? (t as any)[active] : t.home }}</span><span class="title-separator">/</span><span class="title-sub">ByteDesk</span></div>
    <button ref="searchTrigger" class="search-trigger" :aria-label="t.searchTitle" @click="openSearch"><Icon name="search" :size="16"/><span>{{ t.search }}</span><kbd>⌘ K</kbd></button>
    <button v-if="fullscreen" class="fullscreen-exit" @click="toggleFullscreen"><Icon name="expand" :size="14"/>{{ t.exitFullscreen }}<kbd>Esc</kbd></button>
   </div>
   <div class="window-body">
    <aside ref="sidebarElement" class="sidebar">
     <a class="profile" :href="`/${locale}/about/`"><span class="profile-icon"><BrandMark variant="tile" size="100%"/></span><span><strong>{{ t.brand }}</strong><small>{{ locale === 'zh' ? '代码与生活的存档' : 'Code & life, collected' }}</small></span></a>
     <nav :aria-label="t.categories">
      <span class="sidebar-label">{{ t.library }}</span>
      <a :href="`/${locale}/`" :class="['sidebar-link', { selected: !active || active === 'all' }]" :aria-current="!active || active === 'all' ? 'page' : undefined"><Icon name="grid" :size="18"/>{{ t.all }}<span class="nav-count">{{ posts.length }}</span></a>
      <template v-for="group in sectionGroups" :key="group.label">
       <span class="sidebar-label category-label">{{ t[group.label] }}</span>
       <a v-for="section in group.ids" :key="section" :href="sectionHref(locale, section)" :class="['sidebar-link', { selected: active === section }]" :aria-current="active === section ? 'page' : undefined"><Icon :name="section" :size="18" :class="`color-${section}`"/>{{ t[section] }}<span class="nav-count">{{ section === 'lab' || section === 'projects' ? works.filter(p => p.category === section).length : posts.filter(p => p.category === section).length }}</span></a>
      </template>
      <div class="sidebar-rule"></div>
      <a :href="`/${locale}/about/`" :class="['sidebar-link', { selected: active === 'about' }]" :aria-current="active === 'about' ? 'page' : undefined"><Icon name="about" :size="18"/>{{ t.about }}</a>
      <a :href="`/${locale}/rss.xml`" class="sidebar-link"><Icon name="rss" :size="18"/>{{ t.rss }}</a>
     </nav>
     <div class="sidebar-bottom"><span class="online-dot"></span>{{ t.online }}<small>Made with curiosity <span>↗</span></small></div>
    </aside>
    <main id="main-content" class="window-content" tabindex="-1"><slot /></main>
   </div>
   <footer class="window-status"><span><span class="tiny-dot"></span>{{ active === 'lab' || active === 'projects' ? t[active] : t.sample }} · {{ active === 'lab' || active === 'projects' ? works.filter(p => p.category === active).length : posts.length }} {{ active === 'lab' || active === 'projects' ? (locale === 'zh' ? '件作品' : works.filter(p => p.category === active).length === 1 ? 'work' : 'works') : t.entries }}</span><span class="status-stack">{{ t.footer }}</span></footer>
  </div></Transition>
 </div>
 <nav class="dock" :aria-label="locale === 'zh' ? '桌面快捷入口' : 'Desktop shortcuts'">
  <button class="dock-item" @click="hidden ? hidden = false : locationToHome()" :aria-label="hidden ? t.reopen : t.home"><span class="dock-tooltip">{{ hidden ? t.reopen : t.home }}</span><span class="dock-icon dock-home"><DockIcon name="folder"/></span><i :class="{ active: !active }"></i></button>
  <a v-for="category in dockIds" :key="category" :href="sectionHref(locale, category)" class="dock-item" :aria-label="t[category]"><span class="dock-tooltip">{{ t[category] }}</span><span :class="['dock-icon', `dock-${category}`]"><DockIcon :name="category"/></span><i :class="{ active: active === category }"></i></a>
  <span class="dock-divider"></span>
  <a :href="`/${locale}/about/`" class="dock-item" :aria-label="t.about"><span class="dock-tooltip">{{ t.about }}</span><span class="dock-icon dock-about"><DockIcon name="about"/></span><i :class="{ active: active === 'about' }"></i></a>
 </nav>
 <dialog ref="searchDialog" class="search-dialog" @click="(e) => e.target === searchDialog && closeSearch()" @cancel="query = ''">
  <div class="search-dialog-head"><Icon name="search" :size="22"/><input ref="searchInput" v-model="query" :placeholder="t.search" :aria-label="t.searchTitle"/><button class="icon-button" @click="closeSearch" :aria-label="t.close"><kbd>Esc</kbd></button></div>
  <div class="search-dialog-body"><p class="search-help">{{ query ? `${searchResults.length} ${locale === 'en' && searchResults.length === 1 ? 'result' : t.results}` : t.searchHint }}</p><a v-for="p in searchResults" :key="p.href" :href="p.href" class="search-result"><span :class="['result-icon', `color-${p.category}`]"><Icon :name="p.category"/></span><span><strong>{{ p.title }}</strong><small>{{ p.description }}</small></span><Icon name="arrow" :size="18"/></a><div v-if="!searchResults.length" class="search-empty">{{ t.empty }}<small>{{ t.emptyHint }}</small></div></div>
 </dialog>
 </div>
</template>
