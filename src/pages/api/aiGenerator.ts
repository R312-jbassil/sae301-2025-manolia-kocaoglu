// src/scripts/aiGenerator.ts

interface AIGeneratorConfig {
    onStart?: () => void;
    onSuccess?: (svgCode: string) => void;
    onError?: (error: string) => void;
  }
  
  export class AIGlassesGenerator {
    private chatHistory: Array<{ role: string; content: string }> = [];
    private config: AIGeneratorConfig;
  
    constructor(config: AIGeneratorConfig = {}) {
      this.config = config;
    }
  
    /**
     * Générer des lunettes à partir d'un prompt utilisateur
     */
    async generate(prompt: string): Promise<{ success: boolean; svg?: string; error?: string }> {
      try {
        if (!prompt || prompt.trim().length === 0) {
          throw new Error("Veuillez entrer une description");
        }
  
        this.config.onStart?.();
  
        console.log("🤖 Génération IA avec prompt:", prompt);
  
        const response = await fetch('/api/generateGlassesAI', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            chatHistory: this.chatHistory
          })
        });
  
        const data = await response.json();
  
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erreur lors de la génération");
        }
  
        // Ajouter à l'historique
        this.chatHistory.push(
          { role: "user", content: prompt },
          { role: "assistant", content: data.message.content }
        );
  
        console.log("✓ SVG généré avec succès");
        this.config.onSuccess?.(data.svg);
  
        return {
          success: true,
          svg: data.svg
        };
  
      } catch (error: any) {
        console.error("❌ Erreur génération IA:", error);
        const errorMessage = error?.message || "Erreur inconnue";
        this.config.onError?.(errorMessage);
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }
  
    /**
     * Réinitialiser l'historique de conversation
     */
    resetHistory() {
      this.chatHistory = [];
    }
  
    /**
     * Obtenir l'historique de conversation
     */
    getHistory() {
      return [...this.chatHistory];
    }
  }
  
  /**
   * Exemples de prompts suggérés
   */
  export const PROMPT_EXAMPLES = [
    "Lunettes rondes vintage en métal doré avec verres teintés marron",
    "Monture rectangulaire moderne en acétate noir mat",
    "Lunettes de soleil papillon rétro avec monture écaille de tortue",
    "Design minimaliste en titane argenté avec branches fines",
    "Lunettes aviateur classiques avec double pont doré",
    "Monture oversize carrée en acétate transparent",
    "Style cat-eye années 50 en acétate rouge bordeaux",
    "Lunettes sport dynamiques avec monture noire et détails néon"
  ];
  
  /**
   * Valider si un code SVG est valide
   */
  export function isValidSVG(svgCode: string): boolean {
    if (!svgCode || typeof svgCode !== 'string') {
      return false;
    }
  
    // Vérifier la présence des balises essentielles
    const hasSvgTag = /<svg[\s\S]*?<\/svg>/i.test(svgCode);
    const hasViewBox = /viewBox\s*=\s*["'][^"']*["']/i.test(svgCode);
    
    return hasSvgTag && hasViewBox;
  }
  
  /**
   * Nettoyer un code SVG
   */
  export function cleanSVG(svgCode: string): string {
    // Supprimer les backticks markdown si présents
    let cleaned = svgCode.replace(/^```[\w]*\s*|\s*```$/g, '').trim();
    
    // S'assurer qu'on a bien un SVG complet
    const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      cleaned = svgMatch[0];
    }
    
    return cleaned;
  }

  this.chatHistory.push(
    { role: "user", content: prompt },
    { role: "assistant", content: data.svg?.slice(0, 2000) || "[SVG généré]" }
  );