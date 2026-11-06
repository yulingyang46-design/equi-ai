import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

const PLATFORMS = [
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"] },
  { id: "douyin", label: "抖音", hosts: ["douyin.com", "iesdouyin.com"] },
  { id: "kuaishou", label: "快手", hosts: ["kuaishou.com", "gifshow.com"] },
  { id: "bilibili", label: "哔哩哔哩", hosts: ["bilibili.com", "b23.tv"] },
  { id: "xiaohongshu", label: "小红书", hosts: ["xiaohongshu.com", "xhslink.com"] }
];

export function detectPlatform(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    return PLATFORMS.find(p => p.hosts.some(d => host === d || host.endsWith("." + d))) || { id: "web", label: "网页视频" };
  } catch {
    return { id: "unknown", label: "未知来源" };
  }
}

export async function openVideoSource(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) links are supported");
  if (Capacitor.isNativePlatform()) {
    // Opens the original URL in Android Custom Tabs. Android may route verified App Links to an installed official app.
    await Browser.open({ url: url.href, toolbarColor: "#173d32" });
    return { opened: true, method: "system-browser", platform: detectPlatform(url.href) };
  }
  const opened = window.open(url.href, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(url.href);
  return { opened: true, method: "browser", platform: detectPlatform(url.href) };
}
