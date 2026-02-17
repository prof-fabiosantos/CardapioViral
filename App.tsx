import React, { useState, useEffect, useRef } from 'react';
import { AppView, BusinessProfile, Product, GeneratedContent, BusinessCategory, ToneOfVoice, PlanTier } from './types';
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
  QrCode, X, Download, Upload, Loader2, ChevronDown, ChevronUp, Star, Clock, DollarSign, RefreshCw
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Escolha seu Plano</h2>
            <p className="text-gray-500 text-lg">Soluções para quem está começando e para quem quer dominar o mercado.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Trial */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
               <h3 className="font-bold text-lg text-gray-900">Trial Grátis</h3>
               <div className="my-4">
                 <span className="text-3xl font-extrabold">R$ 0</span>
                 <span className="text-gray-500 text-sm">/7 dias</span>
               </div>
               <p className="text-gray-500 text-sm mb-6 flex-1">Para usuários novos que querem testar se a ferramenta funciona.</p>
               <button onClick={onStart} className="w-full py-2 border-2 border-gray-900 text-gray-900 font-bold rounded-lg hover:bg-gray-50 mb-6 text-sm">
                 Testar Agora
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> 5 Produtos</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> 5 Gerações de IA</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> IA Básica (Pack Semanal)</li>
               </ul>
            </div>

            {/* Solo */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
               <h3 className="font-bold text-lg text-gray-900">Plano Solo</h3>
               <div className="my-4">
                 <span className="text-3xl font-extrabold">R$ 29</span>
                 <span className="text-gray-500 text-sm">/mês</span>
               </div>
               <p className="text-gray-500 text-sm mb-6 flex-1">Para pequenos negócios que estão começando e têm um cardápio enxuto.</p>
               <button onClick={onStart} className="w-full py-2 bg-gray-100 text-gray-800 font-bold rounded-lg hover:bg-gray-200 mb-6 text-sm">
                 Começar Solo
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> 20 Produtos</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> 10 Gerações/mês</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> IA Intermediária (+ Oferta do Dia)</li>
               </ul>
            </div>

            {/* Pro (Highlighted) */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-orange-500 relative transform md:-translate-y-4 flex flex-col">
               <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">MAIS VENDIDO</div>
               <h3 className="font-bold text-lg text-orange-600">Plano Pro</h3>
               <div className="my-4">
                 <span className="text-3xl font-extrabold">R$ 59</span>
                 <span className="text-gray-500 text-sm">/mês</span>
               </div>
               <p className="text-gray-500 text-sm mb-6 flex-1">O "Carro Chefe". Restaurantes e deliverys que precisam de liberdade total.</p>
               <button onClick={onStart} className="w-full py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 mb-6 shadow-lg shadow-orange-200 text-sm">
                 Quero Ilimitado
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> <strong>Produtos Ilimitados</strong></li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> <strong>IA Ilimitada</strong></li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> IA Completa (+ Respostas)</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> Suporte VIP</li>
               </ul>
            </div>

            {/* Agency */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
               <h3 className="font-bold text-lg text-gray-900">Agência</h3>
               <div className="my-4">
                 <span className="text-3xl font-extrabold">R$ 99</span>
                 <span className="text-gray-500 text-sm">/mês</span>
               </div>
               <p className="text-gray-500 text-sm mb-6 flex-1">Para Social Media Managers e Agências revenderem tecnologia.</p>
               <button onClick={onStart} className="w-full py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 mb-6 text-sm">
                 Falar com Consultor
               </button>
               <ul className="space-y-3 text-sm text-gray-600">
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> <strong>Marca Branca (Sem Logo)</strong></li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> Multi-clientes (Gestão)</li>
                 <li className="flex gap-2"><CheckCircle size={16} className="text-green-500 flex-shrink-0" /> Tudo do Plano Pro</li>
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
            <p className="mb-4 text-sm">
               <span className="block font-bold text-white mb-1">Fale com a gente:</span>
               <a href="mailto:decentralizedtech.com.br@gmail.com" className="hover:text-white transition-colors">decentralizedtech.com.br@gmail.com</a>
            </p>
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
              <li><a href="mailto:decentralizedtech.com.br@gmail.com" className="hover:text-white">Contato</a></li>
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
  // ... (Onboarding implementation remains exactly same as previous) ...
  // Re-pasting the full component for completeness in App.tsx
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

      let finalLogoUrl = profile.logo_url || '';
      let finalBannerUrl = profile.banner_url || '';

      if (logoFile) {
         const fileExt = logoFile.name.split('.').pop();
         const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
         const { error: logoErr } = await supabase.storage.from('product-images').upload(fileName, logoFile);
         if (!logoErr) {
            const { data: logoData } = supabase.storage.from('product-images').getPublicUrl(fileName);
            finalLogoUrl = logoData.publicUrl;
         }
      }

      if (bannerFile) {
         const fileExt = bannerFile.name.split('.').pop();
         const fileName = `${user.id}/banner-${Date.now()}.${fileExt}`;
         const { error: bannerErr } = await supabase.storage.from('product-images').upload(fileName, bannerFile);
         if (!bannerErr) {
            const { data: bannerData } = supabase.storage.from('product-images').getPublicUrl(fileName);
            finalBannerUrl = bannerData.publicUrl;
         }
      }

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

      const { error: profileError } = await supabase.from('profiles').insert(finalProfile);
      if (profileError) throw profileError;

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
             {/* Simplified inputs for brevity in this change block */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg p-3 outline-none" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg p-3 outline-none" value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular (WhatsApp)</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg p-3 outline-none" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-gray-300 rounded-lg p-3 outline-none" onChange={e => setProfile({...profile, category: e.target.value as BusinessCategory})}>
                <option value="">Selecione...</option>
                {Object.values(BusinessCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button disabled={!profile.name || !profile.category || !profile.phone} onClick={handleNext} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 disabled:opacity-50">Próximo</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Opcional)</label>
              <input type="file" onChange={handleLogoChange} className="mb-2 text-sm text-gray-500"/>
              {logoPreview && <img src={logoPreview} className="w-16 h-16 rounded-full border" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capa (Opcional)</label>
              <input type="file" onChange={handleBannerChange} className="mb-2 text-sm text-gray-500"/>
              {bannerPreview && <img src={bannerPreview} className="w-32 h-16 object-cover border" />}
            </div>
            <button onClick={handleNext} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg mt-4">Próximo</button>
          </div>
        )}

        {step === 3 && (
           <div className="space-y-4">
             <p className="text-gray-600 text-sm">Como sua marca fala com os clientes?</p>
             <div className="grid grid-cols-1 gap-3">
               {Object.values(ToneOfVoice).map((tone) => (
                 <button key={tone} onClick={() => setProfile({...profile, tone})} className={`p-4 border rounded-lg text-left ${profile.tone === tone ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>{tone}</button>
               ))}
             </div>
             <button disabled={!profile.tone} onClick={handleSubmit} className="w-full bg-gray-900 text-white font-bold py-4 rounded-lg mt-4">{loading ? 'Criando...' : 'Finalizar'}</button>
           </div>
        )}
      </div>
    </div>
  );
};

// 3. Updated Dashboard Component

const Dashboard = ({ 
  profile, 
  generatedCount,
  analytics, // New Prop
  onQuickAction,
  onUpgrade,
  products
}: { 
  profile: BusinessProfile, 
  generatedCount: number,
  analytics: { visits: number, clicks: number },
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
            <span className="text-2xl font-bold">{analytics.visits}</span>
          </div>
          <h3 className="font-medium text-gray-700">Visitas no Cardápio</h3>
          <p className="text-xs text-gray-400 mt-1">Últimos 7 dias</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-green-300 transition-colors">
           <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg text-green-600"><MessageCircle size={24} /></div>
            <span className="text-2xl font-bold">{analytics.clicks}</span>
          </div>
          <h3 className="font-medium text-gray-700">Cliques no WhatsApp</h3>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
            <ArrowRight size={12} />
            <span>Taxa de conversão: {analytics.visits > 0 ? ((analytics.clicks/analytics.visits)*100).toFixed(1) : 0}%</span>
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
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: 'Lanches' });
  const [loading, setLoading] = useState(false);

  const tier = profile.subscription?.tier || PlanTier.FREE;
  const limit = PLAN_CONFIG[tier].limits.products;
  const canAdd = products.length < limit;

  const handleSave = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setLoading(true);
    try {
       const productToSave = {
          ...newProduct,
          user_id: profile.user_id,
          price: Number(newProduct.price)
       } as Product;

       const { data, error } = await supabase.from('products').insert(productToSave).select().single();
       if (error) throw error;
       
       onAdd(data);
       setIsAdding(false);
       setNewProduct({ category: 'Lanches' });
    } catch (e: any) {
       alert('Erro ao salvar: ' + e.message);
    } finally {
       setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
     if(!confirm('Tem certeza?')) return;
     const { error } = await supabase.from('products').delete().eq('id', id);
     if (!error) onDelete(id);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Seu Cardápio</h2>
          <p className="text-gray-500 text-sm">
             {products.length} / {limit === 9999 ? '∞' : limit} produtos
          </p>
        </div>
        {!canAdd ? (
           <button onClick={onUpgrade} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-orange-200">
             <Lock size={16} /> Aumentar Limite
           </button>
        ) : (
           <button onClick={() => setIsAdding(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-orange-700">
             <Plus size={16} /> Novo Produto
           </button>
        )}
      </div>

      {isAdding && (
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in">
            <h3 className="font-bold mb-4">Novo Produto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <input placeholder="Nome (ex: X-Bacon)" className="p-2 rounded border" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
               <input placeholder="Preço (ex: 29.90)" type="number" className="p-2 rounded border" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
               <input placeholder="Descrição" className="p-2 rounded border md:col-span-2" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
               <select className="p-2 rounded border" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  <option>Lanches</option>
                  <option>Bebidas</option>
                  <option>Porções</option>
                  <option>Sobremesas</option>
                  <option>Outros</option>
               </select>
            </div>
            <div className="flex gap-2">
               <button onClick={handleSave} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded font-bold">{loading ? 'Salvando...' : 'Salvar'}</button>
               <button onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-bold">Cancelar</button>
            </div>
         </div>
      )}

      <div className="grid gap-4">
         {products.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
               <div>
                  <h4 className="font-bold text-gray-900">{p.name}</h4>
                  <p className="text-sm text-gray-500">{p.category} • R$ {p.price.toFixed(2)}</p>
               </div>
               <button onClick={() => p.id && handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
               </button>
            </div>
         ))}
         {products.length === 0 && !isAdding && (
            <div className="text-center py-8 text-gray-400">Nenhum produto cadastrado.</div>
         )}
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
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

  // Load history on mount
  useEffect(() => {
    if(profile.user_id) {
       dbService.getGeneratedHistory(profile.user_id).then(history => {
          if(history.length > 0) setGenerated(history);
       });
    }
  }, [profile.user_id]);

  const handleGenerate = async () => {
    if (products.length === 0) {
      alert("Adicione produtos ao cardápio antes de gerar conteúdo.");
      return;
    }
    setLoading(true);
    try {
      const results = await generateMarketingContent(profile, products, selectedType, customContext);
      
      // Save to DB and update state
      // Note: We save items individually to DB
      for (const item of results) {
         if (profile.user_id) {
            await dbService.saveGeneratedContent(profile.user_id, item);
         }
      }
      
      const newHistory = [...results, ...generated];
      setGenerated(newHistory);
      
      // Trigger update on parent to refresh dashboard count
      if(results.length > 0) onSave(results[0]); 

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingleImage = async (itemIndex: number, item: GeneratedContent) => {
      if (!item.suggestion) return;
      setGeneratingImages(prev => ({ ...prev, [item.id || itemIndex]: true }));
      try {
          const imageBase64 = await generateSingleImage(item.suggestion, item.type, profile);
          const updatedItem = { ...item, generatedImage: imageBase64 };
          
          // Update local state
          const newGenerated = [...generated];
          newGenerated[itemIndex] = updatedItem;
          setGenerated(newGenerated);
          
          // Persist the image update to DB (Insert as new entry or update - for MVP we insert new to keep simple history)
          if(profile.user_id) {
             await dbService.saveGeneratedContent(profile.user_id, updatedItem);
          }
          
      } catch (e: any) {
          alert("Erro ao gerar imagem: " + e.message);
      } finally {
          setGeneratingImages(prev => ({ ...prev, [item.id || itemIndex]: false }));
      }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
        <h2 className="text-xl font-bold mb-4 text-gray-900">IA de Marketing</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setSelectedType('PACK_SEMANAL')} className={`px-4 py-2 rounded-lg border font-medium text-sm ${selectedType === 'PACK_SEMANAL' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white'}`}>Pack Semanal</button>
          <button onClick={() => setSelectedType('OFERTA_DIA')} className={`px-4 py-2 rounded-lg border font-medium text-sm ${selectedType === 'OFERTA_DIA' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white'}`}>Oferta Relâmpago</button>
          <button onClick={() => setSelectedType('RESPOSTA')} className={`px-4 py-2 rounded-lg border font-medium text-sm ${selectedType === 'RESPOSTA' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white'}`}>Responder Cliente</button>
        </div>
        {selectedType === 'RESPOSTA' && (
           <textarea className="w-full border p-3 rounded-lg mb-4" placeholder="Mensagem do cliente..." rows={3} value={customContext} onChange={e => setCustomContext(e.target.value)} />
        )}
        <button onClick={handleGenerate} disabled={loading} className="bg-orange-600 text-white font-bold py-4 px-6 rounded-xl w-full flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} {loading ? 'Criando...' : 'Gerar Conteúdo'}
        </button>
      </div>

      <div className="space-y-6">
        {generated.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             {/* Content Display Logic (Same as before) */}
             <div className="flex justify-between mb-4">
                <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded">{item.type}</span>
                <button onClick={() => navigator.clipboard.writeText(item.caption)} className="text-gray-400 hover:text-orange-600"><Copy size={16}/></button>
             </div>
             {item.generatedImage ? (
                <img src={item.generatedImage} className="w-full rounded-lg mb-4" />
             ) : (
                item.suggestion && (
                   <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center">
                      <button 
                        onClick={() => handleGenerateSingleImage(idx, item)} 
                        disabled={generatingImages[item.id || idx]}
                        className="text-sm font-bold text-gray-700 flex items-center justify-center gap-2 mx-auto"
                      >
                         {generatingImages[item.id || idx] ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Gerar Imagem
                      </button>
                   </div>
                )
             )}
             <p className="whitespace-pre-wrap text-sm text-gray-700">{item.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const BillingView = ({ profile }: { profile: BusinessProfile }) => {
  const currentTier = profile.subscription?.tier || PlanTier.FREE;

  const handleSubscribe = (tier: PlanTier) => {
    alert(`Redirecionando para o Stripe (${tier})...`);
    // Logic for stripe redirection would go here
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciar Assinatura</h2>
         <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
             <div className="flex-1">
                 <p className="text-sm text-gray-600">Plano Atual</p>
                 <p className="text-2xl font-bold text-orange-700">{PLAN_CONFIG[currentTier].name}</p>
             </div>
             <div className="text-right">
                 <p className="text-sm text-gray-600">Status</p>
                 <p className="font-bold text-green-600 capitalize">{profile.subscription?.status || 'Ativo'}</p>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
           if (key === PlanTier.FREE) return null;
           const isCurrent = currentTier === key;
           return (
             <div key={key} className={`bg-white p-6 rounded-xl shadow-sm border ${isCurrent ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200'} flex flex-col`}>
                 <h3 className="font-bold text-lg">{plan.name}</h3>
                 <div className="my-4">
                    <span className="text-3xl font-bold">R$ {plan.price}</span>
                    <span className="text-gray-500">/mês</span>
                 </div>
                 <ul className="space-y-2 mb-6 flex-1 text-sm text-gray-600">
                    <li>✓ {plan.limits.products === 9999 ? 'Produtos Ilimitados' : `${plan.limits.products} Produtos`}</li>
                    <li>✓ {plan.limits.generations === 9999 ? 'Gerações IA Ilimitadas' : `${plan.limits.generations} Gerações IA/mês`}</li>
                    <li>✓ Suporte Prioritário</li>
                 </ul>
                 <button
                    onClick={() => handleSubscribe(key as PlanTier)}
                    disabled={isCurrent}
                    className={`w-full py-2 rounded-lg font-bold ${isCurrent ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                 >
                    {isCurrent ? 'Plano Atual' : 'Assinar'}
                 </button>
             </div>
           );
        })}
      </div>
    </div>
  );
};

// 4. Updated MenuPublicView with Tracking

const MenuPublicView = ({ profile, products }: { profile: BusinessProfile | null, products: Product[] }) => {
  const hasTrackedView = useRef(false);

  // Track View on Mount
  useEffect(() => {
    if (profile?.id && !hasTrackedView.current) {
      dbService.trackEvent(profile.id, 'VIEW');
      hasTrackedView.current = true;
    }
  }, [profile?.id]);

  const handleWhatsappClick = (productName?: string) => {
    if (profile?.id) {
       dbService.trackEvent(profile.id, 'CLICK_WHATSAPP');
    }
    const message = productName 
       ? `Olá, gostaria de pedir: ${productName}`
       : `Olá, vi o cardápio digital e gostaria de fazer um pedido.`;
    
    const url = `https://wa.me/55${profile?.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!profile) return <div className="p-8 text-center">Cardápio não encontrado.</div>;

  const categories = Array.from(new Set(products.map(p => p.category)));
  const showBranding = profile.subscription?.tier !== PlanTier.AGENCY;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-fade-in">
      {/* Header */}
      <div className="relative">
        <div className="h-48 bg-gray-900">
           {profile.banner_url && <img src={profile.banner_url} className="w-full h-full object-cover opacity-80" />}
        </div>
        <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4">
             {profile.logo_url && <img src={profile.logo_url} className="w-20 h-20 rounded-full border-4 border-white" />}
             <div>
                <h1 className="text-xl font-bold">{profile.name}</h1>
                <p className="text-sm text-gray-500">{profile.city}</p>
             </div>
             <button onClick={() => handleWhatsappClick()} className="ml-auto bg-green-500 text-white p-3 rounded-full shadow-lg">
                <MessageCircle />
             </button>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-8">
        {categories.map(cat => (
          <div key={cat}>
            <h2 className="text-lg font-bold mb-4">{cat}</h2>
            <div className="grid gap-4">
              {products.filter(p => p.category === cat).map(product => (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
                  <div className="flex-1">
                     <h3 className="font-bold">{product.name}</h3>
                     <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-green-700">R$ {product.price.toFixed(2)}</span>
                        <button onClick={() => handleWhatsappClick(product.name)} className="text-orange-600 font-bold text-sm flex items-center gap-1">
                           Adicionar <Plus size={16}/>
                        </button>
                     </div>
                  </div>
                  {product.image_url && <img src={product.image_url} className="w-24 h-24 object-cover rounded-lg bg-gray-100" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {showBranding && (
        <div className="text-center text-gray-400 text-xs mt-12 pb-4">
          Cardápio Digital por <span className="font-bold text-orange-400">ViralMenu</span>
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
  
  // Real stats from DB
  const [generatedCount, setGeneratedCount] = useState(0);
  const [analyticsStats, setAnalyticsStats] = useState({ visits: 0, clicks: 0 });
  
  const [loading, setLoading] = useState(true);

  // Hash Routing
  useEffect(() => {
    const handleHashChange = async () => {
      if (window.location.hash.startsWith('#/m/')) {
        setLoading(true);
        const slug = window.location.hash.replace('#/m/', '').split('?')[0];
        const { data: publicProfile } = await supabase.from('profiles').select('*').eq('slug', slug).single();

        if (publicProfile) {
           const { data: publicProducts } = await supabase.from('products').select('*').eq('user_id', publicProfile.user_id);
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

    if (window.location.hash.startsWith('#/m/')) {
       handleHashChange();
    } else {
       checkAuth();
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        if (!profile) fetchUserData(session.user.id);
      } else {
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

        if (view === AppView.LANDING || view === AppView.AUTH) setView(AppView.DASHBOARD);
      } else {
        setView(AppView.ONBOARDING);
      }
    } catch (error) {
      console.error(error);
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
    setView(AppView.LANDING);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-orange-600" size={48} />
      </div>
    );
  }

  // Routing
  const renderView = () => {
    switch (view) {
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
         // Simplified wrapper passing props
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
        return <Landing onStart={() => setView(AppView.AUTH)} onLogin={() => setView(AppView.AUTH)} />;
    }
  };

  return (
    <Layout currentView={view} onChangeView={setView} profile={profile} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;