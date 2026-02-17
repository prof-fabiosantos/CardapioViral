import React, { useState, useEffect, useRef } from 'react';
import { AppView, BusinessProfile, Product, GeneratedContent, BusinessCategory, ToneOfVoice, PlanTier, PublicProduct } from './types';
import { MOCK_PRODUCTS, PLAN_CONFIG, STRIPE_PUBLIC_KEY } from './constants';
import { generateMarketingContent, generateSingleImage } from './services/geminiService';
import { dbService } from './services/dbService';
import { supabase } from './lib/supabaseClient';

// Icons
import { 
  ChefHat, LayoutDashboard, Utensils, Sparkles, LogOut, 
  Menu as MenuIcon, User, Copy, Share2, 
  Trash2, Plus, MessageCircle, Instagram, ExternalLink,
  Smartphone, Zap, ArrowRight, CheckCircle, Lock, AlertTriangle,
  SearchX, Mail, Image as ImageIcon, MapPin, Phone,
  QrCode, X, Download, Upload, Loader2, ChevronDown, ChevronUp, Star, Clock, DollarSign, RefreshCw,
  MoreHorizontal, Heart, Send, Search, Filter, ShoppingBag, Store, ChevronLeft
} from 'lucide-react';

// Declare Stripe on window since we loaded it via script tag
declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

// --- Components ---

// 1. Sidebar / Layout
const Layout = ({ 
  children, 
  currentView, 
  onChangeView,
  profile,
  onLogout
}: { 
  children?: React.ReactNode, 
  currentView: AppView, 
  onChangeView: (v: AppView) => void,
  profile?: BusinessProfile | null,
  onLogout: () => void
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.GENERATOR, label: 'IA de Marketing', icon: Sparkles },
    { id: AppView.PRODUCTS, label: 'Cardápio/Produtos', icon: Utensils },
    { id: AppView.BILLING, label: 'Assinatura', icon: User },
  ];

  // Views that don't use the Sidebar layout
  if (currentView === AppView.MAIN_HUB ||
      currentView === AppView.LANDING || 
      currentView === AppView.AUTH || 
      currentView === AppView.ONBOARDING || 
      currentView === AppView.MENU_PREVIEW ||
      currentView === AppView.DISCOVERY) {
    return <>{children}</>;
  }

  const handleOpenPublicMenu = () => {
     if (!profile?.slug) return;
     const fullUrl = `${window.location.origin}/#/m/${profile.slug}`;
     window.open(fullUrl, '_blank');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xl cursor-pointer" onClick={() => onChangeView(AppView.LANDING)}>
            <ChefHat size={28} />
            <span>Cardápio Viral</span>
          </div>
          {profile && (
             <div className="mt-2">
                <div className="text-xs text-gray-500 font-medium truncate">{profile.name}</div>
                <div className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 inline-block px-2 py-0.5 rounded mt-1">
                  {PLAN_CONFIG[profile.subscription?.tier || PlanTier.FREE].name}
                </div>
             </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-orange-50 text-orange-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={handleOpenPublicMenu}
             className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg mb-2"
           >
              <ExternalLink size={20} />
              Ver Cardápio Público
           </button>
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white z-20 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-orange-600 font-bold" onClick={() => onChangeView(AppView.LANDING)}>
           <ChefHat size={24} />
           <span>ViralMenu</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
          <MenuIcon size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col p-4 md:hidden">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsMobileMenuOpen(false)}><LogOut size={24} /></button>
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onChangeView(item.id); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-4 w-full px-4 py-4 text-lg font-medium border-b border-gray-100"
            >
              <item.icon size={24} />
              {item.label}
            </button>
          ))}
          <button 
             onClick={handleOpenPublicMenu}
             className="flex items-center gap-4 w-full px-4 py-4 text-lg font-medium border-b border-gray-100 text-gray-600"
           >
              <ExternalLink size={24} />
              Ver Cardápio Público
           </button>
           <button onClick={onLogout} className="flex items-center gap-4 w-full px-4 py-4 text-lg font-medium border-b border-gray-100 text-red-600">
              <LogOut size={24} /> Sair
           </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 pt-16 md:pt-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- MAIN HUB COMPONENT (NEW ROOT LANDING) ---
