---
title: "让代码更清楚的三个小习惯"
description: "好的命名、清晰的边界，以及给未来的自己留一条线索。"
locale: "zh"
translationKey: "small-code-habits"
category: "code"
date: "2026-09-03"
tags: ["开发笔记", "前端"]
sample: true
minutes: 4
featured: false
---

## 让名字表达意图

这是一篇**技术排版示例**，展示短篇开发笔记的阅读效果。

比起 `data`，一个具体的名字能让代码更容易理解。例如，把筛选后的文章命名为 `visiblePosts`。

```ts
const visiblePosts = posts.filter(post => !post.draft)
```

## 把变化留在边界

日期格式、图片地址、语言文案集中管理。之后修改规则时，就不需要在每个组件里寻找同样的逻辑。

## 解释为什么

注释可以记录一个不明显的决定：为什么选这个边界条件，为什么保留这个行为。让下一次阅读代码的人少猜一步。
