import React, { useState, useEffect } from 'react';
import { AppView, BusinessProfile, Product, GeneratedContent, BusinessCategory, ToneOfVoice, PlanTier } from './types';
import { MOCK_PRODUCTS, PLAN_CONFIG, STRIPE_PUBLIC_KEY } from './constants';
import { generateMarketingContent } from './services/geminiService';
import { supabase } from './lib/supabaseClient';

// Icons
import { 
  ChefHat, LayoutDashboard, Utensils, Sparkles, LogOut, 
  Menu as MenuIcon, User, Copy, Share2, 
  Trash2, Plus, MessageCircle, Instagram, ExternalLink,
  Smartphone, Zap, ArrowRight, CheckCircle, Lock, AlertTriangle,
  SearchX, Mail
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
    { id: AppView.GENERATOR, label: 'IA Viral', icon: Sparkles },
    { id: AppView.PRODUCTS, label: 'Cardápio/Produtos', icon: Utensils },
    { id: AppView.BILLING, label: 'Assinatura', icon: User },
  ];

  if (currentView === AppView.LANDING || currentView === AppView.AUTH || currentView === AppView.ONBOARDING || currentView === AppView.MENU_PREVIEW) {
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
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xl">
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
        <div className="flex items-center gap-2 text-orange-600 font-bold">
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

// 2. Views

const Landing = ({ onStart, onLogin }: { onStart: () => void, onLogin: () => void }) => (
  <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col items-center justify-center p-4 text-center">
    <div className="absolute top-4 right-4">
      <button onClick={onLogin} className="text-sm font-semibold text-gray-600 hover:text-orange-600 px-4 py-2">
        Já tenho conta
      </button>
    </div>
    <div className="bg-white p-4 rounded-full shadow-lg mb-6 text-orange-600">
      <ChefHat size={48} />
    </div>
    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
      Cardápio <span className="text-orange-600">Viral</span>
    </h1>
    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8">
      A IA que cria seu cardápio digital e gera conteúdo para seu Instagram e WhatsApp em 5 minutos.
      Perfeito para Bares, Pizzarias e Lanchonetes.
    </p>
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
      <button 
        onClick={onStart}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-transform hover:scale-105"
      >
        Começar Grátis Agora
      </button>
    </div>
    <div className="mt-12 grid grid-cols-3 gap-4 text-sm text-gray-500">
      <div className="flex flex-col items-center">
        <Sparkles className="mb-2 text-yellow-500" />
        <span>Posts com IA</span>
      </div>
      <div className="flex flex-col items-center">
        <MenuIcon className="mb-2 text-blue-500" />
        <span>Cardápio QR</span>
      </div>
      <div className="flex flex-col items-center">
        <Share2 className="mb-2 text-green-500" />
        <span>Vendas Zap</span>
      </div>
    </div>
  </div>
);

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
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      alert('Erro ao enviar email: ' + error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
            <Mail size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Verifique seu Email</h2>
          <p className="text-gray-600 mb-6">Enviamos um link mágico para <strong>{email}</strong>. Clique nele para entrar.</p>
          <button onClick={() => setSent(false)} className="text-sm text-gray-500 underline">Tentar outro email</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
         <div className="text-center mb-6">
           <ChefHat className="mx-auto text-orange-600 mb-2" size={40} />
           <h2 className="text-2xl font-bold">Acessar Painel</h2>
           <p className="text-gray-500">Digite seu email para entrar ou criar conta</p>
         </div>
         <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2"
            >
              {loading ? 'Enviando...' : 'Receber Link de Acesso'}
            </button>
         </form>
      </div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: (p: BusinessProfile, items: Product[]) => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<BusinessProfile>>({
    themeColor: '#ea580c'
  });

  const handleNext = () => setStep(s => s + 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Usuário não autenticado");

      // Generate Slug
      const slug = profile.name?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

      const finalProfile: BusinessProfile = {
        user_id: user.id,
        name: profile.name!,
        slug: slug,
        city: profile.city!,
        phone: profile.phone!,
        category: profile.category!,
        tone: profile.tone!,
        instagram: profile.instagram || '',
        themeColor: profile.themeColor || '#ea580c',
        subscription: {
          tier: PlanTier.FREE,
          status: 'trial',
          periodEnd: Date.now() + 7 * 24 * 60 * 60 * 1000 
        }
      };

      // 1. Insert Profile
      const { error: profileError } = await supabase.from('profiles').insert(finalProfile);
      if (profileError) throw profileError;

      // 2. Insert Default Products
      const productsWithUser = MOCK_PRODUCTS.map(p => ({
         user_id: user.id,
         name: p.name,
         description: p.description,
         price: p.price,
         category: p.category,
         isPopular: p.isPopular || false
      }));

      const { data: insertedProducts, error: prodError } = await supabase
        .from('products')
        .insert(productsWithUser)
        .select();

      if (prodError) throw prodError;

      onComplete(finalProfile, insertedProducts as Product[]);

    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-bold text-gray-900">
             {step === 1 ? 'Sobre a Empresa' : step === 2 ? 'Personalidade' : 'Cadastro Rápido'}
           </h2>
           <span className="text-sm font-semibold text-orange-600">Passo {step} de 3</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: Pizzaria do Zé"
                value={profile.name || ''}
                onChange={e => setProfile({...profile, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: São Paulo, SP"
                value={profile.city || ''}
                onChange={e => setProfile({...profile, city: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular (WhatsApp)</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: 11999999999"
                value={profile.phone || ''}
                onChange={e => setProfile({...profile, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-3 outline-none"
                onChange={e => setProfile({...profile, category: e.target.value as BusinessCategory})}
              >
                <option value="">Selecione...</option>
                {Object.values(BusinessCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button 
              disabled={!profile.name || !profile.category || !profile.phone}
              onClick={handleNext}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
             <p className="text-gray-600 text-sm">Como sua marca fala com os clientes?</p>
             <div className="grid grid-cols-1 gap-3">
               {Object.values(ToneOfVoice).map((tone) => (
                 <button
                    key={tone}
                    onClick={() => setProfile({...profile, tone})}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      profile.tone === tone ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                 >
                   <span className="block font-medium text-gray-900">{tone}</span>
                 </button>
               ))}
             </div>
             <button 
              disabled={!profile.tone}
              onClick={handleNext}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        )}

        {step === 3 && (
           <div className="space-y-4 text-center">
             <div className="bg-green-50 p-6 rounded-xl mb-4">
               <h3 className="font-semibold text-green-800 mb-2">Tudo pronto!</h3>
               <p className="text-green-700 text-sm">
                 Vamos salvar seus dados e criar seu cardápio online.
               </p>
             </div>
             <button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-black flex justify-center items-center gap-2"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Acessar Painel'}
            </button>
           </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ 
  profile, 
  generatedCount,
  onQuickAction,
  onUpgrade,
  products
}: { 
  profile: BusinessProfile, 
  generatedCount: number,
  onQuickAction: () => void,
  onUpgrade: () => void,
  products: Product[]
}) => {
  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limits = PLAN_CONFIG[tier].limits;
  const isLimited = tier !== PlanTier.PRO && tier !== PlanTier.AGENCY;
  const percentUsed = isLimited ? Math.min((generatedCount / limits.generations) * 100, 100) : 0;

  const handleCopyPublicLink = () => {
     const fullUrl = `${window.location.origin}/#/m/${profile.slug}`;
     navigator.clipboard.writeText(fullUrl);
     alert("Link público copiado! Envie para seus clientes.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Olá, {profile.name}! 👋</h2>
          <p className="text-gray-500">
            Plano atual: <strong className="text-orange-600">{PLAN_CONFIG[tier].name}</strong>
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={handleCopyPublicLink} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
             <Share2 size={16} /> Compartilhar Cardápio
          </button>
          {tier === PlanTier.FREE && (
            <button onClick={onUpgrade} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-200 transition-colors">
               🚀 Fazer Upgrade Agora
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Sparkles size={24} /></div>
            <span className="text-2xl font-bold">
              {generatedCount}
              {isLimited && <span className="text-sm text-gray-400 font-normal">/{limits.generations}</span>}
            </span>
          </div>
          <h3 className="font-medium text-gray-700">Conteúdos Gerados</h3>
          
          {isLimited && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${percentUsed}%` }}></div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><MenuIcon size={24} /></div>
            <span className="text-2xl font-bold">128</span>
          </div>
          <h3 className="font-medium text-gray-700">Visitas no Cardápio</h3>
          <p className="text-xs text-gray-400 mt-1">Últimos 7 dias</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-green-300 transition-colors">
           <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg text-green-600"><MessageCircle size={24} /></div>
            <span className="text-2xl font-bold">12</span>
          </div>
          <h3 className="font-medium text-gray-700">Cliques no WhatsApp</h3>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
            <ArrowRight size={12} />
            <span>Reutilizar melhor oferta</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Precisa vender mais hoje?</h3>
          <p className="text-gray-300 mb-6 max-w-md">
            Gere uma "Oferta Relâmpago" com arte pronta, legenda e texto de Zap em 1 clique.
          </p>
          <button 
            onClick={onQuickAction}
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Zap size={18} className="text-yellow-500 fill-current" />
            Criar Oferta do Dia
          </button>
        </div>
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10">
          <Sparkles size={200} />
        </div>
      </div>
    </div>
  );
};

const ProductsManager = ({ products, onAdd, onDelete, profile, onUpgrade }: { 
  products: Product[], 
  onAdd: (p: Product) => void, 
  onDelete: (id: string) => void,
  profile: BusinessProfile,
  onUpgrade: () => void
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: 'Geral' });
  
  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limits = PLAN_CONFIG[tier].limits;
  const isLimitReached = products.length >= limits.products;

  const handleSave = async () => {
    if(newProduct.name && newProduct.price) {
      const { data, error } = await supabase.from('products').insert({
        user_id: profile.user_id,
        name: newProduct.name,
        price: Number(newProduct.price),
        description: newProduct.description || '',
        category: newProduct.category || 'Geral'
      }).select().single();

      if (error) {
        alert('Erro ao salvar produto');
      } else if (data) {
        onAdd(data as Product);
        setIsAdding(false);
        setNewProduct({ category: 'Geral' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
       alert('Erro ao deletar');
    } else {
       onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Seu Cardápio</h2>
          <span className="text-xs text-gray-500">{products.length} / {limits.products > 1000 ? 'Ilimitado' : limits.products} produtos</span>
        </div>
        
        {isLimitReached ? (
           <button onClick={onUpgrade} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-orange-200">
             <Lock size={16} /> Fazer Upgrade para Adicionar
           </button>
        ) : (
          <button onClick={() => setIsAdding(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700">
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-xl border border-orange-200 mb-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input placeholder="Nome do Produto" className="border p-2 rounded" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input type="number" placeholder="Preço (R$)" className="border p-2 rounded" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
            <input placeholder="Descrição" className="border p-2 rounded md:col-span-2" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="text-gray-500 px-4 py-2">Cancelar</button>
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-4 font-medium">Produto</th>
              <th className="p-4 font-medium">Categoria</th>
              <th className="p-4 font-medium">Preço</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{p.description}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">{p.category}</td>
                <td className="p-4 font-medium text-gray-900">R$ {p.price.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(p.id!)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ContentGenerator = ({ 
  profile, 
  products, 
  onGenerated,
  initialMode = 'PACK_SEMANAL',
  generatedCount,
  onUpgrade
}: { 
  profile: BusinessProfile, 
  products: Product[], 
  onGenerated: (items: GeneratedContent[]) => void,
  initialMode?: 'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA',
  generatedCount: number,
  onUpgrade: () => void
}) => {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent[]>([]);
  const [mode, setMode] = useState<'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA'>(initialMode);
  const [customInput, setCustomInput] = useState('');

  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limits = PLAN_CONFIG[tier].limits;
  const isLimitReached = generatedCount >= limits.generations;

  // Update mode if initialMode prop changes (e.g. re-navigating)
  useEffect(() => {
    setMode(initialMode);
    // Clear previous results when mode changes to avoid confusion
    if (initialMode !== mode) {
      setGenerated([]); 
    }
  }, [initialMode]);

  const handleGenerate = async () => {
    if (isLimitReached) {
      onUpgrade();
      return;
    }

    setLoading(true);
    setGenerated([]);
    try {
      const results = await generateMarketingContent(profile, products, mode, customInput);
      
      // Save to Supabase
      const resultsWithUser = results.map(r => ({
          user_id: profile.user_id,
          type: r.type,
          hook: r.hook,
          caption: r.caption,
          cta: r.cta,
          hashtags: r.hashtags,
          script: r.script || null,
          suggestion: r.suggestion || null
      }));

      const { data, error } = await supabase.from('generated_content').insert(resultsWithUser).select();
      
      if (!error && data) {
         setGenerated(data as GeneratedContent[]);
         onGenerated(data as GeneratedContent[]);
      } else {
         // Fallback if DB fails but AI worked
         setGenerated(results);
      }

    } catch (e) {
      alert("Erro ao gerar conteúdo.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const btn = document.activeElement as HTMLElement;
    if (btn) {
       const originalText = btn.innerText;
       btn.innerText = 'Copiado!';
       setTimeout(() => btn.innerText = originalText, 1000);
    }
  };

  // Helper to extract items for the Bundle view
  const bundleItems = {
    insta: generated.find(i => i.type === 'FEED'),
    zap: generated.find(i => i.type === 'WHATSAPP'),
    art: generated.find(i => i.type === 'STORY') // Used for visual prompt
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-bold">Gerador de Conteúdo IA</h2>
           <span className={`text-xs px-2 py-1 rounded font-bold ${isLimitReached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
             {generatedCount} / {limits.generations > 1000 ? 'Ilimitado' : limits.generations} usos
           </span>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'PACK_SEMANAL', label: 'Pack Semanal', icon: LayoutDashboard },
            { id: 'OFERTA_DIA', label: 'Oferta do Dia', icon: Zap },
            { id: 'RESPOSTA', label: 'Responder Cliente', icon: MessageCircle }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setMode(opt.id as any); setGenerated([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-colors ${
                mode === opt.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <opt.icon size={16} /> {opt.label}
            </button>
          ))}
        </div>

        {mode === 'RESPOSTA' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">O que o cliente perguntou?</label>
            <input 
              className="w-full border border-gray-300 rounded-lg p-3"
              placeholder="Ex: Tem opção vegetariana? Aceita Pix?"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
            />
          </div>
        )}

        {mode === 'OFERTA_DIA' && (
           <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
             <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
               <CheckCircle size={16}/> Fonte da Verdade
             </h3>
             <p className="text-xs text-orange-700 mb-3">
               A IA usará apenas seus produtos cadastrados. Quer focar em algum específico?
             </p>
             <select 
               className="w-full border border-orange-200 rounded-lg p-2 text-sm bg-white"
               onChange={e => setCustomInput(e.target.value)}
             >
               <option value="">Escolha automática (IA decide)</option>
               {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
             </select>
         </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-all active:scale-95
             ${isLimitReached 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-black text-white'
             }
          `}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Cozinhando Conteúdo...
            </>
          ) : isLimitReached ? (
             <>
               <Lock size={18} /> Limite Atingido (Faça Upgrade)
             </>
          ) : (
            <>
              {mode === 'OFERTA_DIA' ? 'Gerar Oferta Completa' : 'Gerar Conteúdo'} <Sparkles size={18} />
            </>
          )}
        </button>
      </div>

      {/* SPECIAL LAYOUT FOR OFERTA DO DIA BUNDLE */}
      {mode === 'OFERTA_DIA' && generated.length > 0 && (
        <div className="space-y-6 animate-fade-in-up">
           
           <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
             <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex justify-between items-center text-white">
                <div className="font-bold flex items-center gap-2"><Smartphone size={18}/> Story / Arte Digital</div>
                <button className="bg-white/20 hover:bg-white/30 p-2 rounded text-xs font-bold backdrop-blur-sm">Baixar PNG</button>
             </div>
             <div className="p-8 flex justify-center bg-gray-100">
                {/* MOCKUP OF GENERATED ART */}
                <div className="w-[270px] h-[480px] bg-white shadow-xl rounded-lg overflow-hidden relative flex flex-col">
                  <div className="h-2/3 bg-gray-200 flex items-center justify-center relative">
                     <span className="text-gray-400 text-xs text-center px-4">
                        (Foto do produto) <br/>
                        {bundleItems.art?.suggestion}
                     </span>
                  </div>
                  <div className="flex-1 bg-yellow-400 p-4 flex flex-col justify-center items-center text-center">
                     <h3 className="font-black text-2xl uppercase leading-none mb-2 text-black">{bundleItems.art?.hook || "OFERTA!"}</h3>
                     <p className="font-bold text-xl text-red-600">{bundleItems.art?.caption}</p>
                     <div className="mt-2 bg-black text-white text-xs px-3 py-1 rounded-full font-bold">PEDIR AGORA</div>
                  </div>
                </div>
             </div>
           </div>

           <div className="grid md:grid-cols-2 gap-6">
              {/* Instagram Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-pink-600 font-bold"><Instagram size={18}/> Legenda Instagram</div>
                    <button onClick={() => copyToClipboard(`${bundleItems.insta?.caption}\n\n${bundleItems.insta?.cta}`)} className="text-gray-400 hover:text-gray-900"><Copy size={16}/></button>
                 </div>
                 <textarea 
                    readOnly 
                    className="w-full h-40 bg-gray-50 border border-gray-100 rounded p-3 text-sm focus:outline-none resize-none"
                    value={`${bundleItems.insta?.caption}\n\n${bundleItems.insta?.cta}\n\n${bundleItems.insta?.hashtags.join(' ')}`}
                 />
              </div>

              {/* WhatsApp Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-green-600 font-bold"><MessageCircle size={18}/> Texto WhatsApp</div>
                    <button onClick={() => copyToClipboard(`${bundleItems.zap?.caption}\n\n${bundleItems.zap?.cta}`)} className="text-gray-400 hover:text-gray-900"><Copy size={16}/></button>
                 </div>
                 <textarea 
                    readOnly 
                    className="w-full h-40 bg-green-50 border border-green-100 rounded p-3 text-sm focus:outline-none resize-none"
                    value={`${bundleItems.zap?.caption}\n\n${bundleItems.zap?.cta}`}
                 />
              </div>
           </div>
        </div>
      )}

      {/* STANDARD LIST LAYOUT FOR OTHER MODES */}
      {mode !== 'OFERTA_DIA' && generated.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {generated.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                  {item.type === 'FEED' && <Instagram size={14} />}
                  {item.type === 'WHATSAPP' && <MessageCircle size={14} />}
                  {item.type}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(`${item.caption}\n\n${item.cta}`)} className="text-gray-400 hover:text-orange-600" title="Copiar">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1">
                <div className="mb-3">
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-medium">{item.hook}</span>
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap mb-4">{item.caption}</p>
                
                {item.script && (
                  <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 mb-4 border border-gray-200">
                    <strong>🎬 Roteiro Visual:</strong> {item.script}
                  </div>
                )}
                
                <p className="text-orange-600 font-medium text-sm">{item.cta}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.hashtags.map(h => (
                    <span key={h} className="text-xs text-blue-500">{h}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MenuPublicView = ({ profile, products }: { profile: BusinessProfile | null, products: Product[] }) => {
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
         <div className="bg-white p-6 rounded-full shadow-sm mb-4">
            <SearchX size={48} className="text-gray-300" />
         </div>
         <h2 className="text-xl font-bold text-gray-900 mb-2">Cardápio não encontrado</h2>
         <p className="text-gray-500 max-w-md">
            O link pode estar incorreto.
         </p>
         <button onClick={() => window.location.hash = ''} className="mt-8 text-orange-600 font-bold hover:underline">
            Criar meu próprio Cardápio Viral
         </button>
      </div>
    );
  }

  // Group products by category
  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="min-h-screen bg-gray-50 pb-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white shadow-sm pb-4">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500"></div>
        <div className="px-4 -mt-10 flex items-end justify-between">
          <div className="bg-white p-2 rounded-xl shadow-lg">
             <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-orange-600">
               <ChefHat size={40} />
             </div>
          </div>
          <div className="mb-2 text-right">
             <span className={`px-3 py-1 rounded-full text-xs font-bold ${
               profile.subscription?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
             }`}>
               Aberto Agora
             </span>
          </div>
        </div>
        <div className="px-4 mt-2">
           <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
           <p className="text-gray-500 text-sm">{profile.category} • {profile.city}</p>
           
           <div className="flex gap-2 mt-4">
              <a 
                href={`https://wa.me/55${profile.phone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={18} /> Pedir no Zap
              </a>
              <button 
                onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copiado!');
                }}
                className="p-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <Share2 size={20} />
              </button>
           </div>
        </div>
      </div>

      {/* Menu Categories */}
      <div className="px-4 mt-6 space-y-8">
        {categories.map(cat => (
          <div key={cat}>
            <h2 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-orange-500 pl-3">{cat}</h2>
            <div className="grid gap-4">
              {products.filter(p => p.category === cat).map(product => (
                <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    <div className="font-bold text-green-700 mt-2">R$ {product.price.toFixed(2)}</div>
                  </div>
                  {product.isPopular && (
                    <div className="ml-2">
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                        Top
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center text-gray-400 text-xs mt-8 pb-4">
        Cardápio Digital por <span className="font-bold">ViralMenu</span>
      </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [contentHistory, setContentHistory] = useState<GeneratedContent[]>([]);
  const [generatorInitialMode, setGeneratorInitialMode] = useState<'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA'>('PACK_SEMANAL');
  const [checkoutLoading, setCheckoutLoading] = useState<PlanTier | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Initial State
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (event === 'SIGNED_IN') checkUser();
       if (event === 'SIGNED_OUT') {
           setProfile(null);
           setProducts([]);
           setView(AppView.LANDING);
       }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Hash Routing for Public Links
  useEffect(() => {
    const handleHashChange = async () => {
      if (window.location.hash.startsWith('#/m/')) {
        setLoading(true);
        const slug = window.location.hash.replace('#/m/', '').split('?')[0];
        
        // Fetch Public Profile
        const { data: publicProfile, error: pError } = await supabase
           .from('profiles')
           .select('*')
           .eq('slug', slug)
           .single();

        if (publicProfile) {
           const { data: publicProducts } = await supabase
              .from('products')
              .select('*')
              .eq('user_id', publicProfile.user_id);
              
           setProfile(publicProfile as BusinessProfile);
           setProducts(publicProducts as Product[] || []);
           setView(AppView.MENU_PREVIEW);
        } else {
           setProfile(null);
           setView(AppView.MENU_PREVIEW);
        }
        setLoading(false);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const checkUser = async () => {
    setLoading(true);
    try {
      const userResult = await supabase.auth.getUser();
      const user = userResult.data?.user;
      
      // If user is on a public link, don't override with dashboard check
      if (window.location.hash.startsWith('#/m/')) {
          setLoading(false);
          return; 
      }

      if (user) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData as BusinessProfile);
          
          // Fetch Products
          const { data: prodData } = await supabase
              .from('products')
              .select('*')
              .eq('user_id', user.id);
          setProducts(prodData as Product[] || []);

          // Fetch History
          const { data: histData } = await supabase
              .from('generated_content')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
          setContentHistory(histData as GeneratedContent[] || []);

          setView(AppView.DASHBOARD);
        } else {
          // User logged in but no profile yet
          setView(AppView.ONBOARDING);
        }
      } else {
        // Not logged in
        if (view !== AppView.LANDING && view !== AppView.AUTH) {
            setView(AppView.LANDING);
        }
      }
    } catch (e) {
      console.error("Auth check failed", e);
      // Fallback safely to landing if supabase is down or misconfigured
      if (view !== AppView.LANDING) setView(AppView.LANDING);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOnboardingComplete = (p: BusinessProfile, items: Product[]) => {
    setProfile(p);
    setProducts(items);
    setView(AppView.DASHBOARD);
  };

  // Stripe Handling (Mocked for now, but ready for real)
  const handleCheckout = async (plan: PlanTier) => {
    if (!profile) return;
    setCheckoutLoading(plan);
    // ... Stripe logic stays similar, but would usually call a backend function to create session
    // For now, we mock success redirect
    setTimeout(() => {
        window.location.href = `${window.location.origin}?success=true&plan=${plan}`;
    }, 1500);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleAddProduct = (p: Product) => {
    setProducts([...products, p]);
  };

  const handleContentGenerated = (items: GeneratedContent[]) => {
    setContentHistory([...items, ...contentHistory]);
  };

  const handleChangeView = (newView: AppView) => {
    setView(newView);
    if (newView === AppView.GENERATOR) {
        setGeneratorInitialMode('PACK_SEMANAL');
    }
  };

  const handleQuickAction = () => {
    setGeneratorInitialMode('OFERTA_DIA');
    setView(AppView.GENERATOR);
  };

  if (loading) {
     return <div className="h-screen flex items-center justify-center bg-gray-50 text-orange-600"><ChefHat className="animate-bounce" size={48} /></div>;
  }

  if (view === AppView.MENU_PREVIEW) {
    return <MenuPublicView profile={profile} products={products} />;
  }

  return (
    <Layout 
      currentView={view} 
      onChangeView={handleChangeView} 
      profile={profile}
      onLogout={handleLogout}
    >
      {view === AppView.LANDING && (
          <Landing 
            onStart={() => setView(AppView.AUTH)} 
            onLogin={() => setView(AppView.AUTH)}
          />
      )}

      {view === AppView.AUTH && <AuthScreen onAuthSuccess={checkUser} />}
      
      {view === AppView.ONBOARDING && <Onboarding onComplete={handleOnboardingComplete} />}
      
      {view === AppView.DASHBOARD && profile && (
        <Dashboard 
            profile={profile} 
            generatedCount={contentHistory.length} 
            onQuickAction={handleQuickAction}
            onUpgrade={() => setView(AppView.BILLING)}
            products={products}
        />
      )}
      
      {view === AppView.PRODUCTS && profile && (
        <ProductsManager 
          products={products} 
          onAdd={handleAddProduct} 
          onDelete={handleDeleteProduct} 
          profile={profile}
          onUpgrade={() => setView(AppView.BILLING)}
        />
      )}
      
      {view === AppView.GENERATOR && profile && (
        <ContentGenerator 
          profile={profile} 
          products={products} 
          onGenerated={handleContentGenerated} 
          initialMode={generatorInitialMode}
          generatedCount={contentHistory.length}
          onUpgrade={() => setView(AppView.BILLING)}
        />
      )}

      {view === AppView.BILLING && profile && (
        <div className="max-w-4xl mx-auto pb-10">
          <h2 className="text-2xl font-bold mb-2 text-center">Planos e Assinatura</h2>
          <p className="text-center text-gray-500 mb-8">Escalável para o tamanho da sua fome de crescer.</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`bg-white p-6 rounded-xl border ${profile.subscription?.tier === PlanTier.SOLO ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200'}`}>
              <h3 className="font-bold text-lg">Solo</h3>
              <div className="text-3xl font-bold mt-2">R$ 29<span className="text-sm font-normal text-gray-500">/mês</span></div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2"><Sparkles size={16} className="text-green-500"/> 10 Posts/mês</li>
                <li className="flex gap-2"><Utensils size={16} className="text-green-500"/> Até 20 produtos</li>
                <li className="flex gap-2"><User size={16} className="text-green-500"/> 1 Usuário</li>
              </ul>
              <button 
                onClick={() => handleCheckout(PlanTier.SOLO)}
                disabled={profile.subscription?.tier === PlanTier.SOLO || checkoutLoading !== null}
                className="w-full mt-6 py-2 border border-orange-600 text-orange-600 rounded-lg font-bold hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {checkoutLoading === PlanTier.SOLO && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>}
                {profile.subscription?.tier === PlanTier.SOLO ? 'Plano Atual' : 'Assinar Solo'}
              </button>
            </div>
             <div className={`bg-white p-6 rounded-xl border-2 relative shadow-lg transform md:-translate-y-2 ${profile.subscription?.tier === PlanTier.PRO ? 'border-orange-600' : 'border-orange-400'}`}>
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">POPULAR</div>
              <h3 className="font-bold text-lg text-orange-600">Pro</h3>
              <div className="text-3xl font-bold mt-2">R$ 59<span className="text-sm font-normal text-gray-500">/mês</span></div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2"><Sparkles size={16} className="text-green-500"/> Ilimitado</li>
                <li className="flex gap-2"><Utensils size={16} className="text-green-500"/> Produtos Ilimitados</li>
                <li className="flex gap-2"><Sparkles size={16} className="text-green-500"/> Pack Mensal IA</li>
              </ul>
              <button 
                onClick={() => handleCheckout(PlanTier.PRO)}
                disabled={profile.subscription?.tier === PlanTier.PRO || checkoutLoading !== null}
                className="w-full mt-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {checkoutLoading === PlanTier.PRO && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {profile.subscription?.tier === PlanTier.PRO ? 'Plano Atual' : 'Assinar Pro'}
              </button>
            </div>
             <div className={`bg-white p-6 rounded-xl border ${profile.subscription?.tier === PlanTier.AGENCY ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200'}`}>
              <h3 className="font-bold text-lg">Agência</h3>
              <div className="text-3xl font-bold mt-2">R$ 99<span className="text-sm font-normal text-gray-500">/mês</span></div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2"><User size={16} className="text-green-500"/> Multi-clientes</li>
                <li className="flex gap-2"><Sparkles size={16} className="text-green-500"/> Marca Branca</li>
                <li className="flex gap-2"><Sparkles size={16} className="text-green-500"/> Suporte Prioritário</li>
              </ul>
              <button 
                onClick={() => handleCheckout(PlanTier.AGENCY)}
                disabled={profile.subscription?.tier === PlanTier.AGENCY || checkoutLoading !== null}
                className="w-full mt-6 py-2 border border-gray-300 text-gray-900 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {checkoutLoading === PlanTier.AGENCY && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>}
                {profile.subscription?.tier === PlanTier.AGENCY ? 'Plano Atual' : 'Falar com Vendas'}
              </button>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Pagamentos processados via Stripe.</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;