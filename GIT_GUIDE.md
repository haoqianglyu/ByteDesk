# ByteDesk 提交与发布

公开仓库：[haoqianglyu/ByteDesk](https://github.com/haoqianglyu/ByteDesk)。网站已在 [haoqianglyu.com](https://haoqianglyu.com/zh/) 上线，使用 Cloudflare Workers；GitHub Actions CI/CD 已启用。

**发布路径：推送或合并到 `main` → CI 检查 → 自动部署 Workers → 线上页面检查。** 本地保存文件和 `git commit` 都不会更新线上网站，最终 push 才会触发流程。

## 日常协作分工

助手负责修改、检查、`git add` 和 `git commit`，并报告提交摘要、检查结果、所在分支与提交编号。仓库所有者负责最终 `git push`。助手完成 commit 后停止，不自行推送、合并 PR 或执行手动部署。

### 助手准备本地提交

先查看当前分支和改动，核对提交范围，再运行与改动相称的检查。代码或文章改动运行 `npm run verify`；仅维护文档时检查内容、命令与链接。

```sh
git status --short --branch
git diff
npm run verify
git add README.md CONTENT_GUIDE.md
git diff --cached
git commit -m "Describe the change"
```

上面的文件名仅为示例，暂存时改为本次实际修改的文件。只提交本次已检查的改动；`.env`、令牌、依赖、构建产物与私人草稿不进入仓库。

### 仓库所有者最终推送

助手确认在 `main` 完成提交后，可先查看待发布内容：

```sh
git status --short --branch
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```

确认后执行：

```sh
git push
```

本项目的本地 `main` 已跟踪 `origin/main`，因此可直接使用 `git push`。如果 Git 提示远端已有更新，先同步并处理冲突，再继续发布，不要强推覆盖远端。

### 确认网站已更新

1. 打开 [Actions → CI / CD](https://github.com/haoqianglyu/ByteDesk/actions/workflows/ci.yml)，确认最新运行的提交编号与本次提交一致。
2. 等待 `verify` 和 `deploy` 均通过。检查失败会停止发布；若只有发布后的 HTTP 检查失败，新版本可能已经上线，需要查看部署日志。
3. 打开 [中文首页](https://haoqianglyu.com/zh/) 或 [英文首页](https://haoqianglyu.com/en/)，核对实际改动；页面已打开时可用 macOS 的 `⌘⇧R` 强制刷新。

日常更新无需再运行 `npm run deploy`。图片先单独上传 R2，Git 保存图片引用及来源说明。CD 的暂停开关、凭据维护、失败重试与回退见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 使用分支和 PR

较大改动可以在功能分支上完成：

```sh
git switch -c feature/your-change
```

助手检查并 commit 后，由仓库所有者执行首次推送：

```sh
git push -u origin feature/your-change
```

将示例分支名替换为实际名称，再在 GitHub 创建 PR。单独推送功能分支不会触发当前工作流；创建或更新 PR 后运行 CI，PR 阶段不部署。仓库所有者确认并合并到 `main` 后，主分支流程才会自动上线。

## 新电脑继续开发

直接克隆现有仓库：

```sh
git clone https://github.com/haoqianglyu/ByteDesk.git
cd ByteDesk
npm ci
npm run dev
```

使用 Node.js 24.x 和 npm 11 或更新版本。提交前设置自己的公开显示名及 GitHub noreply 邮箱，推送前配置与远端 URL 对应的认证：上面的 HTTPS 地址需要 GitHub 凭据；使用 SSH 密钥时将远端改为仓库的 SSH 地址。流程参考 [GitHub 官方说明](https://docs.github.com/en/get-started/git-basics/about-remote-repositories)。运行已有 CD 无需在新电脑复制 Cloudflare Token，它保存在 GitHub 的 `production` 环境 Secret 中。

## 公开内容与待改进事项

仓库尚未选定代码许可证；素材授权见 [ASSETS.md](ASSETS.md) 和 [ASSET_CREDITS.md](ASSET_CREDITS.md)。`draft: true` 只影响网站构建，公开仓库中的 Markdown 源码仍可被读取，私人草稿应存到仓库外。

| 优先级 | 事项 | 说明 |
| --- | --- | --- |
| 内容维护 | 填写个人介绍和真实文章，处理示例标记 | 写作与发布步骤见 [CONTENT_GUIDE.md](CONTENT_GUIDE.md) |
| 内容维护 | 内容测试与示例数据解耦 | 当前断言依赖固定的 6 篇文章、示例路由和索引规则，增删文章时需同步调整 |
| 体验验收 | 手机真机手势、Safari、低性能设备和弱网检查 | 当前主要验证桌面浏览器与模拟尺寸 |
| 性能优化 | 动态壁纸加载、GPU 与电量开销 | Three.js 仍有大型共享模块提示 |
| 性能优化 | 图片缩略图、响应式图片和更多页面的断图状态 | 当前保留原图，旅行页面已有失败重试 |
| 展示优化 | 分享卡片的 og:image、og:url 和文章类型 | 当前只有基本标题和摘要 |
| 定期维护 | 部署凭据有效期与 Actions 发布结果 | 当前网站和 R2 已接入自定义域名，令牌到期信息见部署说明 |

## 已验证记录

2026-09-09 的 [CI/CD 运行](https://github.com/haoqianglyu/ByteDesk/actions/runs/34302195318) 已完成类型检查、38 页构建、19 项测试、Wrangler 部署及线上页面检查。后续每次发布仍以对应提交的 Actions 结果为准。
