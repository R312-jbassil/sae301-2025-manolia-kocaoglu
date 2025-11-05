import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1) charger l'auth depuis le cookie de la requête (pb_auth)
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response(JSON.stringify({
        error: "Non connecté. Veuillez vous reconnecter.",
        details: "AuthStore.isValid = false (cookie pb_auth manquant ?)"
      }), { status: 401, headers: { "content-type": "application/json" }});
    }

    const raw = await request.json();

    // 2) normaliser les champs (compat client ancien/nouveau)
    const data = {
      nom_modele:        raw.nom_modele || raw.nom || "TaVue Custom",
      materiau_monture:  raw.materiau_monture || raw.mat_monture,
      couleur_monture:   raw.couleur_monture  || raw.col_montureNom || raw.col_monture,
      materiau_branches: raw.materiau_branches|| raw.mat_branches,
      couleur_branches:  raw.couleur_branches || raw.col_branchesNom || raw.col_branches,
      largeur_pont:      raw.largeur_pont ?? raw.pont ?? null,
      taille_verres:     raw.taille_verres ?? raw.verres ?? null,
      prix_total:        raw.prix_total ?? raw.prix ?? null,
      svg_code:          raw.svg_code || raw.svg || null,
      id_utilisateur:    pb.authStore.model?.id || null,
    };

    // 3) validation minimale
    const required = ["nom_modele","materiau_monture","couleur_monture","materiau_branches","couleur_branches","largeur_pont","taille_verres","prix_total","svg_code","id_utilisateur"];
    const missing = required.filter(k => data[k as keyof typeof data] === null || data[k as keyof typeof data] === undefined || data[k as keyof typeof data] === "");
    if (missing.length) {
      return new Response(JSON.stringify({
        error: "Champs manquants",
        missing,
        received: Object.keys(raw)
      }), { status: 400, headers: { "content-type": "application/json" }});
    }

    // 4) create record
    const rec = await pb.collection("lunettes").create(data);
    return new Response(JSON.stringify({ success: true, id: rec.id }), {
      status: 200, headers: { "content-type": "application/json" }
    });

  } catch (e: any) {
    // cas PocketBase connu
    if (e?.status === 400) {
      return new Response(JSON.stringify({
        error: "Données invalides pour PocketBase",
        fields_error: e?.data?.data || null
      }), { status: 400, headers: { "content-type": "application/json" }});
    }
    if (e?.status === 403) {
      return new Response(JSON.stringify({
        error: "Accès refusé par PocketBase",
        details: "Vérifiez les règles RLS de la collection 'lunettes'"
      }), { status: 403, headers: { "content-type": "application/json" }});
    }
    return new Response(JSON.stringify({
      error: e?.message || "Erreur lors de la sauvegarde",
      status: e?.status, details: e?.data
    }), { status: 500, headers: { "content-type": "application/json" }});
  }
};
