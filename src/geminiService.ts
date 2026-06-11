import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("Gemini API Key is missing or using placeholder. AI features will be disabled.");
      return null;
    }
    try {
      aiInstance = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
      return null;
    }
  }
  return aiInstance;
}

export const geminiService = {
  async translateText(text: string, targetLanguage: string = 'English'): Promise<string> {
    if (!text || text.trim().length === 0) return text;
    
    const ai = getAI();
    if (!ai) return text;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text. Do not add explanations or quotes.\n\nText: ${text}`,
      });
      return response.text?.trim() || text;
    } catch (error) {
      console.error("Gemini Translation Error:", error);
      return text;
    }
  }
};
