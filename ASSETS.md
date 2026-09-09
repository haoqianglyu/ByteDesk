# 素材来源

图片仅用于博客示例，不代表站长的真实生活或旅行。三张图片已于 2026-09-08 上传到 R2 bucket `bytedesk-images` 的根目录；对应对象键为 `cat.jpg`、`coffee.jpg`、`lake.jpg`，完整性校验清单见 [R2_IMAGES.json](R2_IMAGES.json)。

已开启公开读取，当前图片域名为 `https://img.haoqianglyu.com`，例如 [cat.jpg](https://img.haoqianglyu.com/cat.jpg)。三张远端图片在上传时已核对 HTTP 状态、图片类型、文件大小和 SHA-256，与原文件完全一致。中英文页面从 R2 加载照片，项目不保存照片副本。界面图标为项目中的 SVG/Vue 组件；地图与壁纸素材另见 [ASSET_CREDITS.md](ASSET_CREDITS.md)。

| 文件 | 作者 | 原始页面 |
| --- | --- | --- |
| cat.jpg | Nihal Thakur | https://unsplash.com/photos/a-cat-is-resting-in-the-sunlight-k-RQ4YLcpkc |
| coffee.jpg | Ionela Mat | https://unsplash.com/photos/an-open-notebook-with-a-pencil-and-a-cup-of-coffee-kZypzn4qVPg |
| lake.jpg | Mattia Poli | https://unsplash.com/photos/a-mountain-lake-surrounded-by-snow-covered-mountains-XPVVtqCQWzY |

均按 [Unsplash License](https://unsplash.com/license) 使用。示例图片为 1200 × 800 版本。站点关于页面保留作者与来源链接。

## 爪记 Zoji 应用素材

这是站长自己开发的应用，作为真实项目展示。12 张截图来自站长提供的 `zoji-app-store-zh-Hans-6.9/` 和 `zoji-app-store-en-US-6.9/` 上架素材目录，保持原图与尺寸。应用图标来自该应用的 Apple 官方商店元数据（512 × 512 JPEG）。

- 中国区：[爪记 - Zoji](https://apps.apple.com/cn/app/%E7%88%AA%E8%AE%B0-zoji/id6802273364)
- 美国区：[Zoji: Pet Life Journal](https://apps.apple.com/us/app/zoji-pet-life-journal/id6802273364)
- 图标原始来源：https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/68/cb/dc/68cbdc16-96a2-8ac1-bd00-bb700b875c7c/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg

13 个文件已于 2026-09-08 上传到 `bytedesk-images/projects/zoji/` 并核对 HTTP 200、图片类型和逐字节一致性。完整对象键、文件大小与 SHA-256 见 `R2_IMAGES.json`。页面分别引用 `zh-` 与 `en-` 截图，图标共用。项目及构建产物没有这些图片的本地副本。

## ByteDesk 标志

2026-09-08 为本站绘制的 SVG 几何标志：两片错位、斜切的窗口轮廓，主色 `#183758`、冰蓝 `#7ab6ed`。文件为 `public/brand/bytedesk-mark.svg`（单色）、`bytedesk-icon.svg`（方形）、`bytedesk-logo.svg`（横向字标），并同步至 `public/favicon.svg`。字标使用系统字体；标记本身为路径，无图片或字体文件依赖。
