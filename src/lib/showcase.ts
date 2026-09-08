import type { Locale } from './i18n';
import { zojiContent } from './zoji';
export function showcaseItems(locale: Locale) {
 const zh = locale === 'zh';
 const zoji = zojiContent(locale);
 return [
  { slug: 'zoji', category: 'projects' as const, title: zoji.title, description: zoji.description, tags: ['iOS', 'Zoji', '爪记', zh ? '宠物' : 'Pets'], status: zh ? '已上架' : 'Available', href: `/${locale}/projects/zoji/` },
  { slug: 'glass-playground', category: 'lab' as const, title: zh ? '玻璃的另一面' : 'Through the glass', description: zh ? '试着改变透明度、模糊与色彩，看看一张界面卡片如何变得不同。' : 'Explore how opacity, blur and color change the character of an interface.', tags: ['Vue', 'CSS', zh ? '交互实验' : 'Interaction'], status: zh ? '可交互' : 'Interactive', href: `/${locale}/lab/glass-playground/` },
  { slug: 'logo-study', category: 'lab' as const, title: zh ? '在两片之间' : 'Between the pieces', description: zh ? '把桌面的标记变成立体，转动、展开，在玻璃和金属之间观察光。' : 'A dimensional study of the desktop mark. Rotate, separate, and explore glass and metal.', tags: ['Three.js', 'Vue', zh ? '立体实验' : '3D study'], status: zh ? '可交互' : 'Interactive', href: `/${locale}/lab/logo-study/` },
  { slug: 'bytedesk', category: 'projects' as const, title: 'ByteDesk', description: zh ? '一个放代码、生活与灵感的个人桌面。也是你现在正在逛的网站。' : 'A personal desktop for code, life and ideas. The website you are exploring right now.', tags: ['Astro', 'Vue', 'R2'], status: zh ? '开发中' : 'In development', href: `/${locale}/projects/bytedesk/` },
 ];
}
