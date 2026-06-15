import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(desktopRoot, "..");
const appRoot = resolve(desktopRoot, "app");

await rm(resolve(appRoot, "dist"), { recursive: true, force: true });
await rm(resolve(appRoot, "assets"), { recursive: true, force: true });
await mkdir(appRoot, { recursive: true });
await cp(resolve(projectRoot, "web", "dist"), resolve(appRoot, "dist"), { recursive: true });
await cp(resolve(projectRoot, "web", "assets"), resolve(appRoot, "assets"), { recursive: true });

console.log("Prepared shared Digital Pet assets for the desktop app.");
