// src/lib/pb.ts
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from "./pocketbase-types";

let path = '';
if (import.meta.env.MODE === 'development') path = 'http://localhost:8090';
else path = 'https://sae301.manolia.kocaoglu.fr:443'; // <-- corrige "sae301"

const pb = new PocketBase(path) as TypedPocketBase;

// côté client: recharge depuis cookie si dispo
if (typeof window !== "undefined") {
  try { pb.authStore.loadFromCookie(document.cookie); } catch {}
}

/** Exporte l’auth actuelle dans un cookie lisible côté serveur (même origin). */
export function syncAuthCookie() {
  if (typeof document === "undefined") return;
  // SameSite=Lax pour que le cookie remonte sur /api/*
  document.cookie = pb.authStore.exportToCookie({ httpOnly: false, sameSite: "Lax" });
}

/** S'assure qu'un profil existe dans `utilisateur` portant le même id que `users.id`. */
export async function ensureUserProfile() {
  const u = pb.authStore.model as any;
  if (!u?.id) return null;
  try {
    const profil = await pb.collection("utilisateur").getOne(u.id);
    return profil?.id || null;
  } catch {
    try {
      const created = await pb.collection("utilisateur").create({
        id: u.id, nom: u.name || "", prenom: ""
      });
      return created.id;
    } catch (e) {
      console.error("Creation profil utilisateur failed", e);
      return null;
    }
  }
}

export default pb;
