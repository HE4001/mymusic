# 部署与维护

本文说明如何把云端音乐交给 Cloudflare Pages 和私有 Backblaze B2。它只覆盖部署配置与运维动作，不创建音频代理、数据库、上传后台或新的 Worker。当前交付只包含可部署代码和配置示例，不需要云账号；没有连接真实 B2、Cloudflare Access 或 Pages，下面的域名、bucket、密钥和 Access audience 都必须由部署者填写并自行验收。

## 1. 准备私有 B2

创建或确认一个私有 B2 bucket，上传 2～3 首自有测试音频，并记录每个对象的完整 key。建议使用 `music/artist/album/file.mp3` 这样的路径；`objectKey` 中的中文、空格和 `#`、`?`、`%` 等字符必须作为对象名保留，清单和签名代码会按路径段编码。

为运行时创建范围受限的 application key，只授予目标 bucket 或目录的只读能力。运行时 key 不需要上传、删除、列举 bucket 或管理 CORS 的权限。上传、整理和 CORS 管理由独立的管理凭据完成，避免把管理密钥放进 Pages Functions。

编辑 [`server/library.json`](../server/library.json) 后再构建。每个条目必须有稳定唯一的 `id`、`title`、`objectKey`，并使用合法的 `artist`、`album`、`mimeType` 和 `duration`；`duration` 可以为 `null`。`objectKey` 只能是允许的 `music/` 路径，不能是任意 URL，也不能包含反斜杠、空段、`.`、`..` 或控制字符。上传、改名或删除对象后都要同步更新清单。

## 2. 创建 Pages 项目并构建

本地构建需要 Node.js `>=22.12.0`。在 Cloudflare Pages 创建项目 `cloud-music`，选择 Git 集成或使用 Wrangler 从项目根目录发布。构建配置使用：

| 配置 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 项目根目录 | 仓库根目录 |

根目录的 `functions/` 由 Pages Functions 处理 API；它与前端构建一起发布。手工发布时在项目根目录执行：

```powershell
npm ci
npm run check
npm run build
npx wrangler pages deploy dist --project-name cloud-music
```

仓库已有 lockfile 时使用 `npm ci`；需要更新依赖时才使用 `npm install`。现有 `build` 脚本依次执行清单校验、Vite 构建和 `wrangler pages functions build functions --outdir .build/functions`，所以 `.build/functions/` 是本地 Functions 编译输出；构建后应确认该目录已生成。这些构建步骤不需要云账号。`preview:pages` 当前运行 `wrangler pages dev dist`，用于预览 Pages 构建产物。不要使用普通 Worker 的 `wrangler deploy`，本项目没有 Worker `main` 入口。Dashboard 的静态拖拽上传不能替代根目录 Functions 的编译和发布；需要 Functions 时使用 Git 集成或 Wrangler Pages 发布。发布前应确认清单校验、Vite 构建和 Functions 构建成功。

首次使用 Wrangler 直接上传时，先登录并创建 Pages 项目：

```powershell
npx wrangler login
npx wrangler pages project create cloud-music
```

如果项目已经由 Dashboard 创建，跳过 `pages project create`。创建或确认项目后，先在 `wrangler.jsonc` 中填写四个普通变量：`B2_ENDPOINT`、`B2_REGION`、`ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`，并为 Preview 在 `env.preview.vars` 中填写对应的独立值。`B2_BUCKET`、`B2_KEY_ID`、`B2_APPLICATION_KEY` 都是 Pages Secrets，不写入 `vars`。Cloudflare 的 Pages CLI 使用 `pages secret put`；生产和 Preview 只支持这两个环境，下面显式指定环境，生产也可以省略 `--env production`（默认就是 production）：

```powershell
# Production
npx wrangler pages secret put B2_BUCKET --project-name cloud-music --env production
npx wrangler pages secret put B2_KEY_ID --project-name cloud-music --env production
npx wrangler pages secret put B2_APPLICATION_KEY --project-name cloud-music --env production

# Preview（使用独立的测试桶和只读密钥）
npx wrangler pages secret put B2_BUCKET --project-name cloud-music --env preview
npx wrangler pages secret put B2_KEY_ID --project-name cloud-music --env preview
npx wrangler pages secret put B2_APPLICATION_KEY --project-name cloud-music --env preview
```

