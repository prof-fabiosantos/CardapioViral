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
      suggestion: { type: Type.STRING, description: "Descrição visual EXTREMAMENTE DETALHADA para criar uma imagem. IMPORTANTE: NÃO USE NOMES DE MARCAS (Ex: use 'refrigerante' em vez de 'Coca-Cola', 'ketchup' em vez de 'Heinz')." },
    },
    required: ["type", "caption", "cta", "hashtags"],
  }
};

// Helper para gerar imagem individual
const generateImageForContent = async (item: any, profile: BusinessProfile): Promise<string | undefined> => {
  if (!item.suggestion || item.type === 'REPLY') return undefined;

  try {
    const ai = getAiInstance();
    
    // Determinar Aspect Ratio baseado no tipo
    const aspectRatio = item.type === 'STORY' || item.type === 'REELS' ? '9:16' : '1:1';

    // Melhorar o prompt para o modelo de imagem
    // Forçamos a remoção de termos de marca comuns caso a IA de texto tenha falhado nisso
    const cleanSuggestion = item.suggestion
      .replace(/Coca-Cola|Coca Cola|Coke/gi, "dark soda glass bottle")
      .replace(/Pepsi/gi, "soda")
      .replace(/Nutella/gi, "chocolate hazelnut cream")
      .replace(/Heineken/gi, "green beer bottle")
      .replace(/McDonald's|McDonalds/gi, "fast food burger");

    const imagePrompt = `
      Professional food photography advertisement for ${profile.name} (${profile.category}).
      Subject: ${cleanSuggestion}.
      Style: High quality, appetizing, studio lighting, 4k resolution, cinematic composition, delicious.
      No text overlays inside the image. No brand logos.
    `;

    console.log(`Gerando imagem para ${item.type}...`);

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          // imageSize: "1K" // Supported only on Pro models, Flash sets automatically
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
    // Se o erro for de segurança, logamos especificamente
    if (error.message?.includes('Safety') || error.message?.includes('Blocked')) {
       console.warn("Imagem bloqueada por filtros de segurança (provavelmente marca registrada).");
    }
    return undefined; // Retorna sem imagem se falhar, não quebra o fluxo
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
         - No campo 'suggestion', descreva como deve ser o design da imagem (ex: "Close-up ultra realista do Burguer X com queijo derretendo, fundo desfocado escuro").
         - IMPORTANTE: NÃO CITE MARCAS FAMOSAS (ex: Coca-Cola) na suggestion. Use genéricos (ex: refrigerante, cola).
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
    
    // 2. Processa as imagens SEQUENCIALMENTE para evitar Rate Limit e Bloqueios
    // Usar 'for...of' em vez de Promise.all
    for (const item of rawData) {
       const baseItem: GeneratedContent = {
         ...item,
         id: Math.random().toString(36).substr(2, 9),
         createdAt: Date.now(),
         type: item.type || (generationType === 'RESPOSTA' ? 'REPLY' : 'FEED')
       };

       // Gera imagem se tiver sugestão (exceto para respostas de texto puro)
       if (item.suggestion && item.type !== 'REPLY') {
          // Pequeno delay artificial para aliviar a API se houver muitos itens
          await new Promise(r => setTimeout(r, 500)); 
          
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
    // Verificar se é erro de cota (429) e lançar erro amigável
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
        throw new Error("Muitas solicitações ao mesmo tempo. Aguarde 30 segundos.");
    }
    throw error;
  }
};