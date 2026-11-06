import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";

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
const system=`You are EquiAI, a careful equestrian learning assistant. Answer in Chinese by default. Preserve source meaning. Separate source facts, analysis/inference, and items needing verification. Never invent quotations, measurements, diagnoses, medication doses, or URLs. For the first occurrence of a specialist term, write Chinese (English). For equestrian knowledge entries, make steps concrete and actionable. Flag safety, welfare, and medical uncertainty clearly.`;
function client(){if(!process.env.GEMINI_API_KEY)throw new Error("服务端尚未配置 GEMINI_API_KEY。");return new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});}
app.use("/api", (req,res,next)=>{
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
app.listen(port,"0.0.0.0",()=>console.log("EquiAI AI service listening on "+port));
