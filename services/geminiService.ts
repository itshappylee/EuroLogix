
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getLogisticsIntelligence = async (prompt: string, events: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: You are a European Logistics AI Assistant. 
      The current logistics schedule includes: ${JSON.stringify(events)}.
      User Request: ${prompt}`,
      config: {
        systemInstruction: "Provide concise, professional logistics advice. Focus on European borders, transit times, port congestion, and regional regulations like driving bans.",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I couldn't process that logistics query right now. Please check port status manually.";
  }
};

export const parseLogisticsQuery = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this natural language request into a logistics event object. Query: "${query}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Maritime', 'Road', 'Rail', 'Air', 'Holiday', 'Risk'] },
            start: { type: Type.STRING, description: 'ISO format date' },
            end: { type: Type.STRING, description: 'ISO format date' },
            location: { type: Type.STRING },
          },
          required: ['title', 'type', 'start', 'end'],
        },
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};
