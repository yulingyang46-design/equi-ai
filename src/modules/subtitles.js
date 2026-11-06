export function parseSubtitles(raw){
  const text=String(raw||"").replace(/^\uFEFF/,"").replace(/\r/g,"").trim();
  if(!text)return [];
  const blocks=text.replace(/^WEBVTT[^\n]*\n/,"").split(/\n\s*\n/);
  const out=[];
  for(const block of blocks){
    const lines=block.split("\n").map(x=>x.trim()).filter(Boolean);
    const ti=lines.findIndex(x=>x.includes("-->"));
    if(ti<0)continue;
    const m=lines[ti].match(/(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}/g);
    if(!m||m.length<2)continue;
    const toMs=s=>{const p=s.replace(",",".").split(":").map(Number);return Math.round(((p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1])+0)*1000);};
    const start=toMs(m[0]),end=toMs(m[1]),body=lines.slice(ti+1).join(" ").replace(/<[^>]+>/g,"").trim();
    if(body)out.push({start,end,text:body});
  }
  return out.sort((a,b)=>a.start-b.start);
}
export function formatTime(ms){
  const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;
  return h?String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0"):String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
}
export function subtitlesToText(items){return items.map(x=>"["+formatTime(x.start)+"] "+x.text).join("\n");}
