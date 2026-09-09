# 评论管理

ByteDesk 使用 Waline。前端随博客构建；后端单独存放在私有仓库 [bytedesk-comments](https://github.com/haoqianglyu/bytedesk-comments)，由 [Vercel](https://vercel.com/bytedesk/bytedesk-comments) 部署，评论数据保存在 Neon Postgres。

## 访问入口

- 评论管理：<https://comments.haoqianglyu.com/ui>
- 评论服务：<https://comments.haoqianglyu.com>
- 后端环境变量：<https://vercel.com/bytedesk/bytedesk-comments/settings/environment-variables>
- 数据库连接：<https://vercel.com/bytedesk/bytedesk-comments/stores>

管理员账户已创建，使用原来的 Waline 邮箱和密码登录即可；无需重新注册，也无需 GitHub 账户。切换到新域名后，浏览器可能需要重新登录。原来的 `bytedesk-comments.vercel.app` 地址仍连接同一个后端和数据库。

## 一条评论如何完成

1. 访客打开 Cloudflare 托管的文章页面，在评论区填写昵称和内容；邮箱可选。
2. 浏览器把留言发送到 `comments.haoqianglyu.com`，由 Vercel 上的 Waline 校验并写入 Neon 数据库。
3. 当前关闭发布前审核，正常的新留言保存后直接公开；Waline 通过 Gmail SMTP 给管理员发送新评论通知。
4. 中英文版本读取同一组评论。管理员收到通知后可回复或处理垃圾内容；自动反垃圾检查仍可能拦截可疑留言。
5. 管理员在后台或文章评论区回复。填写了有效邮箱的访客可收到回复通知；未填写邮箱的访客仍可回到文章查看回复。

评论保存在数据库中，审核、回复和删除直接通过后台处理，不需要提交 Git 或重新部署博客。发送邮件失败不会自动删除已保存的评论。

## 日常管理

| 要做什么 | 操作 |
| --- | --- |
| 查看新留言 | 登录管理后台，在“已通过”列表查看；普通新评论无需手动审核 |
| 处理待审核留言 | 历史待审核内容不会因关闭审核自动公开；在“待审核”列表中按需点击“通过” |
| 回复留言 | 找到对应评论，点击“回复”；使用管理员账户可以识别作者身份 |
| 处理广告或垃圾内容 | 标记为“垃圾”；确认确实不需要的内容再删除 |
| 修改留言 | 使用评论的“编辑”操作，保存后检查展示结果 |
| 备份评论 | 在“导入 / 导出”中导出数据，保存在私人位置；迁移或批量操作前先备份 |
| 修改管理员资料 | 通过右上角账户入口修改昵称、邮箱等资料 |
| 排查通知未收到 | 先检查收件箱与垃圾邮件，再检查 Vercel 运行日志和 SMTP 环境变量；更新变量后重新部署 |

导出文件可能包含访客邮箱等非公开信息，不应提交到公开 Git 仓库。日常评论管理使用 Waline 后台即可，Neon 控制台主要用于数据库维护与排障。

## 自定义域名

Vercel 项目把 `comments.haoqianglyu.com` 连接到 Production。Cloudflare DNS 使用以下记录：

| 类型 | 名称 | 目标 | 代理 | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `comments` | `3965ae578e17da4d.vercel-dns-017.com` | DNS only | Auto |

HTTPS 证书由 Vercel 管理。DNS 仍在 Cloudflare，评论后端仍在 Vercel。以后迁移托管平台时，可以保留这个子域名，按新平台要求调整 DNS，并迁移评论数据。新的 CNAME 目标始终以 Vercel Domains 页面实际提供的值为准。

## 访客体验

文章底部加载评论。昵称必填，邮箱选填，无需账号；也可以登录 Waline 账户。中英文页面使用各自语言的界面，共用同一组留言。评论内容不会自动翻译。

评论使用 `/zh/posts/<translationKey>/` 作为稳定标识，因此中英文文章共享评论，通知中的文章链接也可以正常访问。修改 `translationKey` 会产生新的评论区；文章发表后应保持此字段不变。

当前使用 `COMMENT_AUDIT=false`，正常的新评论提交后直接显示。邮箱不会展示给其他访客。前端不启用图片上传、表情搜索和浏览量统计。

## 发布审核开关

这个开关位于 [Vercel → bytedesk-comments → Environment Variables](https://vercel.com/bytedesk/bytedesk-comments/settings/environment-variables)，变量名为 `COMMENT_AUDIT`。Waline 管理后台用于处理具体留言；发布前审核规则通过这个服务端环境变量设置。

| 值 | 新评论的默认行为 |
| --- | --- |
| `false`（当前设置，也是未配置时的默认值） | 正常留言保存后直接公开 |
| `true` | 先进入“待审核”，管理员通过后才公开 |

修改步骤：搜索 `COMMENT_AUDIT` → 行右侧 **⋯ → Edit** → 在 **Value** 填入 `true` 或 `false` → **Save → Redeploy**，选择 **Production**。新部署显示 **Ready** 后，再提交留言验证。详见 [Waline 服务端环境变量](https://waline.js.org/reference/server/env.html)。

当前项目中的这个变量以 **Secret** 类型保存，因此重新打开编辑界面时，**Value 会留空，不回显已保存的值**。不能据此判断变量未配置或值为空；需要更改时输入完整的新值，不修改时点击 **Cancel**。普通开关在新建时可使用 **Config** 类型便于查看，数据库密码和 `SMTP_PASS` 等凭据应使用 **Secret**。

恢复发布前审核时，也需要在 `src/components/ArticleComments.vue` 中补回中英文审核提示，并发布博客前端。关闭审核只影响新评论的默认状态，已有留言仍可在后台逐条管理。

## 邮件通知

在 Vercel 配置下列服务端环境变量，保存后重新部署：

| 变量 | 配置 |
| --- | --- |
| `SITE_NAME` | `ByteDesk` |
| `SITE_URL` | `https://haoqianglyu.com` |
| `COMMENT_AUDIT` | `false`（正常的新评论直接公开） |
| `AUTHOR_EMAIL` | 管理员接收新评论通知的邮箱 |
| `SMTP_SERVICE` | `Gmail`（使用 Gmail 发送时） |
| `SMTP_USER` | 发件 Gmail 地址 |
| `SMTP_PASS` | Gmail 应用专用密码，由账户所有者在 Vercel 中填写 |
| `SMTP_SECURE` | `true` |

邮件发送配置完成后，管理员收到新评论通知，填写邮箱的访客可收到回复通知。SMTP 配置不完整时，评论仍可保存在数据库中，但邮件不会送达。

数据库连接串、SMTP 密码都只放在 Vercel，不写进博客前端或 Git 仓库。详见 [Waline 通知文档](https://waline.js.org/guide/features/notification.html)。

## 更新与验证

`src/lib/comments.ts` 保存默认公开服务地址。需要替换服务时，可以在构建环境设置 `PUBLIC_WALINE_SERVER_URL`，然后重建博客。此地址不是密钥。

本地与线上默认连接同一评论数据库。验收时可以发布带有“测试”字样的留言，确认无需人工审核即可公开、中英文页面共享以及后台管理功能，最后清理测试留言。

前端改动运行 `npm run verify` 后按照 [提交与发布流程](GIT_GUIDE.md)提交，由仓库所有者推送。后端仓库推送到 `main` 时由 Vercel 自动部署。修改后端环境变量或数据库连接后，需要在 Vercel 重新部署才能生效。

2026-09-09 已验证：评论子域名与管理后台通过 HTTPS 访问，游客测试留言提交后返回 `approved` 并可从公开接口读取，邮件发送测试获得 Gmail 的 `250 OK` 响应。中英文评论提示已移除“审核后显示”，对应代码通过类型检查、38 页构建和 19 项测试。后续配置变化应重新检查对应行为。
