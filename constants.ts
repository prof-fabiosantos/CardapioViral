import { BusinessCategory, PlanTier } from './types';

// Declare process to avoid TypeScript errors (it will be replaced by Vite at build time)
declare const process: any;

export const MOCK_PRODUCTS = [
  { 
    id: '1', 
    name: 'X-Tudo Monstrão', 
    description: 'Pão brioche selado na manteiga, 2 blends de 180g, muito cheddar, bacon crocante e maionese verde secreta.', 
    price: 32.90, 
    category: 'Burgers', 
    isPopular: true,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '2', 
    name: 'Batata Frita Suprema', 
    description: 'Porção generosa para compartilhar. Acompanha cheddar cremoso e farofa de bacon.', 
    price: 25.00, 
    category: 'Porções',
    image_url: 'https://images.unsplash.com/photo-1573080496987-a199f8cd4054?auto=format&fit=crop&w=500&q=60'
  },
  { 
    id: '3', 
    name: 'Coca-Cola 2L', 
    description: 'Gelada para acompanhar a galera.', 
    price: 12.00, 
    category: 'Bebidas',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=60'
  },
];

// Configuration for Stripe Plans and Limits using process.env (Injected by Vite config)
export const STRIPE_PUBLIC_KEY = process.env.VITE_STRIPE_PUBLIC_KEY || '';

export const PLAN_CONFIG = {
  [PlanTier.FREE]: {
    name: 'Trial Grátis',
    price: 0,
    stripePriceId: '', // Free plan has no Stripe ID
    limits: {
      products: 5,
      generations: 5, // Total generations allowed in trial
      aiFeatures: ['PACK_SEMANAL'] // Limited modes
    }
  },
  [PlanTier.SOLO]: {
    name: 'Plano Solo',
    price: 29,
    stripePriceId: process.env.VITE_STRIPE_PRICE_SOLO || '', 
    limits: {
      products: 20,
      generations: 10, // Per month
      aiFeatures: ['PACK_SEMANAL', 'OFERTA_DIA']
    }
  },
  [PlanTier.PRO]: {
    name: 'Plano Pro',
    price: 59,
    stripePriceId: process.env.VITE_STRIPE_PRICE_PRO || '',
    limits: {
      products: 9999, // Unlimited
      generations: 9999, // Unlimited
      aiFeatures: ['PACK_SEMANAL', 'OFERTA_DIA', 'RESPOSTA']
    }
  }
};

export const SYSTEM_INSTRUCTION = `
Você é uma IA especialista em Marketing Digital para Gastronomia no Brasil.
Seu nome é "Chef Viral".
Seu objetivo é gerar conteúdo altamente engajador, persuasivo e adequado ao "Tom de Voz" e "Categoria" do estabelecimento.

REGRAS DE OURO (COMPLIANCE):
1. NUNCA invente preços. Se citar preço, use EXATAMENTE o que está no cadastro de produtos. Se não souber, use "consulte valor".
2. Respeite o horário de funcionamento implícito (ex: não poste "Bom dia" para um bar noturno se for um post de happy hour).
3. Linguagem nativa PT-BR, usando gírias locais adequadas ao tom (ex: "Mano", "Galera", "Top" se for casual).
4. Emojis são essenciais. Use-os com inteligência.
5. Não prometa entregas grátis ou promoções absurdas a menos que especificado no prompt do usuário.

FORMATO DE SAÍDA:
Sempre retorne JSON puro.
`;

export const getCategoryPrompt = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.BAR:
      return "Foque em happy hour, cerveja gelada, petiscos, futebol e encontro com amigos.";
    case BusinessCategory.PIZZARIA:
      return "Foque em borda recheada, forno a lenha, domingo de pizza, delivery rápido e queijo derretendo.";
    case BusinessCategory.HAMBURGUERIA:
      return "Foque em bacon crocante, carne suculenta, 'matar a fome', e fotos 'porn food'.";
    case BusinessCategory.SORVETERIA:
      return "Foque em refrescância, calor, sobremesa, cobertura extra e açaí.";
    default:
      return "Foque em sabor, qualidade dos ingredientes e experiência do cliente.";
  }
};