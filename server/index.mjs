import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import mammoth from "mammoth";

const app=express();
const port=Number(process.env.PORT||8080);
const maxMb=Math.min(Number(process.env.MAX_VIDEO_MB||200),500);
const upload=multer({dest:os.tmpdir(),limits:{fileSize:maxMb*1024*1024}});
app.use(express.json({limit:"2mb"}));
app.use((req,res,next)=>{
  const allowed=(process.env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const origin=req.headers.origin;
  if(!origin||!allowed.length||allowed.includes(origin)){if(origin)res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");}
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS")return res.sendStatus(204);
  next();
});
const system=`You are EquiAI, a careful equestrian learning assistant. Answer in Chinese by default. Preserve all user-supplied source meaning and existing structure; never delete requirements or silently rewrite the original structure. Only refine and supplement. Separate 【来源原文】, 【整理归纳】, 【推断】 and 【需核实】. Mark unknown facts [需核实]. Never invent quotations, measurements, diagnoses, medication doses, sources or URLs. For the first occurrence of a specialist term, write Chinese (English). Avoid vague filler and duplicate steps. Make content actionable with concrete actions, frequency, duration, tools, numeric standards, checkpoints and judgment criteria; if a value cannot be verified, mark [需核实] rather than guessing.
For M entries use: ## M编号 标题; 一句话定义; 适用场景; 核心要点; 操作步骤 (optional); 注意事项; 关联词条. M65–M67 clinical entries use 临床定义; 场景; at least five 排查处置 steps; 易错点; 关联词条. Lameness workflow: 静立→直线慢步/快步→转弯/圆圈→硬地对比→屈曲试验; distinguish front-limb head nod from hind-limb croup drop.
For R entries, match R22 practical depth: 适用对象; 核心宗旨; 前置硬性要求; 单次操作时长; 操作步骤. Give tools, handler position, action, frequency, numbers and assessment standards. R48 career path must remain 助教→初级教练→中级教练→高级/主教练→技术总监.
For horse health, medication, lameness and riding safety, state evidence limits and risks; never present model output as diagnosis or treatment instructions.`;
function client(){if(!process.env.GEMINI_API_KEY)throw new Error("服务端尚未配置 GEMINI_API_KEY。");return new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});}
app.use("/api", (req,res,next)=>{
  if(req.path==="/health")return next();
  const expected=process.env.APP_ACCESS_TOKEN;
  if(!expected)return res.status(503).json({error:"服务端尚未配置 APP_ACCESS_TOKEN。"});
  const supplied=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(supplied!==expected)return res.status(401).json({error:"访问令牌无效，请检查应用设置。"});
  next();
});
app.get("/api/health",(req,res)=>res.json({ok:true,service:"EquiAI AI service",configured:Boolean(process.env.GEMINI_API_KEY),model:process.env.GEMINI_MODEL||"gemini-3.8-flash"}));
app.post("/api/analyze",async(req,res)=>{
  try{
    const {text="",task="分析并整理马术学习资料",language="中文",context=""}=req.body||{};
    if(!String(text).trim())return res.status(400).json({error:"请先提供字幕或教学文字。"});
    if(String(text).length>180000)return res.status(413).json({error:"文本过长，请分段处理。"});
    const result=await client().models.generateContent({model:process.env.GEMINI_MODEL||"gemini-3.8-flash",contents:system+"\n\n任务："+task+"\n输出语言："+language+"\n补充背景："+context+"\n\n原始资料：\n"+text});
    res.json({ok:true,model:process.env.GEMINI_MODEL||"gemini-3.8-flash",text:result.text||"",usage:result.usageMetadata||null});
  }catch(e){console.error("analyze:",e);res.status(502).json({error:e.message||"AI 分析失败，请稍后重试。"});}
});
app.post("/api/analyze-url",async(req,res)=>{
  try{
    const {url="",task="分析该马术视频来源页面",context=""}=req.body||{};
    let parsed;try{parsed=new URL(url);}catch{return res.status(400).json({error:"视频链接格式无效。"});}
    if(!["http:","https:"].includes(parsed.protocol))return res.status(400).json({error:"仅支持 HTTP 或 HTTPS 链接。"});
    const result=await client().models.generateContent({
      model:process.env.GEMINI_MODEL||"gemini-3.8-flash",
      contents:system+"\n\n请尝试读取下方公开视频页面可访问的文字、说明和字幕线索，并完成任务："+task+"。背景："+context+"。如果无法读取视频画面或完整字幕，必须明确说明，不得假装看过视频。\n来源链接："+parsed.href,
      config:{tools:[{urlContext:{}}]}
    });
    res.json({ok:true,model:process.env.GEMINI_MODEL||"gemini-3.8-flash",text:result.text||"",usage:result.usageMetadata||null});
  }catch(e){console.error("analyze-url:",e);res.status(502).json({error:e.message||"视频链接分析失败。"});}
});
app.post("/api/analyze-video",upload.single("video"),async(req,res)=>{
  const file=req.file;
  if(!file)return res.status(400).json({error:"没有收到视频文件。"});
  let ai, remote;
  try{
    ai=client();
    const mime=req.file.mimetype||"video/mp4";
    remote=await ai.files.upload({file:file.path,config:{mimeType:mime}});
    for(let i=0;i<60&&String(remote.state)!=="ACTIVE";i++){
      if(String(remote.state)==="FAILED")throw new Error(remote.error?.message||"Gemini 视频预处理失败。");
      await new Promise(r=>setTimeout(r,5000));
      remote=await ai.files.get({name:remote.name});
    }
    if(String(remote.state)!=="ACTIVE")throw new Error("视频处理超时，请缩短视频或稍后重试。");
    const prompt=String(req.body?.prompt||"请分析马术教学视频");
    const context=String(req.body?.context||"");
    const result=await ai.models.generateContent({model:process.env.GEMINI_MODEL||"gemini-3.8-flash",contents:createUserContent([createPartFromUri(remote.uri,remote.mimeType),system+"\n\n任务："+prompt+"\n背景："+context+"\n请按时间顺序整理：画面内容、骑手动作、马匹反应、教学要点、可能错误、纠正建议、无法确认之处。不要臆测画面看不清的细节。"])});
    res.json({ok:true,model:process.env.GEMINI_MODEL||"gemini-3.8-flash",text:result.text||"",usage:result.usageMetadata||null});
  }catch(e){console.error("analyze-video:",e);res.status(502).json({error:e.message||"视频分析失败。"});}
  finally{if(ai&&remote?.name)await ai.files.delete({name:remote.name}).catch(()=>{});await fs.unlink(file.path).catch(()=>{});}
});


