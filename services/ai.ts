
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNPCResponse = async (history: {role: string, parts: {text: string}[]}[], userMessage: string, type: 'guide' | 'merchant' = 'guide'): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    let systemInstruction = "";
    if (type === 'merchant') {
      systemInstruction = "You are a greedy but charming travelling merchant in a dangerous pixel dungeon. You sell potions and upgrades for gold. You speak quickly and enthusiastically. Keep responses very short (max 20 words). You want the player to buy something.";
    } else {
      systemInstruction = "You are distinct 'Old Knight', a retired pixel-art hero living in the safe zone of an infinite dungeon. You are weary but helpful. You speak in short, slightly archaic, but punchy sentences suitable for a fast-paced game. Keep responses under 30 words.";
    }

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map(h => ({
        role: h.role === 'player' ? 'user' : 'model',
        parts: h.parts
      }))
    });

    const response = await chat.sendMessage({ message: userMessage });
    return response.text || "...";
  } catch (error) {
    console.error("AI Error:", error);
    return "The spirits are silent today... (Check API Key)";
  }
};
