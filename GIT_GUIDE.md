# ByteDesk 上传 GitHub

公开仓库：[haoqianglyu/ByteDesk](https://github.com/haoqianglyu/ByteDesk)。本文保留首次上传与日常更新的操作说明；仓库已经初始化或关联远端时，跳过对应的初始化步骤。网站部署在 Cloudflare Workers。配置凭据并启用 CD 后，推送 main 会先检查，再自动部署；首次配置见 [部署说明](DEPLOYMENT.md)。

## 已完成的准备

- `.gitignore` 排除依赖、构建产物、Astro/Cloudflare 缓存、环境配置和本机文件。
- `.nvmrc` 与 `package.json` 约定 Node.js 24，锁文件统一使用 npm 官方源，保留依赖版本和完整性校验值。
- `.github/workflows/ci.yml` 使用只读仓库权限，执行安装、类型检查、构建与测试；启用 CD 后，main 自动部署同一份已验证产物。
- 图片域名统一配置；本地预览与正式构建的搜索索引规则共用一处判断。
- README 已整理，历史实现记录保留在 `docs/DEVELOPMENT.md`，移除了本机路径、任务 ID 和工具连接状态。

## 公开前确认

1. 选择仓库名称，例如 `ByteDesk`，并确认 GitHub 账户。
2. 决定是否为自己的代码添加开源许可证。公开仓库不等于授予任意复用权；选好后再添加 `LICENSE`。照片、地图、商标和应用素材按各自说明处理，参考 [GitHub 许可证说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)。
3. 公开仓库中的 Markdown 和资源清单都能被读取，包括 `draft: true` 的文章源码。`draft` 只控制网站构建，不隐藏 Git 文件。未来私人草稿请存到仓库外。
4. 提交作者使用希望公开的名称和邮箱；如需隐藏真实邮箱，在 GitHub 的 Settings → Emails 获取自己的 noreply 地址。

## 第一次上传

在 [GitHub 新建仓库](https://github.com/new) 页面选择 Public。创建空仓库，不勾选自动添加 README、.gitignore 或许可证，以免与本地内容冲突。创建后复制仓库的 HTTPS 地址。

在项目目录执行以下命令，名称、邮箱和仓库地址须替换为自己的实际值：

```sh
git init -b main
git config user.name "你的公开显示名"
git config user.email "你的 GitHub noreply 邮箱"
npm run verify
git add .
git status --short
git diff --cached --stat
git diff --cached
```

确认暂存文件中没有 `.env`、`.dev.vars`、密钥、私人草稿、`node_modules` 或 `dist`。再提交并关联仓库：

```sh
git commit -m "Initial commit: ByteDesk blog"
git remote add origin https://github.com/YOUR_USERNAME/ByteDesk.git
git remote -v
git push -u origin main
```

推送前需要完成 GitHub 认证。可使用 GitHub Desktop 登录，或安装并登录 GitHub CLI 后执行 `gh auth setup-git`；不要把令牌写进仓库地址。当前检查到本机有 Git，命令行 PATH 中未找到 `gh`。流程依据 [GitHub 官方上传说明](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)。

推送成功后，打开仓库 Actions 页确认 `verify` 通过；启用 CD 后还需要确认 `deploy` 通过。检查 README、文件清单和公开内容是否符合预期；首次部署后打开网站确认效果。

## 日常更新

```sh
git switch -c feature/your-change
# 编辑代码或文章
npm run verify
git add 需要提交的文件
git diff --cached
git commit -m "Describe the change"
git push -u origin feature/your-change
```

在 GitHub 提交 PR，CI 通过后合并到 main。启用 CD 后，main 检查通过会自动更新 `https://haoqianglyu.com`，在 Actions 查看结果。图片依然单独上传 R2，Git 只保存公开图片引用及来源说明。

## 后续改进与上线

| 优先级 | 事项 | 原因 |
| --- | --- | --- |
| 正式上线前 | 填写个人介绍和真实文章，处理示例标记 | 当前仍以演示内容为主 |
| 后续维护 | 部署凭据有效期与 Actions 发布结果 | 网站和 R2 已接入自定义域名；CD 需要有效凭据及启用开关 |
| 正式上线前 | 手机真机手势、Safari、低性能设备和弱网检查 | 当前主要验证桌面浏览器与模拟尺寸 |
| 后续优化 | 默认动态壁纸的加载、GPU 与电量开销 | Three.js 有大型共享模块，适合单独性能审计 |
| 后续优化 | 图片缩略图、响应式图片和更多页面的断图状态 | 目前原图较大，旅行页面已经有失败重试 |
| 后续优化 | 分享卡片的 og:image、og:url 和文章类型 | 当前只有基本标题和摘要 |
| 后续维护 | 内容测试与示例数据解耦，补充关键交互回归测试 | 现有部分检查依赖示例文章和固定 RSS 数量，替换内容时需同步更新 |

2026-09-08 本地检查与全新临时副本均通过类型检查、38 页构建和 18 项测试；全新副本从 npm 官方源执行 `npm ci`，并用测试站点域名和图片域名验证正式构建。对上传范围进行了常见密钥格式扫描，未发现匹配；npm 官方依赖审计返回 0 个已知漏洞。这些结果仅代表本次检查，并不覆盖所有可能的敏感内容或未来依赖风险。
