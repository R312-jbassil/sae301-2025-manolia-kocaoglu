// src/pages/api/generateGlassesAI.ts
import type { APIRoute } from 'astro';

const HF_TOKEN = import.meta.env.PUBLIC_HF_TOKEN;
const MODEL = "Qwen/Qwen2.5-0.5B-Instruct"; // Modèle léger et rapide

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ 
        error: "Le prompt est requis" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("=== Génération IA de lunettes (HuggingFace) ===");
    console.log("Modèle:", MODEL);
    console.log("Prompt:", prompt);

    // Construire le prompt optimisé pour Qwen
    const fullPrompt = `Tu es un expert en génération de code SVG pour des lunettes.

Tâche: Génère du code SVG valide pour des lunettes basées sur cette description: "${prompt}"

RÈGLES STRICTES:
1. Réponds UNIQUEMENT avec du code SVG, rien d'autre
2. Structure requise:
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="50 100 500 200" width="100%" height="100%">
     <g id="branches"><!-- branches des lunettes --></g>
     <g id="monture"><!-- monture --></g>
     <g id="verres"><!-- verres --></g>
   </svg>
3. Utilise des paths SVG pour dessiner les formes
4. Applique les couleurs appropriées (fill, stroke)
5. Ne génère QUE le code SVG, sans texte explicatif

Génère maintenant le SVG:`;

    // Appel à l'API HuggingFace
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur HuggingFace:", errorText);
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Réponse brute HF:", JSON.stringify(data).substring(0, 200));

    // Extraire le texte généré
    let generatedText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      generatedText = data[0].generated_text;
    } else if (data.generated_text) {
      generatedText = data.generated_text;
    } else {
      throw new Error("Format de réponse inattendu");
    }

    console.log("Texte généré:", generatedText.substring(0, 200));

    // Extraire le SVG avec plusieurs patterns
    let svgMatch = generatedText.match(/<svg[\s\S]*?<\/svg>/i);
    
    // Si pas de match, essayer de nettoyer
    if (!svgMatch) {
      // Supprimer les backticks markdown
      generatedText = generatedText.replace(/```[\w]*\s*/g, '').replace(/```/g, '');
      svgMatch = generatedText.match(/<svg[\s\S]*?<\/svg>/i);
    }
    
    if (!svgMatch) {
      console.error("Aucun SVG trouvé dans:", generatedText);
      return new Response(JSON.stringify({ 
        error: "L'IA n'a pas généré de SVG valide. Le modèle a peut-être besoin d'être plus chargé. Réessayez dans quelques secondes.",
        rawResponse: generatedText,
        tip: "Si le problème persiste, le modèle est peut-être en train de se charger sur HuggingFace"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const svgCode = svgMatch[0];
    console.log("✓ SVG extrait:", svgCode.substring(0, 100));

    // Valider que le SVG a les groupes requis
    const hasBranches = svgCode.includes('id="branches"');
    const hasMonture = svgCode.includes('id="monture"');
    const hasVerres = svgCode.includes('id="verres"');

    if (!hasBranches || !hasMonture || !hasVerres) {
      console.warn("SVG incomplet, mais on le renvoie quand même");
    }

    return new Response(JSON.stringify({ 
      success: true,
      svg: svgCode,
      model: MODEL,
      info: {
        hasBranches,
        hasMonture,
        hasVerres
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("=== ERREUR GÉNÉRATION ===");
    console.error("Message:", e?.message);
    console.error("Stack:", e?.stack);
    
    return new Response(JSON.stringify({ 
      error: "Erreur lors de la génération",
      details: e?.message || "Erreur inconnue",
      tip: "Vérifiez que votre token HuggingFace est valide et que le modèle est accessible"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};