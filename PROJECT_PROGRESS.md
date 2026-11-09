# 仔仔的马术库｜项目进度与换手机交接

最后更新：2026-11-09
仓库：https://github.com/yulingyang46-design/equi-ai
工作分支：`android-v2-online-search`
海外服务地址：https://equi-ai.onrender.com
当前代码提交：`faf0026d6b0b3ae24d291a0be9b3209b3cdd0424`
Android 构建：<https://github.com/yulingyang46-design/equi-ai/actions/runs/42631406420>
构建产物：`EquiAI-debug-apk`，Artifact ID `13680791916`，有效期至 2026-11-23。
当前 APK：`仔仔的马术库-多模态测试版.apk`
APK SHA-256：`d50d541dc8b3fe854a3cc9220add00d9d0429a9ee3abbd5783559c3745be92cf`

## 用户明确要求
- 不只改外观；必须做代码、构建、接口和页面流程检查。
- 保留资料库、知识库、备份迁移、字幕、视频来源收藏等现有功能，不擅自删减。
- AI 输入覆盖本地视频、图片、视频/网页链接、文档、字幕和粘贴文本。
- 国内版与海外版同步推进；国内模式不依赖 Gemini、YouTube、DuckDuckGo。
- 国内/海外切换不能覆盖另一套服务配置或删除本地资料。
- 完成后保存进度，便于换手机继续；密钥不能写进 APK、GitHub 源码或聊天。

## 本轮已实现
### AI 学习工作台
- 主要入口：本地视频、图片、PDF、DOCX、TXT/MD/CSV、视频/网页链接、粘贴文本。
- SRT/VTT 收入可选辅助区，不再是显眼的唯一输入方式。
- 本地视频可直接从 AI 学习区选择；选择后先保存到本机资料库并建立关联，再上传分析。
- 无关联资料时，分析结果也可保存为新资料笔记；知识库保存入口保留。
- 链接分析明确区分网页文字/说明与真实视频画面，不能访问视频画面时不得假装看过。

### 海外版
- Gemini 文本、视频、图片/PDF 文件分析接口已接线。
- 视频搜索将所选平台传给后端；海外搜索先试 DuckDuckGo，失败后试 Bing RSS。
- Bing RSS 解析器已修正；搜索错误会显示来源失败信息。
- 新增 `POST /api/test-ai`，设置页“测试 AI 实际推理”会实际调用模型，不再只检查健康接口。
- 客户端保留底层网络错误，不再全部伪装成“无法连接”。
- 本地播放器关闭时释放临时 Object URL，减少重复播放后的内存占用。
- Android 文件选择器未提供 MIME 时，按文件扩展名识别常见视频/图片。

### 国内版
- 服务端支持 `AI_PROVIDER=qwen`，通过阿里云百炼/Qwen 兼容接口。
- 文本、图片（≤10 MB）、PDF 可搜索文字、DOCX、TXT/MD/CSV、直接视频文件 URL、网页文字分析已接线。
- 本地视频：≤7 MB 走 Base64；>7 MB 走阿里云 OSS 私有临时对象，签发 1 小时 URL，模型分析后主动删除对象。
- 默认上传上限 200 MB，可通过 `MAX_VIDEO_MB` 调整，代码硬上限 500 MB。
- 视频模型处理画面帧，不理解视频音轨；语音讲解需要另附 SRT/VTT 或文本。
- 扫描版 PDF OCR 尚未接入；DOCX 中嵌入图片/复杂排版不保证识别。
- 国内搜索优先 Bilibili 公开接口，随后尝试百度公开网页搜索；抖音/快手/小红书尚未接官方 API，当前仅用百度索引尝试。
- 设置页可切换“海外服务（Gemini）/中国大陆服务（千问/百炼）”；两个区域的 endpoint/token 分开存储。
- 国内部署变量和限制见 `server/README-CHINA.md`。

### 备份迁移
- 新版完整 JSON 备份会包含 IndexedDB 本地媒体文件并恢复资料与媒体关联。
- 从旧版 APK 迁移时：旧版 JSON 不含视频；先导出 JSON，再在旧版“本地视频导出”逐个导出已有视频。
- 新版导入旧 JSON 后，缺失视频的记录会显示“选择文件恢复关联”，逐个选回先前导出的视频即可。
- 之后新版完整备份包含媒体，不需要逐个导出。

