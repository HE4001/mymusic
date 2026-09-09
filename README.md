# 云端音乐

云端音乐是一个使用私有 B2 存储的浏览器音乐播放器：前端使用 Vite、React 和 TypeScript，页面部署到 Cloudflare Pages，Pages Functions 提供曲库和短期播放地址，浏览器通过原生 `audio` 直接从私有 Backblaze B2 播放音频。

播放器无登录和用户认证。任何访客都可以读取曲库并请求短期 B2 签名；B2 桶保持私有，B2 密钥只在服务端配置，接口只为曲库清单中的对象签名。

本仓库包含可部署的代码、配置示例和维护说明。本轮没有配置真实 B2 或 Pages，也没有执行云端部署；默认曲库可以为空。

## 本地开发

需要 Node.js `>=22.12.0`。依赖由项目已有的 `package.json` 和 lockfile 管理。

在项目根目录执行：

```powershell
npm ci
npm run dev
```

仓库已有 lockfile 时使用 `npm ci`；只有在需要按 `package.json` 重新解析或更新依赖时才使用 `npm install`。本轮不重复安装依赖。

然后打开 Vite 显示的本地地址。开发时可以显式打开 `?demo=1` 使用客户端提供的演示曲库，例如：

```text
http://localhost:5173/?demo=1
```

演示模式只在开发环境且 URL 明确带有 `demo=1` 时启用，使用本地生成的测试音频 fixture；它不需要真实 B2，也不会在生产 API 失败后自动启用。演示模式不能用于判断生产 B2、Range 或音频编码是否正常。

常用检查命令如下：

```powershell
npm run check
npm run test
npm run test:ablation
npm run build
npm run preview:pages
```

`build` 依次校验 `server/library.json`、生成 Vite 的 `dist/`，并把根目录 `functions/` 编译到 `.build/functions/`；构建后应确认 `.build/functions/` 已生成。上述步骤都在本地完成，不需要云账号。`preview:pages` 使用 Wrangler 按 Pages 方式预览 `dist/`。实际脚本以项目 `package.json` 为准，本文不替代脚本定义。

## 配置生产曲库

1. 在私有 B2 桶中上传自有音频，记录每个对象的完整 key。可以手动编辑清单，或使用下述构建同步；网页不提供上传。
2. 编辑 [`server/library.json`](server/library.json)，为每首要开放播放的音频加入稳定且唯一的 `id`、`title`、`artist`、`album`、`duration`、`mimeType` 和 `objectKey`。
3. `objectKey` 应使用桶内相对对象路径，例如 `music/artist-a/album-a/01-night-flight.mp3`。保留路径中的 `/`；不要写反斜杠、空路径段、`.`、`..` 或控制字符，也不要把 B2 URL、bucket 或凭据写进清单。
4. `duration` 可以是 `null`；有值时使用正的有限秒数，实际播放时长仍以浏览器媒体元数据为准。没有标签时填写合适的文件名和“未知歌手”等展示值。
5. 更新清单后运行 `npm run check`、`npm run build`，再按 [`docs/DEPLOY.md`](docs/DEPLOY.md) 发布。

清单是服务端输入，前端接口只返回安全展示字段，不会把 `objectKey` 作为普通曲库字段暴露给浏览器。删除或改名 B2 对象时，要同步更新清单；稳定的 `id` 只有在歌曲本身被替换或删除时才改变或移除。

## 从 B2 自动生成曲库

Pages 构建命令改为 `npm run build:b2`，每次部署先读取 B2 全桶文件列表，再生成服务端清单并构建。普通 `npm run build` 仍只使用现有清单，不访问 B2。

沿用五项 B2 配置，无需增加新的 Key 名称。同步所用 Application Key 必须对目标桶具备 `listFiles` 和 `readFiles`，不需要上传、删除或管理桶权限。Pages 的环境变量和 Secrets 在构建时提供给同步脚本；生产和预览分别配置。不要把凭据写进命令或源码。

