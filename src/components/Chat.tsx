import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { createChat, qualifyLead } from '../services/geminiService';
import { ChatMessage, Lead, LeadStatus } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: "Olá! Sou o seu assistente imobiliário. Como posso ajudar você a encontrar o imóvel dos seus sonhos hoje?" }] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadCreated, setLeadCreated] = useState(false);
  const [notificationSent, setNotificationSent] = useState({ hot: false, qualified: false });
  const [displayLimit, setDisplayLimit] = useState(10);
  const prevCount = useRef(messages.length);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 10;
  const hasMoreMessages = messages.length > displayLimit;
  const visibleMessages = messages.slice(-displayLimit);

  useEffect(() => {
    chatRef.current = createChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Increment display limit as new messages arrive to keep them in view
    if (messages.length > prevCount.current) {
      const diff = messages.length - prevCount.current;
      setDisplayLimit(prev => prev + diff);
    }
    prevCount.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: input });
      const botMessage: ChatMessage = { role: 'model', parts: [{ text: response.text || "Desculpe, não consegui processar sua solicitação no momento." }] };
      setMessages(prev => [...prev, botMessage]);

      // Every few messages, try to qualify and update the lead (or create it)
      if (messages.length > 3) {
        await processLeadQualification([...messages, userMessage, botMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processLeadQualification = async (history: ChatMessage[]) => {
    try {
      const qualification = await qualifyLead(history);
      
      // If we have a name or a significant score, save/update in Firestore
      if (qualification.score > 20) {
        const leadId = localStorage.getItem('currentLeadId') || `lead_${Date.now()}`;
        localStorage.setItem('currentLeadId', leadId);

        const leadData = {
          name: qualification.name || null,
          email: qualification.email || null,
          phone: qualification.phone || null,
          budget: qualification.budget || null,
          interests: qualification.interests || [],
          location: qualification.location || null,
          score: Math.floor(qualification.score),
          summary: qualification.summary,
          status: qualification.score > 70 ? LeadStatus.QUALIFIED : LeadStatus.NEW,
          qualifications: {
            readyToBuy: qualification.readyToBuy,
            hasFinancing: qualification.hasFinancing,
            urgency: qualification.urgency
          },
          chatHistory: history,
          updatedAt: serverTimestamp(),
          createdAt: leadCreated ? undefined : serverTimestamp(), // only set on initial create
        };

        const docRef = doc(db, 'leads', leadId);
        try {
          // Remove undefined values to avoid Firestore errors
          const cleanData = Object.fromEntries(
            Object.entries(leadData).filter(([_, v]) => v !== undefined)
          );
          await setDoc(docRef, cleanData, { merge: true });
          setLeadCreated(true);

          // Trigger Notifications
          if (leadData.score > 80 && !notificationSent.hot) {
            await createNotification(leadId, leadData, 'hot_lead');
            setNotificationSent(prev => ({ ...prev, hot: true }));
          } else if (leadData.status === LeadStatus.QUALIFIED && !notificationSent.qualified) {
            await createNotification(leadId, leadData, 'qualification_complete');
            setNotificationSent(prev => ({ ...prev, qualified: true }));
          }

        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `leads/${leadId}`);
        }
      }
    } catch (error) {
      console.error('Qualification error:', error);
    }
  };

  const createNotification = async (leadId: string, leadData: any, type: 'hot_lead' | 'qualification_complete') => {
    const notifId = `notif_${Date.now()}`;
    const notification = {
      leadId,
      title: type === 'hot_lead' ? 'ALERTA: LEAD DE ALTA PRIORIDADE' : 'LEAD QUALIFICADO',
      message: type === 'hot_lead' 
        ? `Lead ${leadData.name || 'Identificado'} com score ${leadData.score}. Budget: ${leadData.budget ? leadData.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}.`
        : `O perfil de ${leadData.name || 'Identificado'} foi estabilizado e está pronto para contato.`,
      type,
      read: false,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'notifications', notifId), notification);
    } catch (err) {
      console.error('Notification trigger failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-white border border-slate-200 overflow-hidden shadow-2xl">
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded flex items-center justify-center font-black text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            AI
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-widest text-sm">Consultor Virtual</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">Processamento Ativo</p>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {hasMoreMessages && (
          <div className="flex justify-center pb-4">
            <button 
              onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-sm text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"
            >
              Ver mensagens anteriores ({messages.length - displayLimit})
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {visibleMessages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-4 max-w-[90%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border",
                m.role === 'user' ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white border-slate-200 text-emerald-600"
              )}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-4 text-sm leading-relaxed",
                m.role === 'user' 
                  ? "bg-slate-900 text-white rounded-l-lg rounded-br-lg shadow-lg shadow-slate-900/10" 
                  : "bg-white border border-slate-200 text-slate-700 rounded-r-lg rounded-bl-lg shadow-sm"
              )}>
                <div className="prose prose-sm prose-slate">
                  <ReactMarkdown>
                    {m.parts[0].text}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-4 max-w-[90%]">
            <div className="w-8 h-8 rounded-sm bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-r-lg rounded-bl-lg shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analisando Perfil</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-200">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="COMO POSSO AJUDAR?"
            className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-0 focus:border-slate-900 text-sm outline-none transition-all font-medium placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-white rounded-sm disabled:opacity-50 transition-all hover:bg-slate-800"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-4">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
            AES QUALIFICATION PROTOCOL V.1.0
          </p>
          {leadCreated && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-emerald-400 rounded-full" />
              <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Lead Sincronizado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