每条命令都会提示输入对应值；不要把真实值写进命令、仓库或聊天。先设置 Pages Secrets，再创建使用它们的部署；修改 Wrangler 文件中的普通变量要改文件并创建新部署。不要在 Dashboard 中尝试编辑 Wrangler 文件已经声明的普通变量。这里使用的是 Pages 专用命令，不是普通 Worker 的 `wrangler secret put`。参见 [Cloudflare Pages Wrangler 命令](https://developers.cloudflare.com/workers/wrangler/commands/pages/) 和 [Pages Functions Wrangler 配置](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)。

Wrangler 配置见 [`../wrangler.jsonc`](../wrangler.jsonc)，声明 Pages 输出目录、兼容日期和环境变量占位值，不包含真实密钥、KV、D1、R2、Sites 或独立 Worker。

## 3. 配置七个运行时字段

本项目使用带 `pages_build_output_dir` 的 Wrangler 文件，因此按 [Cloudflare Pages Functions Wrangler 配置说明](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) 将该文件视为 Pages 项目配置的 source of truth。四个普通变量统一写在 [`../wrangler.jsonc`](../wrangler.jsonc)：生产和本地使用顶层 `vars`，Preview 使用单独完整的 `env.preview.vars`，不会继承生产占位值。`B2_BUCKET` 不属于 `vars`，与两个 B2 key 一样按 Pages Secret 配置。部署后，Wrangler 文件声明的普通变量不能再从 Dashboard 编辑；修改普通变量要改文件并创建新部署。

三个 B2 Secret 不写入 `vars`，只通过 Pages Secrets 或 `wrangler pages secret put` 管理。`.dev.vars.example` 仍提供本地开发时的占位示例，不是生产配置；真实 `.dev.vars` 只在本地 Pages Functions 开发时使用，不会部署，也不提交到 Git。所有占位值都会让后端安全失败，部署者必须在交付前替换为实际配置。Cloudflare 对 Pages Secret 的说明见 [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)。

| 名称 | 配置来源 | 填写内容 |
| --- | --- | --- |
| `B2_ENDPOINT` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | 与 bucket 匹配的 HTTPS S3 endpoint，例如 `https://s3.YOUR-REGION.backblazeb2.com` |
| `B2_REGION` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | B2 region，例如 `YOUR-REGION`，须与 endpoint 一致 |
| `B2_BUCKET` | Pages Secret / `wrangler pages secret put` | 实际私有 bucket 名称；按本项目策略作为 Secret 管理 |
| `B2_KEY_ID` | Pages Secret / `wrangler pages secret put` | 只读 application key ID |
| `B2_APPLICATION_KEY` | Pages Secret / `wrangler pages secret put` | 对应的只读 application key |
| `ACCESS_TEAM_DOMAIN` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | Access 团队域名，例如 `https://your-team.cloudflareaccess.com` |
| `ACCESS_AUD` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | 当前 Access 应用的 audience |

Production 和 Preview 应使用各自的 B2 endpoint、region、Access 普通变量和三项 Secrets。不要为 Preview 复制生产密钥而跳过测试隔离；没有 Preview 测试桶时，可先只验证构建和鉴权拒绝路径。

短期票据测试变量 `B2_URL_TTL_SECONDS` 只能用于非生产验收，合法范围为 `60`～`3600` 秒，由后端负责校验；不能只修改前端的 `expiresAt` 来伪造过期。生产省略该变量，使用服务端默认 TTL。

## 4. 配置 Cloudflare Access

为以下入口配置同一套邮箱白名单或等价的 Access policy：

- 正式自定义域名，例如 `https://music.example.com`；
- 生产默认域名，例如 `https://cloud-music.pages.dev`；
- 需要验收的 Preview 部署域名。

Pages 的预览保护不会自动覆盖正式自定义域名，因此要分别核对这些 hostname。Access 负责浏览器入口，但 Functions 仍会验证 `Cf-Access-Jwt-Assertion` 的签名、issuer、audience 和有效期；缺少配置、缺少 JWT 或 JWT 无效时，后端必须拒绝请求，不能因为某个邮箱 header 存在就放行。不要在生产启用“无 JWT 则进入演示模式”的绕过。

发布后先用未授权浏览器验证 `/api/library` 和 `/api/play-url` 不能得到业务数据，再用白名单邮箱重新登录，确认授权请求能返回曲库。Access 登录页、失效会话和错误 HTML 不能被前端误当成成功 JSON。

## 5. 配置 B2 CORS

[`../b2-cors.example.json`](../b2-cors.example.json) 是 S3 `PutBucketCors` / AWS CLI 格式，不是 B2 Native API 的 `corsRules` 格式。将 `AllowedOrigins` 替换为真实生产来源；本地联调时只临时加入准确的 `http://localhost:端口`，不要放开全部 `*.pages.dev`。

更新 CORS 前先读取当前 bucket 的规则，把播放器需要的规则与其他应用规则合并后再提交；不要直接用示例文件覆盖其他应用的来源或方法。播放器需要 `GET`、`HEAD`、`Range` 请求和 `Accept-Ranges`、`Content-Range`、`Content-Length`、`ETag` 响应头暴露。CORS 是浏览器跨域许可，不能代替 Access 或签名鉴权。

使用独立的管理 profile 执行类似命令，先替换所有占位符并确认现有规则已合并：

```powershell
aws --profile b2-admin --endpoint-url https://s3.YOUR-REGION.backblazeb2.com s3api put-bucket-cors --bucket YOUR-BUCKET --cors-configuration file://b2-cors.json
```

浏览器音频直接请求 B2；这不代表音频经过 Cloudflare CDN、全球加速或享有某种免费出站额度。直连 B2 的预签名 URL 必然要携带访问所需的桶名、object path、key ID（通常在 `X-Amz-Credential` 中）和短期签名/过期参数；`B2_APPLICATION_KEY` 只在 Pages Function 服务端签名，绝不发送给客户端。Pages Secret 只保护 Cloudflare 中保存的 Secret 值，不会隐藏浏览器网络面板里的请求地址、B2 endpoint 或对象路径。不要把 B2 CORS、Access 或签名 URL 描述成即时撤销已发出 URL 的机制；签名 URL 在有效期内仍可被持有者使用。

## 6. 发布后的手工验收

在桌面主浏览器和至少一台实际目标手机上，使用授权邮箱检查：

1. 曲库能加载，搜索、播放、暂停、切歌和收藏工作；刷新页面不会自动发声。
2. 播放器的媒体请求来自 B2，拖动到中段可以继续。网络面板中对有效 `Range` 请求应看到 `206` 和正确的 `Content-Range`；普通完整读取出现 `200` 本身不表示故障。
3. 连续快速点击三首歌后，最终只播放最后选择的歌曲，旧的签名请求不会把音频切回去。
4. 在非生产测试环境将票据 TTL 设置为服务端允许的短值，等待真实票据过期后暂停再继续或拖动；客户端最多自动刷新一次签名并恢复位置，第二次失败应提供重试，不应无限循环。
5. 手机底部播放器不会遮住最后一首，播放按钮和收藏按钮可触摸，进度操作在浏览器支持时可用。

同时验证这些边界：空曲库显示空状态；不存在的 id 返回可读错误；缺失或错误 Access 会话无法拿到曲库或签名；缺少 B2 配置会安全失败；B2 中不存在的对象在媒体阶段报错并可重试；不兼容编码不被网页仅凭扩展名承诺可播放。没有真实 B2、Access 和发布环境时，这些线上验收都属于未验证项目，不能在交付报告中标记为通过。

## 7. 日常维护与限制

日常流程是上传音频、更新 `server/library.json`、运行检查和构建、发布 Pages。删除或改名对象前先同步清单，避免仍可见的条目指向旧 key；尽量用新 key 替换正在使用的文件，减少缓存和 Range 内容不一致。定期查看 B2 流量与 Functions 错误，日志不得记录完整签名 URL、Cookie、Access JWT 或 B2 application key。

`.dev.vars` 只用于本地 Pages Functions 开发，应被 `.gitignore` 忽略，不能提交，也不能当作 Pages production/preview 配置。密钥轮换在 B2 和 Pages Secret 两端完成，不能通过聊天传递密钥。页面部署与音频出站的费用取决于实际 Cloudflare、Access 和 B2 账户方案及流量；本项目不对免费额度、全球加速或账单作承诺。

首版不提供上传管理、多用户收藏同步、歌词、转码、离线下载、音频代理或数据库。曲库规模、格式兼容、移动端后台播放和 B2 网络表现应以实际验收为准；出现这些需求时再单独评估架构变化。
