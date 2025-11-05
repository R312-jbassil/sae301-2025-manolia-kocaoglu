import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Charge l'auth depuis le cookie de la requête
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = pb.authStore.model?.id;

    // Récupérer tous les modèles de l'utilisateur
    const records = await pb.collection("lunettes").getFullList({
      sort: '-created',
      filter: `id_utilisateur = "${userId}"`
    });

    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("Error fetching models:", e);
    return new Response(e?.message || "Error", { status: 500 });
  }
};