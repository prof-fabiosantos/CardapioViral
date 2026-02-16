import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BusinessProfile, Product, GeneratedContent, ToneOfVoice } from "../types";
import { SYSTEM_INSTRUCTION, getCategoryPrompt } from "../constants";

declare const process: any;

// Initialize Gemini Client using process.env.API_KEY
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview"; 

// Schema for structured output
const contentSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['FEED', 'STORY', 'REELS', 'WHATSAPP'] },
      hook: { type: Type.STRING, description: "A primeira frase que prende a atenção (gancho) ou título da arte" },
      caption: { type: Type.STRING, description: "O corpo do texto completo com emojis" },
      cta: { type: Type.STRING, description: "Chamada para ação (Ex: Peça no Link da Bio)" },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      script: { type: Type.STRING, description: "Roteiro visual apenas para Reels" },
      suggestion: { type: Type.STRING, description: "Descrição visual exata para montar um card de oferta (Cores, Texto Grande, Elementos)" },
    },
    required: ["type", "caption", "cta", "hashtags"],
  }
};

export const generateMarketingContent = async (
  profile: BusinessProfile,
  products: Product[],
  generationType: 'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA',
  customContext?: string
): Promise<GeneratedContent[]> => {
  
  // process.env.API_KEY is assumed to be pre-configured and valid.

  const productListStr = products
    .map(p => `- ${p.name} (${p.category}): R$ ${p.price.toFixed(2)} - ${p.description}`)
    .join('\n');

  let prompt = `
    EMPRESA: ${profile.name}
    CIDADE: ${profile.city}
    CATEGORIA: ${profile.category}
    TOM DE VOZ: ${profile.tone}
    CONTATO: ${profile.phone}
    
    CARDÁPIO ATIVO (FONTE DA VERDADE - SÓ USE ESTES PREÇOS E PRODUTOS):
    ${productListStr}
    
    CONTEXTO DO USUÁRIO: ${getCategoryPrompt(profile.category)}
  `;

  if (generationType === 'PACK_SEMANAL') {
    prompt += `
    TAREFA: Crie um mini-pack de conteúdo variado (5 itens).
    Inclua:
    - 2 Legendas para Feed (foco em desejo visual e prova social)
    - 2 Textos curtos para Stories (interação, enquete)
    - 1 Roteiro de Reels (tendência/audio em alta)
    - 1 Texto para Lista de Transmissão WhatsApp (promoção ou novidade)
    `;
  } else if (generationType === 'OFERTA_DIA') {
    prompt += `
    TAREFA: Crie um BUNDLE DE OFERTA DO DIA (3 itens que funcionam juntos).
    
    Item 1 (FEED): Legenda para Instagram. Curta, direta, foco na escassez.
    Item 2 (WHATSAPP): Mensagem para Lista de Transmissão. Começa com saudação, oferta clara, link de pedido.
    Item 3 (STORY): Este item servirá de base para a ARTE visual. 
         - No campo 'suggestion', descreva como deve ser o design da imagem (ex: "Fundo laranja, foto do Burguer X gigante, Preço R$ 20 em amarelo piscando").
         - No campo 'hook', coloque o TÍTULO PRINCIPAL da arte (Ex: "SÓ HOJE!").
         - No campo 'caption', coloque o SUBTÍTULO ou PREÇO da arte.
    
    Produto Foco: ${customContext || 'Escolha um produto popular da lista acima'}.
    IMPORTANTE: Se o produto escolhido não tem preço no cadastro, use "Consulte". Não invente valor.
    `;
  } else if (generationType === 'RESPOSTA') {
    prompt += `
    TAREFA: O cliente perguntou: "${customContext}".
    Gere 3 opções de resposta educada e vendedora para usar no Direct/Comentários.
    E gere 1 ideia de post baseada nessa dúvida frequente.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: contentSchema,
        temperature: 0.7, // Lower temperature for more accurate pricing/facts
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    
    // Map to internal type and add IDs
    return rawData.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      type: item.type || (generationType === 'RESPOSTA' ? 'REPLY' : 'FEED')
    }));

  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Falha ao gerar conteúdo com IA.");
  }
};