## 自动化验收结果
- [x] GitHub Actions Android 构建成功：Run `42631406420`。
- [x] 根项目 JavaScript 语法检查成功。
- [x] 服务端依赖安装及语法/导入检查成功（包括 Gemini SDK、Mammoth、PDF Parse、Ali OSS SDK）。
- [x] Web 资源准备、Android 项目生成、Capacitor Sync、Debug APK 编译及 Artifact 上传成功。
- [x] 静态 DOM 检查：没有重复 ID；未匹配到的 `toStudio/editSave/editTitle/editNotes/editStatus` 是动态弹窗元素；已确认 AI 文件/链接入口、区域切换、旧视频恢复入口存在。
- [x] APK 已下载并检查为有效 Android APK，约 4 MB。
- [ ] Render 是否已自动部署本轮服务端代码：尚未能从当前环境验证。
- [ ] Render 真实 Gemini 推理、搜索接口实际结果：需要在应用里用已保存的访问令牌做真实请求。
- [ ] 国内百炼 Key、国内云主机、OSS Bucket 尚未由用户账号配置，国内服务未上线验收。
- [ ] 没有真实 Android 设备可供我直接操作；页面切换流畅度、长视频上传体验、断网恢复仍需真机测试，不能宣称已完成设备级验收。

## 重要安装提醒：旧 APK 签名不同
检测到本轮 APK 与用户此前安装候选版本的 Android Debug 证书指纹不同：
- 旧 APK（Run 42617163473）：`32:D2:4C:4F:CA:3F:0C:D3:69:E5:6D:D1:AF:81:BC:52:92:BA:11:0B:CD:01:DF:AD:82:9D:7F:95:B5:3E:F3:55`
- 当前 APK（Run 42631406420）：`E2:00:D0:E2:E5:5D:73:60:5A:E8:38:90:37:96:CB:BD:30:A7:8F:26:B1:52:C8:14:7B:4A:A0:39:6D:03:B6:3F`
因此 Android 可能拒绝直接覆盖安装。**不要在未备份前卸载旧版。**
安全迁移步骤：
1. 在旧版先导出 JSON 备份。
2. 若有本地视频，在旧版“备份与迁移 → 本地视频导出”逐个导出，并复制到手机安全目录。
3. 另行保存 AI 服务端地址；若忘记访问令牌，可在服务端重设 `APP_ACCESS_TOKEN`，不要把令牌发给聊天。
4. 确认备份文件和视频文件都存在后，再卸载旧 APK。
5. 安装新版，导入旧 JSON；在“本地视频导出 / 恢复”里逐条选择视频，恢复与原资料的关联。
6. 新版今后导出“完整备份（含本地视频）”。

## 尚未解决 / 下一步
- 配置固定 Android 签名密钥，避免以后每次 GitHub Actions 临时生成 Debug Key 导致更新签名冲突。当前 APK 的签名不等于旧版；以后应由用户保管 keystore，并通过 GitHub Actions Secret 配置稳定签名。
- 部署国内服务到中国大陆云主机；配置 `AI_PROVIDER=qwen`、百炼 Key、OSS Bucket 和最小权限 RAM 密钥。
- 国内真机测试图片、视频、文档、链接、搜索和页面切换。
- 评估扫描 PDF OCR、PPTX/XLSX 文档支持、视频音轨转写、更多国内平台官方搜索 API。
- 真实推理测试要在应用“设置 → 测试 AI 实际推理”中进行；健康检查 `/api/health` 的 `configured:true` 只代表检测到 Key，不代表推理成功。

## 换手机继续
先打开本文件，再打开当前分支与上述 Actions Run。核对“尚未解决 / 下一步”和“重要安装提醒”，不要覆盖旧手机的本地资料，不要从旧 APK 重新开始。


## 2026-11-09 Gemini 临时故障恢复更新

- 新增统一 Gemini 推理调用包装：文本分析、链接分析、视频分析、文件/图片/PDF 分析及实际模型连通性测试均走统一重试逻辑。
- 对 HTTP 408、425、429、500、502、503、504，以及模型繁忙/限流/暂时不可用等错误最多重试 3 次，等待间隔递增。
- 新增可选服务端环境变量 `GEMINI_FALLBACK_MODEL`：主模型重试失败后，自动尝试该备用模型（同样最多 3 次）。备用模型必须是当前 Gemini API Key 有权限调用的有效模型 ID。
- 未配置备用模型时仍会重试主模型；全部失败会返回更明确的错误，提示可配置备用模型。非临时错误（如密钥权限/参数错误）不会盲目重试。
- 已更新 `server/README.md` 的环境变量和故障恢复说明。
- 代码提交：`b2bcc594bfffbb2ad8ece4bc42a957e1c5f2d8b9`（服务端）；文档提交：`14fe55548d222207133ed3e963e24aefbd171c9c`。
- GitHub Actions 安卓构建运行：42634745436，当前状态待完成；链接：https://github.com/yulingyang46-design/equi-ai/actions/runs/42634745436。
- 注意：自动备用模型需要在 Render 等后端服务的 Environment 中新增 `GEMINI_FALLBACK_MODEL` 并填写已在 Google AI Studio 确认可用的模型 ID；此变量不能写入 APK 或 GitHub 源码。当前尚未验证真实模型调用、Render 自动部署或实体手机端表现。
