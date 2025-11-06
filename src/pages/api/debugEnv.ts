// src/pages/api/debugEnv.ts
import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const GET: APIRoute = async () => {
  const envPath = path.resolve(process.cwd(), ".env");
  const exists = fs.existsSync(envPath);
  let head = "";
  try {
    if (exists) {
      const raw = fs.readFileSync(envPath, "utf8");
      head = raw.split(/\r?\n/).slice(0, 10).join("\n"); // aperçu (sans valeurs secrètes)
    }
  } catch {}

  const importMeta = (import.meta as any)?.env || {};
  const keysImportMeta = Object.keys(importMeta).filter(k => /HF_TOKEN|PRIVATE_HF_TOKEN|HUGGINGFACE_MODEL/.test(k));

  return new Response(JSON.stringify({
    cwd: process.cwd(),
    env_file_exists: exists,
    env_file_path: envPath,
    env_file_head_preview: head.replace(/(HF_TOKEN|PRIVATE_HF_TOKEN)\s*=.*/g, "$1=********"),
    process_env_seen: {
      HF_TOKEN: !!process.env.HF_TOKEN,
      PRIVATE_HF_TOKEN: !!process.env.PRIVATE_HF_TOKEN,
      HUGGINGFACE_MODEL: !!process.env.HUGGINGFACE_MODEL,
    },
    import_meta_env_seen: keysImportMeta,
  }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
};
