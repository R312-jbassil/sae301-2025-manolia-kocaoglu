// src/pages/api/generateGlassesAI.ts

import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

/** Charge .env à la main si process.env ne contient pas HF_TOKEN */
function loadDotEnvIfNeeded() {
  const hasHF =
    !!process.env.HF_TOKEN || !!process.env.PRIVATE_HF_TOKEN;
  if (hasHF) return;

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        // retire guillemets éventuels
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] == null) process.env[key] = val;
      }
    }
  } catch {}
}

// tente de charger .env si besoin
loadDotEnvIfNeeded();

// -------- ENV (process.env d'abord, fallback import.meta.env) --------------
const readEnv = (k: string): string | undefined => {
  if (typeof process !== "undefined" && process?.env && process.env[k]) return process.env[k] as string;
  const ie = (import.meta as any)?.env || {};
  if (ie[k]) return ie[k];
  if (ie[`PUBLIC_${k}`]) return ie[`PUBLIC_${k}`];
  return undefined;
};

const HF_TOKEN = readEnv("HF_TOKEN") || readEnv("PRIVATE_HF_TOKEN");
const MODEL = readEnv("HUGGINGFACE_MODEL") || "Qwen/Qwen2.5-7B-Instruct";

// -------- Utils -------------------------------------------------------------
const corsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders() },
  });

const buildFullPrompt = (userPrompt: string) => {
  const system =
    "Tu renvoies UNIQUEMENT un SVG inline valide (<svg>…</svg>) représentant des lunettes vue de face, 512x256. " +
    "Classes: .frame, .temple-left, .temple-right, .lens-left, .lens-right. " +
    "Pas de texte hors <svg>, pas de <script>, pas de <foreignObject>. Paths/rect/circle/ellipse uniquement.";
  return `SYSTEM: ${system}\n\nUSER: Génère un SVG inline selon la description: ${userPrompt}`;
};
const extractSVG = (t: string) => t?.match?.(/<svg[\s\S]*?<\/svg>/i)?.[0] ?? null;

// -------- Handlers ----------------------------------------------------------
export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: corsHeaders() });

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify({
      ok: true,
      expects: "POST",
      hasToken: !!(process.env.HF_TOKEN || process.env.PRIVATE_HF_TOKEN || (import.meta as any)?.env?.HF_TOKEN),
      model: MODEL
    }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
    });
  };

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!HF_TOKEN) {
      return json(
        {
          success: false,
          stage: "env",
          error: "Missing HF token",
          fix: [
            "Vérifie que .env est dans le MÊME dossier que package.json",
            "Ligne exacte: HF_TOKEN=hf_XXXX (sans guillemets, sans espaces)",
            "Redémarre: npm run dev",
            "Ou lance: HF_TOKEN=hf_XXXX npm run dev",
          ],
          debug: {
            cwd: typeof process !== "undefined" ? process.cwd() : "no-process",
            has_process_env: Boolean(process?.env?.HF_TOKEN || process?.env?.PRIVATE_HF_TOKEN),
            has_import_meta_env: Boolean((import.meta as any)?.env?.HF_TOKEN || (import.meta as any)?.env?.PRIVATE_HF_TOKEN),
          },
        },
        500
      );
    }

    if (!(request.headers.get("content-type") || "").includes("application/json")) {
      return json({ success: false, error: "Content-Type must be application/json" }, 415);
    }

    const { prompt, style } = (await request.json()) as { prompt?: string; style?: string };
    if (!prompt?.trim()) return json({ success: false, error: "Le champ 'prompt' est requis (string non vide)." }, 400);

    const fullPrompt = buildFullPrompt([prompt.trim(), style?.trim()].filter(Boolean).join(". "));

    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { max_new_tokens: 2048, temperature: 0.6, top_p: 0.95, return_full_text: false, do_sample: true },
        options: { wait_for_model: true, use_cache: true },
      }),
    });

    const text = await hfRes.text();

    if (!hfRes.ok) {
      let details: any = null;
      try { details = JSON.parse(text); } catch { details = text.slice(0, 1000); }
      return json({ success: false, stage: "hf-error", status: hfRes.status, statusText: hfRes.statusText, model: MODEL, details }, hfRes.status);
    }

    let raw = text;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length) {
        const first = parsed[0];
        raw = first?.generated_text ?? first?.text ?? (typeof first === "string" ? first : JSON.stringify(first));
      } else if (parsed && typeof parsed === "object") {
        raw = (parsed as any).generated_text ?? (parsed as any).text ?? text;
      }
    } catch { /* texte brut, ok */ }

    const svg = extractSVG(raw);
    if (!svg) return json({ success: false, stage: "parse-svg", error: "Aucun <svg> détecté.", sample: raw.slice(0, 800) }, 422);

    return json({ success: true, model: MODEL, svg, info: { length: svg.length } });
  } catch (e: any) {
    return json({ success: false, stage: "unhandled", error: e?.message || String(e) }, 500);
  }
};
