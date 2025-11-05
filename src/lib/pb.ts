import PocketBase from 'pocketbase';
import type { TypedPocketBase } from "./pocketbase-types";
var path='';
if(import.meta.env.MODE === 'development')
    path = 'http://localhost:8090'    //localhost = machine de dev
else path = 'https://sea301.manolia.kocaoglu.fr:443'   //url du site 
const pb = new PocketBase(path) as TypedPocketBase;

if (typeof window !== "undefined") {
  try { pb.authStore.loadFromCookie(document.cookie); } catch {}
}

/** S'assure qu'un profil existe dans `utilisateur` portant le même id que `users.id`. */
export async function ensureUserProfile() {
  const u = pb.authStore.model as any;
  if (!u?.id) return null;
  try {
    // tente de récupérer le profil utilisateur avec le même id
    const profil = await pb.collection("utilisateur").getOne(u.id);
    return profil?.id || null;
  } catch {
    // sinon on le crée en forçant l'id = users.id (format compatible)
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