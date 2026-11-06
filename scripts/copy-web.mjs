import { mkdir, copyFile, cp } from "node:fs/promises";

await mkdir("www", { recursive: true });
await copyFile("index.html", "www/index.html");
await cp("src", "www/src", { recursive: true });
console.log("EquiAI web app and modular source files copied to www/");
