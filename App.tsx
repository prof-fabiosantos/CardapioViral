import React from 'react';
import { Clock, Smartphone, DollarSign } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
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
  );
}