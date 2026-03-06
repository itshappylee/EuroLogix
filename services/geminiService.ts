
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
        systemInstruction: "Provide concise, professional logistics advice. Focus ONLY on European logistics strikes (Strike), truck traffic bans (Traffic Ban), and public holidays (Holiday). Ignore maritime, air, or standard port operations unless they are directly affected by a strike.",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I couldn't process that logistics query right now. Please check port status manually.";
  }
};

export const getPortCongestion = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Check the current port congestion status for Port of Koper (Slovenia) and Port of Rijeka (Croatia). Provide a status for each: 'Congested', 'Moderate', or 'Fluid'. Return as a JSON object with port names as keys.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Koper: { type: Type.STRING, enum: ['Congested', 'Moderate', 'Fluid'] },
            Rijeka: { type: Type.STRING, enum: ['Congested', 'Moderate', 'Fluid'] }
          },
          required: ['Koper', 'Rijeka']
        }
      },
    });
    
    const text = response.text;
    if (!text) return { Koper: 'Fluid', Rijeka: 'Fluid' };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching port congestion:", error);
    return { Koper: 'Fluid', Rijeka: 'Fluid' };
  }
};

export const getRealTimeLogisticsEvents = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Find major logistics strikes (Strike), truck traffic bans (Traffic Ban), and ALL public holidays (Holiday) for European countries (SK, HU, PL, CZ, IT, DE, AT, UA, RO, SI) for the year 2026. Pay special attention to Easter holidays in April 2026 (Good Friday, Easter Monday) which vary by country. Return them as a JSON array of events.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Risk', 'Holiday'] },
              start: { type: Type.STRING, description: 'ISO date string' },
              end: { type: Type.STRING, description: 'ISO date string' },
              location: { type: Type.STRING },
              countryCode: { type: Type.STRING, description: 'ISO 2-letter country code (e.g., SK, DE, PL)' },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['planned', 'delayed', 'on-time'] },
              category: { type: Type.STRING, enum: ['Strike', 'Traffic Ban', 'Holiday'] },
              sourceUrl: { type: Type.STRING, description: 'URL to the source of information' }
            },
            required: ['title', 'type', 'start', 'end', 'location', 'countryCode', 'category', 'sourceUrl']
          }
        }
      },
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching real-time logistics:", error);
    return [];
  }
};
