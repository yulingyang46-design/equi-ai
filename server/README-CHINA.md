# 国内版服务端（千问 / 阿里云百炼）

本文件说明如何把同一套应用接入中国大陆可用的模型服务。海外 Gemini 服务与国内 Qwen 服务分开部署、分开配置，API Key 仅保存在服务端环境变量。

## 当前代码已具备的国内服务适配

设置服务端环境变量：
- `AI_PROVIDER=qwen`
- `DASHSCOPE_API_KEY=你的百炼 API Key`
- `DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`（北京地域默认示例；API Key、模型、Base URL 必须属于同一地域/业务空间）
- `DASHSCOPE_MODEL=qwen3.8-flash`
- `OSS_REGION=oss-cn-beijing`（示例，按 Bucket 实际地域填写）\n- `OSS_BUCKET=你的私有 Bucket 名称`\n- `OSS_ACCESS_KEY_ID=仅服务端使用的 RAM 访问密钥 ID`\n- `OSS_ACCESS_KEY_SECRET=仅服务端使用的 RAM 访问密钥 Secret`\n- `OSS_ENDPOINT=https://oss-cn-beijing.aliyuncs.com`（可选，按地域调整）\n- `MAX_VIDEO_MB=200`\n- `APP_ACCESS_TOKEN=自行生成的长随机令牌`
- `ALLOWED_ORIGINS=`（按部署域名配置；不要把密钥写进 APK）

如使用工作空间地域专属域名，请在百炼控制台确认工作空间 ID、地域与对应 API Key，并将完整 compatible-mode Base URL 配置到 `DASHSCOPE_BASE_URL`。

## 已实现输入类型

| 输入 | 国内 Qwen 路径 | 当前限制 |
|---|---|---|
| 本地图片 | 图片 Base64 多模态请求 | 单张暂限 10 MB |
| 本地视频 | 视频 Base64 多模态请求；大文件通过阿里云 OSS 私有临时对象与 1 小时签名 URL 中转 | 默认服务器上传上限 200 MB；≤7 MB 可直传 Base64，>7 MB 需要配置 OSS |
| 直接视频文件 URL | Qwen 视频 URL 输入 | 必须是模型服务端可公开访问的直接视频文件 URL |
| 普通网页/平台链接 | 服务端尝试读取网页文字，再交给模型分析 | 不代表已读取视频画面；平台反爬、登录、地区限制可能导致读不到 |
| PDF | 提取可搜索文字后交给模型 | 扫描版/图片型 PDF OCR 尚未接入国内路径 |
| DOCX | Mammoth 提取文字后交给模型 | 复杂排版、嵌入图片不保证保留 |
| TXT / MD / CSV | 提取文字后交给模型 | 单文件 10 MB，文本超长会截断 |
| SRT / VTT | 前端解析为带时间戳文本后分析 | 作为可选辅助材料 |

**视频分析注意：** 当前国内 Qwen 视频路径采用视频帧理解；官方说明视频文件输入不理解视频音轨。需要讲解音频翻译时，请另附 SRT/VTT 字幕或文本。大于 7 MB 的本地视频要正式投入使用，下一步必须完成 OSS 临时 URL 上传/回收流程，再把短时签名 URL交给模型；不能把 7 MB 限制当成长期方案。

## 搜索路径

国内模式优先尝试哔哩哔哩公开搜索接口；全部平台/其他来源会尝试百度公开网页搜索。不同平台可能有反爬、登录和链接跳转限制；搜索到结果不等于可下载视频，也不保证所有平台都有结果。国内服务部署后必须从中国大陆网络实测。

## 部署建议

- 国内服务应部署在中国大陆可访问的云主机/容器平台；公网域名、ICP备案及平台合规要求按实际部署主体和服务类型核实。
- 海外 Render 服务保持 `AI_PROVIDER=gemini`，不修改当前已用的海外环境变量。
- 在 APK「设置 → 服务区域」选择“中国大陆服务”，填写国内服务 HTTPS 地址和独立 `APP_ACCESS_TOKEN`。海外与国内地址/令牌分别保存，切换不覆盖另一侧配置。
- 不要将 `DASHSCOPE_API_KEY`、`GEMINI_API_KEY` 或 `APP_ACCESS_TOKEN` 写入前端、GitHub 源码或聊天消息。

## 国内版上线前必须完成的验收

- [ ] 在中国大陆网络部署并确认 `/api/health` 返回 `provider=qwen`、`configured=true`。
- [ ] 使用真实百炼 Key 完成文本、图片、视频、PDF、DOCX、直接视频 URL 的实际推理测试。
- [x] 已实现 OSS 私有临时对象上传、签名 URL 传递和分析结束后主动删除；仍需真实 Bucket 凭据进行端到端实测。
- [ ] 接入扫描 PDF OCR / 图文 PDF 处理。
- [ ] 实测 Bilibili、抖音、快手、小红书等平台搜索结果与原始出处直达；不可用的平台明确标注。
- [ ] 在大陆 Android 设备验证上传、切换区域、页面切换、保存和长视频等待/失败恢复。
- [ ] 验证国内服务的访问控制、跨域、日志脱敏、临时文件清理和费用限额。

## 官方依据

- Qwen 图像与视频理解：https://docs.modelstudio.console.alibabacloud.com/zh/model-studio/vision
- Qwen 视频本地文件/ Base64 输入、视频时长/大小和音频限制见上述文档的“传入本地文件”“视频限制”章节。
- Qwen Node.js SDK（可选后续扩展）：https://github.com/dashscope/dashscope-sdk-nodejs
