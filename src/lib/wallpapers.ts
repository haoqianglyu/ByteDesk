export const wallpapers = [
 { id: 'campfire', zh: '星空 · 篝火相伴', en: 'Starlight · By the Fire', titleZh: '星空相伴', titleEn: 'Under the Stars', descriptionZh: '银河、篝火，还有彼此', descriptionEn: 'The Milky Way, a warm fire, and you' },
 { id: 'earth-night', zh: '地球夜景 · 城市灯光', en: 'Earth at Night · City Lights', titleZh: '地球夜景', titleEn: 'Earth at Night', descriptionZh: '夜间灯光合成 · 缓慢自转', descriptionEn: 'Night-light composite · A rotating world' },
 { id: 'earth', zh: '地球 · 太空视角', en: 'Earth · From Space', titleZh: '地球', titleEn: 'Earth', descriptionZh: '太空视角 · 旋转的蓝色星球', descriptionEn: 'From space · Our blue planet' },
 { id: 'solar', zh: '太阳系', en: 'Solar System', titleZh: '太阳系', titleEn: 'Solar System', descriptionZh: '太阳系 · 艺术化模拟', descriptionEn: 'The Solar System · An artistic interpretation' },
 { id: 'classic', zh: '经典壁纸', en: 'Classic Wallpaper', titleZh: '', titleEn: '', descriptionZh: '', descriptionEn: '' },
] as const;
export type Wallpaper = typeof wallpapers[number]['id'];
export type AnimatedWallpaper = Exclude<Wallpaper, 'classic'>;
export function savedWallpaper(value: string | null): Wallpaper {
 return wallpapers.some(item => item.id === value) ? value as Wallpaper : 'solar';
}
