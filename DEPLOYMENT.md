# Cloudflare 部署

预览地址：[中文](https://bytedesk.haoqianglyu.workers.dev/zh/) · [English](https://bytedesk.haoqianglyu.workers.dev/en/)。

本站使用 Workers Static Assets 托管 Astro 生成的 `dist` 目录，图片仍从现有 R2 地址加载。无需自有域名，也没有引入服务端渲染或数据库。配置见 `wrangler.jsonc`。

## 更新网站

在项目目录运行：

```sh
npm run deploy
```

这个命令会设置部署网址，执行类型检查、构建及测试，全部通过后才上传。检查失败会立即停止，不会上传。`npm run dev` 继续使用本地预览地址。

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

## 临时网址和正式域名

`*.workers.dev` 预览页带有 `noindex`，`robots.txt` 禁止抓取。它仍是任何拿到链接的人都能访问的公开网站；这些设置不提供访问控制。

申请正式域名后，将域名绑定到此 Worker，并在构建环境或本地 `.env` 中设置真实的 `SITE_URL` 后重新部署。部署脚本要求 HTTPS 地址；若 `.env` 仍写着本地 HTTP 地址，请更新或移除该项。正式自定义域名将按现有规则启用搜索收录，示例文章仍保持 `noindex`。

图片另设 R2 自定义域名后，再更新 `PUBLIC_IMAGE_BASE_URL` 并重新部署。更换站点域名不会自动改变图片域名。

路由使用与 Astro 一致的结尾斜杠；不存在的页面返回自定义 `404.html` 和 HTTP 404。

参考：[Astro 静态站部署](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)、[静态页面路由](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)。
