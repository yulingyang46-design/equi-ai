import { mediaBlob } from "./storage-v2.js";
const ENDPOINT_KEY="equiAI_ai_endpoint";
const ACCESS_KEY="equiAI_access_token";
const REGION_KEY="equiAI_service_region";
export function getAIRegion(){return localStorage.getItem(REGION_KEY)||"overseas";}
export function setAIRegion(value){const v=value==="china"?"china":"overseas";localStorage.setItem(REGION_KEY,v);return v;}
export function getAIEndpoint(){const region=getAIRegion();return localStorage.getItem(ENDPOINT_KEY+"_"+region)||(region==="overseas"?localStorage.getItem(ENDPOINT_KEY)||"":"");}
export function setAIEndpoint(value){const v=String(value||"").trim().replace(/\/$/,""),key=ENDPOINT_KEY+"_"+getAIRegion();if(v)localStorage.setItem(key,v);else localStorage.removeItem(key);if(getAIRegion()==="overseas"){if(v)localStorage.setItem(ENDPOINT_KEY,v);else localStorage.removeItem(ENDPOINT_KEY);}return v;}
export function getAIAccessToken(){const region=getAIRegion();return localStorage.getItem(ACCESS_KEY+"_"+region)||(region==="overseas"?localStorage.getItem(ACCESS_KEY)||"":"");}
export function setAIAccessToken(value){const v=String(value||"").trim(),key=ACCESS_KEY+"_"+getAIRegion();if(v)localStorage.setItem(key,v);else localStorage.removeItem(key);if(getAIRegion()==="overseas"){if(v)localStorage.setItem(ACCESS_KEY,v);else localStorage.removeItem(ACCESS_KEY);}return v;}
async function request(path,options={}){
  const base=getAIEndpoint();
  if(!base)throw new Error("尚未配置安全 AI 服务端地址。请在「设置」中填写部署后的服务端地址；不要填写 API 密钥。");
  let response;
  try{const headers=new Headers(options.headers||{});const token=getAIAccessToken();if(token)headers.set("Authorization","Bearer "+token);response=await fetch(base+path,{...options,headers});}catch(e){throw new Error("无法连接 AI 服务端："+(e?.message||"网络请求失败")+"。请检查网络、服务端地址及跨域配置。");}
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

export async function analyzeUpload({file,prompt="请分析这份马术学习资料",context=""}){
  if(!file)throw new Error("请先选择文件。");
  const isVideo=file.type.startsWith("video/");if(getAIRegion()==="china"&&isVideo&&file.size>7*1024*1024)throw new Error("国内服务当前本地视频直传上限为 7 MB；请先使用较小视频，较大视频的 OSS 中转正在规划接入。");if(getAIRegion()==="china"&&file.type.startsWith("image/")&&file.size>10*1024*1024)throw new Error("国内服务图片暂限 10 MB，请压缩后上传。");
  const form=new FormData();form.append(isVideo?"video":"file",file,file.name||"learning-material");
  form.append("prompt",prompt);form.append("context",context);
  const path=isVideo?"/api/analyze-video":"/api/analyze-file";
  return request(path,{method:"POST",body:form});
}
