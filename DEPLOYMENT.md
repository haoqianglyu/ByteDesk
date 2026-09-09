# Cloudflare 部署

网站地址：[中文](https://haoqianglyu.com/zh/) · [English](https://haoqianglyu.com/en/)。

本站使用 Workers Static Assets 托管 Astro 生成的 `dist` 目录，图片、项目截图和壁纸从 `https://img.haoqianglyu.com` 对应的 R2 桶 `bytedesk-images` 加载。没有引入服务端渲染或数据库。配置见 `wrangler.jsonc`。

## 更新网站

在项目目录运行：

```sh
npm run deploy
```

这个命令默认使用 `https://haoqianglyu.com`，执行类型检查、构建及测试，全部通过后才上传。检查失败会立即停止，不会上传。`npm run dev` 继续使用本地预览地址。

首次在另一台电脑部署，先执行 `npm ci`，再用项目自带的 Wrangler 登录：

```sh
npm exec -- wrangler login --scopes account:read user:read workers_scripts:write
```

登录信息由 Wrangler 保存在本机，不应复制进仓库。`wrangler.jsonc` 指定了本项目所属账号；如果复制项目到自己的账号，请修改 `account_id`、Worker 名称和 `scripts/deploy.mjs` 中的默认网址。

只检查部署包，不上传：

```sh
npm run deploy -- --dry-run
```

GitHub CI 会验证代码、构建和部署配置。当前推送 GitHub **不会自动更新线上网站**；上线需运行 `npm run deploy`。后续可再连接自动部署。

## 域名和图片配置

Cloudflare 控制台中，Worker `bytedesk` 已连接 `haoqianglyu.com` 和 `www.haoqianglyu.com`。这些域名绑定由控制台管理，`wrangler.jsonc` 有意不设置 `routes`，日常部署会保留绑定；不要随意改为其他 Worker 的域名配置。

域名的 Redirect Rule `ByteDesk www to canonical domain` 精确匹配 `http.host eq "www.haoqianglyu.com"`，以 HTTP 301 跳转到 `https://haoqianglyu.com`，保留原路径和查询参数。该规则由 Cloudflare 控制台管理。

部署脚本要求 `SITE_URL` 为 HTTPS 地址；若 `.env` 仍写着本地 HTTP 地址，请更新或移除该项。正式构建的 canonical、RSS 与 sitemap 使用 `https://haoqianglyu.com`；示例文章仍保持 `noindex`。

R2 自定义域名 `img.haoqianglyu.com` 连接到现有公开图片桶。`R2_IMAGES.json` 和 `.env.example` 使用该地址。原 R2 开发地址仍保留，旧链接可继续使用。更换图片域名后必须同步 `PUBLIC_IMAGE_BASE_URL` 或清单中的默认地址并重新构建，域名绑定本身不会改写页面内的链接。

Workers 默认地址继续可用，提供同一份正式构建，其 canonical 指向主域名。如果使用 `*.workers.dev`、`*.pages.dev` 或本地地址作为 `SITE_URL` 单独构建预览包，则自动禁止搜索收录。`noindex` 不提供访问控制。

Pages 对比测试尚未部署；新域名目前连接的是原有 Workers 网站。自定义域名是否改善大陆直连，需要用大陆网络关闭代理后实测。

路由使用与 Astro 一致的结尾斜杠；不存在的页面返回自定义 `404.html` 和 HTTP 404。

参考：[Astro 静态站部署](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)、[静态页面路由](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)。
