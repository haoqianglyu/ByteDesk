export type Locale = 'zh' | 'en';
export const locales: Locale[] = ['zh', 'en'];
export const categoryIds = ['pets', 'daily', 'travel', 'code'] as const;
export const sectionIds = [...categoryIds, 'lab', 'projects'] as const;
export type Section = typeof sectionIds[number];
export const sectionGroups = [{ label: 'life', ids: ['pets', 'daily', 'travel'] }, { label: 'create', ids: ['code', 'lab', 'projects'] }] as const;
export const sectionHref = (locale: Locale, section: Section) => section === 'lab' || section === 'projects' ? `/${locale}/${section}/` : `/${locale}/category/${section}/`;
export type Category = typeof categoryIds[number];
export const messages = {
  zh: {
    brand: '字节桌面', tagline: '记录代码，也记录灵感。', subtitle: '在代码与生活之间，留下一些值得记住的瞬间。',
    home: '我的桌面', all: '全部内容', categories: '我的收藏夹', library: '资料库', latest: '最近更新',
    pets: '宠物', daily: '日常', travel: '旅游', code: '代码', about: '关于我', projects: '项目', lab: '实验室', life: '生活记录', create: '创作空间', results: '条结果',
    search: '搜索文章、实验、项目…', searchTitle: '搜索这张桌面', searchHint: '试试「Vue」「照片」或「旅行」',
    empty: '还没有找到相关内容', emptyHint: '换一个关键词，或看看其他分类。', clear: '清除筛选',
    featured: '桌面精选', recent: '最近的记录', explore: '随处看看', read: '打开阅读', allPosts: '查看全部',
    sample: '示例内容', demo: '预览版 · 当前文章与照片均为示例', entries: '篇记录', photo: '照片',
    theme: '外观', light: '浅色', dark: '深色', system: '跟随系统', language: '切换至英文',
    close: '关闭窗口', minimize: '收起窗口', maximize: '进入全屏', exitFullscreen: '退出全屏', reopen: '恢复窗口',
    viewGrid: '卡片视图', viewList: '列表视图', back: '返回桌面', toc: '本文目录', minutes: '分钟阅读',
    copy: '复制代码', copied: '已复制', copyFailed: '复制失败，请手动选择', imageClose: '关闭大图',
    imageHint: '点击查看大图', original: '打开原图', note: '桌面便签', noteText: '让好奇心常驻。\n写一点代码，\n也收藏一点生活。',
    online: '欢迎来我的桌面坐坐', footer: 'A home for code and ideas.', tags: '标签', rss: '订阅 RSS',
    missing: '这篇内容暂时没有英文译文，以下展示中文原文。', missingLink: '查看中文原文',
    categoryDescription: { pets: '柔软的小伙伴，和那些被治愈的瞬间。', daily: '平凡日子里，也有闪闪发光的小事。', travel: '走远一点，让世界成为灵感。', code: '把问题拆开，把想法写成代码。' },
    month: '九月', since: '始于 2026', pinned: '置顶', next: '继续探索', noEntries: '这里还没有记录',
  },
  en: {
    brand: 'ByteDesk', tagline: 'A home for code and ideas.', subtitle: 'Small stories from the space between code and everyday life.',
    home: 'My desktop', all: 'All stories', categories: 'FAVORITES', library: 'LIBRARY', latest: 'Recently updated',
    pets: 'Pets', daily: 'Daily', travel: 'Travel', code: 'Code', about: 'About', projects: 'Projects', lab: 'Lab', life: 'LIFE', create: 'CREATE', results: 'results',
    search: 'Search stories, experiments…', searchTitle: 'Search this desktop', searchHint: 'Try “Vue”, “photos” or “travel”',
    empty: 'No stories found', emptyHint: 'Try another keyword or explore a different category.', clear: 'Clear filters',
    featured: 'ON THE DESKTOP', recent: 'Recent stories', explore: 'A little of everything', read: 'Read the story', allPosts: 'View all',
    sample: 'Sample', demo: 'Preview · All stories and photographs are samples', entries: 'stories', photo: 'Photo',
    theme: 'Appearance', light: 'Light', dark: 'Dark', system: 'System', language: 'Switch to Chinese',
    close: 'Close window', minimize: 'Minimize window', maximize: 'Enter full screen', exitFullscreen: 'Exit full screen', reopen: 'Restore window',
    viewGrid: 'Grid view', viewList: 'List view', back: 'Back to desktop', toc: 'ON THIS PAGE', minutes: 'min read',
    copy: 'Copy code', copied: 'Copied', copyFailed: 'Copy failed; select manually', imageClose: 'Close image',
    imageHint: 'Click to enlarge', original: 'Open original', note: 'A SMALL REMINDER', noteText: 'Stay curious.\nWrite a little code.\nCollect a little life.',
    online: 'Make yourself at home', footer: 'A home for code and ideas.', tags: 'Tags', rss: 'Subscribe via RSS',
    missing: 'An English translation is not available yet. The original Chinese story is shown below.', missingLink: 'Read the Chinese original',
    categoryDescription: { pets: 'Little companions. A softer way to see the world.', daily: 'Finding something lovely in the ordinary.', travel: 'A little further from home, a little closer to wonder.', code: 'Breaking down problems. Bringing ideas to life.' },
    month: 'SEPTEMBER', since: 'EST. 2026', pinned: 'Pinned', next: 'Keep exploring', noEntries: 'No stories here yet',
  },
};
export const ui = (locale: Locale) => messages[locale];
export const categoryLabel = (locale: Locale, category: Category) => messages[locale][category];
export const dateLabel = (date: string | Date, locale: Locale) => new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date));
