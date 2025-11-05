// src/lib/pb.ts
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from "./pocketbase-types";

// Configuration de l'URL PocketBase
let path = '';
if (import.meta.env.MODE === 'development') {
  path = 'http://localhost:8090';
} else {
  // CORRECTION : Vérifie que cette URL est correcte
  // Remplace par ton URL réelle de production
  path = 'https://sae301.manolia.kocaoglu.fr';
}

const pb = new PocketBase(path) as TypedPocketBase;

// Désactive l'auto-cancel des requêtes
pb.autoCancellation(false);

// Côté client : recharge depuis cookie si disponible
if (typeof window !== "undefined") {
  try { 
    pb.authStore.loadFromCookie(document.cookie); 
  } catch (e) {
    console.error("Erreur chargement cookie:", e);
  }
  
  // Synchronise le cookie à chaque changement d'auth
  pb.authStore.onChange(() => {
    syncAuthCookie();
  });
}

/**
 * Exporte l'auth actuelle dans un cookie lisible côté serveur
 */
export function syncAuthCookie() {
  if (typeof document === "undefined") return;
  
  const cookie = pb.authStore.exportToCookie({ 
    httpOnly: false,
    secure: import.meta.env.PROD, // Secure uniquement en production
    sameSite: "Lax",
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 jours
  });
  
  document.cookie = cookie;
  console.log("Cookie synchronisé:", pb.authStore.isValid);
}

/**
 * S'assure qu'un profil existe dans `utilisateur` portant le même id que `users.id`
 */
export async function ensureUserProfile() {
  const u = pb.authStore.model as any;
  if (!u?.id) {
    console.log("Pas d'utilisateur authentifié");
    return null;
  }
  
  try {
    // Vérifie si le profil existe
    const profil = await pb.collection("utilisateur").getOne(u.id);
    console.log("Profil trouvé:", profil.id);
    return profil.id;
  } catch (e: any) {
    // Si le profil n'existe pas (404), le créer
    if (e?.status === 404) {
      try {
        console.log("Création du profil utilisateur...");
        const created = await pb.collection("utilisateur").create({
          id: u.id,
          nom: u.name?.split(' ').pop() || "",
          prenom: u.name?.split(' ')[0] || ""
        });
        console.log("Profil créé:", created.id);
        return created.id;
      } catch (createError: any) {
        console.error("Erreur création profil:", createError);
        return null;
      }
    }
    console.error("Erreur récupération profil:", e);
    return null;
  }
}

// Helper pour vérifier la connexion
export function checkAuth() {
  return pb.authStore.isValid;
}

// Helper pour se déconnecter
export function logout() {
  pb.authStore.clear();
  if (typeof document !== "undefined") {
    document.cookie = "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

export default pb;