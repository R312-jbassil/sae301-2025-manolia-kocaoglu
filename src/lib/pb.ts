// src/lib/pb.ts
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from "./pocketbase-types";

// ============================================
// CONFIGURATION DE L'URL POCKETBASE
// ============================================

let path = '';

// En développement local
if (import.meta.env.MODE === 'development') {
  path = 'http://localhost:8090';
} 
// En production
else {
  // IMPORTANT : Change cette URL selon ton hébergement PocketBase
  // Option 1 : PocketBase sur le même VPS que l'appli
  path = 'http://localhost:8090'; // Si PocketBase tourne sur le VPS
  
  // Option 2 : PocketBase sur un sous-domaine dédié
  // path = 'https://pb.manolia.kocaoglu.fr';
  
  // Option 3 : PocketBase Cloud
  // path = 'https://ton-app.pockethost.io';
}

console.log("🔧 PocketBase URL:", path, "| Mode:", import.meta.env.MODE);

// Créer l'instance PocketBase
const pb = new PocketBase(path) as TypedPocketBase;

// Désactive l'auto-cancel des requêtes
pb.autoCancellation(false);

// ============================================
// CONFIGURATION CÔTÉ CLIENT
// ============================================

if (typeof window !== "undefined") {
  // 1. Charger l'auth depuis les cookies
  try { 
    pb.authStore.loadFromCookie(document.cookie); 
    console.log("✓ Auth chargée depuis cookie:", pb.authStore.isValid);
  } catch (e) {
    console.error("❌ Erreur chargement cookie:", e);
  }
  
  // 2. Synchroniser le cookie à chaque changement d'auth
  pb.authStore.onChange(() => {
    syncAuthCookie();
  });
  
  // 3. Debug en développement
  if (import.meta.env.MODE === 'development') {
    console.log("🔍 État auth:", {
      isValid: pb.authStore.isValid,
      userId: pb.authStore.model?.id,
      email: pb.authStore.model?.email
    });
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Exporte l'auth actuelle dans un cookie lisible côté serveur
 */
export function syncAuthCookie() {
  if (typeof document === "undefined") return;
  
  const cookie = pb.authStore.exportToCookie({ 
    httpOnly: false,
    secure: import.meta.env.PROD, // Secure uniquement en production HTTPS
    sameSite: "Lax",
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 jours
  });
  
  document.cookie = cookie;
  
  if (import.meta.env.MODE === 'development') {
    console.log("🍪 Cookie synchronisé:", pb.authStore.isValid ? "✓ Valide" : "✗ Invalide");
  }
}

/**
 * S'assure qu'un profil existe dans `utilisateur` portant le même id que `users.id`
 */
export async function ensureUserProfile() {
  const u = pb.authStore.model as any;
  if (!u?.id) {
    console.log("⚠️ Pas d'utilisateur authentifié");
    return null;
  }
  
  try {
    // Vérifie si le profil existe
    const profil = await pb.collection("utilisateur").getOne(u.id);
    console.log("✓ Profil trouvé:", profil.id);
    return profil.id;
  } catch (e: any) {
    // Si le profil n'existe pas (404), le créer
    if (e?.status === 404) {
      try {
        console.log("📝 Création du profil utilisateur...");
        const created = await pb.collection("utilisateur").create({
          id: u.id,
          nom: u.name?.split(' ').pop() || "",
          prenom: u.name?.split(' ')[0] || ""
        });
        console.log("✓ Profil créé:", created.id);
        return created.id;
      } catch (createError: any) {
        console.error("❌ Erreur création profil:", createError);
        console.error("Détails:", createError.data);
        return null;
      }
    }
    console.error("❌ Erreur récupération profil:", e);
    return null;
  }
}

/**
 * Vérifier la connexion
 */
export function checkAuth() {
  const isValid = pb.authStore.isValid;
  console.log("🔐 Vérification auth:", isValid ? "✓ Connecté" : "✗ Déconnecté");
  return isValid;
}

/**
 * Se déconnecter
 */
export function logout() {
  pb.authStore.clear();
  if (typeof document !== "undefined") {
    document.cookie = "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
  console.log("👋 Déconnexion effectuée");
}

// ============================================
// GESTION DES ERREURS GLOBALES
// ============================================

// Intercepter les erreurs d'authentification
if (typeof window !== "undefined") {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('PocketBase') || e.message?.includes('fetch')) {
      console.error("🚨 Erreur PocketBase détectée:", e.message);
      console.error("Vérifiez que PocketBase est bien accessible à:", path);
    }
  });
}

export default pb;