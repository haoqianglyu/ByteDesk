# 评论管理

ByteDesk 使用 Waline。前端随博客构建；后端单独存放在私有仓库 [bytedesk-comments](https://github.com/haoqianglyu/bytedesk-comments)，由 [Vercel](https://vercel.com/bytedesk/bytedesk-comments) 部署，评论数据保存在 Neon Postgres。

## 访问入口

- 评论管理：<https://bytedesk-comments.vercel.app/ui>
- 首次管理员注册：<https://bytedesk-comments.vercel.app/ui/register>（第一个注册的账户成为管理员）
- 后端环境变量：<https://vercel.com/bytedesk/bytedesk-comments/settings/environment-variables>
- 数据库连接：<https://vercel.com/bytedesk/bytedesk-comments/stores>

## 访客体验

文章底部加载评论。昵称必填，邮箱选填，无需账号；也可以登录 Waline 账户。中英文页面使用各自语言的界面，共用同一组留言。评论内容不会自动翻译。

评论使用 `/zh/posts/<translationKey>/` 作为稳定标识，因此中英文文章共享评论，通知中的文章链接也可以正常访问。修改 `translationKey` 会产生新的评论区；文章发表后应保持此字段不变。

启用 `COMMENT_AUDIT=true` 后，访客评论需要管理员审核才会公开。邮箱不会展示给其他访客。前端不启用图片上传、表情搜索和浏览量统计。

## 邮件通知

在 Vercel 配置下列服务端环境变量，保存后重新部署：

| 变量 | 配置 |
| --- | --- |
| `SITE_NAME` | `ByteDesk` |
| `SITE_URL` | `https://haoqianglyu.com` |
| `COMMENT_AUDIT` | `true` |
| `AUTHOR_EMAIL` | 管理员接收新评论通知的邮箱 |
| `SMTP_SERVICE` | `Gmail`（使用 Gmail 发送时） |
| `SMTP_USER` | 发件 Gmail 地址 |
| `SMTP_PASS` | Gmail 应用专用密码，由账户所有者在 Vercel 中填写 |
| `SMTP_SECURE` | `true` |

邮件发送配置完成后，管理员收到新评论通知，填写邮箱的访客可收到回复通知。SMTP 配置不完整时，评论仍可保存在数据库中，但邮件不会送达。

数据库连接串、SMTP 密码都只放在 Vercel，不写进博客前端或 Git 仓库。详见 [Waline 通知文档](https://waline.js.org/guide/features/notification.html)。

## 更新与验证

`src/lib/comments.ts` 保存默认公开服务地址。需要替换服务时，可以在构建环境设置 `PUBLIC_WALINE_SERVER_URL`，然后重建博客。此地址不是密钥。

本地与线上默认连接同一评论数据库。验收时可以发布带有“测试”字样的留言，在后台确认待审核状态、审核后展示、双语页面共享以及删除功能，最后清理测试留言。

前端改动运行 `npm run verify` 后按照 [提交与发布流程](GIT_GUIDE.md)提交，由仓库所有者推送。后端仓库推送到 `main` 时由 Vercel 自动部署。修改后端环境变量或数据库连接后，需要在 Vercel 重新部署才能生效。
