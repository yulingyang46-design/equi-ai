# EquiAI

个人马术视频学习与知识整理 Android 应用。

## 当前功能

- 保存视频标题、原始网址、分类、语言、学习状态和笔记。
- 识别 YouTube、抖音、快手、哔哩哔哩、小红书等链接，并直达原始视频出处。
- 通过 Android 系统浏览器 / Chrome Custom Tabs 打开视频来源；是否自动唤起官方 App 取决于平台 App Links 与系统设置。
- 从手机文件选择器导入本地视频，并在应用内播放。
- 本地视频文件存入 IndexedDB；单个视频限制 500 MB。
- 搜索、分类筛选、学习状态更新、JSON 资料备份与导入。
- AI 助手目前生成分析任务文本，尚未连接在线 AI 服务。

## 数据与保存说明

文字资料保存在本机浏览器存储中；本地视频单独保存在 IndexedDB。卸载应用、清除应用数据或系统清理站点存储可能造成数据丢失。JSON 备份只包含资料文字和链接，不包含视频二进制文件。

“直达出处”打开平台原始页面，不绕过平台登录、地区、版权或播放限制。平台不允许下载的内容不会由本应用绕过限制获取。可导入自己拥有或获准使用的视频文件。

## 文件结构

```
.
├── index.html
├── src/
│   └── modules/
│       ├── platform-links.js
│       └── local-videos.js
├── scripts/
│   └── copy-web.mjs
├── capacitor.config.json
├── package.json
└── .github/workflows/
    └── build-android.yml
```

## 构建

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

正式接入 AI 时，应通过服务端调用模型，不要把 API 密钥写入 APK、前端或 Git 仓库。
