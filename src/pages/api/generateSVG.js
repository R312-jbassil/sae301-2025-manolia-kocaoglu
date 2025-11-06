import OpenAI from "openai";

// Configuration OpenRouter
const BASE_URL = "https://openrouter.ai/api/v1";
const ACCESS_TOKEN = "VOTRE_CLE_OPENROUTER"; // ⚠️ À remplacer par votre clé

export const POST = async ({ request }) => {
    console.log("Requête reçue pour generateSVG");

    // Extraction des messages du corps de la requête
    const messages = await request.json();
    
    // Initialisation du client OpenAI avec l'URL de base et le token d'API
    const client = new OpenAI({
        baseURL: BASE_URL,
        apiKey: ACCESS_TOKEN,
    });
    
    // Création du message système pour guider le modèle
    let SystemMessage = {
        role: "system",
        content: `You are an SVG code generator specialized in eyeglasses/sunglasses design. 
Generate SVG code for eyeglasses modifications based on user requests.
The SVG should represent eyeglasses with customizable properties like:
- Frame shape (round, square, cat-eye, aviator, rectangular)
- Frame color
- Lens color/tint
- Temple (arm) style
- Bridge style
- Size adjustments

Make sure to:
1. Include ids for each part (monture, branches, verres)
2. Use a viewBox="50 100 500 200" for consistency with the existing design
3. Center the glasses horizontally
4. Keep the design clean and professional
5. Use proper SVG paths and shapes
6. Follow the same structure as the existing SVG with groups: #branches, #monture, #verres

Respond ONLY with the SVG code, no explanations.`,
    };
    
    try {
        // Appel à l'API pour générer le code SVG
        const chatCompletion = await client.chat.completions.create({
            model: "meta-llama/llama-3.2-3b-instruct:free", // Modèle gratuit
            messages: [SystemMessage, ...messages],
        });
        
        // Récupération du message généré par l'API
        const message = chatCompletion.choices[0].message || { content: "" };
        
        console.log("Message généré:", message);
        
        // Recherche d'un élément SVG dans le message généré
        const svgMatch = message.content.match(/<svg[\s\S]*?<\/svg>/i);
        
        // Si un SVG est trouvé, le remplace dans le message, sinon laisse une chaîne vide
        message.content = svgMatch ? svgMatch[0] : "";
        
        // Retourne une réponse JSON contenant le SVG généré
        return new Response(JSON.stringify({ svg: message }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Erreur lors de la génération du SVG:", error);
        return new Response(
            JSON.stringify({ 
                error: "Erreur lors de la génération", 
                details: error.message 
            }), 
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
};