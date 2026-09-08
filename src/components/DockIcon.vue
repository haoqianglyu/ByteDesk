<script setup lang="ts">
import { useId } from 'vue';
defineProps<{ name: string }>();
const id = useId();
const paint = (name: string) => `url(#${id}-${name})`;
const tile = 'M17 2h30c10 0 15 5 15 15v30c0 10-5 15-15 15H17C7 62 2 57 2 47V17C2 7 7 2 17 2Z';
</script>

<template>
 <svg class="dock-art" width="48" height="48" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <defs>
   <linearGradient :id="`${id}-porcelain`" x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#e7ebef"/></linearGradient>
   <linearGradient :id="`${id}-blue`" x1="32" y1="12" x2="32" y2="55" gradientUnits="userSpaceOnUse"><stop stop-color="#65cbff"/><stop offset="1" stop-color="#0879e0"/></linearGradient>
   <linearGradient :id="`${id}-folder`" x1="32" y1="27" x2="32" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#63c7ff"/><stop offset="1" stop-color="#268fe9"/></linearGradient>
   <linearGradient :id="`${id}-cream`" x1="20" y1="2" x2="45" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#fff7df"/><stop offset="1" stop-color="#e9d5b5"/></linearGradient>
   <linearGradient :id="`${id}-fur`" x1="22" y1="17" x2="38" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#eab675"/><stop offset="1" stop-color="#c98949"/></linearGradient>
   <linearGradient :id="`${id}-yellow`" x1="30" y1="3" x2="30" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#ffe272"/><stop offset="1" stop-color="#f6bc31"/></linearGradient>
   <linearGradient :id="`${id}-pin`" x1="34" y1="9" x2="44" y2="42" gradientUnits="userSpaceOnUse"><stop stop-color="#ff7568"/><stop offset="1" stop-color="#d92f47"/></linearGradient>
   <clipPath :id="`${id}-map`"><rect x="6" y="6" width="52" height="52" rx="11"/></clipPath>
   <linearGradient :id="`${id}-terminal`" x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#555960"/><stop offset="1" stop-color="#25272b"/></linearGradient>
   <linearGradient :id="`${id}-leather`" x1="15" y1="3" x2="50" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#dbc6a3"/><stop offset="1" stop-color="#ad8e63"/></linearGradient>
  </defs>

  <g v-if="name === 'folder'">
   <path :d="tile" :fill="paint('porcelain')"/>
   <path d="M8 17a4 4 0 0 1 4-4h13l5 5h22a4 4 0 0 1 4 4v30H8Z" :fill="paint('blue')"/>
   <path d="m15 17 31-3 3 30-31 3Z" fill="#fff" stroke="#d2e6f4" stroke-width=".8"/>
   <path d="m20 23 20-2m-20 7 15-1.5" stroke="#b6c7d8" stroke-width="1.5" stroke-linecap="round"/>
   <path d="M7 29a3 3 0 0 1 3-3h44a3 3 0 0 1 3 3l-3 22a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z" :fill="paint('folder')"/>
   <path d="M10 27h44" stroke="#b7e7ff" stroke-width="1.1"/>
   <path d="m25 35 5 5-5 5m9 0h7" stroke="#effaff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g v-else-if="name === 'pets'">
   <path :d="tile" :fill="paint('cream')"/>
   <ellipse cx="32" cy="52" rx="20" ry="4" fill="#805e2b" opacity=".12"/>
   <path d="m13 29-1-16c0-2 2-3 4-2l12 8h9l11-8c2-1 4 0 4 2l-1 17c7 18-3 26-19 26S6 47 13 29Z" :fill="paint('fur')"/>
   <path d="m16 24-1-10 10 7Zm24-3 9-7-1 11Z" fill="#e7a091"/>
   <path d="m27 18 2 7m8-7-2 7M13 34l7 2m31-2-7 2" stroke="#a66b34" stroke-width="2.4" stroke-linecap="round"/>
   <path d="M19 34c1-5 8-5 10 0-3 4-7 4-10 0Zm16 0c2-5 9-5 10 0-3 4-7 4-10 0Z" fill="#e8eccd"/>
   <ellipse cx="24" cy="33.5" rx="1.4" ry="3" fill="#344230"/><ellipse cx="40" cy="33.5" rx="1.4" ry="3" fill="#344230"/>
   <path d="M20 44c0-6 8-6 12-2 4-4 12-4 12 2 0 8-8 9-12 7-4 2-12 1-12-7Z" fill="#fff0d8"/>
   <path d="m29 40 3 3 3-3Z" fill="#a65d55"/><path d="M32 43v3m0 0-3 1m3-1 3 1" stroke="#8c6250" stroke-width="1.2" stroke-linecap="round"/>
   <path d="m19 42-10-2m10 6-9 1m35-5 10-2m-10 6 9 1" stroke="#8c6250" stroke-width="1" stroke-linecap="round" opacity=".8"/>
  </g>

  <g v-else-if="name === 'daily'">
   <path :d="tile" :fill="paint('porcelain')"/>
   <path d="M17 2h30c10 0 15 5 15 15v5H2v-5C2 7 7 2 17 2Z" :fill="paint('yellow')"/>
   <path d="M3 21h58" stroke="#dca434"/><path d="M4 23h56" stroke="#fff"/>
   <path d="M12 32h37M12 40h30M12 48h25" stroke="#bdc2c9" stroke-width="1.5" stroke-linecap="round"/>
   <g transform="rotate(34 46 40)">
    <path d="M42 20h8v31l-4 7-4-7Z" fill="#000" opacity=".1" transform="translate(1 1)"/>
    <path d="M42 22h8v27h-8Z" fill="#f4b52e"/><path d="M47 22h3v27h-3Z" fill="#d99714"/>
    <path d="m42 49 4 8 4-8Z" fill="#dcb889"/><path d="m44.5 54 1.5 3 1.5-3Z" fill="#42434a"/>
    <path d="M42 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4h-8Z" fill="#df857b"/><path d="M42 24h8v3h-8Z" fill="#d7dbe0"/>
   </g>
  </g>

  <g v-else-if="name === 'travel'">
   <path :d="tile" :fill="paint('porcelain')"/>
   <g :clip-path="paint('map')">
    <rect x="6" y="6" width="52" height="52" fill="#eee9da"/>
    <path d="M6 6h19v19H6Zm31 29h21v23H37Z" fill="#a3cc8d"/>
    <path d="M50 3c-16 20 14 25-4 39-6 5-7 11-5 19" stroke="#99d9f2" stroke-width="9"/>
    <path d="M6 30h52M28 6v52M6 48h31M15 6v24" stroke="#d5cfbe" stroke-width="5"/>
    <path d="M6 30h52M28 6v52M6 48h31M15 6v24" stroke="#fffef8" stroke-width="3"/>
    <path d="m3 44 58-28" stroke="#fff" stroke-width="7"/>
    <path d="m3 44 58-28" stroke="#f8c766" stroke-width="4"/>
    <path d="M15 48h13V35l10-5" stroke="#348fe7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
   </g>
   <circle cx="15" cy="48" r="3.3" fill="#348fe7" stroke="#fff" stroke-width="1.5"/>
   <ellipse cx="39" cy="42" rx="7" ry="2" fill="#5c5b45" opacity=".17"/>
   <path d="M39 9a11 11 0 0 0-11 11c0 8 11 21 11 21s11-13 11-21A11 11 0 0 0 39 9Z" :fill="paint('pin')"/>
   <path d="M30 19a9 9 0 0 1 9-8" stroke="#ffb5a8" stroke-width="1" stroke-linecap="round"/>
   <circle cx="39" cy="20" r="4.5" fill="#fff"/>
  </g>

  <g v-else-if="name === 'code'">
   <path :d="tile" :fill="paint('terminal')"/>
   <rect x="6" y="8" width="52" height="48" rx="7" fill="#101215" stroke="#757b81" stroke-width=".8"/>
   <path d="M13 8h38a7 7 0 0 1 7 7v5H6v-5a7 7 0 0 1 7-7Z" fill="#34383e"/>
   <circle cx="12" cy="14" r="1.5" fill="#f27b73"/><circle cx="18" cy="14" r="1.5" fill="#e7bc5c"/><circle cx="24" cy="14" r="1.5" fill="#70bd78"/>
   <path d="m15 29 10 8-10 8" stroke="#f5f7f7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M31 46h13" stroke="#e8eeef" stroke-width="3" stroke-linecap="round"/>
   <rect x="45" y="27" width="2" height="4" rx=".5" fill="#829690" opacity=".65"/>
  </g>

  <g v-else-if="name === 'lab'">
   <path :d="tile" :fill="paint('porcelain')"/>
   <circle cx="33" cy="34" r="24" fill="#eee5fb"/>
   <path d="M25 10h14v5h-3v14l15 22a4 4 0 0 1-3 6H16a4 4 0 0 1-3-6l15-22V15h-3Z" fill="#d8d4ed" stroke="#afa4c8" stroke-width="1"/>
   <path d="m24 37-9 15a2 2 0 0 0 2 3h30a2 2 0 0 0 2-3l-9-15c-5 5-11-4-16 0Z" fill="#9b77d4"/>
   <path d="M30 18v12L18 50" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
   <circle cx="32" cy="44" r="3" fill="#d4bcf5"/><circle cx="39" cy="50" r="2" fill="#c4a5ef"/><circle cx="39" cy="23" r="2" fill="#ac8ad9"/><path d="M48 11v8m-4-4h8" stroke="#ab82d8" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g v-else-if="name === 'projects'">
   <path :d="tile" :fill="paint('cream')"/>
   <path d="M23 22v-6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6" stroke="#91643c" stroke-width="5"/>
   <rect x="8" y="21" width="48" height="35" rx="6" :fill="paint('leather')"/>
   <path d="M8 27a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v10c-16 5-32 5-48 0Z" fill="#cd9a64"/>
   <path d="M10 36c15 5 29 5 44 0" stroke="#926138" stroke-width="1"/>
   <rect x="28" y="35" width="8" height="11" rx="2" fill="#e9d29a" stroke="#a68145" stroke-width="1"/>
   <path d="M13 25h37" stroke="#f1d4a6" stroke-linecap="round"/>
  </g>
  <g v-else-if="name === 'about'">
   <path :d="tile" :fill="paint('porcelain')"/>
   <rect x="48" y="14" width="9" height="11" rx="2" fill="#db9368"/><rect x="48" y="27" width="9" height="11" rx="2" fill="#79a9ba"/><rect x="48" y="40" width="9" height="11" rx="2" fill="#a299c2"/>
   <rect x="8" y="6" width="43" height="53" rx="6" fill="#6e5032" opacity=".15"/>
   <rect x="7" y="5" width="43" height="53" rx="6" :fill="paint('leather')"/>
   <path d="M14 6v51" stroke="#8c704d" stroke-width="1" opacity=".55"/>
   <rect x="18" y="14" width="25" height="33" rx="3" fill="#f4e5c9" stroke="#b9976b" stroke-width=".7"/>
   <circle cx="30.5" cy="25" r="5.3" fill="#af946e"/><path d="M21.5 41v-3a9 9 0 0 1 18 0v3Z" fill="#af946e"/>
   <path d="M24 51h13" stroke="#8c704d" stroke-linecap="round" opacity=".5"/>
  </g>
  <path :d="tile" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>
 </svg>
</template>
