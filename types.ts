
export enum BusinessCategory {
  RESTAURANTE = 'Restaurante',
  BAR = 'Bar/Boteco',
  PIZZARIA = 'Pizzaria',
  HAMBURGUERIA = 'Hamburgueria',
  LANCHONETE = 'Lanchonete',
  SORVETERIA = 'Sorveteria/Açaí',
  DOCERIA = 'Confeitaria/Doceria',
  OUTRO = 'Outro'
}

export enum ToneOfVoice {
  CASUAL = 'Casual e Amigável',
  PREMIUM = 'Premium e Sofisticado',
  ZOEIRA = 'Engraçado/Zoeira (Meme)',
  ENERGETICO = 'Energético e Promocional',
  TIO_DO_ZAP = 'Tio do Zap (Emojis e Capslock)'
}

export interface Product {
  id?: string; // Optional because Supabase generates it
  user_id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isPopular?: boolean;
}

export enum PlanTier {
  FREE = 'FREE',
  SOLO = 'SOLO',
  PRO = 'PRO',
  AGENCY = 'AGENCY'
}

export interface Subscription {
  tier: PlanTier;
  status: 'active' | 'trial' | 'canceled' | 'past_due';
  periodEnd: number;
}

export interface BusinessProfile {
  id?: string;
  user_id?: string;
  name: string;
  slug: string; // URL identifier
  city: string;
  category: BusinessCategory;
  tone: ToneOfVoice;
  phone: string; // WhatsApp
  instagram: string;
  address?: string;
  themeColor: string;
  deliveryInfo?: string; 
  subscription?: Subscription;
}

export interface GeneratedContent {
  id?: string;
  user_id?: string;
  type: 'FEED' | 'STORY' | 'REELS' | 'WHATSAPP' | 'REPLY';
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  script?: string; // For Reels
  suggestion?: string; // Visual suggestion/Image Prompt
  createdAt?: number; // timestamp
  created_at?: string; // Supabase timestamp
  isFavorite?: boolean;
}

export enum AppView {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PRODUCTS = 'PRODUCTS',
  GENERATOR = 'GENERATOR',
  MENU_PREVIEW = 'MENU_PREVIEW',
  BILLING = 'BILLING'
}
