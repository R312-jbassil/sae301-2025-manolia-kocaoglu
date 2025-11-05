import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // Charge l'auth depuis le cookie de la requête
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Récupérer l'ID depuis les query params
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Missing ID", { status: 400 });
    }

    // Supprimer le modèle
    await pb.collection("lunettes").delete(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("Error deleting model:", e);
    return new Response(e?.message || "Error", { status: 500 });
  }
};