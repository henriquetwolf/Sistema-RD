import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Store, MapPin, Loader2, Package, BarChart3, 
  ChevronRight, Calendar, Users, DollarSign, TrendingUp,
  FileSignature, LifeBuoy, ArrowLeftRight, Building2, CheckCircle
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'contracts' | 'support' | 'financeiro'>('dashboard');
  const [classes, setClasses] = useState<any[]>([]);
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const [finReceivables, setFinReceivables] = useState<any[]>([]);
  const [finPayables, setFinPayables] = useState<any[]>([]);
  const [isLoadingFinanceiro, setIsLoadingFinanceiro] = useState(false);
  const [finFilterStatus, setFinFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [finFilterDateFrom, setFinFilterDateFrom] = useState('');
  const [finFilterDateTo, setFinFilterDateTo] = useState('');
  const [finFilterSearch, setFinFilterSearch] = useState('');

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

  const fetchFinanceiro = async () => {
    setIsLoadingFinanceiro(true);
    try {
      const docs: string[] = [];
      if (cpf?.trim()) docs.push(cpf.trim());

      const names = [...new Set([franchise?.company_name?.trim(), franchise?.franchisee_name?.trim()].filter(Boolean))] as string[];

      const { data, error } = await appBackend.client.rpc('lookup_financeiro_by_docs', {
        p_docs: docs.length > 0 ? docs : null,
        p_names: names.length > 0 ? names : null,
      });

      if (error) {
        console.error('[Financeiro Franqueado] Erro RPC:', error);
        setFinReceivables([]);
        setFinPayables([]);
        return;
      }

      setFinReceivables(data?.receber || []);
      setFinPayables(data?.pagar || []);
    } catch (e) {
      console.error("Erro ao buscar dados financeiros:", e);
    } finally {
      setIsLoadingFinanceiro(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const applyFinFilter = (arr: any[]) => {
    const today = new Date().toISOString().slice(0, 10);
    return arr.filter(item => {
      if (finFilterStatus === 'paid') {
        const s = (item.status || '').toUpperCase();
        if (s !== 'RECEBIDO' && s !== 'LIQUIDADO' && s !== 'PAGO') return false;
      } else if (finFilterStatus === 'pending') {
        const s = (item.status || '').toUpperCase();
        if (s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO') return false;
        if (item.data_vencimento && item.data_vencimento < today) return false;
      } else if (finFilterStatus === 'overdue') {
        const s = (item.status || '').toUpperCase();
        if (s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO') return false;
        if (!item.data_vencimento || item.data_vencimento >= today) return false;
      }
      if (finFilterDateFrom && item.data_vencimento && item.data_vencimento < finFilterDateFrom) return false;
      if (finFilterDateTo && item.data_vencimento && item.data_vencimento > finFilterDateTo) return false;
      if (finFilterSearch) {
        const q = finFilterSearch.toLowerCase();
        if (!(item.descricao || '').toLowerCase().includes(q) && !(item.categoria_nome || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  const filteredFinReceivables = useMemo(() => applyFinFilter(finReceivables), [finReceivables, finFilterStatus, finFilterDateFrom, finFilterDateTo, finFilterSearch]);
  const filteredFinPayables = useMemo(() => applyFinFilter(finPayables), [finPayables, finFilterStatus, finFilterDateFrom, finFilterDateTo, finFilterSearch]);

  useEffect(() => {
    if (activeTab === 'financeiro' && finReceivables.length === 0 && finPayables.length === 0) fetchFinanceiro();
  }, [activeTab]);

  if (signingContract) {
    return <ContractSigning contract={signingContract} onBack={() => { setSigningContract(null); fetchData(); }} />;
  }

  const tabs = [
    { id: 'dashboard' as const, label: 'Painel', icon: BarChart3 },
    { id: 'classes' as const, label: 'Turmas', icon: Calendar },
    { id: 'contracts' as const, label: 'Contratos', icon: FileSignature, badge: pendingContracts.length },
    { id: 'support' as const, label: 'Suporte', icon: LifeBuoy, badge: pendingTicketsCount },
    { id: 'financeiro' as const, label: 'Financeiro', icon: DollarSign, badge: 0 },
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

            {activeTab === 'financeiro' && (
              <div className="space-y-6 animate-in fade-in">
                <h2 className="text-lg font-black text-slate-800">Financeiro</h2>

                {isLoadingFinanceiro ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                  </div>
                ) : !cpf ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <DollarSign className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">CPF/CNPJ não informado.</p>
                    <p className="text-xs text-slate-400 mt-1">Não é possível buscar dados financeiros sem documento.</p>
                  </div>
                ) : finReceivables.length === 0 && finPayables.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <DollarSign className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Nenhum registro financeiro encontrado.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <p className="text-sm font-medium text-slate-500">A Receber Total</p>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800">
                          {formatCurrency(finPayables.reduce((sum, i) => sum + (i.valor || 0), 0))}
                        </h4>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CheckCircle size={20} />
                          </div>
                          <p className="text-sm font-medium text-slate-500">Já Recebido</p>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800">
                          {formatCurrency(finPayables.filter(i => { const s = (i.status || '').toUpperCase(); return s === 'PAGO' || s === 'LIQUIDADO' || s === 'RECEBIDO'; }).reduce((sum, i) => sum + (i.valor || 0), 0))}
                        </h4>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} />
                          </div>
                          <p className="text-sm font-medium text-slate-500">A Pagar Total</p>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800">
                          {formatCurrency(finReceivables.reduce((sum, i) => sum + (i.valor || 0), 0))}
                        </h4>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <Calendar size={20} />
                          </div>
                          <p className="text-sm font-medium text-slate-500">Em Aberto Pagar</p>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800">
                          {formatCurrency(finReceivables.filter(i => { const s = (i.status || '').toUpperCase(); return s !== 'RECEBIDO' && s !== 'LIQUIDADO' && s !== 'PAGO'; }).reduce((sum, i) => sum + (i.valor || 0), 0))}
                        </h4>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Status</label>
                        <select
                          value={finFilterStatus}
                          onChange={e => setFinFilterStatus(e.target.value as any)}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        >
                          <option value="all">Todos</option>
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago/Recebido</option>
                          <option value="overdue">Vencido</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">De</label>
                        <input
                          type="date"
                          value={finFilterDateFrom}
                          onChange={e => setFinFilterDateFrom(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Até</label>
                        <input
                          type="date"
                          value={finFilterDateTo}
                          onChange={e => setFinFilterDateTo(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-xs font-bold text-slate-500">Buscar</label>
                        <input
                          type="text"
                          placeholder="Descrição ou categoria..."
                          value={finFilterSearch}
                          onChange={e => setFinFilterSearch(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => { setFinFilterStatus('all'); setFinFilterDateFrom(''); setFinFilterDateTo(''); setFinFilterSearch(''); }}
                        className="text-sm text-slate-500 hover:text-purple-600 font-bold transition-colors px-3 py-2"
                      >
                        Limpar
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contas a Receber</h3>
                      {filteredFinPayables.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                          <p className="text-slate-400 text-sm">Nenhum registro encontrado.</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Descrição</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Parcela</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Vencimento</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Valor</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Recebido</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredFinPayables.map((item, idx) => {
                                const s = (item.status || '').toUpperCase();
                                const isPaid = s === 'PAGO' || s === 'LIQUIDADO' || s === 'RECEBIDO';
                                const today = new Date().toISOString().slice(0, 10);
                                const isOverdue = !isPaid && item.data_vencimento && item.data_vencimento < today;
                                return (
                                  <tr key={item.id || idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-700">{item.descricao || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.categoria_nome || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.numero_parcela ? `${item.numero_parcela}/${item.total_parcelas || '?'}` : '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.data_vencimento ? new Date(item.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(item.valor || 0)}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">{item.valor_pago ? formatCurrency(item.valor_pago) : '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={clsx(
                                        "px-2.5 py-1 rounded-full text-xs font-bold",
                                        isPaid ? "bg-green-50 text-green-700" : isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                                      )}>
                                        {isPaid ? 'Recebido' : isOverdue ? 'Vencido' : 'Pendente'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contas a Pagar</h3>
                      {filteredFinReceivables.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                          <p className="text-slate-400 text-sm">Nenhum registro encontrado.</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Descrição</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Parcela</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Vencimento</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Valor</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Pago</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredFinReceivables.map((item, idx) => {
                                const s = (item.status || '').toUpperCase();
                                const isPaid = s === 'PAGO' || s === 'LIQUIDADO' || s === 'RECEBIDO';
                                const today = new Date().toISOString().slice(0, 10);
                                const isOverdue = !isPaid && item.data_vencimento && item.data_vencimento < today;
                                return (
                                  <tr key={item.id || idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-700">{item.descricao || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.categoria_nome || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.numero_parcela ? `${item.numero_parcela}/${item.total_parcelas || '?'}` : '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{item.data_vencimento ? new Date(item.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(item.valor || 0)}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">{item.valor_pago ? formatCurrency(item.valor_pago) : '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={clsx(
                                        "px-2.5 py-1 rounded-full text-xs font-bold",
                                        isPaid ? "bg-green-50 text-green-700" : isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                                      )}>
                                        {isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
