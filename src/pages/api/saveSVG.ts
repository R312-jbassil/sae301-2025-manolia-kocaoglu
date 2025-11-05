import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Charge l'auth depuis le cookie de la requête
    const cookie = request.headers.get("cookie") || "";
    try { pb.authStore.loadFromCookie(cookie); } catch {}

    if (!pb.authStore.isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = await request.json();

    // Option A : si tu utilises une relation `lunettes.id_utilisateur` → `utilisateur`
    // et que ton profil `utilisateur` a le même id que `users.id`,
    // alors:
    const userId = pb.authStore.model?.id;
    // Essaye de créer si ton schéma l'exige explicitement (sinon enlève la ligne suivante):
    // data.id_utilisateur = userId;

    const rec = await pb.collection("lunettes").create(data);

    return new Response(JSON.stringify(rec), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    return new Response(e?.message || "Error", { status: 500 });
  }
};
