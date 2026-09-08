# 云端音乐

云端音乐是一个面向个人或少量亲友使用的私有音乐播放器：前端使用 Vite、React 和 TypeScript，页面部署到 Cloudflare Pages，Pages Functions 提供曲库和短期播放地址，浏览器通过原生 `audio` 直接从私有 Backblaze B2 播放音频。Cloudflare Access 负责入口访问控制，B2 密钥只在服务端配置。

本仓库包含可部署的代码、配置示例和维护说明。本轮没有配置真实 B2、Cloudflare Access 或 Pages，也没有执行云端部署；默认曲库可以为空。

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

演示模式只在开发环境且 URL 明确带有 `demo=1` 时启用，使用本地生成的测试音频 fixture；它明确是“演示曲库”，不需要真实 B2，也不会在生产鉴权或曲库请求失败后自动启用。演示模式不能用于判断生产 B2、Access、Range 或音频编码是否正常。

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

1. 在私有 B2 桶中上传自有音频，记录每个对象的完整 key。首版不从 B2 自动扫描，也不在网页中上传文件。
2. 编辑 [`server/library.json`](server/library.json)，为每首要开放播放的音频加入稳定且唯一的 `id`、`title`、`artist`、`album`、`duration`、`mimeType` 和 `objectKey`。
3. `objectKey` 应使用 `music/` 开头的对象路径，例如 `music/artist-a/album-a/01-night-flight.mp3`。保留路径中的 `/`；不要写反斜杠、空路径段、`.`、`..` 或控制字符，也不要把 B2 URL、bucket 或凭据写进清单。
4. `duration` 可以是 `null`；有值时使用正的有限秒数，实际播放时长仍以浏览器媒体元数据为准。没有标签时填写合适的文件名和“未知歌手”等展示值。
5. 更新清单后运行 `npm run check`、`npm run build`，再按 [`docs/DEPLOY.md`](docs/DEPLOY.md) 发布。

清单是服务端输入，前端接口只返回安全展示字段，不会把 `objectKey` 作为普通曲库字段暴露给浏览器。删除或改名 B2 对象时，要同步更新清单；稳定的 `id` 只有在歌曲本身被替换或删除时才改变或移除。

## 生产配置要点

本轮只交付可部署代码和配置示例，不需要云账号，也没有执行真实部署。生产需要一个私有 B2 桶、限制为目标桶/目录只读的 application key 和 Cloudflare Access 应用。`B2_ENDPOINT`、`B2_REGION`、`ACCESS_TEAM_DOMAIN`、`ACCESS_AUD` 是普通变量，写在 [`wrangler.jsonc`](wrangler.jsonc) 的生产 `vars` 和独立的 `env.preview.vars` 占位值中；`B2_BUCKET`、`B2_KEY_ID`、`B2_APPLICATION_KEY` 全部通过 Cloudflare Pages Secrets 管理，不写入 `vars`。由于文件包含 `pages_build_output_dir`，它是 Pages 项目配置的 source of truth，同字段不能再从 Dashboard 编辑。任何凭据都不能使用 `VITE_` 前缀、提交到仓库、放进静态文件，或粘贴到聊天中。`.dev.vars.example` 只提供本地占位示例；复制出的 `.dev.vars` 仅供本地使用且不提交。完整流程见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

生产和 Preview 使用独立的 Pages 变量与 secrets。没有真实配置时，生产路径应显示配置或访问错误；不能把演示曲库当作生产回退。

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
