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
// UPGRADE: Trocando para o modelo PRO de imagem para evitar bloqueios e melhorar qualidade
const IMAGE_MODEL_NAME = "gemini-3-pro-image-preview";

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
      suggestion: { type: Type.STRING, description: "Descrição visual para uma ILUSTRAÇÃO 3D (Estilo Pixar/Disney). Foco em comida apetitosa, cores vibrantes, fundo limpo. PROIBIDO MARCAS." },
    },
    required: ["type", "caption", "cta", "hashtags"],
  }
};

// Função para remover marcas registradas E termos de realismo que bloqueiam a geração
const sanitizeImagePrompt = (text: string): string => {
  return text
    // REMOVER TERMOS DE REALISMO (CRÍTICO PARA EVITAR BLOQUEIOS)
    .replace(/ultra-realista|hiper-realista|realista|realistic|photorealistic|photo-realistic/gi, "stylized 3D render")
    .replace(/fotografia|foto|photo|photography|camera|lens|shot|clique|macro/gi, "illustration")
    .replace(/4k|8k|hd|high definition|detalhado|detailed/gi, "vibrant high quality")

    // Refrigerantes - Termos genéricos
    .replace(/Coca-Cola|Coca Cola|Coke|Coca/gi, "red soda cup")
    .replace(/Pepsi/gi, "blue soda cup")
    .replace(/Fanta/gi, "orange soda")
    .replace(/Guaraná|Guarana|Antarctica/gi, "golden soda")
    .replace(/Sprite|Soda Limão/gi, "lemon lime soda")
    .replace(/Refrigerante de cola/gi, "dark soda")
    // Chocolates e Doces
    .replace(/Nutella/gi, "hazelnut cream")
    .replace(/Ovomaltine/gi, "chocolate malt")
    .replace(/KitKat|Kit Kat/gi, "chocolate wafer")
    .replace(/Kinder/gi, "milk chocolate")
    .replace(/M&M|Confeti/gi, "colorful chocolate candies")
    .replace(/Oreo|Negresco/gi, "chocolate sandwich cookie")
    // Molhos e Outros
    .replace(/Heinz/gi, "ketchup bottle")
    .replace(/Hellmann's|Hellmanns/gi, "mayonnaise")
    // Fast Food Brands
    .replace(/McDonald's|McDonalds|Mc Donalds/gi, "cheeseburger")
    .replace(/Burger King|BK/gi, "grilled burger")
    .replace(/Starbucks/gi, "coffee cup")
    .replace(/Heineken/gi, "green beer bottle")
    .replace(/Budweiser/gi, "red beer bottle");
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

    // Prompt Otimizado para Gemini 3 Pro Image
    const imagePrompt = `
      Create a cute, high-quality 3D Marketing Illustration (Pixar style) for a food business named "${profile.name}".
      Subject: ${cleanSuggestion}.
      Style: 3D Render, isometric, vibrant colors, soft studio lighting, clean solid color background.
      Quality: Masterpiece, trending on artstation.
      Restrictions: NO TEXT, NO TRADEMARKS, NO REALISTIC PHOTOS.
    `;

    console.log(`[Gerando Ilustração PRO] Prompt: ${cleanSuggestion}`);

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME, // Usando gemini-3-pro-image-preview
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K" // Recurso exclusivo do modelo Pro
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
    Item 3 (STORY): Base para ARTE visual (ILUSTRAÇÃO 3D). 
         - 'suggestion': Descrição visual LÚDICA e ESTILIZADA de "${customContext || 'Produto principal'}". Use termos como "cartoon", "3d render". PROIBIDO MARCAS.
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
    
    // 2. Processa as imagens SEQUENCIALMENTE
    for (const item of rawData) {
       const baseItem: GeneratedContent = {
         ...item,
         id: Math.random().toString(36).substr(2, 9),
         createdAt: Date.now(),
         type: item.type || (generationType === 'RESPOSTA' ? 'REPLY' : 'FEED')
       };

       if (item.suggestion && item.type !== 'REPLY') {
          // Delay de 2s mantido para segurança
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