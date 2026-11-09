import { mediaBlob } from "./storage-v2.js";
const ENDPOINT_KEY="equiAI_ai_endpoint";
const ACCESS_KEY="equiAI_access_token";
export function getAIEndpoint(){return localStorage.getItem(ENDPOINT_KEY)||"";}
export function setAIEndpoint(value){const v=String(value||"").trim().replace(/\/$/,"");if(v)localStorage.setItem(ENDPOINT_KEY,v);else localStorage.removeItem(ENDPOINT_KEY);return v;}
export function getAIAccessToken(){return localStorage.getItem(ACCESS_KEY)||"";}
export function setAIAccessToken(value){const v=String(value||"").trim();if(v)localStorage.setItem(ACCESS_KEY,v);else localStorage.removeItem(ACCESS_KEY);return v;}
async function request(path,options={}){
  const base=getAIEndpoint();
  if(!base)throw new Error("尚未配置安全 AI 服务端地址。请在「设置」中填写部署后的服务端地址；不要填写 API 密钥。");
  let response;
  try{const headers=new Headers(options.headers||{});const token=getAIAccessToken();if(token)headers.set("Authorization","Bearer "+token);response=await fetch(base+path,{...options,headers});}catch(e){throw new Error("无法连接 AI 服务端，请检查网络和服务端地址。");}
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||("AI 服务请求失败（"+response.status+"）"));
  return body;
}
export async function analyzeText({text,task,language="中文",context=""}){
  return request("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,task,language,context})});
}
export async function analyzeUrl({url,task,context=""}){return request("/api/analyze-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url,task,context})});}
export async function analyzeVideo({mediaId,prompt="请分析这段马术教学视频",context=""}){
  const blob=await mediaBlob(mediaId);if(!blob)throw new Error("本地视频文件不存在，请重新导入。");
  const form=new FormData();form.append("video",blob,"equiai-video."+((blob.type.split("/")[1]||"mp4").replace("quicktime","mov")));form.append("prompt",prompt);form.append("context",context);
  return request("/api/analyze-video",{method:"POST",body:form});
}
export async function checkAI(){return request("/api/health");}

export async function searchVideos({query,platform="all"}){return request("/api/search-videos?q="+encodeURIComponent(query)+"&platform="+encodeURIComponent(platform),{method:"GET"});}
