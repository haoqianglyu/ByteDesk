import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

type ScrollPosition = { left: number; top: number };
const positions = new Map<string, ScrollPosition>();
const entryKey = 'bytedeskEntry';
const content = () => document.querySelector<HTMLElement>('#main-content');
const pageKey = () => location.pathname + location.search;

function historyEntry(fresh = false): string {
 const key = !fresh && history.state?.[entryKey] || crypto.randomUUID();
 history.replaceState({ ...history.state, [entryKey]: key }, '');
 return key;
}

let currentEntry = historyEntry();
let currentPage = pageKey();

function rememberScroll() {
 const main = content();
 if (main) positions.set(currentEntry, { left: main.scrollLeft, top: main.scrollTop });
}

function restoreScroll(position?: ScrollPosition, hash = '') {
 const main = content();
 if (!main) return;
 if (position) main.scrollTo({ ...position, behavior: 'instant' });
 else {
  main.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  if (hash) {
   let id = hash.slice(1);
   try { id = decodeURIComponent(id); } catch {}
   document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
  }
 }
}

// Astro handles document scrolling; this desktop also has its own scroll container.
document.addEventListener('scroll', event => {
 if (event.target === content()) rememberScroll();
}, { capture: true, passive: true });
window.addEventListener('hashchange', () => { currentEntry = historyEntry(); });
window.addEventListener('popstate', () => {
 // Same-page anchors bypass Astro's page-swap events.
 if (pageKey() !== currentPage) return;
 const restored = positions.get(history.state?.[entryKey]);
 currentEntry = historyEntry();
 restoreScroll(restored, location.hash);
});

document.addEventListener('astro:before-swap', (event: TransitionBeforeSwapEvent) => {
 const currentContent = content();
 const currentSlot = currentContent?.querySelector(':scope > astro-slot');
 const incomingSlot = event.newDocument.querySelector('#main-content > astro-slot');
 if (!currentContent || !currentSlot || !incomingSlot) return;

 rememberScroll();
 const restored = event.navigationType === 'traverse' ? positions.get(history.state?.[entryKey]) : undefined;
 const swap = event.swap;
 event.swap = () => {
  // Vue owns the persistent desktop, while Astro owns the HTML in this static slot.
  // Replace only its children so outgoing islands unmount and incoming ones hydrate.
  // Persisting the shell alone would also keep the previous page's slot content.
  currentSlot.replaceChildren(...incomingSlot.childNodes);
  event.newDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  swap();
 };

 document.addEventListener('astro:after-swap', () => {
  currentEntry = historyEntry(event.navigationType !== 'traverse');
  currentPage = pageKey();
  // Wait for the persistent Vue shell to apply the new page/locale props.
  queueMicrotask(() => {
   const main = content();
   if (!main) return;
   main.focus({ preventScroll: true });
   restoreScroll(restored, event.to.hash);
  });
 }, { once: true });
});
