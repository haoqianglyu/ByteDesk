# 字节桌面 · ByteDesk

记录代码，也记录灵感。A home for code and ideas.

一个采用 macOS 桌面风格的个人博客，使用 Astro、Vue 3 和 TypeScript 构建。文章在构建时生成静态 HTML，窗口、地图和实验由 Vue 提供交互，照片与壁纸素材托管在 Cloudflare R2。

线上网站：[中文](https://haoqianglyu.com/zh/) · [English](https://haoqianglyu.com/en/)。网站部署到 Cloudflare Workers Static Assets，图片和壁纸通过 `img.haoqianglyu.com` 从 R2 加载。仓库附带 6 篇中英文示例文章，示例图片和旅行地点不代表作者的真实经历。

## 功能

- 可拖动、缩放、收起和全屏阅读的桌面窗口，支持手机布局。
- 中英文、浅色/深色/跟随系统、全站搜索、分类和标签。
- Markdown 文章、目录、代码高亮与复制、图片查看、RSS 和 sitemap。
- 旅行地图、地点聚合、同地点多篇游记、图片加载失败重试。
- 实验室、项目展示、Zoji 应用截图与交互式手机模型。
- 太阳系、地球日夜景和篝火动态壁纸，支持暂停与减少动态效果。

## 启动

使用 Node.js 24.x 和 npm 11 或更新版本。安装了 nvm 时可先执行 `nvm use`。

```sh
npm ci
npm run dev
```

打开终端显示的地址，默认入口为 [中文首页](http://127.0.0.1:4321/zh/) 和 [英文首页](http://127.0.0.1:4321/en/)。

```sh
npm run verify   # 类型检查、生产构建、测试
npm run preview  # 预览 dist，先运行 build
```

依赖版本由 `package-lock.json` 固定；`.npmrc` 使用 npm 官方下载源。当前文章使用 `.md` 文件，尚未接入 MDX。

## 部署

网站通过 GitHub Actions 自动检查、构建并部署到 Cloudflare Workers。配置与维护方式见 [部署说明](DEPLOYMENT.md)。

## 配置

需要自定义时复制 `.env.example` 为 `.env`：

| 变量 | 用途 |
| --- | --- |
| `SITE_URL` | 网站完整地址；默认是本地预览。正式构建设置真实 HTTPS 域名。 |
| `PUBLIC_IMAGE_BASE_URL` | 照片、应用截图与地球/篝火壁纸共用的公开图片地址。默认使用 `https://img.haoqianglyu.com`。 |

`PUBLIC_` 变量会出现在浏览器端，不能用于保存密钥。项目无需 R2 写入凭据即可本地构建；上传图片时单独管理凭据。本地 `.env`、`.dev.vars`、依赖、构建产物及运行缓存已加入 `.gitignore`。

以本地 HTTP/回环地址、`*.workers.dev` 或 `*.pages.dev` 作为 `SITE_URL` 构建时，不生成可索引页面；正式域名构建启用 canonical 与 robots。通过其他入口访问同一份正式构建时，canonical 仍指向正式域名。示例文章和缺少译文的回退页始终保持 noindex。

## 项目结构

```text
src/pages/          页面、双语路由、RSS、sitemap
src/components/     Vue 交互和页面组件
src/content/posts/  中英文 Markdown 文章
src/lib/            内容、地图、窗口和 Three.js 场景
src/data/           世界地图矢量数据
src/styles/         样式
public/             SVG 标志和 favicon
tests/             几何、路由、图片、SEO 等检查
```

## 文档

- [内容更新与图片管理](CONTENT_GUIDE.md)
- [Git 提交、发布流程与待改进事项](GIT_GUIDE.md)
- [Cloudflare 部署与网站更新](DEPLOYMENT.md)
- [设计与开发记录](docs/DEVELOPMENT.md)
- [示例素材来源](ASSETS.md)、[地图与壁纸素材说明](ASSET_CREDITS.md)
- [R2 素材清单](R2_IMAGES.json)、[篝火生成提示](CAMPFIRE_PROMPTS.md)

## 当前限制

真实内容和个人介绍仍待补充。网站和图片已使用自定义域名，大陆直连表现需要实测。图片尚未自动生成缩略图，Three.js 共享模块仍有体积提示；移动设备的耗电、帧率和真实触屏手势需要实机验收。

目前没有为项目代码选定开源许可证。第三方地图、照片及纹理的来源和授权说明见素材文档；不应将它们视为已由本项目重新授权。
