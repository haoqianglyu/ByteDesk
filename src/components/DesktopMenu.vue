<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import BrandMark from './BrandMark.vue';
import { wallpapers, type Wallpaper } from '../lib/wallpapers';
import { ui, sectionHref, type Locale } from '../lib/i18n';
const props = defineProps<{ locale: Locale; hidden: boolean; expanded: boolean; desktop: boolean; wallpaper: Wallpaper; solarPaused: boolean }>();
type MenuId = 'brand' | 'browse' | 'window' | 'wallpaper';
type Action = 'search' | 'minimize' | 'zoom' | 'fullscreen' | 'reset' | 'view-wallpaper' | 'pause-solar';
const emit = defineEmits<{
 (event: Action | 'opening'): void;
 (event: 'wallpaper', value: Wallpaper): void;
}>();
type Item = { label: string; href?: string; action?: Action; wallpaper?: Wallpaper; separator?: boolean; shortcut?: string; checked?: boolean };
const root = ref<HTMLElement>();
const open = ref<MenuId | null>(null);
const t = computed(() => ui(props.locale));
const zh = computed(() => props.locale === 'zh');
const menus = computed(() => [
 { id: 'brand' as const, label: 'ByteDesk' },
 { id: 'browse' as const, label: zh.value ? '浏览' : 'Browse' },
 { id: 'wallpaper' as const, label: zh.value ? '壁纸' : 'Wallpaper' },
 ...(props.desktop ? [{ id: 'window' as const, label: zh.value ? '窗口' : 'Window' }] : []),
]);
const items = computed<Record<MenuId, Item[]>>(() => ({
 brand: [
  { label: t.value.about, href: `/${props.locale}/about/` },
  { label: zh.value ? '友情链接' : 'Friends', href: `/${props.locale}/about/#friends` },
 ],
 browse: [
  { label: t.value.all, href: `/${props.locale}/` },
  ...(['pets', 'daily', 'travel', 'code', 'lab', 'projects'] as const).map((id, index) => ({ label: t.value[id], href: sectionHref(props.locale, id), separator: index === 0 || id === 'lab' })),
  { label: zh.value ? '搜索…' : 'Search…', action: 'search', separator: true, shortcut: '⌘ K' },
 ],
 wallpaper: [
  ...wallpapers.map(item => ({ label: zh.value ? item.zh : item.en, wallpaper: item.id, checked: props.wallpaper === item.id })),
  { label: zh.value ? '收起窗口，欣赏壁纸' : 'Hide Window to Enjoy Wallpaper', action: 'view-wallpaper', separator: true },
  ...(props.wallpaper !== 'classic' ? [{ label: props.solarPaused ? (zh.value ? '继续动画' : 'Resume Animation') : (zh.value ? '暂停动画' : 'Pause Animation'), action: 'pause-solar' as const }] : []),
 ],
 window: [
  { label: props.hidden ? (zh.value ? '重新打开窗口' : 'Reopen Window') : (zh.value ? '收起窗口' : 'Minimize'), action: 'minimize' },
  { label: props.expanded ? (zh.value ? '还原窗口' : 'Restore Window') : (zh.value ? '放大窗口' : 'Zoom'), action: 'zoom' },
  { label: zh.value ? '进入全屏' : 'Enter Full Screen', action: 'fullscreen' },
  { label: zh.value ? '恢复默认大小与位置' : 'Reset Size and Position', action: 'reset', separator: true },
 ],
}));
function trigger(id: MenuId) { return root.value?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${id}"]`); }
function menuItems() { return [...(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') || [])]; }
function close(restore = false) {
 const id = open.value; open.value = null;
 if (restore && id) trigger(id)?.focus({ preventScroll: true });
}
async function show(id: MenuId, focus: 'first' | 'last' | false = false) {
 open.value = id; emit('opening');
 await nextTick();
 if (focus) { const list = menuItems(); (focus === 'first' ? list[0] : list.at(-1))?.focus(); }
}
function toggle(id: MenuId) { if (open.value === id) close(); else show(id); }
function hover(id: MenuId, event: PointerEvent) { if (event.pointerType === 'mouse' && open.value && open.value !== id) show(id); }
function activate(item: Item) {
 close(!!item.action || !!item.wallpaper);
 if (item.wallpaper) emit('wallpaper', item.wallpaper);
 else if (item.action) emit(item.action);
}
function keys(event: KeyboardEvent, id: MenuId, inPanel = false) {
 const { key } = event;
 if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
 if (key === 'Tab') { close(); return; }
 if (key === 'ArrowLeft' || key === 'ArrowRight') {
  event.preventDefault();
  const ids = menus.value.map(m => m.id), i = ids.indexOf(id);
  const next = ids[(i + (key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length]!;
  if (open.value) show(next, 'first'); else trigger(next)?.focus();
  return;
 }
 if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return;
 event.preventDefault();
 if (!inPanel) { show(id, key === 'ArrowUp' || key === 'End' ? 'last' : 'first'); return; }
 const list = menuItems(), current = list.indexOf(document.activeElement as HTMLElement);
 const index = key === 'Home' ? 0 : key === 'End' ? list.length - 1 : (current + (key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
 list[index]?.focus();
}
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) close(); }
function focusLeft(event: FocusEvent) { if (event.relatedTarget && !root.value?.contains(event.relatedTarget as Node)) close(); }
function escape(event: KeyboardEvent) { if (event.key === 'Escape' && open.value) { event.preventDefault(); close(true); } }
onMounted(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); });
onUnmounted(() => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); });
defineExpose({ close });
</script>
<template>
 <nav ref="root" class="desktop-menus" :aria-label="zh ? '桌面菜单' : 'Desktop menus'" @focusout="focusLeft">
  <div v-for="menu in menus" :key="menu.id" :class="['desktop-menu', `desktop-menu-${menu.id}`]">
   <button :id="`desktop-menu-${menu.id}`" :data-menu-trigger="menu.id" :aria-label="menu.label" class="desktop-menu-trigger" :class="{ 'menu-brand': menu.id === 'brand' }" :aria-expanded="open === menu.id" aria-haspopup="menu" :aria-controls="`desktop-panel-${menu.id}`" @click="toggle(menu.id)" @pointerenter="hover(menu.id, $event)" @keydown="keys($event, menu.id)"><BrandMark v-if="menu.id === 'brand'" :size="24"/><span>{{ menu.label }}</span></button>
   <div v-if="open === menu.id" :id="`desktop-panel-${menu.id}`" class="desktop-menu-panel" role="menu" :aria-labelledby="`desktop-menu-${menu.id}`" @keydown="keys($event, menu.id, true)">
    <template v-for="item in items[menu.id]" :key="item.label">
     <div v-if="item.separator" role="separator" class="desktop-menu-separator"></div>
     <a v-if="item.href" :href="item.href" role="menuitem" tabindex="-1" @click="activate(item)">{{ item.label }}</a>
     <button v-else :role="item.checked !== undefined ? 'menuitemradio' : 'menuitem'" :aria-checked="item.checked" tabindex="-1" @click="activate(item)"><span>{{ item.label }}</span><span v-if="item.checked" aria-hidden="true">✓</span><kbd v-if="item.shortcut">{{ item.shortcut }}</kbd></button>
    </template>
   </div>
  </div>
 </nav>
</template>
