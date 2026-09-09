# ByteDesk 内容更新

## 本地开发

使用 Node.js 24.x 和 npm 11 或更新版本，与 `.nvmrc` 和 CI 保持一致。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，默认中文首页为 `http://127.0.0.1:4321/zh/`。Astro 7 会在后台运行开发服务，可用 `npx astro dev status` 查看状态、`npx astro dev logs` 查看日志、`npx astro dev stop` 停止。

```sh
npm run check
npm run build
npm test
```

可运行 `npm run verify` 一次完成类型检查、构建与测试。检查覆盖构建产物中的内部链接、文章锚点、双语路由、图片引用和 RSS，并根据 `SITE_URL` 验证本地预览或正式构建的搜索索引规则。CI 使用 `https://haoqianglyu.com` 作为正式网址；本地默认使用预览地址。测试不会逐张下载 R2 图片，新增素材还需打开链接核对。

主要交互和 320/390 像素窄屏已做浏览器检查，手机真机手势仍待验收。提交与发布流程见 [GIT_GUIDE.md](GIT_GUIDE.md)。

## 新建文章或图文日常

在 `src/content/posts/zh/` 下新增一个 `.md` 文件。例如 `my-first-note.md`。当前内容加载器只读取 `.md`，尚未接入 MDX：

```markdown
---
title: "我的第一篇记录"
description: "用一句话描述这篇内容。"
locale: "zh"
translationKey: "my-first-note"
category: "daily"
date: "2026-09-08"
tags: ["生活", "随记"]
cover: "daily/2026/2026-09-08-first-note/01.jpg"
coverAlt: "具体描述图片中能看到的内容"
minutes: 3
featured: false
draft: true
sample: false
---

## 今天想记下的事

正文写在这里。
```

- `category` 只能为 `pets`、`daily`、`travel`、`code`。
- `translationKey` 是稳定的文章地址标识，使用小写英文字母、数字和连字符。发布后尽量不改，否则旧链接会失效。
- `draft: true` 不会生成对应文章的公开页面，也不进入列表、搜索和 RSS；准备好后改为 `false`。公开仓库中的草稿源码仍可被读取，私人草稿应存放在仓库外。
- 封面可不填，页面会显示代码风格的占位封面；图片型内容建议填封面。
- 当前首页优先显示 `featured: true` 的最新文章；若都没设置，则使用最新一篇。
- `minutes` 是手动填写的预计阅读时间。
- `sample: true` 会显示示例标记并禁止文章被搜索引擎索引；正式内容改为 `false`。

## 在旅行地图上添加地点

将游记的 `category` 设为 `travel`，在 frontmatter 中加入地点字段。例如下面是现有布局示例，正式文章请填写实际地点：

```yaml
place:
  id: "dolomites"
  name: "多洛米蒂"
  region: "意大利"
  longitude: 12.1
  latitude: 46.5
```

同一地点的多篇游记使用相同 `id` 和坐标；中英文版本也保持相同 `id` 和坐标，只翻译 `name`、`region`。经度范围为 -180 至 180，纬度范围为 -85 至 85。不填 `place` 的游记仍出现在卡片列表。地图不需要 API Key，照片仍使用 R2 地址。

## 中英文

英文版本放在 `src/content/posts/en/`，设置 `locale: "en"`，并保留相同的 `translationKey`。其标题、描述、标签和正文分别写成英文。

两种语言共用照片地址。缺少翻译时会在目标语言页面明确提示，并展示原文与原文链接，不会自动翻译。`src/lib/i18n.ts` 负责界面文案。

## 图片与 R2

图片桶是 `bytedesk-images`，已有 `pets/`、`daily/`、`travel/`、`code/` 四个目录。按“分类 / 年份 / 日期与主题 / 文件名”上传。

三张示例图片已迁移到 bucket 根目录：`cat.jpg`、`coffee.jpg`、`lake.jpg`。未来新增图片按上面的分类目录上传。项目不再保存文章照片；SVG/Vue 界面图标仍随代码管理。

当前公开图片地址：`https://img.haoqianglyu.com`。默认地址记录在 `R2_IMAGES.json` 的 `publicBaseUrl`，也可以在 `.env` 或构建环境中覆盖：

```dotenv
PUBLIC_IMAGE_BASE_URL=https://img.haoqianglyu.com
```

封面 `cover` 写 R2 对象键，例如 `cat.jpg` 或 `pets/2026/2026-09-08-sunshine/01.jpg`，程序会拼接图片地址。也支持完整 HTTPS 地址。正文 Markdown 图片使用完整地址：

```markdown
![猫咪晒太阳](https://img.haoqianglyu.com/cat.jpg)
```

更新流程：先上传图片到 R2，确认图片链接可以打开，再在文章中引用。更换图片时使用新文件名，避免旧缓存。无需把照片复制进项目或提交到 Git。`R2_IMAGES.json` 中保存了示例图的大小与 SHA-256 校验记录。

