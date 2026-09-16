# 部署与维护

本文说明如何把云端音乐部署到 Cloudflare Pages，并让 Pages Functions 为私有 Backblaze B2 对象生成短期签名。播放器使用共享密码登录，曲库和播放接口均验证服务端签名会话。B2 桶保持私有，B2 密钥只在服务端使用。

## 1. 准备私有 B2

创建或确认一个私有 B2 bucket，上传自有音频并记录每个对象的完整 key。建议使用 `music/artist/album/file.mp3` 这样的路径。编辑 [`../server/library.json`](../server/library.json)，为每首歌曲填写稳定唯一的 `id`、`title`、`artist`、`album`、`duration`、`mimeType` 和 `objectKey`。

运行时只需要一个限制在目标 bucket 或目录、具有读文件能力的 application key。不要给它上传、删除、列举 bucket 或管理 CORS 的权限。上传和整理文件使用独立的管理凭据；不要把任何凭据写进清单或前端代码。

`objectKey` 只能是清单中的合法相对路径，不能是任意 URL，也不能包含反斜杠、空段、`.`、`..` 或控制字符。上传、改名或删除对象后同步更新清单。

## 2. 创建 Pages 项目并构建

在 Cloudflare Pages 创建项目 `cloud-music`，构建配置如下：

| 配置 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 项目根目录 | 仓库根目录 |

根目录的 `functions/` 由 Pages Functions 处理 API，并与前端构建一起发布。手工发布时使用 Pages 命令：

```powershell
npm ci
npm run check
npm run build
npx wrangler pages deploy dist --project-name cloud-music
```

不要使用普通 Worker 的 `wrangler deploy`。由于 [`../wrangler.jsonc`](../wrangler.jsonc) 声明了 `pages_build_output_dir`，它是 Pages 项目配置的 source of truth；不要在 Dashboard 另行维护同一组普通变量。

## 3. 配置 B2 与网站密码

B2 使用以下五项配置：两项普通变量和三项 Pages Secrets。网站另需 `SITE_PASSWORD` Secret，设置方法见本文“网站密码与 iOS Safari”。生产和 Preview 应分别配置自己的值；`.dev.vars.example` 仅供本地占位，不是生产配置。

| 名称 | 配置来源 | 填写内容 |
| --- | --- | --- |
| `B2_ENDPOINT` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | 与 bucket 匹配的 HTTPS S3 endpoint，例如 `https://s3.YOUR-REGION.backblazeb2.com` |
| `B2_REGION` | `wrangler.jsonc` 的 `vars` / `env.preview.vars` | B2 region，例如 `YOUR-REGION`，须与 endpoint 一致 |
| `B2_BUCKET` | Pages Secret | 实际私有 bucket 名称 |
| `B2_KEY_ID` | Pages Secret | 只读 application key ID |
| `B2_APPLICATION_KEY` | Pages Secret | 对应的只读 application key |

普通变量写入 Wrangler 配置；三个 Secret 通过 Pages CLI 设置。命令只会提示输入值，不要把真实值写进命令、仓库或聊天：

```powershell
# Production
npx wrangler pages secret put B2_BUCKET --project-name cloud-music --env production
npx wrangler pages secret put B2_KEY_ID --project-name cloud-music --env production
npx wrangler pages secret put B2_APPLICATION_KEY --project-name cloud-music --env production

# Preview：使用独立的测试桶和只读密钥
npx wrangler pages secret put B2_BUCKET --project-name cloud-music --env preview
npx wrangler pages secret put B2_KEY_ID --project-name cloud-music --env preview
npx wrangler pages secret put B2_APPLICATION_KEY --project-name cloud-music --env preview
```

不要使用 `VITE_` 前缀，也不要把 `.dev.vars` 提交到 Git。B2 密钥只在 Pages Function 服务端签名，绝不发送给浏览器。

## 4. 登录保护与平台策略

访客通过 `POST /api/session` 提交网站密码，服务端校验后签发 HttpOnly 会话 Cookie。以下接口要求有效会话，未登录返回401：

- `GET /api/library`：读取曲库展示字段；
- `GET /api/play-url?id=...`：为清单中存在的曲目获取短期 B2 签名；
- `GET /api/stream?id=...`：302 跳转到短期播放地址，音频由浏览器直接向 B2 请求。

`GET /api/session` 查询登录状态，`DELETE /api/session` 退出。密码未配置或少于12个字符时服务端返回503，关闭访问。

接口不接受客户端提交的 bucket、host、object key 或任意远程 URL。签名 URL 是有效期内的持有者凭据，浏览器网络面板可以看到 URL、bucket、对象路径和短期签名；这不等于 B2 桶被设为公开。短期 URL 失效后需要重新请求，服务端密钥仍不离开 Pages Functions。

如果曾在 Cloudflare 平台为播放器域名配置 Cloudflare Access 策略，代码不能移除平台策略；需要在 Cloudflare 平台取消对播放器域名的保护，否则播放器会被平台拦截。只取消播放器域名的保护，不修改其他应用的策略。

## 5. B2 跨域播放

[`../b2-cors.example.json`](../b2-cors.example.json) 是 S3 `PutBucketCors` / AWS CLI 格式，不是 B2 Native API 的 `corsRules` 格式。将 `AllowedOrigins` 改为真实播放器来源；本地联调时只临时加入准确的 `http://localhost:端口`，不要放开全部 `*.pages.dev`。

当前播放器使用原生 Audio，不设置 crossOrigin，因此基本播放不要求桶配置 CORS。只有以后添加 Web Audio 或 JavaScript 读取音频时，才需要配置 `GET`、`HEAD`、`Range` 并暴露相关响应头。参考 [MDN crossOrigin](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/crossOrigin)。更新 CORS 前先读取现有规则，与其他应用规则合并后再提交；不要用示例文件覆盖其他应用的来源或方法。

