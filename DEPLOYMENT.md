# Cloudflare 部署

网站地址：[中文](https://haoqianglyu.com/zh/) · [English](https://haoqianglyu.com/en/)。

本站使用 Workers Static Assets 托管 Astro 生成的 `dist` 目录，图片、项目截图和壁纸从 `https://img.haoqianglyu.com` 对应的 R2 桶 `bytedesk-images` 加载。没有引入服务端渲染或数据库。配置见 `wrangler.jsonc`。

## 更新网站

日常修改提交到 GitHub，合并或推送到 `main` 后，Actions 的 **CI / CD** 流程按顺序执行：

1. 安装锁文件中的依赖，使用 `https://haoqianglyu.com` 构建，运行类型检查、测试和 Wrangler 部署预演。
2. 保存已检查的 `dist`，由 `deploy` 下载同一次运行的产物，部署到 Worker `bytedesk`，无需再次构建。
3. 检查线上中文首页、英文首页和 sitemap 能否访问。Workers 版本说明记录对应的 Git commit SHA。

只有本仓库 `main` 的推送或手动运行能够部署；PR 只检查。正在运行的 main 流程会执行完，新提交等待；PR 的过时检查会取消。构建产物保留 7 天，超过期限需要重新运行整个流程。

### 首次启用自动部署

本仓库已于 2026-09-09 启用 CD：`production` 环境只允许 `main` 分支，部署令牌保存在环境 Secret `CLOUDFLARE_API_TOKEN`，仓库变量 `CLOUDFLARE_CD_ENABLED=true`。Cloudflare 账号令牌名称为 `ByteDesk GitHub Actions`，仅包含 Workers Scripts 编辑权限，到期时间为 **2027-09-09 23:59:59 UTC**（北京时间 2027-09-10 07:59:59）。到期前更换令牌并更新该 Secret。

自动部署默认关闭，需要仓库管理员完成以下配置：

1. 在 Cloudflare 创建专用 API Token，例如 `ByteDesk GitHub Actions`。将账号范围限制为 `wrangler.jsonc` 中的账号，权限使用 **Account → Workers Scripts → Edit**。该权限覆盖指定账号的 Workers，并非仅限一个 Worker；本流程不需要 DNS、R2 或 VPN 权限。设置合理有效期，到期前更换。
2. GitHub 仓库 **Settings → Environments** 创建 `production`，将允许部署的分支限定为 `main`；在这个环境的 Secrets 中添加 `CLOUDFLARE_API_TOKEN`。密钥只会传给部署步骤，不写入源码或构建产物。
3. 在 **Settings → Secrets and variables → Actions → Variables** 添加仓库变量 `CLOUDFLARE_CD_ENABLED`，值设为 `true`。账号 ID 已在 `wrangler.jsonc` 中固定，无需另存密钥。
4. 打开 [Actions](https://github.com/haoqianglyu/ByteDesk/actions/workflows/ci.yml)，选择 **Run workflow → main**。确认 `verify` 和 `deploy` 均通过，再访问网站。

开关未设置或不是 `true` 时，CI 照常运行，`deploy` 显示 skipped。复制或 fork 本项目时，还需要修改工作流中的仓库限制、正式网址及 Wrangler 配置，再配置自己账号的凭据。

### 失败、暂停和回退

- `verify` 失败：不会执行部署，修复后重新推送。
- `deploy` 失败：查看 Actions 对应步骤的错误。若仅上线后的 HTTP 检查失败，新版本可能已经发布，需要结合 Workers 的部署记录确认。
- 暂停发布：将仓库变量 `CLOUDFLARE_CD_ENABLED` 改为 `false`。该开关影响后续运行，不能中止已经开始的部署。
- 回退：优先用 `git revert <有问题的提交>` 生成回退提交并推送 `main`，CI 通过后自动发布。不要强推改写 main 历史。
- 凭据到期或撤销：更换 `production` 环境中的 Secret，随后重新运行流程。不要将本机 Wrangler 登录文件上传到 GitHub。

### 从本机部署

需要手动发布时，在项目目录运行：

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

自动部署不会上传图片或改变 R2 桶、域名 DNS、VPN 配置。新增素材仍按 [内容更新说明](CONTENT_GUIDE.md) 单独上传。

## 域名和图片配置

Cloudflare 控制台中，Worker `bytedesk` 已连接 `haoqianglyu.com` 和 `www.haoqianglyu.com`。这些域名绑定由控制台管理，`wrangler.jsonc` 有意不设置 `routes`，日常部署会保留绑定；不要随意改为其他 Worker 的域名配置。

域名的 Redirect Rule `ByteDesk www to canonical domain` 精确匹配 `http.host eq "www.haoqianglyu.com"`，以 HTTP 301 跳转到 `https://haoqianglyu.com`，保留原路径和查询参数。该规则由 Cloudflare 控制台管理。

部署脚本要求 `SITE_URL` 为 HTTPS 地址；若 `.env` 仍写着本地 HTTP 地址，请更新或移除该项。正式构建的 canonical、RSS 与 sitemap 使用 `https://haoqianglyu.com`；示例文章仍保持 `noindex`。

R2 自定义域名 `img.haoqianglyu.com` 连接到现有公开图片桶。`R2_IMAGES.json` 和 `.env.example` 使用该地址。原 R2 开发地址仍保留，旧链接可继续使用。更换图片域名后必须同步 `PUBLIC_IMAGE_BASE_URL` 或清单中的默认地址并重新构建，域名绑定本身不会改写页面内的链接。

Workers 默认地址继续可用，提供同一份正式构建，其 canonical 指向主域名。如果使用 `*.workers.dev`、`*.pages.dev` 或本地地址作为 `SITE_URL` 单独构建预览包，则自动禁止搜索收录。`noindex` 不提供访问控制。

Pages 对比测试尚未部署；新域名目前连接的是原有 Workers 网站。自定义域名是否改善大陆直连，需要用大陆网络关闭代理后实测。

路由使用与 Astro 一致的结尾斜杠；不存在的页面返回自定义 `404.html` 和 HTTP 404。

参考：[Astro 静态站部署](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)、[GitHub Actions 部署](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)、[静态页面路由](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)。
