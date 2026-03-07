import React, { useState, useEffect } from 'react';
import { 
  LogOut, Store, MapPin, Loader2, Package, BarChart3, 
  ChevronRight, Calendar, Users, DollarSign, TrendingUp,
  FileSignature, LifeBuoy, ArrowLeftRight, Building2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { InventoryRecord, Contract, SupportTicket } from '../types';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import clsx from 'clsx';

interface FranchiseeAreaProps {
  franchise: any;
  cpf: string;
  onLogout: () => void;
  onSwitchRole?: () => void;
}

export const FranchiseeArea: React.FC<FranchiseeAreaProps> = ({ franchise, cpf, onLogout, onSwitchRole }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'contracts' | 'support'>('dashboard');
  const [classes, setClasses] = useState<any[]>([]);
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

  const franchiseName = franchise?.franchisee_name || franchise?.company_name || 'Franqueado';
  const franchiseEmail = franchise?.email || '';
  const franchiseId = franchise?.id || '';

  useEffect(() => {
    fetchData();
  }, [franchise]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [classRes, contractRes, ticketRes] = await Promise.all([
        appBackend.client.from('crm_classes').select('*').ilike('studio_mod_1', `%${franchise?.company_name || ''}%`),
        franchiseEmail ? appBackend.getPendingContractsByEmail(franchiseEmail) : Promise.resolve([]),
        franchiseId ? appBackend.getSupportTicketsBySender(franchiseId).catch(() => []) : Promise.resolve([]),
      ]);
      setClasses(classRes.data || []);
      setPendingContracts(contractRes);
      const pending = (ticketRes as SupportTicket[]).filter(t => t.status === 'pending').length;
      setPendingTicketsCount(pending);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (signingContract) {
    return <ContractSigning contract={signingContract} onBack={() => { setSigningContract(null); fetchData(); }} />;
  }

  const tabs = [
    { id: 'dashboard' as const, label: 'Painel', icon: BarChart3 },
    { id: 'classes' as const, label: 'Turmas', icon: Calendar },
    { id: 'contracts' as const, label: 'Contratos', icon: FileSignature, badge: pendingContracts.length },
    { id: 'support' as const, label: 'Suporte', icon: LifeBuoy, badge: pendingTicketsCount },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <Store size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800">{franchiseName}</h1>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Área do Franqueado</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchRole && (
              <button onClick={onSwitchRole} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors mr-2">
                <ArrowLeftRight size={14} /> Trocar Perfil
              </button>
            )}
            <button onClick={onLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 font-medium transition-colors">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-2">
        <nav className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap relative",
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <tab.icon size={16} /> {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in">
                <section className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                    <span className="text-purple-200 text-xs font-black uppercase tracking-widest">Franquia</span>
                    <h2 className="text-3xl font-black mt-1">{franchiseName}</h2>
                    {franchise?.city && (
                      <p className="text-purple-100 flex items-center gap-1 mt-2 text-sm">
                        <MapPin size={14} /> {franchise.city}{franchise.state ? `, ${franchise.state}` : ''}
                      </p>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Turmas Ativas</p>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800">{classes.length}</h4>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <FileSignature size={20} />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Contratos Pendentes</p>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800">{pendingContracts.length}</h4>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <LifeBuoy size={20} />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Chamados Abertos</p>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800">{pendingTicketsCount}</h4>
                  </div>
                </div>

                {franchise?.sales_consultant && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Consultor Comercial</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{franchise.sales_consultant}</p>
                        <p className="text-xs text-slate-500">Seu contato direto na VOLL</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-black text-slate-800">Turmas Vinculadas</h2>
                {classes.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Nenhuma turma vinculada.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {classes.map((c: any) => (
                      <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800">{c.name || c.course_name || 'Turma'}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {c.start_date && `Início: ${new Date(c.start_date).toLocaleDateString('pt-BR')}`}
                            {c.end_date && ` — Fim: ${new Date(c.end_date).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          c.status === 'active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {c.status === 'active' ? 'Ativa' : c.status || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-black text-slate-800">Contratos Pendentes</h2>
                {pendingContracts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <FileSignature className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Nenhum contrato pendente.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {pendingContracts.map(c => (
                      <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800">{c.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">Criado em {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button
                          onClick={() => setSigningContract(c)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          Assinar <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-800">Suporte</h2>
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
                  >
                    Abrir Chamado
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <LifeBuoy className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-slate-500 font-medium">Seus chamados de suporte aparecerão aqui.</p>
                  <p className="text-xs text-slate-400 mt-1">Clique em "Abrir Chamado" para solicitar ajuda.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showSupportModal && (
        <SupportTicketModal
          senderId={franchiseId}
          senderName={franchiseName}
          senderRole="franchise"
          onClose={() => setShowSupportModal(false)}
          onCreated={() => { setShowSupportModal(false); fetchData(); }}
        />
      )}
    </div>
  );
};