app.post("/api/analyze-file",upload.single("file"),async(req,res)=>{
  const file=req.file;if(!file)return res.status(400).json({error:"没有收到文件。"});
  let ai,remote;
  try{
    const name=String(file.originalname||"").toLowerCase();
    const mime=file.mimetype||"application/octet-stream";
    const prompt=String(req.body?.prompt||"分析这份马术学习资料");
    const context=String(req.body?.context||"");
    let source="";
    if(/\.(txt|md|csv)$/i.test(name)||mime.startsWith("text/")){
      if(file.size>10*1024*1024)throw new Error("文本文件超过 10 MB，请拆分后再上传。");
      source=await fs.readFile(file.path,"utf8");
    }else if(/\.docx$/i.test(name)||mime.includes("wordprocessingml")){
      const parsed=await mammoth.extractRawText({path:file.path});source=parsed.value||"";
      if(!source.trim())throw new Error("未能从 DOCX 文档提取到文字。");
    }else if(mime==="application/pdf"||/\.pdf$/i.test(name)||mime.startsWith("image/")){
      ai=client();remote=await ai.files.upload({file:file.path,config:{mimeType:mime}});
      const result=await ai.models.generateContent({model:process.env.GEMINI_MODEL||"gemini-3.8-flash",contents:createUserContent([createPartFromUri(remote.uri,remote.mimeType),system+"\n\n任务："+prompt+"\n背景："+context+"\n请识别并分析文件内容；对看不清或无法确认的信息明确标记，不要臆测。"])});
      return res.json({ok:true,model:process.env.GEMINI_MODEL||"gemini-3.8-flash",text:result.text||"",usage:result.usageMetadata||null});
    }else{
      return res.status(415).json({error:"暂不支持此文件类型。请使用图片、PDF、DOCX、TXT、MD 或 CSV。"});
    }
    if(!source.trim())throw new Error("文件中没有可分析的文字内容。");
    if(source.length>180000)source=source.slice(0,180000)+"\n[内容过长，已截取前 180000 字符]";
    const result=await client().models.generateContent({model:process.env.GEMINI_MODEL||"gemini-3.8-flash",contents:system+"\n\n任务："+prompt+"\n背景："+context+"\n\n文档原文：\n"+source});
    res.json({ok:true,model:process.env.GEMINI_MODEL||"gemini-3.8-flash",text:result.text||"",usage:result.usageMetadata||null});
  }catch(e){console.error("analyze-file:",e);res.status(502).json({error:e.message||"文件分析失败。"});}
  finally{if(ai&&remote?.name)await ai.files.delete({name:remote.name}).catch(()=>{});await fs.unlink(file.path).catch(()=>{});}
});

