import { useState } from 'react';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import { Home, MessageSquare, LayoutDashboard, Building2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type Page = 'home' | 'chat' | 'dashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-slate-900 flex-shrink-0 flex flex-col border-r border-slate-800 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-sm flex items-center justify-center font-bold text-slate-900">Q</div>
          <span className="text-white font-bold text-lg tracking-tight uppercase">Qualify.re</span>
        </div>
        
        <div className="mt-4 flex-grow px-4 space-y-2">
          {[
            { id: 'home', label: 'Dashboard Home', icon: Home },
            { id: 'chat', label: 'Lead Simulator', icon: MessageSquare },
            { id: 'dashboard', label: 'Sales CRM', icon: LayoutDashboard },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all text-left",
                currentPage === item.id 
                  ? "bg-slate-800 text-white shadow-inner" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                currentPage === item.id ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-transparent"
              )} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 group opacity-80 hover:opacity-100 transition-opacity cursor-default">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold border border-slate-600">
              RA
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-white font-medium truncate">Equipe Imobi</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Acesso Gestor</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
              {currentPage === 'home' ? 'Visão Geral do Sistema' : currentPage === 'chat' ? 'Qualificação em Tempo Real' : 'Lead Qualification Queue'}
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              {currentPage === 'home' ? 'Análise de performance e conversão' : 'Processamento baseado em budget e interesse'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">
              Status Operacional: Ativo
            </div>
          </div>
        </header>

        <main className="p-8 flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-12"
              >
                <div className="max-w-4xl">
                  <h2 className="text-6xl font-bold text-slate-900 leading-[1] mb-8 uppercase">
                    Poderosa Inteligência <br />
                    <span className="text-emerald-500">De Qualificação.</span>
                  </h2>
                  <p className="text-lg text-slate-600 max-w-2xl mb-10 border-l-2 border-slate-200 pl-6 border-l-emerald-500">
                    Aumente sua taxa de conversão imobiliária em até 40% delegando o primeiro contato e qualificação para nossa IA treinada no mercado de alto padrão.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setCurrentPage('chat')}
                      className="px-8 py-4 bg-slate-900 text-white rounded font-bold text-sm tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl"
                    >
                      INICIAR SIMULADOR
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                  {[
                    {
                      title: "Score de 0-100",
                      desc: "Algoritmos de IA analisam budget, urgência e perfil para rotular o lead com precisão geométrica.",
                      icon: MessageSquare,
                    },
                    {
                      title: "CRM Estruturado",
                      desc: "Interface limpa e focada em dados. Menos distrações, mais fechamentos.",
                      icon: LayoutDashboard,
                    },
                    {
                      title: "Filtro de Vendas",
                      desc: "Leve apenas os melhores leads para seus corretores. Elimine o ruído das consultas sem fundos.",
                      icon: Building2,
                    }
                  ].map((feature, i) => (
                    <div key={i} className="bg-white p-8 border border-slate-200 hover:border-emerald-500 group transition-all">
                      <feature.icon className="w-8 h-8 mb-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">{feature.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentPage === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                <Chat />
              </motion.div>
            )}

            {currentPage === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Dashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