支持 mp3、m4a、aac、flac、wav、ogg、opus；并发最多3个请求，每首最多读取前2 MiB解析标签，不提取封面。保留已有人工信息，再使用音频标签，最后回退到文件名和目录。无标签的根目录文件不编造专辑名。M4A尾部标签或超出读取范围的标签可能无法识别；部分读取的音频时长交由浏览器读取。文件名排序、分页读取，ID由对象路径稳定生成。浏览器是否能解码仍以实际格式为准。

目录里没有支持的音频、请求失败或分页不完整会停止构建，不覆盖旧清单，也不会发布半份曲库。成功同步会移除已经不在桶列表中的歌曲。服务端清单只在该次构建中生成，不自动提交回Git；人工标题若要跨部署保留，应写入仓库清单。

本地也可在通过环境变量提供配置后执行 `npm run sync:library`。脚本不会自动读取 `.dev.vars`；Node支持时可用 `node --env-file=.dev.vars --import tsx scripts/sync-library.ts` 明确加载本地配置。密钥不要出现在命令参数中。

支持根目录及任意子目录，无需移动桶内文件。新上传歌曲需要重新触发部署才出现在网页中。

依据：[B2 List Objects V2](https://www.backblaze.com/apidocs/s3-list-objects-v2)、[Pages环境变量与Secret](https://developers.cloudflare.com/pages/functions/bindings/)。

## 生产配置

运行时固定使用五项配置：

| 名称 | 类型 | 位置 |
| --- | --- | --- |
| `B2_ENDPOINT` | 普通变量 | `wrangler.jsonc` 的 `vars` / `env.preview.vars` |
| `B2_REGION` | 普通变量 | `wrangler.jsonc` 的 `vars` / `env.preview.vars` |
| `B2_BUCKET` | Secret | Cloudflare Pages Secret |
| `B2_KEY_ID` | Secret | Cloudflare Pages Secret |
| `B2_APPLICATION_KEY` | Secret | Cloudflare Pages Secret |

前两项是与私有桶匹配的 S3 endpoint 和 region；后三项是私有桶的只读 B2 application key 信息。任何凭据都不能使用 `VITE_` 前缀、提交到仓库、放进静态文件或粘贴到聊天中。`.dev.vars.example` 只提供本地占位示例；复制出的 `.dev.vars` 仅供本地使用且不提交。完整流程见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

签名 URL 在有效期内可被持有者使用，因此应使用短期 TTL，并留意流量和费用。浏览器直连 B2，不代表音频经过 Cloudflare CDN 或享有某种免费出站额度。

如果曾在 Cloudflare 平台为播放器域名配置 Cloudflare Access 策略，代码不能移除平台策略；需要在 Cloudflare 平台取消对播放器域名的保护，避免无登录播放器被平台拦截。只处理播放器域名，不修改其他应用的策略。

## 文档

- [设计与编码指南](云端音乐播放器设计与编码指南.md)
- [协作与接口约定](docs/tasks/00-协作与接口约定.md)
- [前端界面任务](docs/tasks/01-前端界面.md)
- [播放核心任务](docs/tasks/02-播放核心.md)
- [服务端任务](docs/tasks/03-服务端.md)
- [部署与维护任务](docs/tasks/04-部署与维护.md)
- [本轮界面与机密配置任务](docs/tasks/06-界面与机密配置.md)
- [部署与维护](docs/DEPLOY.md)
- [集成审查](docs/REVIEW.md)
- [消融方法与结果](docs/ABLATION.md)

兼容变量别名：`B2_ACCESS_KEY_ID` 对应 `B2_KEY_ID`，`B2_SECRET_ACCESS_KEY` 对应 `B2_APPLICATION_KEY`，标准名称优先。每项只设置一个名称；两项凭据和 `B2_BUCKET` 存为 Pages Secret，禁止添加 `VITE_` 前缀。

实际联调：579个对象中识别425首音频，整理为29个专辑分组；修复旧GBK标签乱码、双碟名称后缀和目录内少数错误专辑标签。目录内超过半数歌曲使用同一专辑标签时统一该组，其余混合集合保留各自标签，人工编辑的已有专辑优先。
