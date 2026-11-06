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
export async function migrateLegacy(){
  const marker=await get("settings","legacy-migrated");if(marker)return 0;
  let old=[];try{old=JSON.parse(localStorage.getItem("equiAI_v1")||"[]");}catch{}
  let count=0;
  if(Array.isArray(old)) for(const r of old){
    if(!r||typeof r.title!=="string")continue;
    await put("records",{id:r.id||"legacy-"+Date.now()+"-"+count,title:r.title,url:r.url||"",category:r.category||"其他",language:r.language||"暂不确定",status:r.status||"待学习",notes:r.notes||"",created:r.created||new Date().toISOString(),mediaId:r.localVideoId||"",transcript:"",sourceType:r.localVideoId?"local":"link",updatedAt:new Date().toISOString()});count++;
  }
  await put("settings",{id:"legacy-migrated",value:true,at:new Date().toISOString()});
  return count;
}
export async function exportAll(){
  const [records,knowledge,settings]=await Promise.all([all("records"),all("knowledge"),all("settings")]);
  return {app:"EquiAI",schemaVersion:2,exportedAt:new Date().toISOString(),records,knowledge,settings:settings.filter(x=>x.id!=="ai-endpoint")};
}
export async function importAll(data){
  let n=0;
  for(const r of (data.records||[])){if(r&&typeof r.title==="string"){await put("records",{...r,id:r.id||"import-"+Date.now()+"-"+n});n++;}}
  for(const k of (data.knowledge||[])){if(k&&typeof k.title==="string")await put("knowledge",k);}
  return n;
}
