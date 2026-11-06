# EquiAI · 安卓马术学习工作台

EquiAI 是个人使用的安卓马术学习应用，目标是把视频来源、本地视频、字幕、学习笔记、AI 分析结果和马术知识条目放在同一工作流中。

## v2 当前实现

- 手机优先的工作台界面：首页、视频资料库、添加资料、AI 学习、知识库、设置、备份。
- 网络视频链接收藏与来源直达：YouTube、抖音、快手、Bilibili、小红书等平台链接交由系统浏览器打开；是否跳转官方 App 取决于设备和平台。
- 本地视频导入、应用内播放、单独导出；当前 APK 单文件导入上限 200 MB。
- SRT / VTT 字幕导入，解析时间戳并关联到学习资料。
- 资料分类、搜索、笔记、状态管理和知识条目编辑。
- JSON 备份与合并导入；JSON 不包含视频二进制文件，视频单独导出。
- 旧版 `equiAI_v1` 资料迁移；尝试迁移旧版 IndexedDB 本地视频。
- 独立 Gemini 服务端：文本/字幕分析、本地视频分析、公开来源页面 URL Context 分析。
- 服务端使用 `GEMINI_API_KEY`，APK 仅保存服务端地址和应用访问令牌，不嵌入 Gemini 密钥。

## 重要边界

- 收藏网络视频链接不等于下载视频。应用不会绕过平台登录、地区限制、版权或播放限制。
- URL Context 只能尝试读取可访问的网页文字、说明和字幕线索；不能保证模型读取到实际视频画面或完整字幕。需要画面分析时，导入本地视频再执行视频分析。
- 本地视频只有用户主动点击“分析本地视频”时才会上传到你配置的服务端。服务端分析完成后会请求删除 Gemini Files 临时文件。
- AI 分析结果需要人工核对；涉及马匹医疗、药物、跛行和骑乘安全时，不可把模型输出当作诊断或处置指令。

## 目录

- `index.html`：应用页面
- `src/app.js`：界面交互与学习工作流
- `src/styles.css`：移动端样式
- `src/modules/storage-v2.js`：IndexedDB 存储与旧版迁移
- `src/modules/subtitles.js`：SRT / VTT 字幕解析
- `src/modules/ai-client.js`：安全服务端 API 客户端
- `src/modules/knowledge.js`：马术知识整理规则
- `server/`：Gemini 服务端
- `scripts/copy-web.mjs`：构建 Web 资源
- `.github/workflows/build-android.yml`：安卓 APK 自动构建

## 本地构建

```bash
npm install
npm run check
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## AI 服务端

阅读 [server/README.md](server/README.md)。部署后在 APK「设置」中填写 HTTPS 服务地址和 `APP_ACCESS_TOKEN`。真实 Gemini API Key 必须保存在托管平台 Secret 中，不能写进 APK 或 GitHub 源码。

## 当前限制

AI 服务端需要单独部署和配置密钥/访问令牌；仅安装 APK 不会自动启用 AI。当前没有自动抓取所有平台视频文件的功能，也没有自动从所有平台提取字幕的保证。
