const DB_NAME = "EquiAI-v2";
const DB_VERSION = 1;
const STORES = ["records", "media", "knowledge", "settings"];
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      for(const name of STORES) if(!db.objectStoreNames.contains(name)) db.createObjectStore(name,{keyPath:"id"});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function run(store,mode,fn){
  const db=await openDB();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode), os=tx.objectStore(store);
      let result;
      try{result=fn(os);}catch(e){reject(e);return;}
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error("存储事务已取消"));
    });
  }finally{db.close();}
}
export async function all(store){const db=await openDB();try{return await request(db.transaction(store,"readonly").objectStore(store).getAll());}finally{db.close();}}
export async function get(store,id){const db=await openDB();try{return await request(db.transaction(store,"readonly").objectStore(store).get(id));}finally{db.close();}}
export async function put(store,value){return run(store,"readwrite",os=>os.put(value));}
export async function remove(store,id){return run(store,"readwrite",os=>os.delete(id));}
export async function clear(store){return run(store,"readwrite",os=>os.clear());}
export async function saveMedia(file,meta={}){
  const id="media-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  await put("media",{id,blob:file,name:file.name||meta.name||"video",type:file.type||meta.type||"video/mp4",size:file.size||meta.size||0,savedAt:new Date().toISOString()});
  return id;
}
export async function mediaBlob(id){const item=await get("media",id);return item?.blob||null;}
export async function deleteMedia(id){return remove("media",id);}
async function readLegacyVideo(id){
  if(!id)return null;
  let db;
  try{
    db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open("EquiAI-media");
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    if(!db.objectStoreNames.contains("videos"))return null;
    const item=await request(db.transaction("videos","readonly").objectStore("videos").get(id));
    return item?.blob||null;
  }catch{return null;}finally{db?.close();}
}
export async function migrateLegacy(){
  const marker=await get("settings","legacy-migrated");if(marker)return 0;
  let old=[];try{old=JSON.parse(localStorage.getItem("equiAI_v1")||"[]");}catch{}
  let count=0;
  if(Array.isArray(old)) for(const r of old){
    if(!r||typeof r.title!=="string")continue;
    let mediaId="";
    if(r.localVideoId){
      const blob=await readLegacyVideo(r.localVideoId);
      if(blob){mediaId=r.localVideoId;await put("media",{id:mediaId,blob,name:"legacy-video",type:blob.type||"video/mp4",size:blob.size||0,savedAt:new Date().toISOString()});}
    }
    await put("records",{id:r.id||"legacy-"+Date.now()+"-"+count,title:r.title,url:r.url||"",category:r.category||"其他",language:r.language||"暂不确定",status:r.status||"待学习",notes:r.notes||"",created:r.created||new Date().toISOString(),mediaId,legacyVideoMissing:Boolean(r.localVideoId&&!mediaId),transcript:"",sourceType:r.localVideoId?"local":"link",updatedAt:new Date().toISOString()});count++;
  }
  await put("settings",{id:"legacy-migrated",value:true,at:new Date().toISOString()});
  return count;
}

