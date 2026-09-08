---
title: "Three small habits for clearer code"
description: "Thoughtful names, clear boundaries, and a small note for your future self."
locale: "en"
translationKey: "small-code-habits"
category: "code"
date: "2026-09-03"
tags: ["Dev notes", "Frontend"]
sample: true
minutes: 4
featured: false
---

## Name the intention

This is a **sample technical note** demonstrating a short article layout.

A specific name can explain more than a generic `data` variable. A filtered collection of articles could be called `visiblePosts`.

```ts
const visiblePosts = posts.filter(post => !post.draft)
```

## Keep changes at the boundary

Centralize date formatting, image URLs and interface translations. A rule can then change in one place.

## Explain why

A comment can capture a decision that is not obvious from the code. Leave a useful clue for the next person reading it.