浏览器音频直接请求 B2；这不代表音频经过 Cloudflare CDN 或享有某种免费出站额度。签名 URL 在有效期内仍可使用，CORS 也不能撤销已经发出的 URL。

## 6. 发布后验收

1. 在未登录浏览器打开播放器，确认受保护接口返回401；输入网站密码后，`/api/library` 返回曲库，`/api/play-url` 能为合法曲目返回短期地址。
2. 使用返回地址播放、暂停、切歌和拖动；有效 Range 请求应返回 `206` 和正确的 `Content-Range`，普通完整读取返回 `200` 也可能是正常的。
3. 空曲库、不存在的 id、缺少 B2 配置和 B2 中不存在的对象都应显示可读错误并允许重试。
4. 在测试环境使用短 TTL，等待真实地址过期后继续播放或拖动，客户端最多自动刷新一次签名，不应无限重试。
5. 在目标手机上确认底部播放器不遮住最后一首，播放按钮和收藏按钮可操作。

没有真实 B2 和发布环境时，以上线上验收仍属于未验证项目。

## 7. 日常维护与限制

日常流程是上传音频、更新 `server/library.json`、检查和构建、发布 Pages。删除或改名对象前先同步清单，尽量用新 key 替换正在使用的文件，减少缓存和 Range 内容不一致。

定期查看 B2 流量与 Functions 错误；日志不得记录完整签名 URL、Cookie 或 B2 application key。密钥轮换在 B2 和 Pages Secret 两端完成。首版不提供上传管理、多用户收藏同步、歌词、转码、离线下载、音频代理或数据库。

## 从 B2 自动生成曲库

Pages 构建命令改为 `npm run build:b2`，每次部署先读取 B2 全桶文件列表，再生成服务端清单并构建。普通 `npm run build` 仍只使用现有清单，不访问 B2。

沿用五项 B2 配置，无需增加新的 Key 名称。同步所用 Application Key 必须对目标桶具备 `listFiles` 和 `readFiles`，不需要上传、删除或管理桶权限。Pages 的环境变量和 Secrets 在构建时提供给同步脚本；生产和预览分别配置。不要把凭据写进命令或源码。

支持 mp3、m4a、aac、flac、wav、ogg、opus；并发最多3个请求，每首最多读取前2 MiB解析标签，不提取封面。保留已有人工信息，再使用音频标签，最后回退到文件名和目录。无标签的根目录文件不编造专辑名。M4A尾部标签或超出读取范围的标签可能无法识别；部分读取的音频时长交由浏览器读取。文件名排序、分页读取，ID由对象路径稳定生成。浏览器是否能解码仍以实际格式为准。

目录里没有支持的音频、请求失败或分页不完整会停止构建，不覆盖旧清单，也不会发布半份曲库。成功同步会移除已经不在桶列表中的歌曲。服务端清单只在该次构建中生成，不自动提交回Git；人工标题若要跨部署保留，应写入仓库清单。

本地也可在通过环境变量提供配置后执行 `npm run sync:library`。脚本不会自动读取 `.dev.vars`；Node支持时可用 `node --env-file=.dev.vars --import tsx scripts/sync-library.ts` 明确加载本地配置。密钥不要出现在命令参数中。

支持根目录及任意子目录，无需移动桶内文件。新上传歌曲需要重新触发部署才出现在网页中。

依据：[B2 List Objects V2](https://www.backblaze.com/apidocs/s3-list-objects-v2)、[Pages环境变量与Secret](https://developers.cloudflare.com/pages/functions/bindings/)。

兼容变量别名：`B2_ACCESS_KEY_ID` 对应 `B2_KEY_ID`，`B2_SECRET_ACCESS_KEY` 对应 `B2_APPLICATION_KEY`，标准名称优先。每项只设置一个名称；两项凭据和 `B2_BUCKET` 存为 Pages Secret，禁止添加 `VITE_` 前缀。

实际联调：579个对象中识别425首音频，整理为29个专辑分组；修复旧GBK标签乱码、双碟名称后缀和目录内少数错误专辑标签。目录内超过半数歌曲使用同一专辑标签时统一该组，其余混合集合保留各自标签，人工编辑的已有专辑优先。

## 网站密码与 iOS Safari

在 Cloudflare Pages → 设置 → 变量和机密中新增 `SITE_PASSWORD`，选择 Secret，值为你自行设置的至少12个字符的密码；生产与预览环境分别设置，再重新部署。不要使用 `VITE_` 前缀，不要写入 wrangler.jsonc 或前端代码。本地写入被Git忽略的 `.dev.vars`。未配置时服务端返回503并关闭访问。

登录使用同源POST和HttpOnly Cookie，HTTPS下带Secure、SameSite=Strict，有效期7天。修改密码并重新部署会使原会话失效；退出删除当前浏览器会话。应用包含每个Worker实例的简单尝试频率限制，该限制并非跨实例的全局限流。已签发的B2短期链接在自身到期前仍然有效。

首页已移除搜索栏，保留专辑和收藏筛选。点歌时同步调用Audio.play()，通过受保护的 `/api/stream?id=...` 服务端302跳转到B2，以保留Safari触摸播放许可；音频字节不经过Pages。适配刘海、底部安全区、动态视口与16px输入框；恢复页面不自动播放。iOS音量使用设备按键。Windows上的手机尺寸检查不等于真实iPhone测试，锁屏续播及具体编码兼容性仍需真机验证。依据：[WebKit播放策略](https://webkit.org/blog/6784/new-video-policies-for-ios/)、[Cookie配置](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)。
