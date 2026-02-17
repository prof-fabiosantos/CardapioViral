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
  SearchX, Mail, Image as ImageIcon, MapPin, Phone,
  QrCode, X, Download, Upload, Loader2, ChevronDown, ChevronUp, Star, Clock, DollarSign
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

const Landing = ({ onStart, onLogin }: { onStart: () => void, onLogin: () => void }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Preciso ter computador para usar?",
      a: "Não! O Cardápio Viral foi feito pensando em quem usa celular. Você consegue criar seu cardápio, gerar posts e gerenciar pedidos tudo pelo smartphone."
    },
    {
      q: "Serve para qual tipo de negócio?",
      a: "Perfeito para delivery, pizzarias, hamburguerias, confeitarias, lanchonetes e bares que querem vender pelo WhatsApp e Instagram sem pagar comissões abusivas."
    },
    {
      q: "O cliente precisa baixar aplicativo?",
      a: "Não. Seu cliente acessa um link (ex: viralmenu.com/sua-loja), escolhe o pedido e envia direto para o seu WhatsApp já pronto. Sem login, sem download, sem barreira."
    },
    {
      q: "Como funciona a IA de conteúdo?",
      a: "Nossa IA 'lê' o seu cardápio e cria legendas, roteiros de reels e textos de venda persuasivos focados nos seus produtos. É como ter uma agência de marketing no bolso."
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Sem fidelidade, sem multas. Você usa o mês que pagou e pode cancelar a renovação a qualquer momento."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xl">
            <ChefHat size={32} />
            <span>Cardápio Viral</span>
          </div>
          <div className="flex gap-4">
            <button onClick={onLogin} className="text-gray-600 font-medium hover:text-orange-600 px-4 py-2 hidden md:block">
              Já tenho conta
            </button>
            <button onClick={onStart} className="bg-orange-600 text-white px-5 py-2 rounded-full font-bold hover:bg-orange-700 transition-transform hover:scale-105 shadow-lg shadow-orange-200">
              Começar Grátis
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
              Crie um cardápio digital irresistível e deixe nossa IA gerar posts, stories e ofertas que vendem por você. Tudo em 5 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <button 
                onClick={onStart}
                className="bg-orange-600 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-xl hover:bg-orange-700 hover:shadow-2xl transition-all transform hover:-translate-y-1"
              >
                Criar Minha Loja Grátis
              </button>
              <button onClick={() => document.getElementById('plans')?.scrollIntoView({behavior: 'smooth'})} className="bg-white text-gray-700 border border-gray-200 text-lg font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors">
                Ver Planos
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500 flex items-center justify-center md:justify-start gap-2">
              <CheckCircle size={14} className="text-green-500" /> Teste grátis sem cartão de crédito
            </p>
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

      {/* Vantagens Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Vantagens de ser uma Loja Parceira</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Pare de perder tempo com design e tecnologia. Foque no que importa: a comida.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-orange-50 border border-orange-100 hover:shadow-lg transition-shadow">
              <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center text-orange-600 mb-6">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Economize 10h por semana</h3>
              <p className="text-gray-600 leading-relaxed">
                Nossa IA cria o conteúdo da semana inteira em minutos. Adeus bloqueio criativo e horas no Canva.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-blue-50 border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                <Smartphone size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Cardápio Digital & WhatsApp</h3>
              <p className="text-gray-600 leading-relaxed">
                 Seu cliente acessa um <strong>link web exclusivo</strong> (seu cardápio online), escolhe os produtos visualmente e o pedido chega pronto no seu WhatsApp.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-green-50 border border-green-100 hover:shadow-lg transition-shadow">
              <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center text-green-600 mb-6">
                <DollarSign size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Venda Mais</h3>
              <p className="text-gray-600 leading-relaxed">
                Use a função "Oferta Relâmpago" para girar estoque parado e aumentar o faturamento em dias fracos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como abrir uma loja */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1500&q=80" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Como abrir sua loja no Cardápio Viral?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
             {/* Connector Line (Desktop) */}
             <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-gray-700 z-0"></div>

             <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-3xl font-bold border-8 border-gray-900 mb-6 shadow-glow">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">Cadastro Rápido</h3>
                <p className="text-gray-400">Preencha nome e telefone. Em 30 segundos sua conta está criada.</p>
             </div>

             <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-3xl font-bold border-8 border-gray-900 mb-6 shadow-glow">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2">Adicione Produtos</h3>
                <p className="text-gray-400">Cadastre seus lanches, pizzas ou bebidas com foto e preço.</p>
             </div>

             <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-3xl font-bold border-8 border-gray-900 mb-6 shadow-glow">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2">Use a Magia</h3>
                <p className="text-gray-400">Clique na IA para gerar posts e divulgue seu link para começar a vender.</p>
             </div>
          </div>

          <div className="text-center mt-12">
            <button onClick={onStart} className="bg-white text-gray-900 font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-colors">
              Começar Agora
            </button>
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="plans" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Conheça nossos Planos</h2>
            <p className="text-gray-500 text-lg">Custa menos que uma pizza por mês.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-xl text-gray-900">Trial Grátis</h3>
               <div className="my-4">
                 <span className="text-4xl font-extrabold">R$ 0</span>
                 <span className="text-gray-500">/7 dias</span>
               </div>
               <p className="text-gray-500 text-sm mb-6">Para testar a ferramenta e ver se funciona para você.</p>
               <button onClick={onStart} className="w-full py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-lg hover:bg-gray-50 mb-6">
                 Começar Grátis
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> 5 Produtos</li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> 5 Gerações de IA</li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Cardápio Digital</li>
               </ul>
            </div>

            {/* Pro (Highlighted) */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-orange-500 relative transform md:-translate-y-4">
               <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MAIS VENDIDO</div>
               <h3 className="font-bold text-xl text-orange-600">Plano Pro</h3>
               <div className="my-4">
                 <span className="text-4xl font-extrabold">R$ 59</span>
                 <span className="text-gray-500">/mês</span>
               </div>
               <p className="text-gray-500 text-sm mb-6">Para quem quer crescer de verdade e profissionalizar o delivery.</p>
               <button onClick={onStart} className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 mb-6 shadow-lg shadow-orange-200">
                 Quero Vender Mais
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> <strong>Produtos Ilimitados</strong></li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> <strong>IA Ilimitada</strong> (Posts, Stories, Reels)</li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Cardápio Digital</li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Suporte VIP</li>
               </ul>
            </div>

            {/* Agency */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-xl text-gray-900">Agência</h3>
               <div className="my-4">
                 <span className="text-4xl font-extrabold">R$ 99</span>
                 <span className="text-gray-500">/mês</span>
               </div>
               <p className="text-gray-500 text-sm mb-6">Para social media managers que cuidam de várias contas.</p>
               <button onClick={onStart} className="w-full py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 mb-6">
                 Falar com Consultor
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Multi-clientes</li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> <strong>Marca Branca (White Label)</strong></li>
                 <li className="flex gap-2"><CheckCircle size={18} className="text-green-500 flex-shrink-0" /> Tudo do Plano Pro</li>
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center p-5 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-gray-900">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {openFaq === idx && (
                  <div className="p-5 bg-white text-gray-600 border-t border-gray-200 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
               <ChefHat size={24} /> <span>Cardápio Viral</span>
            </div>
            <p className="mb-4 max-w-xs">A plataforma #1 de Marketing com Inteligência Artificial para pequenos negócios de alimentação no Brasil.</p>
            <div className="flex gap-4">
               <Instagram className="hover:text-white cursor-pointer" size={24}/>
               <MessageCircle className="hover:text-white cursor-pointer" size={24}/>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Funcionalidades</a></li>
              <li><a href="#plans" className="hover:text-white">Preços</a></li>
              <li><a href="#" className="hover:text-white">Casos de Sucesso</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white">Privacidade</a></li>
              <li><a href="#" className="hover:text-white">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-sm">
           © {new Date().getFullYear()} Cardápio Viral. Feito com ❤️ e IA no Brasil.
        </div>
      </footer>
    </div>
  );
};

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
      if (error.message.includes('rate limit')) {
        alert('Muitas tentativas de login recentes. Por segurança, aguarde alguns minutos antes de tentar novamente.');
      } else {
        alert('Erro ao enviar email: ' + error.message);
      }
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
  
  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [logoPreview, bannerPreview]);

  const handleNext = () => setStep(s => s + 1);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      // Clear URL input if file is selected to avoid confusion
      setProfile(prev => ({ ...prev, logo_url: '' })); 
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setProfile(prev => ({ ...prev, banner_url: '' })); 
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Usuário não autenticado");

      // --- IMAGE UPLOAD LOGIC ---
      let finalLogoUrl = profile.logo_url || '';
      let finalBannerUrl = profile.banner_url || '';

      if (logoFile) {
         const fileExt = logoFile.name.split('.').pop();
         const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
         const { error: logoErr } = await supabase.storage.from('product-images').upload(fileName, logoFile);
         if (logoErr) throw logoErr;
         const { data: logoData } = supabase.storage.from('product-images').getPublicUrl(fileName);
         finalLogoUrl = logoData.publicUrl;
      }

      if (bannerFile) {
         const fileExt = bannerFile.name.split('.').pop();
         const fileName = `${user.id}/banner-${Date.now()}.${fileExt}`;
         const { error: bannerErr } = await supabase.storage.from('product-images').upload(fileName, bannerFile);
         if (bannerErr) throw bannerErr;
         const { data: bannerData } = supabase.storage.from('product-images').getPublicUrl(fileName);
         finalBannerUrl = bannerData.publicUrl;
      }
      // --------------------------

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
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
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
         image_url: p.image_url,
         isPopular: p.isPopular || false
      }));

      const { data: insertedProducts, error: prodError } = await supabase
        .from('products')
        .insert(productsWithUser)
        .select();

      if (prodError) throw prodError;

      onComplete(finalProfile, insertedProducts as Product[]);

    } catch (error: any) {
      console.error("Erro no Onboarding:", error);
      alert('Erro ao salvar dados: ' + (error.message || 'Verifique se as colunas no banco de dados existem.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-bold text-gray-900">
             {step === 1 ? 'Sobre a Empresa' : step === 2 ? 'Visual' : 'Personalidade'}
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
          <div className="space-y-6">
             <div className="bg-orange-50 p-4 rounded-lg text-sm text-orange-800 mb-2">
               Cole links de imagens ou faça upload do seu computador.
             </div>
             
             {/* LOGO INPUT */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Opcional)</label>
              <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg p-3 outline-none text-sm"
                      placeholder="https://..."
                      value={profile.logo_url || ''}
                      onChange={e => {
                         setProfile({...profile, logo_url: e.target.value});
                         setLogoFile(null); // Clear file if typing URL
                         setLogoPreview(null);
                      }}
                      disabled={!!logoFile}
                    />
                    <div className="relative flex-shrink-0">
                       <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoChange} />
                       <label 
                         htmlFor="logo-upload" 
                         className={`cursor-pointer h-full px-4 rounded border flex items-center gap-2 transition-colors font-medium text-sm whitespace-nowrap ${logoFile ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                       >
                         <Upload size={16} /> {logoFile ? 'Alterar' : 'Upload'}
                       </label>
                    </div>
                 </div>
                 {logoPreview && (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200 w-fit pr-4">
                       <img src={logoPreview} alt="Logo Preview" className="w-12 h-12 rounded-full object-cover border border-gray-300" />
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">Logo Selecionado</span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{logoFile?.name}</span>
                       </div>
                       <button onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                    </div>
                 )}
              </div>
            </div>

            {/* BANNER INPUT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capa/Banner (Opcional)</label>
               <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg p-3 outline-none text-sm"
                      placeholder="https://..."
                      value={profile.banner_url || ''}
                      onChange={e => {
                         setProfile({...profile, banner_url: e.target.value});
                         setBannerFile(null);
                         setBannerPreview(null);
                      }}
                      disabled={!!bannerFile}
                    />
                    <div className="relative flex-shrink-0">
                       <input type="file" id="banner-upload" accept="image/*" className="hidden" onChange={handleBannerChange} />
                       <label 
                         htmlFor="banner-upload" 
                         className={`cursor-pointer h-full px-4 rounded border flex items-center gap-2 transition-colors font-medium text-sm whitespace-nowrap ${bannerFile ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                       >
                         <Upload size={16} /> {bannerFile ? 'Alterar' : 'Upload'}
                       </label>
                    </div>
                 </div>
                 {bannerPreview && (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-200 w-fit pr-4">
                       <img src={bannerPreview} alt="Banner Preview" className="w-20 h-10 object-cover rounded border border-gray-300" />
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">Capa Selecionada</span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{bannerFile?.name}</span>
                       </div>
                       <button onClick={() => { setBannerFile(null); setBannerPreview(null); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                    </div>
                 )}
              </div>
            </div>

            <button 
              onClick={handleNext}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4"
            >
              Próximo
            </button>
          </div>
        )}

        {step === 3 && (
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
              onClick={handleSubmit}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-lg mt-4 flex justify-center items-center gap-2"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Finalizar e Criar Cardápio'}
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
  const [showQrModal, setShowQrModal] = useState(false);
  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limits = PLAN_CONFIG[tier].limits;
  const isLimited = tier !== PlanTier.PRO && tier !== PlanTier.AGENCY;
  const percentUsed = isLimited ? Math.min((generatedCount / limits.generations) * 100, 100) : 0;
  
  const menuUrl = `${window.location.origin}/#/m/${profile.slug}`;

  const handleCopyPublicLink = () => {
     navigator.clipboard.writeText(menuUrl);
     alert("Link público copiado! Envie para seus clientes.");
  };

  return (
    <div className="space-y-6">
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl relative animate-fade-in-up">
             <button 
               onClick={() => setShowQrModal(false)} 
               className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1"
             >
               <X size={20} />
             </button>
             
             <div className="mb-4 flex flex-col items-center">
               <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                 <QrCode size={32} />
               </div>
               <h3 className="text-xl font-bold text-gray-900">Seu QR Code</h3>
               <p className="text-gray-500 text-sm">Imprima e cole nas mesas para facilitar o pedido.</p>
             </div>
             
             <div className="bg-white p-4 border-2 border-gray-900 rounded-xl inline-block mb-6 shadow-lg transform hover:scale-105 transition-transform duration-300">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=000000&bgcolor=ffffff&data=${encodeURIComponent(menuUrl)}`} 
                 alt="QR Code" 
                 className="w-48 h-48 md:w-56 md:h-56"
               />
             </div>

             <div className="grid grid-cols-1 gap-2">
               <a 
                 href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=${encodeURIComponent(menuUrl)}`} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
               >
                 <Download size={18}/> Baixar Alta Qualidade
               </a>
               <p className="text-xs text-gray-400 mt-2">Dica: Baixe a imagem e insira no seu design ou imprima direto.</p>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Olá, {profile.name}! 👋</h2>
          <p className="text-gray-500">
            Plano atual: <strong className="text-orange-600">{PLAN_CONFIG[tier].name}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => setShowQrModal(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
             <QrCode size={16} /> QR Code
           </button>
           <button onClick={handleCopyPublicLink} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
             <Share2 size={16} /> Compartilhar Link
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limits = PLAN_CONFIG[tier].limits;
  const isLimitReached = products.length >= limits.products;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if(!newProduct.name || !newProduct.price) {
      alert("Preencha nome e preço.");
      return;
    }

    setSaving(true);
    let finalImageUrl = newProduct.image_url || null;

    try {
      // 1. Upload da imagem se existir
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${profile.user_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) {
           if (uploadError.message.includes('row-level security')) {
             throw new Error("Erro de Permissão no Supabase: Você precisa criar uma 'Policy' no Storage para permitir uploads (INSERT) para usuários autenticados.");
           }
           // Se o bucket não existir, vai dar erro aqui.
           throw new Error(`Erro no upload: ${uploadError.message}. Verifique se o bucket 'product-images' existe no Supabase.`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;
      }

      // 2. Salvar no Banco
      const { data, error } = await supabase.from('products').insert({
        user_id: profile.user_id,
        name: newProduct.name,
        price: Number(newProduct.price),
        description: newProduct.description || '',
        category: newProduct.category || 'Geral',
        image_url: finalImageUrl
      }).select().single();

      if (error) {
        console.error('Erro ao salvar produto:', error);
        let msg = error.message;
        if (msg.includes('column "image_url" of relation "products" does not exist')) {
           msg = 'A coluna "image_url" não foi criada no banco de dados. Execute o script SQL no Supabase.';
        }
        alert('Erro ao salvar produto: ' + msg);
      } else if (data) {
        onAdd(data as Product);
        setIsAdding(false);
        setNewProduct({ category: 'Geral' });
        setImageFile(null);
        setPreviewUrl(null);
      }
    } catch (err: any) {
       alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
       alert('Erro ao deletar: ' + error.message);
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
        <div className="bg-white p-6 rounded-xl border border-orange-200 mb-6 animate-fade-in shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
               <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
               <input placeholder="Ex: X-Salada" className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-sm font-medium text-gray-700">Preço (R$)</label>
               <input type="number" placeholder="0.00" className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
            </div>
            <div className="space-y-1 md:col-span-2">
               <label className="text-sm font-medium text-gray-700">Descrição</label>
               <input placeholder="Ingredientes, porção..." className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
            </div>
            
            <div className="md:col-span-2 space-y-2 pt-2">
               <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
               <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  {/* URL Input */}
                  <div className="flex-1 w-full">
                     <input
                        type="text"
                        placeholder="Cole uma URL de imagem..."
                        className="border border-gray-300 w-full p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        value={newProduct.image_url || ''}
                        onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                        disabled={!!imageFile}
                     />
                  </div>
                  <div className="text-gray-400 text-sm font-medium">OU</div>
                  {/* File Upload Button */}
                  <div className="relative">
                      <input 
                         type="file" 
                         id="file-upload" 
                         accept="image/*"
                         className="hidden"
                         onChange={handleFileChange}
                      />
                      <label 
                         htmlFor="file-upload" 
                         className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded border transition-colors ${imageFile ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                         <Upload size={18} />
                         {imageFile ? 'Imagem Selecionada' : 'Fazer Upload'}
                      </label>
                  </div>
               </div>
               
               {/* PREVIEW DA IMAGEM */}
               {imageFile && (
                  <div className="flex items-center gap-4 bg-green-50 p-3 rounded-lg border border-green-100 mt-2">
                     {previewUrl && (
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-md border border-green-200 shadow-sm" 
                        />
                     )}
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-green-800 flex items-center gap-1">
                           <CheckCircle size={12} /> Arquivo Selecionado
                        </span>
                        <span className="text-xs text-green-700 truncate max-w-[200px]">{imageFile.name}</span>
                        <button onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="text-xs text-red-500 hover:text-red-700 hover:underline mt-1 text-left">
                           Remover imagem
                        </button>
                     </div>
                  </div>
               )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button onClick={() => { setIsAdding(false); setImageFile(null); setPreviewUrl(null); }} className="text-gray-500 px-4 py-2 hover:bg-gray-50 rounded">Cancelar</button>
            <button 
               onClick={handleSave} 
               disabled={saving}
               className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-4 font-medium">Imagem</th>
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
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded-lg bg-gray-100" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </td>
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

const GeneratorView = ({ 
  profile, 
  products, 
  onSave 
}: { 
  profile: BusinessProfile, 
  products: Product[], 
  onSave: (c: GeneratedContent) => void 
}) => {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent[]>([]);
  const [selectedType, setSelectedType] = useState<'PACK_SEMANAL' | 'OFERTA_DIA' | 'RESPOSTA'>('PACK_SEMANAL');
  const [customContext, setCustomContext] = useState('');

  const handleGenerate = async () => {
    if (products.length === 0) {
      alert("Adicione produtos ao cardápio antes de gerar conteúdo.");
      return;
    }
    setLoading(true);
    try {
      const results = await generateMarketingContent(profile, products, selectedType, customContext);
      setGenerated(results);
      results.forEach(onSave);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
        <h2 className="text-xl font-bold mb-4 text-gray-900">IA de Marketing</h2>
        <p className="text-sm text-gray-500 mb-6">Escolha o tipo de conteúdo que deseja criar hoje.</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <button 
             onClick={() => setSelectedType('PACK_SEMANAL')} 
             className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${selectedType === 'PACK_SEMANAL' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Pack Semanal (5 posts)
          </button>
          <button 
             onClick={() => setSelectedType('OFERTA_DIA')} 
             className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${selectedType === 'OFERTA_DIA' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Oferta Relâmpago
          </button>
          <button 
             onClick={() => setSelectedType('RESPOSTA')} 
             className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${selectedType === 'RESPOSTA' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Responder Cliente
          </button>
        </div>
        
        {selectedType === 'RESPOSTA' && (
           <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem do Cliente</label>
              <textarea 
                className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Ex: 'Qual o valor da entrega?' ou 'Tem opção vegetariana?'" 
                rows={3}
                value={customContext}
                onChange={e => setCustomContext(e.target.value)}
              />
           </div>
        )}
        
        {selectedType === 'OFERTA_DIA' && (
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Produto em Destaque (Opcional)</label>
             <select 
               className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
               value={customContext}
               onChange={e => setCustomContext(e.target.value)}
             >
               <option value="">A IA escolhe o melhor</option>
               {products.map(p => <option key={p.id} value={p.name}>{p.name} - R$ {p.price}</option>)}
             </select>
           </div>
        )}

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-4 px-6 rounded-xl w-full flex items-center justify-center gap-3 hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />} 
          {loading ? 'A IA está criando...' : 'Gerar Conteúdo Agora'}
        </button>
      </div>

      <div className="space-y-6">
        {generated.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in-up" style={{animationDelay: `${idx * 0.1}s`}}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  item.type === 'FEED' ? 'bg-blue-100 text-blue-700' :
                  item.type === 'STORY' ? 'bg-pink-100 text-pink-700' :
                  item.type === 'WHATSAPP' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
              }`}>
                {item.type}
              </span>
              <button 
                 className="text-gray-400 hover:text-orange-600 flex items-center gap-1 text-sm font-medium transition-colors" 
                 onClick={() => {
                    navigator.clipboard.writeText(`${item.hook}\n\n${item.caption}\n\n${item.hashtags.join(' ')}`);
                    alert('Copiado!');
                 }}
              >
                <Copy size={16}/> Copiar
              </button>
            </div>

            {item.hook && (
                <div className="mb-3">
                   <h3 className="font-bold text-lg text-gray-900 leading-snug">{item.hook}</h3>
                </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap mb-4 font-sans text-sm leading-relaxed border border-gray-100">
               {item.caption}
            </div>

            {item.suggestion && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800 mb-4 flex gap-3 items-start">
                <div className="bg-yellow-100 p-1.5 rounded-full text-yellow-600 shrink-0 mt-0.5"><Sparkles size={14}/></div>
                <div>
                  <strong className="block mb-1 text-yellow-900">Sugestão de Imagem/Arte:</strong>
                  {item.suggestion}
                </div>
              </div>
            )}
            
            {item.cta && (
               <div className="text-sm font-bold text-orange-600 mb-2">
                 📢 CTA: {item.cta}
               </div>
            )}

            <div className="text-blue-600 text-xs font-medium">{item.hashtags.join(' ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BillingView = ({ profile }: { profile: BusinessProfile }) => {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
           <User size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sua Assinatura</h2>
        <p className="text-gray-500 mb-8">Gerencie seu plano e método de pagamento</p>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 text-left">
           <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Plano Atual</span>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded uppercase">Ativo</span>
           </div>
           <div className="text-3xl font-bold text-gray-900 mb-1">{PLAN_CONFIG[profile.subscription?.tier || PlanTier.FREE].name}</div>
           <div className="text-sm text-gray-500">
              {profile.subscription?.tier === PlanTier.FREE 
                ? 'Expira em 7 dias' 
                : 'Renovação automática mensal'
              }
           </div>
        </div>
        
        <button 
           onClick={() => alert("Integração com Stripe Customer Portal viria aqui.")}
           className="w-full bg-gray-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
        >
           <ExternalLink size={18} />
           Abrir Portal do Cliente
        </button>
        <p className="text-xs text-gray-400 mt-4">Você será redirecionado para a página segura de pagamentos.</p>
      </div>
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

  // --- WHITE LABEL LOGIC ---
  // Only show "Cardápio Digital por ViralMenu" if user is NOT on AGENCY plan
  const showBranding = profile.subscription?.tier !== PlanTier.AGENCY;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-fade-in">
      {/* Banner / Header Hero */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gray-900 overflow-hidden">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="Capa" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-500 to-red-600" />
          )}
        </div>
        
        {/* Profile Card Floating */}
        <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
             <div className="flex-shrink-0">
               {profile.logo_url ? (
                 <img src={profile.logo_url} className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white" alt="Logo" />
               ) : (
                 <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-orange-100 flex items-center justify-center text-orange-600">
                    <ChefHat size={40} />
                 </div>
               )}
             </div>
             <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 text-sm text-gray-500 mb-3">
                   <span className="flex items-center gap-1"><MapPin size={14}/> {profile.city}</span>
                   <span>•</span>
                   <span>{profile.category}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Aberto Agora
                </div>
             </div>
             <div>
                <a 
                   href={`https://wa.me/55${profile.phone.replace(/\D/g, '')}`} 
                   target="_blank" 
                   rel="noreferrer"
                   className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <MessageCircle size={20} /> Pedir no WhatsApp
                </a>
             </div>
          </div>
        </div>
      </div>

      {/* Categories Navigation (Stickyish) */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-20 py-4 shadow-sm border-b border-gray-200 mt-4 overflow-x-auto no-scrollbar">
         <div className="max-w-3xl mx-auto px-4 flex gap-2">
            {categories.map(cat => (
              <a 
                href={`#cat-${cat}`} 
                key={cat}
                className="whitespace-nowrap px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
              >
                {cat}
              </a>
            ))}
         </div>
      </div>

      {/* Menu Categories */}
      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-10">
        {categories.map(cat => (
          <div key={cat} id={`cat-${cat}`} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {cat}
              <div className="h-px bg-gray-200 flex-1 ml-4"></div>
            </h2>
            
            <div className="grid gap-4">
              {products.filter(p => p.category === cat).map(product => (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex gap-4">
                  {/* Text Content */}
                  <div className="flex-1 flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{product.name}</h3>
                          {product.isPopular && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                               <Sparkles size={10} /> Top
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
                     </div>
                     <div className="mt-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-green-700">R$ {product.price.toFixed(2)}</span>
                        <a 
                          href={`https://wa.me/55${profile.phone.replace(/\D/g, '')}?text=Olá, gostaria de pedir: ${product.name}`}
                          target="_blank"
                          rel="noreferrer" 
                          className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          Adicionar <Plus size={16}/>
                        </a>
                     </div>
                  </div>

                  {/* Image Content */}
                  {product.image_url ? (
                    <div className="w-28 h-28 flex-shrink-0">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg bg-gray-100" />
                    </div>
                  ) : (
                    // Placeholder if no image, specific to category could be nice, but simple generic for now
                    null 
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* White Label Footer Logic */}
      {showBranding && (
        <div className="text-center text-gray-400 text-xs mt-12 pb-4">
          <p className="mb-2">Imagens meramente ilustrativas.</p>
          Cardápio Digital por <span className="font-bold text-orange-400">ViralMenu</span>
        </div>
      )}
      
      {!showBranding && (
         <div className="text-center text-gray-300 text-[10px] mt-12 pb-4">
            <p>Imagens meramente ilustrativas.</p>
         </div>
      )}
    </div>
  );
};

const App = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Initial check
    if (window.location.hash.startsWith('#/m/')) {
       handleHashChange();
    } else {
       // Only run auth check if NOT on a public menu URL
       checkAuth();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // If we just logged in or refreshed, fetch data
        if (!profile) fetchUserData(session.user.id);
      } else {
        // Logged out
        if (!window.location.hash.startsWith('#/m/')) {
           setProfile(null);
           setProducts([]);
           setView(AppView.LANDING);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  };

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
         console.error("Error fetching profile:", error);
      }

      if (profileData) {
        setProfile(profileData);
        
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId);
          
        if (productsData) setProducts(productsData);

        // Se estava no LANDING ou AUTH, vai pro DASHBOARD
        if (view === AppView.LANDING || view === AppView.AUTH) {
           setView(AppView.DASHBOARD);
        }
      } else {
        // Authenticated but no profile -> Onboarding
        setView(AppView.ONBOARDING);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView(AppView.LANDING);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-orange-600" size={48} />
           <p className="text-gray-500 font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  // Routing
  const renderView = () => {
    switch (view) {
      case AppView.MENU_PREVIEW:
        return <MenuPublicView profile={profile} products={products} />;

      case AppView.LANDING:
        return <Landing onStart={() => setView(AppView.AUTH)} onLogin={() => setView(AppView.AUTH)} />;
      
      case AppView.AUTH:
        return <AuthScreen onAuthSuccess={() => { /* Handled by AuthStateChange */ }} />;
      
      case AppView.ONBOARDING:
        return <Onboarding onComplete={(p, prods) => { setProfile(p); setProducts(prods); setView(AppView.DASHBOARD); }} />;
      
      case AppView.DASHBOARD:
        if (!profile) return null;
        return (
           <Dashboard 
              profile={profile} 
              generatedCount={generatedContents.length} 
              products={products}
              onQuickAction={() => setView(AppView.GENERATOR)}
              onUpgrade={() => setView(AppView.BILLING)}
           />
        );

      case AppView.PRODUCTS:
        if (!profile) return null;
        return (
           <ProductsManager 
             products={products} 
             profile={profile}
             onAdd={(p) => setProducts([...products, p])}
             onDelete={(id) => setProducts(products.filter(p => p.id !== id))}
             onUpgrade={() => setView(AppView.BILLING)}
           />
        );

      case AppView.GENERATOR:
        if (!profile) return null;
        return (
           <GeneratorView 
             profile={profile} 
             products={products} 
             onSave={(c) => setGeneratedContents([c, ...generatedContents])} 
           />
        );

      case AppView.BILLING:
        if (!profile) return null;
        return <BillingView profile={profile} />;

      default:
        return <Landing onStart={() => setView(AppView.AUTH)} onLogin={() => setView(AppView.AUTH)} />;
    }
  };

  return (
    <Layout 
      currentView={view} 
      onChangeView={setView} 
      profile={profile}
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
};

export default App;