function tarHeader(name,size){
  const h=new Uint8Array(512),v=new DataView(h.buffer),enc=new TextEncoder();
  const put=(offset,length,value)=>{const bytes=enc.encode(String(value));h.set(bytes.slice(0,length),offset);};
  const oct=(offset,length,n)=>{const value=Math.max(0,Number(n)||0).toString(8).padStart(length-1,"0").slice(-(length-1));put(offset,length-1,value);h[offset+length-1]=0;};
  put(0,100,name);oct(100,8,0o600);oct(108,8,0);oct(116,8,0);oct(124,12,size);oct(136,12,Math.floor(Date.now()/1000));
  for(let i=148;i<156;i++)h[i]=32;
  put(156,1,"0");put(257,6,"ustar");put(263,2,"00");
  let sum=0;for(const b of h)sum+=b;
  const checksum=sum.toString(8).padStart(6,"0");put(148,6,checksum);h[154]=0;h[155]=32;
  return h;
}
function tarEntry(name,blob){return [tarHeader(name,blob.size),blob,...(blob.size%512?[new Uint8Array(512-blob.size%512)]:[])];}
export async function exportTar(){
  const [records,knowledge,settings,media]=await Promise.all([all("records"),all("knowledge"),all("settings"),all("media")]);
  const packed=[],parts=[];
  let index=0,totalBytes=0;
  for(const item of media){
    if(!item?.blob)continue;
    const path="media/"+String(index).padStart(6,"0")+".bin";
    packed.push({id:item.id,name:item.name||"media",type:item.type||item.blob.type||"application/octet-stream",size:item.size||item.blob.size||0,savedAt:item.savedAt||"",path});
    parts.push(...tarEntry(path,item.blob));totalBytes+=item.blob.size;index++;
  }
  const manifest={app:"EquiAI",schemaVersion:4,exportedAt:new Date().toISOString(),records,knowledge,settings:settings.filter(x=>x.id!=="ai-endpoint"),media:packed};
  const meta=new Blob([JSON.stringify(manifest)],{type:"application/json"});
  const allParts=[...tarEntry("backup.json",meta),...parts,new Uint8Array(1024)];
  return {blob:new Blob(allParts,{type:"application/x-tar"}),mediaCount:index,totalBytes};
}
async function importTarFile(file){
  const dec=new TextDecoder();
  let offset=0,manifest=null;
  const mediaFiles=new Map();
  while(offset+512<=file.size){
    const header=new Uint8Array(await file.slice(offset,offset+512).arrayBuffer());
    if(header.every(x=>x===0))break;
    const name=dec.decode(header.slice(0,100)).replace(/\0.*$/s,"");
    const sizeText=dec.decode(header.slice(124,136)).replace(/\0.*$/s,"").trim();
    const size=parseInt(sizeText||"0",8);
    if(!Number.isFinite(size)||size<0||offset+512+size>file.size)throw new Error("备份 TAR 文件结构损坏或不完整。");
    const start=offset+512,end=start+size;
    if(name==="backup.json")manifest=JSON.parse(await file.slice(start,end).text());
    else if(/^media\/[0-9]{6}\.bin$/.test(name))mediaFiles.set(name,file.slice(start,end));
    offset=start+Math.ceil(size/512)*512;
  }
  if(!manifest||manifest.app!=="EquiAI"||!Array.isArray(manifest.records))throw new Error("未找到有效的 EquiAI TAR 备份清单。");
  const mediaMap=new Map();
  for(const item of (manifest.media||[])){
    const blob=mediaFiles.get(item.path);
    if(!blob||!item.id)continue;
    const id="import-media-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
    await put("media",{id,blob,name:item.name||"imported-media",type:item.type||blob.type,size:item.size||blob.size,savedAt:item.savedAt||new Date().toISOString()});
    mediaMap.set(item.id,id);
  }
  let n=0;
  for(const r of manifest.records){
    if(!r||typeof r.title!=="string")continue;
    const mediaId=mediaMap.get(r.mediaId)||"";
    const mediaMissing=Boolean(r.legacyVideoMissing||((r.mediaId||r.localVideoId)&&!mediaId));
    await put("records",{...r,id:"import-"+Date.now().toString(36)+"-"+n+"-"+Math.random().toString(36).slice(2,6),mediaId,legacyVideoMissing:mediaMissing,updatedAt:new Date().toISOString()});
    n++;
  }
  let kCount=0;
  for(const k of (manifest.knowledge||[])){
    if(!k||typeof k.title!=="string")continue;
    await put("knowledge",{...k,id:"import-k-"+Date.now().toString(36)+"-"+kCount+"-"+Math.random().toString(36).slice(2,6)});
    kCount++;
  }
  return {records:n,media:mediaMap.size,knowledge:kCount};
}
export async function importBackupFile(file){
  if(file.name?.toLowerCase().endsWith(".tar")||file.type==="application/x-tar")return importTarFile(file);
  const data=JSON.parse(await file.text());
  const records=await importAll(data);
  return {records,media:(data.media||[]).length,knowledge:(data.knowledge||[]).length};
}

async function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(reader.error||new Error("读取媒体文件失败"));reader.readAsDataURL(blob);});
}
function dataUrlToBlob(value){
  const match=String(value||"").match(/^data:([^;,]+)?;base64,(.*)$/s);if(!match)throw new Error("备份中的媒体文件格式无效");
  const binary=atob(match[2]),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:match[1]||"application/octet-stream"});
}
export async function exportAll(){
  const [records,knowledge,settings,media]=await Promise.all([all("records"),all("knowledge"),all("settings"),all("media")]);
  const packedMedia=[];
  for(const item of media){if(!item?.blob)continue;packedMedia.push({id:item.id,name:item.name||"media",type:item.type||item.blob.type||"application/octet-stream",size:item.size||item.blob.size||0,savedAt:item.savedAt||"",dataUrl:await blobToDataUrl(item.blob)});}
  return {app:"EquiAI",schemaVersion:3,exportedAt:new Date().toISOString(),records,knowledge,settings:settings.filter(x=>x.id!=="ai-endpoint"),media:packedMedia};
}
export async function importAll(data){
  let n=0;
  const mediaMap=new Map();
  for(const item of (data.media||[])){
    if(!item?.dataUrl||!item.id)continue;
    const id="import-media-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
    const blob=dataUrlToBlob(item.dataUrl);
    await put("media",{id,blob,name:item.name||"imported-media",type:item.type||blob.type,size:item.size||blob.size,savedAt:item.savedAt||new Date().toISOString()});
    mediaMap.set(item.id,id);
  }
  for(const r of (data.records||[])){
    if(!r||typeof r.title!=="string")continue;
    const mediaId=mediaMap.get(r.mediaId)||"";
    const mediaMissing=Boolean(r.legacyVideoMissing||((r.mediaId||r.localVideoId)&&!mediaId));
    await put("records",{...r,id:"import-"+Date.now().toString(36)+"-"+n+"-"+Math.random().toString(36).slice(2,6),mediaId,legacyVideoMissing:mediaMissing,updatedAt:new Date().toISOString()});
    n++;
  }
  let kCount=0;
  for(const k of (data.knowledge||[])){
    if(!k||typeof k.title!=="string")continue;
    await put("knowledge",{...k,id:"import-k-"+Date.now().toString(36)+"-"+kCount+"-"+Math.random().toString(36).slice(2,6)});
    kCount++;
  }
  return n;
}