const MainHub = ({ onClient, onBusiness }: { onClient: () => void, onBusiness: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans relative">
      {/* Lado do Cliente (Quero Comer) */}
      <div 
        onClick={onClient}
        className="flex-1 relative group cursor-pointer overflow-hidden border-b-8 md:border-b-0 md:border-r-8 border-white"
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors"></div>
        
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8">
           <div className="bg-white/20 backdrop-blur-md p-4 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <ShoppingBag className="text-white w-12 h-12 md:w-16 md:h-16" />
           </div>
           <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">Estou com Fome</h2>
           <p className="text-lg md:text-xl text-white/90 max-w-md mb-8 drop-shadow-md">
              Encontre comida boa perto de você. Explore cardápios de restaurantes locais e peça pelo WhatsApp.
           </p>
           <button className="bg-white text-gray-900 font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:bg-gray-100 transition-all flex items-center gap-2">
              Buscar Comida <ArrowRight size={20} />
           </button>
        </div>
      </div>

      {/* Lado do Restaurante (Sou Restaurante) */}
      <div 
        onClick={onBusiness}
        className="flex-1 relative group cursor-pointer overflow-hidden"
      >
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
         <div className="absolute inset-0 bg-orange-600/90 group-hover:bg-orange-600/95 transition-colors"></div>

         <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8">
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full mb-6 group-hover:scale-110 transition-transform">
               <Store className="text-white w-12 h-12 md:w-16 md:h-16" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">Sou Restaurante</h2>
            <p className="text-lg md:text-xl text-white/90 max-w-md mb-8 drop-shadow-md">
               Crie seu cardápio digital, use IA para gerar marketing e venda mais. Tudo automático.
            </p>
            <button className="bg-gray-900 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:bg-black transition-all flex items-center gap-2">
               Criar Cardápio <Sparkles size={20} />
            </button>
         </div>
      </div>

      {/* Logo Centralizado (Overlay) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
         <ChefHat className="text-orange-600" size={24} />
         <span className="font-bold text-gray-900 text-lg tracking-tight">Cardápio Viral</span>
      </div>
    </div>
  );
};

// --- BUSINESS LANDING PAGE (SOU RESTAURANTE) ---
const Landing = ({ onStart, onLogin, onBack }: { onStart: () => void, onLogin: () => void, onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xl cursor-pointer" onClick={onBack}>
            <ChefHat size={32} />
            <span>Cardápio Viral</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-500 text-sm hover:text-gray-900 hidden md:flex items-center gap-1">
               <ChevronLeft size={16}/> Voltar
            </button>
            <button onClick={onLogin} className="text-gray-600 font-medium hover:text-orange-600 px-4 py-2 text-sm md:text-base">
              Já tenho conta
            </button>
            <button onClick={onStart} className="bg-orange-600 text-white px-4 py-2 md:px-5 md:py-2 rounded-full font-bold hover:bg-orange-700 transition-transform hover:scale-105 shadow-lg shadow-orange-200 text-sm md:text-base">
              Começar Agora
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 bg-gradient-to-b from-orange-50 to-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold mb-6 animate-fade-in-up">
              <Sparkles size={14} /> Inteligência Artificial para Gastronomia
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Transforme Seguidores em <span className="text-orange-600">Clientes Famintos</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto md:mx-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              Crie um cardápio digital irresistível e deixe nossa IA gerar posts, stories e ofertas que vendem por você.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <button 
                onClick={onStart}
                className="bg-orange-600 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-xl hover:bg-orange-700 hover:shadow-2xl transition-all transform hover:-translate-y-1"
              >
                Criar Minha Loja Grátis
              </button>
              <div className="flex items-center gap-2 text-gray-500 text-sm px-4 justify-center md:justify-start">
                 <CheckCircle size={16} className="text-green-500" /> Sem cartão necessário
              </div>
            </div>
          </div>
          
          {/* Image Collage */}
          <div className="flex-1 relative z-0">
              <div className="relative w-full max-w-lg mx-auto">
               <div className="absolute top-0 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
               <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
               <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
               
               <div className="grid grid-cols-2 gap-4 relative">
                  <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80" alt="Hambúrguer Suculento" className="rounded-2xl shadow-lg transform translate-y-8 hover:scale-105 transition-transform duration-500" />
                  <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80" alt="Pizza" className="rounded-2xl shadow-lg hover:scale-105 transition-transform duration-500" />
                  <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80" alt="Bebidas e Galera" className="rounded-2xl shadow-lg transform -translate-y-8 hover:scale-105 transition-transform duration-500" />
                  <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-500">
                     <Sparkles className="text-orange-500 mb-2" size={32} />
                     <span className="font-bold text-gray-900">IA Geradora</span>
                     <span className="text-xs text-gray-500">Legendas e Artes em 1 clique</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

       <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
                <ChefHat size={24} /> <span>Cardápio Viral</span>
            </div>
            <p className="mb-4 max-w-xs">A plataforma #1 de Marketing com Inteligência Artificial para pequenos negócios de alimentação no Brasil.</p>
            </div>
        </div>
       </footer>
    </div>
  );
};

// --- NEW COMPONENT: DiscoveryView (Marketplace) ---

