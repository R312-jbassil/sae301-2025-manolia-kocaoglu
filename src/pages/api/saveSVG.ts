import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Charge l'auth depuis le cookie de la requête
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response(JSON.stringify({ error: "Non connecté. Veuillez vous connecter." }), { 
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }

    const data = await request.json();

    // Récupérer l'ID de l'utilisateur connecté
    const userId = pb.authStore.model?.id;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Utilisateur non identifié" }), { 
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }
    
    // IMPORTANT : Assigner l'id_utilisateur pour lier le modèle à l'utilisateur
    data.id_utilisateur = userId;

    console.log("Saving model for user:", userId);
    console.log("Model data:", data);

    // Créer le modèle dans la collection lunettes
    const rec = await pb.collection("lunettes").create(data);

    return new Response(JSON.stringify(rec), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("Error saving model:", e);
    return new Response(JSON.stringify({ 
      error: e?.message || "Erreur lors de la sauvegarde",
      details: e
    }), { 
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};