# 云端音乐

使用 React、TypeScript 和 Vite 构建的私人音乐播放器，部署于 Cloudflare Pages。Pages Functions 提供共享密码登录、曲库和短期播放地址，浏览器通过原生 Audio 直接播放私有 Backblaze B2 音频。

支持专辑筛选、收藏、播放队列、顺序/随机/单曲循环、进度恢复和系统媒体控制。收藏与播放偏好保存在当前浏览器，不跨设备同步。网页不提供上传或转码。

## 本地运行

需要 Node.js `>=22.12.0`。

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
```

将 `.dev.vars` 中的占位值替换为有效配置，然后执行：

```powershell
npm run check
npm run build
npm run preview:pages
```

打开 Wrangler 输出的本地地址。开发前端时，保持 Pages 本地服务运行在 `127.0.0.1:8788`，另开终端执行 `npm run dev`，访问 Vite 输出的地址；`/api` 会转发至 Pages 本地服务。

`build` 校验曲库，生成 `dist/` 并编译 Pages Functions 到 `.build/functions/`，不访问 B2。实际播放需要有效的 B2 配置和网站密码。

## 环境配置

| 名称 | 用途 | 生产配置位置 |
| --- | --- | --- |
| `B2_ENDPOINT` | 桶对应的 HTTPS S3 endpoint | `wrangler.jsonc` 的 `vars` |
| `B2_REGION` | 与 endpoint 一致的 region | `wrangler.jsonc` 的 `vars` |
| `B2_BUCKET` | 私有桶名称 | Pages Secret |
| `B2_KEY_ID` | Application Key ID | Pages Secret |
| `B2_APPLICATION_KEY` | Application Key | Pages Secret |
| `SITE_PASSWORD` | 至少 12 个字符的访问密码 | Pages Secret |

预览环境使用 `env.preview.vars` 和独立的 Pages Secrets，需替换配置中的占位值。可选 `B2_URL_TTL_SECONDS` 控制播放链接有效期，范围 60–3600 秒，默认 3600 秒。兼容凭据别名 `B2_ACCESS_KEY_ID` 和 `B2_SECRET_ACCESS_KEY`，标准名称优先。

本地配置保存在被 Git 忽略的 `.dev.vars`。不要将密码或密钥提交到仓库，也不要使用会进入前端的 `VITE_` 前缀。运行时 B2 密钥只需目标桶的 `readFiles` 权限；自动同步曲库另需 `listFiles`。

登录会话有效期为 7 天，修改密码并重新部署会使旧会话失效。已签发的 B2 链接在到期前仍可使用；登录尝试限流仅在单个 Worker 实例内生效。

## 曲库维护

上传音频到 B2 后，编辑 `server/library.json`，或在配置好环境变量后自动同步：

```powershell
node --env-file=.dev.vars --import tsx scripts/sync-library.ts
```

同步支持 mp3、m4a、aac、flac、wav、ogg、opus，保留已有信息，尝试读取音频标签，最后回退到文件名和目录。每首最多读取前 2 MiB，并发最多 3 个请求；标签读取失败时使用回退信息。文件列表读取失败、分页异常或没有支持的音频时，保留旧清单并停止。

手工维护时，每首歌曲需包含唯一稳定的 `id`、`title`、`artist`、`album`、`duration`、`mimeType` 和 `objectKey`。`duration` 可为 `null`，有值时必须为正的有限秒数。`objectKey` 使用桶内相对路径，不能使用 URL、反斜杠、空路径段、`.` 或 `..`。对象改名或删除后同步更新清单。

更新后运行 `npm run check` 和 `npm run build`，再重新部署。自动生成的清单不会提交回 Git，需跨部署保留的人工信息应写入仓库。

## 部署

Cloudflare Pages 项目名为 `cloud-music`，构建命令为 `npm run build`，输出目录为 `dist`，API 由根目录 `functions/` 提供。设置上述变量与 Secrets 后部署；手工发布可执行 `npm run deploy`。

如需每次部署前从 B2 同步曲库，将 Pages 构建命令改为 `npm run build:b2`，并为构建环境提供 B2 配置。普通构建只使用已有清单。

音频直接来自 B2，当前原生 Audio 播放不要求桶配置 CORS，也不经过 Cloudflare 音频代理。iOS 音量使用设备按键；锁屏、后台跨曲和编码兼容性需在目标设备上确认。
