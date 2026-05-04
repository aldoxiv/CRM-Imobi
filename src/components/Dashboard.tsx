import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, signInWithGoogle } from '../lib/firebase';
import { Lead, LeadStatus } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  ChevronRight,
  LogOut,
  Mail,
  Phone,
  DollarSign,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        const q = query(collection(db, 'leads'), orderBy('updatedAt', 'desc'));
        const unsubscribeLeads = onSnapshot(q, (snapshot) => {
          const leadsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
          setLeads(leadsData);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'leads');
        });
        return () => unsubscribeLeads();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesFilter = filter === 'all' || l.status === filter;
    const matchesSearch = !searchTerm || 
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Acesso Restrito</h2>
        <p className="text-neutral-500 mb-6 max-w-sm">
          Apenas membros da equipe de vendas podem acessar o CRM de leads. Faça login para continuar.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-5 h-5 invert" alt="" />
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
        {[
          { label: 'Pipeline Total', value: leads.length, icon: Users, color: 'slate' },
          { label: 'High Priority', value: leads.filter(l => l.score > 80).length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Active Processing', value: leads.filter(l => l.status === LeadStatus.NEW).length, icon: Clock, color: 'amber' },
          { label: 'Conversion Rate', value: leads.length ? Math.round((leads.filter(l => l.status === LeadStatus.CLOSED).length / leads.length) * 100) + '%' : '0%', icon: TrendingUp, color: 'slate' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.label}</span>
              <stat.icon className={cn("w-4 h-4", stat.color === 'emerald' ? "text-emerald-500" : stat.color === 'amber' ? "text-amber-500" : "text-slate-400")} />
            </div>
            <p className="text-3xl font-mono font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main CRM View */}
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6 bg-slate-900 p-6 rounded-sm shadow-xl text-white">
            <div className="flex items-center gap-3 flex-1 min-w-[250px]">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="PROCURAR LEAD..." 
                className="bg-transparent border-none focus:ring-0 text-xs font-bold tracking-widest w-full placeholder:text-slate-600 uppercase"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                className="text-[10px] font-black uppercase tracking-widest border border-slate-700 bg-slate-800 rounded px-3 py-1.5 focus:ring-emerald-500 text-slate-300 transition-all cursor-pointer"
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
              >
                <option value="all">Filtro: Todos</option>
                <option value={LeadStatus.NEW}>Novos</option>
                <option value={LeadStatus.QUALIFIED}>Qualificados</option>
                <option value={LeadStatus.CONTACTED}>Em Contato</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Profile</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <motion.tr 
                      layout
                      key={lead.id} 
                      className={cn(
                        "hover:bg-slate-50 cursor-pointer transition-all border-l-4",
                        selectedLead?.id === lead.id ? "bg-slate-50 border-l-slate-900" : "border-l-transparent",
                        !selectedLead && lead.score > 80 ? "border-l-emerald-500" : 
                        !selectedLead && lead.score > 50 ? "border-l-amber-400" : ""
                      )}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">{lead.name || 'Anonymous'}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 tracking-tighter truncate max-w-[200px]">
                            {lead.email || lead.phone || 'NO CONTACT RECOVERED'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          <div className="flex gap-1 flex-wrap">
                            {(lead.interests || ['N/A']).slice(0, 2).map((it, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-tighter">
                                {it}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs font-mono font-bold text-emerald-600">
                            {lead.budget ? lead.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '---'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-lg font-mono font-bold leading-none",
                            lead.score > 80 ? "text-emerald-500" : lead.score > 50 ? "text-amber-500" : "text-slate-400"
                          )}>
                            {lead.score}
                          </span>
                          <span className="text-[9px] text-slate-300 font-bold uppercase -mb-1">/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            lead.status === LeadStatus.QUALIFIED ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                            lead.status === LeadStatus.NEW ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" :
                            "bg-slate-300"
                          )} />
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{lead.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded transition-colors group">
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Search className="w-8 h-8 text-slate-200" />
                          <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Zero Results Identified</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Lead Details Sidebar */}
        <AnimatePresence mode="wait">
          {selectedLead && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full xl:w-[450px] bg-white border border-slate-200 shadow-2xl flex flex-col h-fit sticky top-6 rounded-sm overflow-hidden"
            >
              <div className="p-8 bg-slate-900 text-white relative">
                <button 
                  onClick={() => setSelectedLead(null)} 
                  className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-3xl font-black text-emerald-400">
                    {(selectedLead.name || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">{selectedLead.name || 'Lead Identified'}</h3>
                    <div className="flex gap-2 mt-2">
                       <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-widest">
                         {selectedLead.qualifications?.urgency || 'Normal'} Intensity
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-800 pt-6">
                   <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Metric</p>
                     <p className="text-4xl font-mono font-bold text-emerald-500">
                       {selectedLead.score}<span className="text-sm text-slate-600 font-sans ml-1 uppercase">/100</span>
                     </p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Protocol</p>
                     <p className="text-sm font-bold text-white uppercase tracking-widest">{selectedLead.status}</p>
                   </div>
                </div>
              </div>

              <div className="p-8 space-y-8 bg-white border-b border-slate-200">
                {/* Interest Profile - Geometric Bars */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Qualification Alignment</h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Budget Readiness</span>
                        <span className="text-[10px] font-mono font-bold text-slate-900">92%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[92%] shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Intent Purity</span>
                        <span className="text-[10px] font-mono font-bold text-slate-900">{selectedLead.score}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 transition-all duration-1000" 
                          style={{ width: `${selectedLead.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Box */}
                <div className="bg-slate-50 p-6 border border-slate-100 rounded-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocol Summary</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    "{selectedLead.summary || 'Awaiting further interaction for profile stabilization...'}"
                  </p>
                </div>

                {/* Contact Table */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Record</p>
                     <p className="text-xs font-bold text-slate-900 truncate">{selectedLead.email || 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tel Record</p>
                     <p className="text-xs font-bold text-slate-900 truncate">{selectedLead.phone || 'N/A'}</p>
                   </div>
                   <div className="space-y-1 mt-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Location Target</p>
                     <p className="text-xs font-bold text-slate-900 truncate">{selectedLead.location || 'Not Specified'}</p>
                   </div>
                   <div className="space-y-1 mt-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget Tier</p>
                     <p className="text-xs font-bold text-emerald-600">
                       {selectedLead.budget ? selectedLead.budget.toLocaleString('pt-BR') : '---'}
                     </p>
                   </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="p-8 bg-slate-50 flex flex-col gap-3">
                <button 
                  onClick={() => updateLeadStatus(selectedLead.id, LeadStatus.CONTACTED)}
                  disabled={selectedLead.status === LeadStatus.CONTACTED}
                  className="w-full py-4 bg-emerald-500 text-slate-900 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:grayscale disabled:opacity-50"
                >
                  ASSIGN TO SALES AGENT
                </button>
                <div className="flex gap-1.5 mt-2">
                   <button 
                     onClick={() => updateLeadStatus(selectedLead.id, LeadStatus.REJECTED)}
                     className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                   >
                     Discard Lead
                   </button>
                   <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                     Download Log
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center py-10 border-t border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center p-1 border border-slate-200">
            {user.photoURL ? <img src={user.photoURL} className="w-full h-full rounded-sm" alt="" /> : <Users className="text-slate-300" />}
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{user.displayName || 'Authorized User'}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">System Operator @ ImobiQualif</p>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="px-4 py-2 border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all"
        >
          Terminate Session
        </button>
      </div>
    </div>
  );
}
