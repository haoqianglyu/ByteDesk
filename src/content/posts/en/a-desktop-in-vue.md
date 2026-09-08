---
title: "A little desktop, made with Vue"
description: "A quiet home for stories, with just enough interaction. The start of a personal blog."
locale: "en"
translationKey: "a-desktop-in-vue"
category: "code"
date: "2026-09-08"
tags: ["Vue", "Frontend"]
sample: true
minutes: 6
featured: false
---

## Start with one small component

This is a **sample code article** showing syntax highlighting, copy controls and a table of contents. It is not a published development journal.

A small window needs a title, its content and a button to change the reading space.

```vue
<script setup lang="ts">
import { ref } from 'vue'

const expanded = ref(false)
</script>

<template>
  <section :class="{ expanded }">
    <button @click="expanded = !expanded">
      Toggle reading space
    </button>
    <slot />
  </section>
</template>
```

## Content and interaction

Astro generates article HTML at build time. Vue handles interactive state. Every story has its own URL, so it can be opened, refreshed and shared directly.

Markdown files contain the article, category, date and tags. Git keeps a history of changes.

## Design for reading

A desktop can be playful, but stories should remain easy to find and read. On mobile, give more space to the words and photographs.

- Keep real links and browser navigation.
- Label controls and show keyboard focus.
- Respect system themes and reduced motion.

## The next line

Start with something readable, then improve it through use. A personal website can grow along with its stories.
