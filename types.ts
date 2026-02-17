
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
  image_url?: string; // URL da imagem do produto
  isPopular?: boolean;
}

// Interface estendida para quando buscamos produtos com dados do restaurante (Join)
export interface PublicProduct extends Product {
  profile?: {
    name: string;
    slug: string;
    city: string;
    neighborhood?: string; // Bairro
    phone: string;
    logo_url?: string;
  }
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
  neighborhood?: string; // Novo campo: Bairro
  category: BusinessCategory;
  tone: ToneOfVoice;
  phone: string; // WhatsApp
  instagram: string;
  address?: string;
  themeColor: string;
  logo_url?: string; // URL do Logo
  banner_url?: string; // URL do Banner de capa
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
  generatedImage?: string; // Base64 image data
  createdAt?: number; // timestamp
  created_at?: string; // Supabase timestamp
  isFavorite?: boolean;
}

export enum AppView {
  MAIN_HUB = 'MAIN_HUB', // Nova tela principal
  LANDING = 'LANDING', // Landing Page para Restaurantes
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PRODUCTS = 'PRODUCTS',
  GENERATOR = 'GENERATOR',
  MENU_PREVIEW = 'MENU_PREVIEW',
  BILLING = 'BILLING',
  DISCOVERY = 'DISCOVERY'
}