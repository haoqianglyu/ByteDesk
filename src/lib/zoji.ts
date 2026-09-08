import type { Locale } from './i18n';
import { imageUrl } from './images';

// Official App Store listings, checked 2026-09-08. Keep storefront and artwork locale paired.
export const zojiStoreUrls: Record<Locale, string> = {
 zh: 'https://apps.apple.com/cn/app/%E7%88%AA%E8%AE%B0-zoji/id6802273364',
 en: 'https://apps.apple.com/us/app/zoji-pet-life-journal/id6802273364',
};
export const zojiImage = (filename: string) => imageUrl(`projects/zoji/${filename}`)!;
export function zojiContent(locale: Locale) {
 const zh = locale === 'zh';
 return {
  title: zh ? '爪记 · Zoji' : 'Zoji: Pet Life Journal',
  tagline: zh ? '宠物生活，认真记录。' : 'Pet life, beautifully kept.',
  description: zh ? '我做的一款宠物生活记录 App。把每只宠物的日常、健康与照护安排，收进一份专属档案。' : 'A pet life journal I built for everyday care. Give each pet a home for their moments, health records and routines.',
  storeUrl: zojiStoreUrls[locale],
  storeLabel: zh ? '在 App Store 下载' : 'Download on the App Store',
  storeRegion: zh ? '中国区 App Store' : 'U.S. App Store',
  icon: zojiImage('icon.jpg'),
  screenshots: [
   { file: '01-home.png', title: zh ? '专属档案' : 'A profile for every pet', description: zh ? '多只宠物，各自珍藏。体重变化与近期照护，一眼就能看到。' : 'Individual profiles, weight trends and upcoming care, all at a glance.' },
   { file: '02-records.png', title: zh ? '生活记录' : 'Everyday moments', description: zh ? '照片、日常、健康和费用，在同一条时间线里慢慢积累。' : 'Keep photos, everyday stories, health notes and expenses together.' },
   { file: '03-reminders.png', title: zh ? '照护提醒' : 'Care reminders', description: zh ? '把疫苗、驱虫与日常照护安排好，查看即将到来的待办。' : 'Keep vaccinations, deworming and everyday care on your schedule.' },
   { file: '04-family.png', title: zh ? '家人一起照顾' : 'Care, shared with family', description: zh ? '邀请家人查看或共同维护指定宠物的资料。' : 'Invite family members to view or help maintain a selected pet’s information.' },
   { file: '05-hospitals.png', title: zh ? '附近的宠物医院' : 'Nearby veterinary care', description: zh ? '需要时，查找附近的宠物医院。' : 'Find nearby veterinary hospitals when you need them.' },
   { file: '06-health-record.png', title: zh ? '健康资料整理' : 'Health records, organized', description: zh ? '整理疫苗、体检、用药与病历附件，保留重要资料。' : 'Organize vaccinations, checkups, medications and medical attachments.' },
  ].map(item => ({ ...item, src: zojiImage(`${locale}-${item.file}`), alt: zh ? `爪记 Zoji 中文 App Store 展示图：${item.title}` : `Zoji English App Store screenshot: ${item.title}`, width: 1320, height: 2868 })),
 };
}
