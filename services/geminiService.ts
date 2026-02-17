import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BusinessProfile, Product, GeneratedContent, ToneOfVoice } from "../types";
import { SYSTEM_INSTRUCTION, getCategoryPrompt } from "../constants";

declare const process: any;

// Helper to get Gemini Instance lazily
const getAiInstance = () => {
    // process.env.API_KEY is replaced by Vite at build time. 
    // If empty/undefined, we handle it here.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY is missing. Please configure it in your environment variables.");
        throw new Error("API Key não configurada");
    }
    return new GoogleGenAI({ apiKey });
};

// Modelos
const TEXT_MODEL_NAME = "gemini-3-flash-preview"; 
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

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
      suggestion: { type: Type.STRING, description: "Descrição visual EXTREMAMENTE DETALHADA para criar uma ILUSTRAÇÃO. IMPORTANTE: NÃO USE NOMES DE MARCAS (Ex: use 'refrigerante escuro' em vez de 'Coca-Cola')." },
    },
    required: ["type", "caption", "cta", "hashtags"],
  }
};

// Função para remover marcas registradas que bloqueiam a geração de imagens
const sanitizeImagePrompt = (text: string): string => {
  return text
    // Refrigerantes - Termos genéricos de ilustração
    .replace(/Coca-Cola|Coca Cola|Coke|Coca/gi, "generic red soda cup illustration")
    .replace(/Pepsi/gi, "generic blue soda cup illustration")
    .replace(/Fanta/gi, "orange soda illustration")
    .replace(/Guaraná|Guarana|Antarctica/gi, "golden soda bottle illustration")
    .replace(/Sprite|Soda Limão/gi, "lemon lime soda illustration")
    .replace(/Refrigerante de cola/gi, "dark soda cup illustration")
    // Chocolates e Doces
    .replace(/Nutella/gi, "hazelnut cream jar illustration")
    .replace(/Ovomaltine/gi, "chocolate malt")
    .replace(/KitKat|Kit Kat/gi, "chocolate bar illustration")
    .replace(/Kinder/gi, "milk chocolate illustration")
    // Molhos e Outros
    .replace(/Heinz/gi, "red ketchup bottle illustration")
    .replace(/Hellmann's|Hellmanns/gi, "mayonnaise jar illustration")
    // Bebidas Alcoólicas
    .replace(/Heineken/gi, "green beer bottle illustration")
    .replace(/Budweiser/gi, "red beer bottle illustration")
    // Geral
    .replace(/Garrafa de/gi, "Illustration of a bottle of")
    .replace(/Lata de/gi, "Illustration of a can of");
};

// Helper para gerar imagem individual
const generateImageForContent = async (item: any, profile: BusinessProfile): Promise<string | undefined> => {
  if (!item.suggestion || item.type === 'REPLY') return undefined;

  try {
    const ai = getAiInstance();
    
    // Determinar Aspect Ratio baseado no tipo
    const aspectRatio = item.type === 'STORY' || item.type === 'REELS' ? '9:16' : '1:1';

    // Limpeza agressiva do prompt
    const cleanSuggestion = sanitizeImagePrompt(item.suggestion);

    // MUDANÇA PRINCIPAL: Prompt focado em Ilustração Gráfica / 3D Render
    const imagePrompt = `
      Create a vibrant Marketing Digital Illustration for a food business named "${profile.name}" (${profile.category}).
      Subject: ${cleanSuggestion}.
      Style: Modern 3D marketing illustration, isometric or pop-art influence, vibrant and appetizing colors, clean smooth vector-like finish, soft studio lighting. 
      Aesthetic: Food delivery app style, colorful, cheerful, high quality digital art.
      IMPORTANT: NO PHOTOREALISM. NO TEXT. NO TRADEMARKS/LOGOS.
    `;

    console.log(`[Gerando Ilustração] Prompt: ${cleanSuggestion}`);

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      },
    });

    // Iterar para encontrar a parte da imagem
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;

  } catch (error: any) {
    console.warn(`Erro ao gerar imagem para ${item.type}:`, error);
    if (error.message?.includes('Safety') || error.message?.includes('Blocked')) {
       console.warn("IMAGEM BLOQUEADA: O modelo detectou conteúdo sensível ou marca registrada.");
    }
    return undefined;
  }
};

export const generateMarketingContent = async (
  profile: BusinessProfile,
  products: Product[],
  generationType: 'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA',
  customContext?: string
): Promise<GeneratedContent[]> => {
  
  const productListStr = products
    .map(p => `- ${p.name} (${p.category}): R$ ${p.price.toFixed(2)} - ${p.description}`)
    .join('\n');

  let prompt = `
    EMPRESA: ${profile.name}
    CIDADE: ${profile.city}
    CATEGORIA: ${profile.category}
    TOM DE VOZ: ${profile.tone}
    CONTATO: ${profile.phone}
    
    CARDÁPIO ATIVO (FONTE DA VERDADE):
    ${productListStr}
    
    CONTEXTO: ${getCategoryPrompt(profile.category)}
  `;

  if (generationType === 'PACK_SEMANAL') {
    prompt += `
    TAREFA: Crie um mini-pack (5 itens).
    - 2 Posts Feed
    - 2 Stories
    - 1 Reels Script
    - 1 Texto WhatsApp
    `;
  } else if (generationType === 'OFERTA_DIA') {
    prompt += `
    TAREFA: Crie um BUNDLE DE OFERTA DO DIA (3 itens).
    Item 1 (FEED): Legenda Instagram.
    Item 2 (WHATSAPP): Mensagem Lista Transmissão.
    Item 3 (STORY): Base para ARTE visual (ILUSTRAÇÃO). 
         - 'suggestion': Descrição visual para uma ILUSTRAÇÃO do produto. PROIBIDO USAR NOMES DE MARCAS.
         - 'hook': Título (Ex: "SÓ HOJE!").
         - 'caption': Preço/Subtítulo.
    Produto Foco: ${customContext || 'Escolha o melhor produto'}.
    `;
  } else if (generationType === 'RESPOSTA') {
    prompt += `
    TAREFA: Responda: "${customContext}".
    Gere 3 opções de resposta e 1 ideia de post.
    `;
  }

  try {
    const ai = getAiInstance(); 
    
    // 1. Gera os textos
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: contentSchema,
        temperature: 0.7, 
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    const resultContents: GeneratedContent[] = [];
    
    // 2. Processa as imagens SEQUENCIALMENTE com maior delay
    for (const item of rawData) {
       const baseItem: GeneratedContent = {
         ...item,
         id: Math.random().toString(36).substr(2, 9),
         createdAt: Date.now(),
         type: item.type || (generationType === 'RESPOSTA' ? 'REPLY' : 'FEED')
       };

       if (item.suggestion && item.type !== 'REPLY') {
          // Mantendo o delay de 2 segundos para segurança
          await new Promise(r => setTimeout(r, 2000)); 
          
          const imageBase64 = await generateImageForContent(item, profile);
          if (imageBase64) {
            baseItem.generatedImage = imageBase64;
          }
       }

       resultContents.push(baseItem);
    }

    return resultContents;

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.status === 429 || error.message?.includes('429')) {
        throw new Error("Muitas solicitações. Aguarde um momento.");
    }
    throw error;
  }
};