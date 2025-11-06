// src/pages/api/saveSVG.ts
import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Auth depuis le cookie
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = pb.authStore.model?.id;
    const body = await request.json().catch(() => ({} as any));

    // Validation minimale
    const {
      nom_modele = "TaVue Custom",
      couleur_monture,
      couleur_branches,
      couleur_verres,
      largeur_pont,
      taille_verres,
      prix_total,
      svg_code,
      id // si fourni → on update
    } = body || {};

    if (!svg_code || typeof svg_code !== "string") {
      return new Response("Missing 'svg_code'", { status: 400 });
    }

    // Données à persister (adapte les noms aux champs PB)
    const data: Record<string, any> = {
      id_utilisateur: userId,
      nom_modele,
      couleur_monture,
      couleur_branches,
      couleur_verres,
      largeur_pont,
      taille_verres,
      prix_total,
      svg_code
    };

    // Nettoyage soft: supprime les undefined pour éviter les schémas stricts
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    // Create vs Update
    let record;
    if (id) {
      record = await pb.collection("lunettes").update(id, data);
    } else {
      record = await pb.collection("lunettes").create(data);
    }

    return json({ success: true, record }, 200);
  } catch (e: any) {
    console.error("saveSVG error:", e);
    return new Response(e?.message || "Server error", { status: 500 });
  }
};
