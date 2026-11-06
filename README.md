# EquiAI

个人马术视频学习与知识整理 Android 应用。

## 当前版本能力

- 本地保存视频资料标题、原始链接、分类、学习状态和笔记。
- 识别 YouTube、抖音、快手、哔哩哔哩、小红书等链接来源。
- 通过 Android 系统浏览器 / Chrome Custom Tabs 直达原始视频页面。
- 导出与导入 JSON 学习资料备份。
- AI 助手当前生成分析任务文本；尚未连接在线 AI 服务。

## 视频链接与保存说明

“直达出处”打开平台原始网页，不代表可以绕过平台登录、地区、版权或播放限制。Android 是否将链接自动交给已安装的官方 App，由平台的 Android App Links 配置和手机系统设置决定。无法唤起官方 App 时，会使用系统浏览器页面。

当前版本不会抓取 YouTube、抖音或快手的视频流，也不会绕过平台下载限制。可以保存平台允许下载的文件或用户自己拥有/获准使用的视频；从手机导入视频并持久化保存的功能仍待开发。

## 文件结构

\`\`\`
.
├── index.html                    # 页面与交互入口
├── src/
│   └── modules/
│       └── platform-links.js     # 平台识别、外部视频出处跳转
├── scripts/
│   └── copy-web.mjs              # 构建时复制网页与模块到 www/
├── www/                          # CI 构建生成，不作为源码编辑入口
├── capacitor.config.json
├── package.json
└── .github/workflows/
    └── build-android.yml         # Android APK 自动构建
\`\`\`

## 构建

\`\`\`bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
\`\`\`

正式版应在服务端接入 AI，不要把 API 密钥写入网页、APK 或 Git 仓库。
