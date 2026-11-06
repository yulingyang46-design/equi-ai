# EquiAI 安全 AI 服务端

服务端负责调用 Gemini。APK 内不保存 Gemini API 密钥；只保存服务端地址和单独的应用访问令牌。

## 部署前准备

需要一个可运行 Node.js 22 的 HTTPS 托管服务，以及 Gemini API Key。建议使用有环境变量/密钥管理功能的托管平台。

在服务端环境变量中设置：

| 变量 | 用途 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio 创建的 Gemini API Key，必须作为平台 Secret 保存 |
| `APP_ACCESS_TOKEN` | 你自己生成的一串长随机访问令牌，必须作为平台 Secret 保存 |
| `GEMINI_MODEL` | 默认 `gemini-3.8-flash` |
| `MAX_VIDEO_MB` | 服务端允许上传的视频大小，默认 200 |
| `ALLOWED_ORIGINS` | Android Capacitor 默认来源为 `https://localhost` |

**不要把真实密钥或访问令牌提交到 GitHub。** 如果曾经把 Gemini 密钥写进源代码或公开仓库，应先在 Google AI Studio 撤销旧密钥并创建新密钥。

## Render / Node 托管平台部署方式

1. 在托管平台创建一个新的 Web Service，并连接此 GitHub 仓库。
2. Root Directory 填 `server`。
3. Build Command 填 `npm install`。
4. Start Command 填 `npm start`。
5. 在平台的 Environment / Secrets 页面添加上表环境变量。
6. 部署成功后复制平台分配的 HTTPS 服务地址。

服务端健康检查地址为 `https://你的服务地址/api/health`，但需要在请求头中携带访问令牌。

## 在 EquiAI 中连接

打开 APK → 设置：
- AI 服务端地址：粘贴 HTTPS 服务地址（不要加 `/api`）。
- 应用访问令牌：填写与服务端 `APP_ACCESS_TOKEN` 完全相同的值。
- 点击“保存地址”，再点击“测试连接”。

连接成功后，可在 AI 学习页分析字幕文本或上传本地视频。

## 接口

- `GET /api/health`：检查服务和 Gemini 密钥配置状态。
- `POST /api/analyze`：文本 / 字幕分析。
- `POST /api/analyze-video`：上传本地视频并调用 Gemini 视频理解。

## 费用和限制

Gemini API 使用量可能产生费用，实际费用取决于模型、输入视频时长、文件大小和输出长度。不要把公开视频链接分析误认为一定能读取到完整视频；平台登录墙、地域限制和视频权限会影响网页内容访问。当前视频分析接口接收用户主动导入的本地视频文件。