新内容统一使用自定义图片域名。正文中直接写入的完整图片 URL 不会随 `PUBLIC_IMAGE_BASE_URL` 自动改变，更换图片域名时需要一并更新。R2 不会自动生成缩略图，自动处理流程尚未接入。

## 发布内容

网站已部署在 Cloudflare Workers，正式地址为 [haoqianglyu.com](https://haoqianglyu.com/zh/)，源码在 [GitHub](https://github.com/haoqianglyu/ByteDesk)。自动发布由仓库的 GitHub Actions 流程执行。

每次更新：

1. 新照片先上传 R2，并核对图片链接。
2. 编辑 `.md`，检查中英文关联、日期、分类和图片说明；正式发布的文章设置 `draft: false`、`sample: false`。
3. 本地预览后运行 `npm run verify`。当前 `tests/site.test.mjs` 仍依赖 6 篇示例、固定路由和示例索引规则，新增正式文章或移除示例时需同步调整这些断言，保留链接、双语和 SEO 检查。
4. 助手整理改动并完成 `git add`、`git commit`；仓库所有者检查提交后执行 `git push`。使用其他分支时，合并到 `main` 才会发布。
5. 在 [Actions](https://github.com/haoqianglyu/ByteDesk/actions/workflows/ci.yml) 确认 `verify` 和 `deploy` 均通过，再打开正式网站核对文章与图片。

CI 已设置正式 `SITE_URL`，构建时生成正式 canonical、RSS 和 sitemap 地址；示例文章依然保持 noindex。本地 `.env` 不会上传到 GitHub；需要影响线上构建的配置，应同步修改仓库配置或工作流。部署详情见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 实验室与项目

网站共有六个版块；原来的四类文章不变，新增独立的 `/zh/lab/` 与 `/zh/projects/`（英文对应 `/en/`）。侧边栏分为生活记录（宠物、日常、旅游）与创作空间（代码、实验室、项目）。Dock 保留桌面、日常、旅游、实验室、项目、关于六个常用入口，所有版块都能从侧边栏进入。

- `src/lib/showcase.ts` 管理作品标题、描述、标签、状态与详情地址，同时用于列表和全站搜索。中英文都在这里填写。
- 实验详情在 `src/pages/[locale]/lab/`，交互用独立 Vue 组件实现。`glass-playground.astro` / `GlassPlayground.vue` 可调整模糊、不透明度和颜色；`logo-study.astro` / `LogoStudy.vue` 提供 Three.js 立体标志实验。
- 项目详情在 `src/pages/[locale]/projects/`。目前展示已上架的爪记 Zoji，以及已上线、继续开发中的 ByteDesk。ByteDesk 详情页保留预览版与示例内容说明，并提供公开仓库链接。
- 新增作品时，同步补齐作品清单与双语详情页，sitemap 会从作品清单自动收录详情地址。文章和作品是两种内容：作品暂不进入文章 RSS。
- 新项目截图仍上传 R2，推荐对象键 `projects/项目名/文件名`；实验配图推荐 `lab/实验名/文件名`。不需要提前创建文件夹。实验室和 ByteDesk 预览使用 CSS/Vue 绘制，Zoji 使用 R2 上的真实上架素材。

### 更新 Zoji 展示

- `src/lib/zoji.ts` 维护应用双语标题、简介、商店地址、六张截图的名称与说明；中文固定中国区 `/cn/`，英文固定美国区 `/us/`。
- `src/pages/[locale]/projects/zoji.astro` 是详情页；`ZojiCard.astro` 同时用于项目页与关于页；`AppGallery.vue` 负责截图切换和大图查看。
- R2 对象位于 `projects/zoji/`：`icon.jpg`，以及 `zh-01-home.png` 到 `zh-06-health-record.png`、对应的 `en-` 六张截图。每套依次为档案、记录、提醒、家庭、医院、健康资料。
- 12 张截图保留原始 1320 × 2868 尺寸，图标为 512 × 512。全部 13 个文件共 9,680,503 字节，2026-09-08 已核对公开访问、图片类型及文件内容，并将 SHA-256 记录到 `R2_IMAGES.json`。
- 后续更新素材先上传 R2，建议使用带版本的新对象键，再更新 `zoji.ts` 引用。不要将图片复制到 `public/` 或 `src/`；原始上架素材留在开发者自己的素材目录。

## 窗口尺寸与自适应

拖住窗口任意边缘或四角即可缩放；标题栏用于移动，双击标题栏放大/还原。缩放边框也支持键盘方向键，Shift 加快调整。最小宽高和边界计算维护在 `src/lib/windowGeometry.ts`，窗口状态与拖拽维护在 `DesktopShell.vue`。尺寸和位置使用 sessionStorage，只影响当前标签页。

`window-resize.css` 为窗口和正文建立 `finder`、`content` 容器。新增作品布局优先使用 `@container content`，避免仅按浏览器宽度切换布局，导致手动缩小窗口后内容拥挤。窗口全屏或双击放大时隐藏拖拽边框；手机上保留原本的自然滚动布局。
