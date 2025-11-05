import type { APIRoute } from "astro";
import pb from "../../lib/pb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("=== API saveSVG appelée ===");
    
    // 1) Charger l'auth depuis le cookie
    const cookie = request.headers.get("cookie") || "";
    try { 
      pb.authStore.loadFromCookie(cookie); 
    } catch (e) {
      console.error("Erreur chargement cookie:", e);
    }

    if (!pb.authStore.isValid) {
      return new Response(JSON.stringify({
        error: "Non connecté. Veuillez vous reconnecter."
      }), { 
        status: 401, 
        headers: { "content-type": "application/json" }
      });
    }

    const userId = pb.authStore.model?.id;
    if (!userId) {
      return new Response(JSON.stringify({
        error: "User ID manquant"
      }), { 
        status: 401, 
        headers: { "content-type": "application/json" }
      });
    }

    // 2) Lire les données
    const raw = await request.json();
    console.log("Données reçues:", {
      materiau_monture: raw.materiau_monture || raw.mat_monture,
      couleur_monture: raw.couleur_monture || raw.col_montureNom,
      materiau_branches: raw.materiau_branches || raw.mat_branches,
      couleur_branches: raw.couleur_branches || raw.col_branchesNom
    });

    // 3) Préparer les données - ENVOI EN TEXTE SIMPLE
    const data = {
      nom_modele: raw.nom_modele || raw.nom || "TaVue Custom",
      
      // Couleurs en texte (pas de relation)
      couleur_monture: raw.couleur_monture || raw.col_montureNom || raw.col_monture || "",
      couleur_branches: raw.couleur_branches || raw.col_branchesNom || raw.col_branches || "",
      couleur_verres: raw.couleur_verres || "",
      
      // Dimensions
      largeur_pont: Number(raw.largeur_pont ?? raw.pont ?? 18),
      taille_verres: Number(raw.taille_verres ?? raw.verres ?? 52),
      prix_total: Number(raw.prix_total ?? raw.prix ?? 0),
      
      // SVG
      svg_code: raw.svg_code || raw.svg || "",
      
      // Relation utilisateur (ID requis)
      id_utilisateur: userId
    };

    // 4) Chercher ou créer les IDs de matériaux si les champs sont des relations
    try {
      // Pour materiau_monture
      const matMontureNom = raw.materiau_monture || raw.mat_monture || "Acétate";
      let matMontureRecord = await pb.collection("materiaux").getFirstListItem(`libelle = "${matMontureNom}"`);
      data.materiau_monture = matMontureRecord.id;
    } catch {
      console.warn("Matériau monture non trouvé, tentative de création");
      try {
        const created = await pb.collection("materiaux").create({
          libelle: raw.materiau_monture || raw.mat_monture || "Acétate",
          type: "monture"
        });
        data.materiau_monture = created.id;
      } catch (e) {
        console.error("Impossible de créer le matériau monture:", e);
        // Si échec, on envoie le texte directement (si le champ accepte text)
        data.materiau_monture = raw.materiau_monture || raw.mat_monture || "Acétate";
      }
    }

    // Pour materiau_branches
    try {
      const matBranchesNom = raw.materiau_branches || raw.mat_branches || "Acétate";
      let matBranchesRecord = await pb.collection("materiaux").getFirstListItem(`libelle = "${matBranchesNom}"`);
      data.materiau_branches = matBranchesRecord.id;
    } catch {
      console.warn("Matériau branches non trouvé, tentative de création");
      try {
        const created = await pb.collection("materiaux").create({
          libelle: raw.materiau_branches || raw.mat_branches || "Acétate",
          type: "branche"
        });
        data.materiau_branches = created.id;
      } catch (e) {
        console.error("Impossible de créer le matériau branches:", e);
        data.materiau_branches = raw.materiau_branches || raw.mat_branches || "Acétate";
      }
    }

    console.log("Données finales à envoyer:", {
      ...data,
      svg_code: data.svg_code.substring(0, 50) + "..."
    });

    // 5) Créer l'enregistrement
    const rec = await pb.collection("lunettes").create(data);
    console.log("✓ Modèle créé:", rec.id);

    return new Response(JSON.stringify({ 
      success: true, 
      id: rec.id 
    }), {
      status: 200, 
      headers: { "content-type": "application/json" }
    });

  } catch (e: any) {
    console.error("=== ERREUR API saveSVG ===");
    console.error("Status:", e?.status);
    console.error("Message:", e?.message);
    console.error("Data:", e?.data);
    
    // Messages d'erreur détaillés
    if (e?.status === 400) {
      return new Response(JSON.stringify({
        error: "Données invalides",
        details: e?.data?.data || e?.message,
        help: "Vérifiez que les champs materiaux sont bien configurés comme Relation dans PocketBase"
      }), { 
        status: 400, 
        headers: { "content-type": "application/json" }
      });
    }
    
    if (e?.status === 403) {
      return new Response(JSON.stringify({
        error: "Accès refusé",
        details: "Vérifiez les règles API de la collection 'lunettes'",
        rule: "@request.auth.id != '' && @request.data.id_utilisateur = @request.auth.id"
      }), { 
        status: 403, 
        headers: { "content-type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({
      error: e?.message || "Erreur serveur",
      status: e?.status,
      details: e?.data
    }), { 
      status: 500, 
      headers: { "content-type": "application/json" }
    });
  }
};