import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, LeadQualificationResult } from "../types";
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from "../lib/firebase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

const SYSTEM_INSTRUCTION = `Você é um assistente virtual especialista em qualificação de leads imobiliários. 
Seu objetivo é conversar com o interessado de forma amigável e profissional para entender:
1. O que eles buscam (Casa, apartamento, terreno, comercial).
2. Localização de interesse.
3. Orçamento estimado.
4. Urgência (quando pretendem fechar).
5. Se já possuem financiamento ou recursos próprios.

Ao final da conversa, ou quando tiver informações suficientes, você deve resumir o perfil do lead.

Importante:
- Seja prestativo mas focado em obter os dados de qualificação.
- Não prometa valores exatos de imóveis, diga que a equipe de vendas consultará a disponibilidade.
- Tente obter Nome, E-mail e Telefone durante a conversa de forma natural.`;

export function createChat() {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
}

export async function qualifyLead(history: ChatMessage[]): Promise<LeadQualificationResult> {
  const filteredHistory = history
    .filter(m => m.role === 'user' || m.role === 'model')
    .map(m => ({
      role: m.role as 'user' | 'model',
      parts: m.parts
    }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...filteredHistory,
      { role: 'user', parts: [{ text: "Com base no histórico da conversa acima, extraia as informações de qualificação do lead em formato JSON." }] },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          budget: { type: Type.NUMBER },
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          location: { type: Type.STRING },
          readyToBuy: { type: Type.BOOLEAN },
          hasFinancing: { type: Type.BOOLEAN },
          urgency: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          score: { type: Type.NUMBER, description: "Score de 0 a 100 baseado no potencial do lead" },
          summary: { type: Type.STRING, description: "Um breve resumo do perfil do lead" }
        },
        required: ['readyToBuy', 'hasFinancing', 'urgency', 'score', 'summary']
      }
    }
  });

  return JSON.parse(response.text);
}