function decodeSearchHtml(value=""){return String(value).replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/\s+/g," ").trim();}
function unwrapSearchUrl(raw){try{const u=new URL(raw.startsWith("//")?"https:"+raw:raw);return u.searchParams.get("uddg")||u.href;}catch{return raw;}}
function identifyVideoPlatform(raw){try{const h=new URL(raw).hostname.toLowerCase().replace(/^www\./,"");if(h.includes("youtube.com")||h==="youtu.be")return "youtube";if(h.includes("bilibili.com")||h==="b23.tv")return "bilibili";if(h.includes("douyin.com"))return "douyin";if(h.includes("kuaishou.com")||h.includes("gifshow.com"))return "kuaishou";if(h.includes("xiaohongshu.com")||h.includes("xhslink.com"))return "xiaohongshu";return "web";}catch{return "web";}}
function parseSearchHtml(html){const links=[...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];const snippets=[...html.matchAll(/<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/gi)];return links.map((m,i)=>{const url=unwrapSearchUrl(m[1]);let domain="";try{domain=new URL(url).hostname.replace(/^www\./,"");}catch{}return {title:decodeSearchHtml(m[2]),url,snippet:decodeSearchHtml(snippets[i]?.[1]||""),domain,platform:identifyVideoPlatform(url)};});}
app.get("/api/search-videos",async(req,res)=>{
  const query=String(req.query.q||"").trim().slice(0,160);
  if(!query)return res.status(400).json({error:"请输入视频搜索关键词。"});
  const platform=String(req.query.platform||"all");
  const domains={youtube:"(site:youtube.com OR site:youtu.be)",bilibili:"(site:bilibili.com OR site:b23.tv)",douyin:"site:douyin.com",kuaishou:"(site:kuaishou.com OR site:gifshow.com)",xiaohongshu:"(site:xiaohongshu.com OR site:xhslink.com)",other:"-site:youtube.com -site:bilibili.com -site:douyin.com"};
  const q=query+" 马术 视频 "+(domains[platform]||"");
  try{
    let results=[],provider="",failures=[];
    try{
      const response=await fetch("https://html.duckduckgo.com/html/?q="+encodeURIComponent(q),{headers:{"User-Agent":"Mozilla/5.0 (compatible; ZizaiHorseLibrary/1.0)","Accept":"text/html"},signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error("DuckDuckGo HTTP "+response.status);
      results=parseSearchHtml(await response.text());if(!results.length)throw new Error("DuckDuckGo 未返回可解析结果");provider="DuckDuckGo";
    }catch(e){failures.push("DuckDuckGo: "+e.message);}
    if(!results.length){
      try{
        const response=await fetch("https://www.bing.com/search?format=rss&q="+encodeURIComponent(q),{headers:{"User-Agent":"Mozilla/5.0 (compatible; ZizaiHorseLibrary/1.0)","Accept":"application/rss+xml,application/xml,text/xml"},signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw new Error("Bing RSS HTTP "+response.status);
        const xml=await response.text();
        results=[...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)].map(m=>{
          const part=m[1],get=t=>decodeSearchHtml((part.match(new RegExp("<"+t+">([\\s\\S]*?)<\\/"+t+">","i"))||[])[1]||"");
          const url=get("link"),title=get("title"),snippet=get("description");let domain="";try{domain=new URL(url).hostname.replace(/^www\\./,"");}catch{}
          return {title,url,snippet,domain,platform:identifyVideoPlatform(url)};
        }).filter(x=>x.url);
        if(!results.length)throw new Error("Bing RSS 未返回可解析结果");provider="Bing RSS";
      }catch(e){failures.push("Bing: "+e.message);}
    }
    const seen=new Set();
    results=results.filter(x=>x.url&&/^https?:\\/\\//i.test(x.url)&&!seen.has(x.url)&&seen.add(x.url));
    if(platform!=="all"&&platform!=="other")results=results.filter(x=>x.platform===platform);
    if(platform==="other")results=results.filter(x=>x.platform==="web");
    if(!results.length&&failures.length===2)throw new Error("搜索服务均不可用；"+failures.join("；"));
    res.json({ok:true,provider:provider+" 公开网页索引",results:results.slice(0,15),warning:failures.length?failures.join("；"):""});
  }catch(e){console.error("search-videos:",e);res.status(502).json({error:e.message||"联网搜索失败，请稍后重试。"});}
});

app.listen(port,"0.0.0.0",()=>console.log("Zizai Horse Library service listening on "+port));