const DiscoveryView = ({ onBack, onSelectStore }: { onBack: () => void, onSelectStore: (slug: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState(''); // Cidade ou Bairro
  const [priceFilter, setPriceFilter] = useState<number | null>(null); // null = all, 0 = 0-50, 50 = 50-100, 100 = 100+
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const categories = Object.values(BusinessCategory);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    
    // Convert price filter to ranges
    let minPrice, maxPrice;
    if (priceFilter === 0) { minPrice = 0; maxPrice = 50; }
    else if (priceFilter === 50) { minPrice = 50; maxPrice = 100; }
    else if (priceFilter === 100) { minPrice = 100; maxPrice = 9999; }

    const results = await dbService.searchGlobalProducts({
      location: locationFilter,
      searchTerm: searchTerm,
      category: categoryFilter,
      minPrice,
      maxPrice
    });

    setProducts(results);
    setLoading(false);
  };

  // Trigger search on mount (empty) or when filters change
  useEffect(() => {
     handleSearch();
  }, [priceFilter, categoryFilter]); 

  return (
    <div className="min-h-screen bg-gray-50">
       {/* Discovery Header */}
       <div className="bg-gradient-to-r from-orange-600 to-orange-500 pb-24 pt-8 px-4">
          <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div onClick={onBack} className="flex items-center gap-2 text-white font-bold cursor-pointer hover:opacity-80">
                   <ChefHat /> Cardápio Viral
                </div>
                <button onClick={onBack} className="text-white/80 hover:text-white text-sm font-bold flex items-center gap-1">
                   <ChevronLeft size={16}/> Voltar
                </button>
             </div>
             
             <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-6 text-center leading-tight">
                Encontre comida boa <br/>perto de você.
             </h1>

             {/* Search Bar */}
             <div className="bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 py-2 border-b md:border-b-0 md:border-r border-gray-100">
                   <MapPin className="text-gray-400 mr-2" />
                   <input 
                      className="w-full outline-none text-gray-700 font-medium placeholder-gray-400" 
                      placeholder="Sua cidade ou bairro (Ex: Moema)"
                      value={locationFilter}
                      onChange={e => setLocationFilter(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                   />
                </div>
                <div className="flex-[2] flex items-center px-4 py-2">
                   <Search className="text-gray-400 mr-2" />
                   <input 
                      className="w-full outline-none text-gray-700 font-medium placeholder-gray-400" 
                      placeholder="O que você quer comer? (Ex: X-Bacon)"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                   />
                </div>
                <button 
                  onClick={handleSearch}
                  className="bg-gray-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-black transition-colors"
                >
                   Buscar
                </button>
             </div>
          </div>
       </div>

       {/* Filters & Content */}
       <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10 pb-20">
          
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
             {/* Category Filter */}
             <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                   <button 
                      onClick={() => setCategoryFilter('')}
                      className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!categoryFilter ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                   >
                      Todos
                   </button>
                   {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                         {cat}
                      </button>
                   ))}
                </div>
             </div>
             
             {/* Price Filter */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                 <button onClick={() => setPriceFilter(null)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${priceFilter === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Qualquer Preço</button>
                 <button onClick={() => setPriceFilter(0)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${priceFilter === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'}`}>Até R$50</button>
                 <button onClick={() => setPriceFilter(50)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${priceFilter === 50 ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'}`}>R$50 - R$100</button>
                 <button onClick={() => setPriceFilter(100)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${priceFilter === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'}`}>R$100+</button>
             </div>
          </div>

          {/* Results Grid */}
          {loading ? (
             <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-orange-600" size={48} />
             </div>
          ) : (
             <>
               <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <ShoppingBag className="text-orange-600" />
                  {products.length > 0 ? 'Cardápio Personalizado para você' : 'Nenhum item encontrado'}
               </h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                     <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden group">
                        {/* Restaurant Header inside Card */}
                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {product.profile?.logo_url ? (
                                <img src={product.profile.logo_url} className="w-8 h-8 rounded-full border border-white" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                   {product.profile?.name.charAt(0)}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                 <p className="text-xs font-bold text-gray-900 truncate">{product.profile?.name}</p>
                                 <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                    <MapPin size={10}/> 
                                    {product.profile?.city} 
                                    {product.profile?.neighborhood && <span className="text-gray-400"> • {product.profile.neighborhood}</span>}
                                 </p>
                              </div>
                           </div>
                           <button 
                             onClick={() => product.profile?.slug && onSelectStore(product.profile.slug)}
                             className="text-[10px] font-bold text-orange-600 hover:underline"
                           >
                             Ver Loja
                           </button>
                        </div>
                        
                        {/* Product Body */}
                        <div className="p-4 flex gap-4">
                           <div className="flex-1">
                              <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
                              <div className="flex items-center justify-between">
                                 <span className="font-bold text-green-700 text-lg">R$ {product.price.toFixed(2)}</span>
                                 <button 
                                   onClick={() => {
                                      const msg = `Olá, vi o ${product.name} no Cardápio Viral e gostaria de pedir!`;
                                      const url = `https://wa.me/55${product.profile?.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                                      window.open(url, '_blank');
                                   }}
                                   className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 shadow-md group-hover:scale-110 transition-transform"
                                   title="Pedir no WhatsApp"
                                 >
                                    <MessageCircle size={18} />
                                 </button>
                              </div>
                           </div>
                           {product.image_url && (
                             <img src={product.image_url} className="w-24 h-24 object-cover rounded-lg bg-gray-100" />
                           )}
                        </div>
                     </div>
                  ))}
               </div>
               
               {products.length === 0 && hasSearched && (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <SearchX size={32} />
                     </div>
                     <h3 className="font-bold text-gray-900">Nenhum prato encontrado</h3>
                     <p className="text-gray-500">Tente mudar o filtro de preço ou procurar por outra coisa.</p>
                  </div>
               )}
             </>
          )}
       </div>
    </div>
  );
};

// --- AUTH COMPONENT ---
const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ 
       email,
       options: {
         emailRedirectTo: window.location.origin
       }
    });
    if (error) alert(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
           <div className="inline-block p-3 bg-orange-100 rounded-full text-orange-600 mb-4">
             <ChefHat size={32} />
           </div>
           <h2 className="text-2xl font-bold text-gray-900">Acesse sua conta</h2>
           <p className="text-gray-500">Digite seu e-mail para entrar ou criar conta.</p>
        </div>

        {sent ? (
          <div className="text-center bg-green-50 p-6 rounded-xl border border-green-100">
             <Mail className="mx-auto text-green-600 mb-2" size={32} />
             <h3 className="font-bold text-green-800">Link enviado!</h3>
             <p className="text-sm text-green-700">Verifique seu e-mail para acessar o sistema.</p>
             <button onClick={() => setSent(false)} className="mt-4 text-sm text-green-800 underline">Tentar outro e-mail</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
               <input 
                 type="email" 
                 required 
                 className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                 placeholder="seu@email.com"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
               />
             </div>
             <button 
               disabled={loading}
               className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" /> : 'Receber Link de Acesso'}
             </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- ONBOARDING COMPONENT ---
const Onboarding = ({ onComplete }: { onComplete: (p: BusinessProfile, products: Product[]) => void }) => {
   const [step, setStep] = useState(1);
   const [formData, setFormData] = useState<Partial<BusinessProfile>>({
     name: '',
     city: '',
     neighborhood: '',
     category: BusinessCategory.OUTRO,
     tone: ToneOfVoice.CASUAL,
     phone: '',
     logo_url: '' // Added missing field init
   });
   const [loading, setLoading] = useState(false);

   const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onloadend = () => {
         setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
       };
       reader.readAsDataURL(file);
     }
   };

   const handleSubmit = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const slug = formData.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
      
      const newProfile: BusinessProfile = {
         user_id: user.id,
         name: formData.name || '',
         city: formData.city || '',
         neighborhood: formData.neighborhood || '',
         category: formData.category || BusinessCategory.OUTRO,
         tone: formData.tone || ToneOfVoice.CASUAL,
         phone: formData.phone || '',
         slug,
         instagram: '',
         themeColor: '#ea580c',
         logo_url: formData.logo_url || '',
         subscription: { tier: PlanTier.FREE, status: 'active', periodEnd: Date.now() + 30*24*60*60*1000 }
      };

      // Tenta inserir
      let { data: profile, error } = await supabase.from('profiles').insert(newProfile).select().single();

      // Fallback para schema antigo (sem coluna neighborhood)
      if (error && (error.message?.includes('neighborhood') || error.code === '42703')) { // 42703 is undefined_column
          console.warn("Schema desatualizado: Coluna neighborhood ausente. Inserindo sem ela.");
          const { neighborhood, ...profileLegacy } = newProfile;
          const retry = await supabase.from('profiles').insert(profileLegacy).select().single();
          profile = retry.data;
          error = retry.error;
      }

      if (error) {
         console.error(error);
         alert("Erro ao criar perfil. " + error.message);
         setLoading(false);
         return;
      }

      // Add sample products
      const sampleProducts = MOCK_PRODUCTS.map(p => ({ ...p, user_id: user.id }));
      // Remove IDs to let DB generate them
      const productsToInsert = sampleProducts.map(({ id, ...rest }) => rest);
      
      const { data: products } = await supabase.from('products').insert(productsToInsert).select();
      
      onComplete(profile as BusinessProfile, products as Product[] || []);
   };

   return (
     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
       <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-xl">
          <div className="mb-6">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-orange-600 uppercase">Passo {step} de 2</span>
                <div className="flex gap-1">
                   <div className={`h-1 w-12 rounded-full ${step >= 1 ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
                   <div className={`h-1 w-12 rounded-full ${step >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
                </div>
             </div>
             <h2 className="text-2xl font-bold text-gray-900">
               {step === 1 ? 'Sobre o seu Negócio' : 'Personalidade da Marca'}
             </h2>
          </div>

          {step === 1 ? (
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento</label>
                   <input className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Pizzaria do João" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Logomarca</label>
                   <div className="flex items-center gap-4">
                      {formData.logo_url && <img src={formData.logo_url} className="w-16 h-16 rounded-full object-cover border" />}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                   <input className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: São Paulo" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                   <input className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} placeholder="Ex: Vila Madalena" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                   <select className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as BusinessCategory})}>
                      {Object.values(BusinessCategory).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <button onClick={() => setStep(2)} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 hover:bg-orange-700">Próximo</button>
             </div>
          ) : (
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp para Pedidos</label>
                   <input className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Ex: 11999999999" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Tom de Voz da Marca</label>
                   <div className="grid grid-cols-1 gap-2">
                      {Object.values(ToneOfVoice).map(tone => (
                         <div key={tone} 
                           onClick={() => setFormData({...formData, tone})}
                           className={`p-3 border rounded-lg cursor-pointer transition-all ${formData.tone === tone ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'}`}
                         >
                            <div className="font-medium text-sm">{tone}</div>
                         </div>
                      ))}
                   </div>
                </div>
                <button onClick={handleSubmit} disabled={loading} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 hover:bg-orange-700 flex justify-center">
                   {loading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'}
                </button>
             </div>
          )}
       </div>
     </div>
   );
};

// --- DASHBOARD COMPONENT ---
const Dashboard = ({ 
  profile, 
  generatedCount, 
  analytics, 
  products,
  onQuickAction,
  onUpgrade
}: { 
  profile: BusinessProfile, 
  generatedCount: number, 
  analytics: { visits: number, clicks: number },
  products: Product[],
  onQuickAction: () => void,
  onUpgrade: () => void
}) => {
   const plan = PLAN_CONFIG[profile.subscription?.tier || PlanTier.FREE];
   const limit = plan.limits.generations;
   const usagePercent = Math.min((generatedCount / limit) * 100, 100);

   return (
      <div className="space-y-6">
         <h1 className="text-2xl font-bold text-gray-900">Olá, {profile.name} 👋</h1>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <p className="text-gray-500 text-sm font-medium">Gerações de IA (Mês)</p>
                     <h3 className="text-3xl font-bold text-gray-900 mt-1">{generatedCount} <span className="text-sm text-gray-400 font-normal">/ {limit}</span></h3>
                  </div>
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={20}/></div>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="bg-purple-600 h-2 rounded-full transition-all" style={{width: `${usagePercent}%`}}></div>
               </div>
               {usagePercent >= 100 && (
                  <button onClick={onUpgrade} className="text-xs font-bold text-orange-600 hover:underline">Fazer Upgrade</button>
               )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <p className="text-gray-500 text-sm font-medium">Visitas no Cardápio (7d)</p>
                     <h3 className="text-3xl font-bold text-gray-900 mt-1">{analytics.visits}</h3>
                  </div>
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ExternalLink size={20}/></div>
               </div>
               <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <ArrowRight size={12} className="rotate-[-45deg]"/> Cardápio Ativo
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <p className="text-gray-500 text-sm font-medium">Cliques no WhatsApp</p>
                     <h3 className="text-3xl font-bold text-gray-900 mt-1">{analytics.clicks}</h3>
                  </div>
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><MessageCircle size={20}/></div>
               </div>
               <div className="text-xs text-gray-500">Conversão estimada: {analytics.visits > 0 ? ((analytics.clicks/analytics.visits)*100).toFixed(1) : 0}%</div>
            </div>
         </div>

         <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
            <div>
               <h2 className="text-2xl font-bold mb-2">Crie conteúdo vendedor agora!</h2>
               <p className="text-orange-100 max-w-md">Nossa IA analisa seus produtos ({products.length} cadastrados) e cria posts para o Instagram em segundos.</p>
            </div>
            <button onClick={onQuickAction} className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 shadow-md transition-transform hover:scale-105 flex items-center gap-2">
               <Sparkles size={20} /> Gerar Post Mágico
            </button>
         </div>
      </div>
   );
};

// --- PRODUCTS MANAGER COMPONENT ---
const ProductsManager = ({ products, profile, onAdd, onDelete, onUpgrade }: { products: Product[], profile: BusinessProfile, onAdd: (p: Product) => void, onDelete: (id: string) => void, onUpgrade: () => void }) => {
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, description: '', category: 'Outros' });
   const [loading, setLoading] = useState(false);

   const plan = PLAN_CONFIG[profile.subscription?.tier || PlanTier.FREE];
   const canAdd = products.length < plan.limits.products;

   const handleSave = async () => {
      if (!newProduct.name || !newProduct.price) return alert("Preencha nome e preço");
      setLoading(true);

      const productToSave = {
         ...newProduct,
         user_id: profile.user_id,
         image_url: newProduct.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60' // default placeholder
      };

      const { data, error } = await supabase.from('products').insert(productToSave).select().single();
      
      if (error) {
         console.error(error);
         alert("Erro ao salvar produto.");
      } else {
         onAdd(data as Product);
         setIsModalOpen(false);
         setNewProduct({ name: '', price: 0, description: '', category: 'Outros' });
      }
      setLoading(false);
   };

   const handleDelete = async (id: string) => {
      if (!confirm("Tem certeza?")) return;
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) onDelete(id);
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-bold text-gray-900">Seu Cardápio</h1>
               <p className="text-gray-500">{products.length} produtos cadastrados</p>
            </div>
            <button 
               onClick={() => canAdd ? setIsModalOpen(true) : onUpgrade()} 
               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-colors ${canAdd ? 'bg-gray-900 hover:bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
            >
               {canAdd ? <><Plus size={20} /> Novo Produto</> : <><Lock size={18}/> Limite Atingido</>}
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
               <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                  {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-3 bg-gray-100" />}
                  <div className="flex-1">
                     <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded text-sm">R$ {product.price.toFixed(2)}</span>
                     </div>
                     <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                     <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{product.category}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                     <button onClick={() => product.id && handleDelete(product.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
               </div>
            ))}
         </div>

         {/* Modal */}
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                  <div className="flex justify-between mb-4">
                     <h2 className="text-xl font-bold">Novo Produto</h2>
                     <button onClick={() => setIsModalOpen(false)}><X size={24}/></button>
                  </div>
                  <div className="space-y-3">
                     <input className="w-full border rounded-lg p-3" placeholder="Nome do Produto" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                     <input className="w-full border rounded-lg p-3" placeholder="Preço (ex: 29.90)" type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                     <textarea className="w-full border rounded-lg p-3" placeholder="Descrição (Ingredientes, tamanho...)" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                     <input className="w-full border rounded-lg p-3" placeholder="Categoria (ex: Burgers)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                     <input className="w-full border rounded-lg p-3" placeholder="URL da Imagem (Opcional)" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
                     <button onClick={handleSave} disabled={loading} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 flex justify-center">
                        {loading ? <Loader2 className="animate-spin"/> : 'Salvar Produto'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

// --- GENERATOR VIEW COMPONENT ---
const GeneratorView = ({ profile, products, onSave }: { profile: BusinessProfile, products: Product[], onSave: () => void }) => {
   const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
   const [loading, setLoading] = useState(false);
   const [mode, setMode] = useState<'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA'>('PACK_SEMANAL');
   const [context, setContext] = useState('');

   const handleGenerate = async () => {
      if (products.length === 0) return alert("Cadastre produtos antes de gerar conteúdo!");
      setLoading(true);
      try {
         const result = await generateMarketingContent(profile, products, mode, context);
         setGeneratedContent(result);
         // Save first result to DB as history
         if (result.length > 0 && profile.user_id) {
            await dbService.saveGeneratedContent(profile.user_id, result[0]);
            onSave();
         }
      } catch (e: any) {
         alert(e.message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="max-w-4xl mx-auto space-y-8">
         <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Estúdio de Criação IA</h1>
            <p className="text-gray-500">Escolha o objetivo e deixe a mágica acontecer</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => setMode('PACK_SEMANAL')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === 'PACK_SEMANAL' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
               <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={24}/></div>
               <span className="font-bold">Pack Semanal</span>
               <span className="text-xs text-center text-gray-500">5 conteúdos variados para movimentar a rede</span>
            </button>
            <button onClick={() => setMode('OFERTA_DIA')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === 'OFERTA_DIA' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
               <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Zap size={24}/></div>
               <span className="font-bold">Oferta do Dia</span>
               <span className="text-xs text-center text-gray-500">Foco em vendas imediatas e urgência</span>
            </button>
            <button onClick={() => setMode('RESPOSTA')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === 'RESPOSTA' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><MessageCircle size={24}/></div>
               <span className="font-bold">Responder Cliente</span>
               <span className="text-xs text-center text-gray-500">Ajuda com reclamações ou elogios</span>
            </button>
         </div>

         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            {mode === 'OFERTA_DIA' && (
               <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Qual produto quer ofertar?</label>
                  <select className="w-full border p-3 rounded-lg" value={context} onChange={e => setContext(e.target.value)}>
                     <option value="">Escolha automática da IA</option>
                     {products.map(p => <option key={p.id} value={p.name}>{p.name} - R$ {p.price}</option>)}
                  </select>
               </div>
            )}
            {mode === 'RESPOSTA' && (
               <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cole a mensagem do cliente:</label>
                  <textarea 
                     className="w-full border p-3 rounded-lg h-24" 
                     placeholder="Ex: 'O lanche chegou frio e demorou muito!'"
                     value={context}
                     onChange={e => setContext(e.target.value)}
                  />
               </div>
            )}
            <button 
               onClick={handleGenerate} 
               disabled={loading}
               className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 shadow-lg hover:shadow-orange-200 transition-all flex justify-center items-center gap-3 text-lg"
            >
               {loading ? <><Loader2 className="animate-spin" /> Criando Mágica...</> : <><Sparkles /> Gerar Conteúdo</>}
            </button>
         </div>

         {generatedContent.length > 0 && (
            <div className="space-y-6 animate-fade-in-up">
               <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="text-green-500"/> Conteúdo Gerado</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedContent.map((content, idx) => (
                     <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                           <span className="text-xs font-bold uppercase text-gray-500">{content.type}</span>
                           <button className="text-gray-400 hover:text-gray-600" onClick={() => navigator.clipboard.writeText(content.caption)}><Copy size={16}/></button>
                        </div>
                        {content.generatedImage && (
                           <div className="relative group">
                              <img src={content.generatedImage} className="w-full h-48 object-cover bg-gray-100" />
                              <a href={content.generatedImage} download="post-viral.png" className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Download size={16} className="text-gray-700"/>
                              </a>
                           </div>
                        )}
                        <div className="p-4 flex-1">
                           {content.hook && <h3 className="font-bold text-lg mb-2 text-gray-900">{content.hook}</h3>}
                           <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.caption}</p>
                           <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-blue-600 font-medium">
                              {content.hashtags.join(' ')}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
};

// --- BILLING VIEW ---
const BillingView = ({ profile }: { profile: BusinessProfile }) => {
   const plans = Object.values(PlanTier).filter(t => t !== PlanTier.FREE);
   
   return (
      <div className="max-w-4xl mx-auto">
         <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Planos e Assinatura</h1>
            <p className="text-gray-500">Evolua seu negócio com mais poder de IA</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(tier => {
               const plan = PLAN_CONFIG[tier];
               const isCurrent = profile.subscription?.tier === tier;
               return (
                  <div key={tier} className={`bg-white rounded-2xl p-6 border-2 flex flex-col ${isCurrent ? 'border-orange-500 shadow-xl scale-105' : 'border-gray-100 shadow-sm hover:border-gray-200'}`}>
                     {isCurrent && <div className="text-center text-xs font-bold text-orange-600 uppercase mb-2">Plano Atual</div>}
                     <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                     <div className="text-3xl font-extrabold text-gray-900 my-4">R$ {plan.price}<span className="text-sm font-normal text-gray-500">/mês</span></div>
                     <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={16} className="text-green-500"/> {plan.limits.products} Produtos</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={16} className="text-green-500"/> {plan.limits.generations} Gerações/mês</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={16} className="text-green-500"/> IA de Imagens</li>
                     </ul>
                     <button className={`w-full py-3 rounded-lg font-bold transition-colors ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                        {isCurrent ? 'Seu Plano' : 'Assinar Agora'}
                     </button>
                  </div>
               );
            })}
         </div>
      </div>
   );
};

// --- PUBLIC MENU VIEW ---
const MenuPublicView = ({ profile, products }: { profile: BusinessProfile | null, products: Product[] }) => {
   if (!profile) return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
           <AlertTriangle size={48} className="text-orange-500 mb-4" />
           <h2 className="text-xl font-bold text-gray-900">Loja não encontrada</h2>
           <p className="text-gray-500 mt-2">O link pode estar incorreto ou a loja foi desativada.</p>
           <a href="#" className="mt-6 text-orange-600 font-bold hover:underline">Voltar para o Início</a>
       </div>
   );

   const categories = [...new Set(products.map(p => p.category))];
   
   const handleOrder = (product: Product) => {
      const msg = `Olá! Gostaria de pedir: *${product.name}* (R$ ${product.price.toFixed(2)})`;
      const url = `https://wa.me/55${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
      
      // Track analytics
      if (profile.id) dbService.trackEvent(profile.id, 'CLICK_WHATSAPP');
      
      window.open(url, '_blank');
   };

   // Track view on mount
   useEffect(() => {
      if (profile.id) dbService.trackEvent(profile.id, 'VIEW');
   }, [profile.id]);

   return (
      <div className="min-h-screen bg-gray-50 pb-20">
         <div style={{ backgroundColor: profile.themeColor || '#ea580c' }} className="pb-10 pt-6 px-4 text-white rounded-b-[2rem] shadow-lg">
            <div className="max-w-md mx-auto text-center">
               {profile.logo_url ? <img src={profile.logo_url} className="w-24 h-24 rounded-full border-4 border-white mx-auto mb-3 shadow-md"/> : <div className="w-24 h-24 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center text-4xl font-bold">{profile.name.charAt(0)}</div>}
               <h1 className="text-2xl font-bold">{profile.name}</h1>
               <p className="opacity-90 flex items-center justify-center gap-1 mt-1 text-sm">
                 <MapPin size={14}/> 
                 {profile.city}
                 {profile.neighborhood && <span> • {profile.neighborhood}</span>}
               </p>
            </div>
         </div>

         <div className="max-w-md mx-auto px-4 mt-6 space-y-8">
            {categories.map(cat => (
               <div key={cat}>
                  <h3 className="font-bold text-gray-800 text-lg mb-3 pl-2 border-l-4 border-orange-500">{cat}</h3>
                  <div className="space-y-4">
                     {products.filter(p => p.category === cat).map(product => (
                        <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4" onClick={() => handleOrder(product)}>
                           {product.image_url && <img src={product.image_url} className="w-20 h-20 rounded-lg object-cover bg-gray-100" />}
                           <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{product.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 my-1">{product.description}</p>
                              <div className="flex justify-between items-center mt-2">
                                 <span className="text-green-700 font-bold">R$ {product.price.toFixed(2)}</span>
                                 <button className="text-xs font-bold text-white bg-green-500 px-3 py-1 rounded-full flex items-center gap-1">
                                    Pedir <MessageCircle size={12}/>
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            ))}
         </div>
         
         <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 text-center text-xs text-gray-400">
            Cardápio Digital por <span className="font-bold text-orange-600">Cardápio Viral</span>
         </div>
      </div>
   );
};

// 2. Updated App Component to handle new Routing
const App = () => {
  const [view, setView] = useState<AppView>(AppView.MAIN_HUB); 
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Real stats from DB
  const [generatedCount, setGeneratedCount] = useState(0);
  const [analyticsStats, setAnalyticsStats] = useState({ visits: 0, clicks: 0 });
  
  const [loading, setLoading] = useState(true);

  // --- Core Functions defined via refs/stable callbacks to avoid closure staleness ---

  // Fetches private user data
  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      
      if (profileData) {
        setProfile(profileData);
        
        const { data: productsData } = await supabase.from('products').select('*').eq('user_id', userId);
        if (productsData) setProducts(productsData);

        // Fetch Real Stats from DB
        const count = await dbService.getGenerationCount(userId);
        setGeneratedCount(count);
        
        if (profileData.id) {
           const stats = await dbService.getAnalyticsStats(profileData.id);
           setAnalyticsStats(stats);
        }

        // Only redirect to dashboard if we are currently at root or in a login flow
        const hash = window.location.hash;
        if (!hash || hash === '#/' || hash.includes('access_token')) {
            setView(AppView.DASHBOARD);
        }
      } else {
        setView(AppView.ONBOARDING);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Initialization & Auth Listener (Run ONCE) ---
  useEffect(() => {
    // 1. Setup Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
         // Only fetch data if we are NOT in a public view (to avoid overwriting public profile with private profile)
         const hash = window.location.hash;
         if (!hash.startsWith('#/m/') && hash !== '#/discovery') {
             fetchUserData(session.user.id);
         }
      } else {
         // Logged out
         const hash = window.location.hash;
         if (!hash.startsWith('#/m/') && hash !== '#/discovery') {
             setProfile(null);
             setProducts([]);
             setView(AppView.MAIN_HUB);
         }
      }
    });

    // 2. Initial Route Check
    handleRoute();

    // 3. Hash Change Listener
    const onHashChange = () => handleRoute();
    window.addEventListener('hashchange', onHashChange);

    // Safety Timeout
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);

    return () => {
       subscription.unsubscribe();
       window.removeEventListener('hashchange', onHashChange);
       clearTimeout(safetyTimeout);
    };
  }, []);

  // --- Router Logic ---
  const handleRoute = async () => {
      const hash = window.location.hash;
      
      // FIX: Ignore Supabase Auth redirects during processing
      if (hash.includes('access_token=') || hash.includes('type=recovery') || hash.includes('error=')) {
         setLoading(true);
         return; 
      }

      setLoading(true);

      try {
        if (hash.startsWith('#/m/')) {
            // PUBLIC MENU VIEW
            const slug = hash.replace('#/m/', '').split('?')[0];
            const { data: publicProfile, error: profileError } = await supabase.from('profiles').select('*').eq('slug', slug).single();

            if (profileError) throw profileError;

            if (publicProfile) {
              const { data: publicProducts } = await supabase.from('products').select('*').eq('user_id', publicProfile.user_id);
              setProfile(publicProfile as BusinessProfile);
              setProducts(publicProducts as Product[] || []);
              setView(AppView.MENU_PREVIEW);
            } else {
              setProfile(null);
              setView(AppView.MENU_PREVIEW); // Will show "Store not found"
            }
        } else if (hash === '#/discovery') {
            // DISCOVERY VIEW
            setView(AppView.DISCOVERY);
        } else {
            // ROOT / DASHBOARD VIEW
            // Important: If we were viewing a public profile, clear it first!
            if (view === AppView.MENU_PREVIEW) {
                setProfile(null);
                setProducts([]);
            }

            // Check if user is logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchUserData(session.user.id);
            } else {
                setView(AppView.MAIN_HUB);
            }
        }
      } catch (err) {
        console.error("Routing error:", err);
        if (!session) setView(AppView.MAIN_HUB);
      } finally {
        setLoading(false);
      }
  };

  const refreshStats = async () => {
     if(profile?.user_id && profile?.id) {
        const count = await dbService.getGenerationCount(profile.user_id);
        setGeneratedCount(count);
        const stats = await dbService.getAnalyticsStats(profile.id);
        setAnalyticsStats(stats);
     }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProducts([]);
    setView(AppView.MAIN_HUB);
    window.location.hash = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
        <Loader2 className="animate-spin text-orange-600 mb-4" size={48} />
        <p className="text-gray-400 text-sm animate-pulse">Carregando...</p>
      </div>
    );
  }

  // Routing
  const renderView = () => {
    switch (view) {
      case AppView.MAIN_HUB:
         return (
            <MainHub 
               onClient={() => { setView(AppView.DISCOVERY); window.location.hash = '#/discovery'; }}
               onBusiness={() => setView(AppView.LANDING)}
            />
         );

      case AppView.DISCOVERY:
         return (
            <DiscoveryView 
               onBack={() => { window.location.hash = ''; setView(AppView.MAIN_HUB); }} 
               onSelectStore={(slug) => { window.location.hash = `#/m/${slug}`; }}
            />
         );
      case AppView.MENU_PREVIEW:
        return <MenuPublicView profile={profile} products={products} />;

      case AppView.DASHBOARD:
        if (!profile) return null;
        return (
           <Dashboard 
              profile={profile} 
              generatedCount={generatedCount}
              analytics={analyticsStats}
              products={products}
              onQuickAction={() => setView(AppView.GENERATOR)}
              onUpgrade={() => setView(AppView.BILLING)}
           />
        );

      case AppView.PRODUCTS:
        if (!profile) return null;
        return <ProductsManager products={products} profile={profile} onAdd={(p) => setProducts([...products, p])} onDelete={(id) => setProducts(products.filter(p => p.id !== id))} onUpgrade={() => setView(AppView.BILLING)} />;

      case AppView.GENERATOR:
        if (!profile) return null;
        return (
           <GeneratorView 
             profile={profile} 
             products={products} 
             onSave={() => refreshStats()} 
           />
        );
      
      case AppView.BILLING:
          if (!profile) return null;
          return <BillingView profile={profile} />;

      case AppView.ONBOARDING:
          return <Onboarding onComplete={(p, prods) => { setProfile(p); setProducts(prods); setView(AppView.DASHBOARD); }} />;

      case AppView.AUTH:
          return <AuthScreen onAuthSuccess={() => {}} />;

      default:
        return <Landing 
          onStart={() => setView(AppView.AUTH)} 
          onLogin={() => setView(AppView.AUTH)} 
          onBack={() => setView(AppView.MAIN_HUB)}
        />;
    }
  };

  return (
    <Layout currentView={view} onChangeView={setView} profile={profile} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;