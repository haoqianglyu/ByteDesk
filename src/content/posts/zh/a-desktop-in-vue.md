---
title: "用 Vue，搭一张自己的桌面"
description: "让内容安静地呈现，让交互恰到好处。记录一个博客的起点。"
locale: "zh"
translationKey: "a-desktop-in-vue"
category: "code"
date: "2026-09-08"
tags: ["Vue", "前端"]
sample: true
minutes: 6
featured: false
---

## 从一个小组件开始

这是一篇**代码栏目示例**。它演示代码高亮、复制按钮和目录，不是已经发布的个人开发日志。

桌面界面可以从一个很小的窗口开始。标题、内容和一个控制阅读空间的按钮，就能组成清晰的交互。

```vue
<script setup lang="ts">
import { ref } from 'vue'

const expanded = ref(false)
</script>

<template>
  <section :class="{ expanded }">
    <button @click="expanded = !expanded">
      切换阅读空间
    </button>
    <slot />
  </section>
</template>
```

## 内容与交互分开考虑

Astro 在构建阶段生成文章 HTML，Vue 负责需要状态的交互。正文拥有独立链接，可以直接打开、刷新和分享。

文章放在 Markdown 文件里，分类、日期和标签写在文件开头。这样可以通过 Git 记录每次修改。

## 让界面服务阅读

桌面风格可以有趣，但文章始终应该容易找到、容易读完。手机上减少装饰，给文字和图片留出足够空间。

- 优先保留真实链接与浏览器导航。
- 为按钮添加文字说明和键盘焦点。
- 支持跟随系统主题与减少动效偏好。

## 下一行代码

先完成一个可以阅读的版本，再根据使用感受继续调整。好的个人网站可以和内容一起慢慢生长。
