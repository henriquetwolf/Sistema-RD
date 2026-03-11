import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, Package, Building2, 
  ChevronRight, Inbox, Truck, Clock, CheckCircle2, CheckCircle, User, Info, RefreshCw,
  CheckSquare, Save, X, MessageSquare, TrendingDown, History, AlertCircle, LifeBuoy, FileSignature, ChevronLeft,
  DollarSign, ExternalLink, FileText
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { PartnerStudioSession, InventoryRecord, SupportTicket, Contract, CourseRental, CourseRentalReceipt } from '../types';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import { CourseRentalForm } from './CourseRentalForm';
import clsx from 'clsx';

interface PartnerStudioAreaProps {
  studio: PartnerStudioSession;
  onLogout: () => void;
}

export const PartnerStudioArea: React.FC<PartnerStudioAreaProps> = ({ studio, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'classes' | 'contracts' | 'alugueis' | 'financeiro'>('dashboard');
    const [movements, setMovements] = useState<InventoryRecord[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
    const [signingContract, setSigningContract] = useState<Contract | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingMove, setIsSavingMove] = useState<string | null>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    const [rentalFormClass, setRentalFormClass] = useState<any | null>(null);
    const [myRentals, setMyRentals] = useState<CourseRental[]>([]);
    const [isLoadingRentals, setIsLoadingRentals] = useState(false);
    const [viewingRentalReceipts, setViewingRentalReceipts] = useState<{ rental: CourseRental; receipts: CourseRentalReceipt[] } | null>(null);
    const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

    const [finReceivables, setFinReceivables] = useState<any[]>([]);
    const [finPayables, setFinPayables] = useState<any[]>([]);
    const [isLoadingFinanceiro, setIsLoadingFinanceiro] = useState(false);
    const [finFilterStatus, setFinFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
    const [finFilterDateFrom, setFinFilterDateFrom] = useState('');
    const [finFilterDateTo, setFinFilterDateTo] = useState('');
    const [finFilterSearch, setFinFilterSearch] = useState('');

    useEffect(() => {
        fetchData();
        fetchSupportNotifications();
        fetchPendingContracts();
    }, [studio]);

    const fetchPendingContracts = async () => {
        try {
            const contracts = await appBackend.getPendingContractsByEmail(studio.email);
            setPendingContracts(contracts);
        } catch (e) {
            console.error("Erro ao buscar contratos pendentes:", e);
        }
    };

    const fetchSupportNotifications = async () => {
        try {
            const tickets = await appBackend.getSupportTicketsBySender(studio.id);
            const pending = tickets.filter(t => t.status === 'pending').length;
            setPendingTicketsCount(pending);
        } catch (e) {}
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [invRes, classRes] = await Promise.all([
                appBackend.getInventory(),
                appBackend.client.from('crm_classes').select('*').eq('studio_mod_1', studio.fantasyName)
            ]);
            
            setMovements((invRes || []).filter(r => r.studioId === studio.id));
            setClasses(classRes.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMyRentals = async () => {
        setIsLoadingRentals(true);
        try {
            const data = await appBackend.fetchStudioRentals(studio.id);
            setMyRentals(data);
        } catch (e) {
            console.error("Erro ao buscar aluguéis:", e);
        } finally {
            setIsLoadingRentals(false);
        }
    };

    const handleViewRentalReceipts = async (rental: CourseRental) => {
        setIsLoadingReceipts(true);
        setViewingRentalReceipts({ rental, receipts: [] });
        try {
            const data = await appBackend.fetchCourseRentalReceipts(rental.id);
            setViewingRentalReceipts({ rental, receipts: data });
        } catch (e) {
            console.error("Erro ao buscar comprovantes:", e);
        } finally {
            setIsLoadingReceipts(false);
        }
    };

    const handleConfirmReceipt = async (record: InventoryRecord) => {
        if (record.conferenceDate) return;
        setIsSavingMove(record.id);
        try {
            const updated = { ...record, conferenceDate: new Date().toISOString().split('T')[0] };
            await appBackend.saveInventoryRecord(updated);
            await fetchData();
        } catch (e) {
            alert("Erro ao confirmar recebimento.");
        } finally {
            setIsSavingMove(null);
        }
    };

    const stockSummary = useMemo(() => {
        const confirmed = movements.filter(m => m.conferenceDate && m.type === 'exit');
        return confirmed.reduce((acc, curr) => ({
            nova: acc.nova + (curr.itemApostilaNova || 0),
            classico: acc.classico + (curr.itemApostilaClassico || 0),
            sacochila: acc.sacochila + (curr.itemSacochila || 0),
            lapis: acc.lapis + (curr.itemLapis || 0),
        }), { nova: 0, classico: 0, sacochila: 0, lapis: 0 });
    }, [movements]);

    const fetchFinanceiro = async () => {
        setIsLoadingFinanceiro(true);
        try {
            const docs: string[] = [];
            if (studio.cnpj?.trim()) docs.push(studio.cnpj.trim());

            const names = [...new Set([studio.fantasyName?.trim(), studio.responsibleName?.trim()].filter(Boolean))] as string[];

            const { data, error } = await appBackend.client.rpc('lookup_financeiro_by_docs', {
                p_docs: docs.length > 0 ? docs : null,
                p_names: names.length > 0 ? names : null,
            });

            if (error) {
                console.error('[Financeiro Studio] Erro RPC:', error);
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

    useEffect(() => { if (activeTab === 'financeiro' && finReceivables.length === 0 && finPayables.length === 0) fetchFinanceiro(); }, [activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black border-2 border-teal-100 shadow-sm">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-slate-800 leading-tight">{studio.fantasyName}</h1>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal do Studio Parceiro</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => { setShowSupportModal(true); setPendingTicketsCount(0); }}
                            className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 flex items-center gap-2 font-bold text-xs relative"
                        >
                            <LifeBuoy size={20} /> Suporte
                            {pendingTicketsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                    {pendingTicketsCount}
                                </span>
                            )}
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-2"></div>
                        <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
                
                {/* Notificação de Contratos Pendentes */}
                {pendingContracts.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-amber-500/10 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md">
                                <FileSignature size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-amber-900">Documentação Pendente</h3>
                                <p className="text-sm text-amber-700 font-medium">Existem {pendingContracts.length} contrato(s) aguardando assinatura do responsável.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveTab('contracts')}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
                        >
                            Ver Documentos
                        </button>
                    </div>
                )}

                <div className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar gap-1">
                    <button onClick={() => setActiveTab('dashboard')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'dashboard' ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>Destaques</button>
                    <button onClick={() => setActiveTab('inventory')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'inventory' ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>Logística</button>
                    <button onClick={() => { setActiveTab('alugueis'); if (myRentals.length === 0) fetchMyRentals(); }} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'alugueis' ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                        <DollarSign size={14} /> Aluguéis
                        {myRentals.length > 0 && (
                            <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px]">{myRentals.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('financeiro')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'financeiro' ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                        <DollarSign size={14} /> Financeiro
                    </button>
                    <button onClick={() => setActiveTab('contracts')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap relative", activeTab === 'contracts' ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                        Contratos
                        {pendingContracts.length > 0 && (
                            <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">{pendingContracts.length}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <section className="bg-gradient-to-br from-teal-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-3">Bem-vindo, Parceiro!</h2>
                                <p className="text-teal-50 text-lg max-w-xl opacity-90 leading-relaxed font-medium">
                                    Este é o seu canal direto com a VOLL. Confirme recebimento de materiais e acompanhe as turmas agendadas no seu espaço.
                                </p>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Apostilas Nova', val: stockSummary.nova, color: 'text-teal-600' },
                                { label: 'Apostilas Cláss.', val: stockSummary.classico, color: 'text-indigo-600' },
                                { label: 'Sacochilas', val: stockSummary.sacochila, color: 'text-orange-600' },
                                { label: 'Lápis VOLL', val: stockSummary.lapis, color: 'text-blue-600' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                    <h3 className={clsx("text-3xl font-black", item.color)}>{item.val}</h3>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Saldo Confirmado</p>
                                </div>
                            ))}
                        </div>

                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><Calendar size={14}/> Cursos Programados no seu Espaço</h3>
                            {classes.length === 0 ? (
                                <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200 text-slate-400">Nenhum curso escalado no momento.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {classes.map(cls => (
                                        <div key={cls.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-teal-500 transition-all">
                                            <div className="p-6 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{cls.course}</h4>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {new Date(cls.date_mod_1).toLocaleDateString()}</p>
                                                </div>
                                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{cls.status}</span>
                                            </div>
                                            <button
                                                onClick={() => setRentalFormClass(cls)}
                                                className="px-6 py-3 flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-teal-600 hover:bg-teal-50 transition-all border-t border-slate-100 group/rental"
                                            >
                                                <span className="flex items-center gap-2"><DollarSign size={14} /> Aluguel de Curso</span>
                                                <ChevronRight size={14} className="group-hover/rental:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                ) : activeTab === 'inventory' ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><Truck className="text-teal-600"/> Remessas da Matriz</h3>
                        {movements.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-slate-200 text-slate-400">Nenhuma remessa enviada pela Matriz.</div>
                        ) : (
                            <div className="space-y-4">
                                {movements.map(m => (
                                    <div key={m.id} className={clsx("bg-white p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6", m.conferenceDate ? "border-slate-100 opacity-70" : "border-teal-200 shadow-lg shadow-teal-600/5 ring-4 ring-teal-50")}>
                                        <div className="flex gap-4 items-center">
                                            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", m.conferenceDate ? "bg-slate-100 text-slate-400" : "bg-teal-100 text-teal-600 animate-pulse")}>
                                                <Inbox size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800">Remessa #{m.id.split('-')[0]}</h4>
                                                <p className="text-xs text-slate-500">Enviado em {new Date(m.registrationDate).toLocaleDateString()}</p>
                                                {m.trackingCode && <p className="text-[10px] font-mono text-indigo-600 mt-1 uppercase">Rastreio: {m.trackingCode}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 border-x border-slate-100 flex-1">
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Apost. Nova</p><p className="font-bold text-slate-700">{m.itemApostilaNova}</p></div>
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Apost. Clás.</p><p className="font-bold text-slate-700">{m.itemApostilaClassico}</p></div>
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Sacochilas</p><p className="font-bold text-slate-700">{m.itemSacochila}</p></div>
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Lápis</p><p className="font-bold text-slate-700">{m.itemLapis}</p></div>
                                        </div>
                                        <div className="shrink-0">
                                            {m.conferenceDate ? (
                                                <div className="flex items-center gap-2 text-green-600 font-black text-xs uppercase px-4 py-2 bg-green-50 rounded-xl border border-green-100"><CheckCircle2 size={16}/> Recebido</div>
                                            ) : (
                                                <button onClick={() => handleConfirmReceipt(m)} disabled={isSavingMove === m.id} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50">
                                                    {isSavingMove === m.id ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Recebimento'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'alugueis' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <DollarSign size={24} className="text-teal-500" /> Meus Aluguéis de Curso
                            </h2>
                        </div>
                        {isLoadingRentals ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                        ) : myRentals.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                                <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-black text-slate-700">Nenhum aluguel enviado</h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                                    Quando você enviar uma solicitação de aluguel, ela aparecerá aqui.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myRentals.map(rental => {
                                    const statusColors: Record<string, string> = {
                                        pendente: 'bg-amber-50 text-amber-700 border-amber-200',
                                        aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                        rejeitado: 'bg-red-50 text-red-700 border-red-200',
                                    };
                                    const statusLabels: Record<string, string> = {
                                        pendente: 'Pendente',
                                        aprovado: 'Aprovado',
                                        rejeitado: 'Rejeitado',
                                    };
                                    const typeLabels: Record<string, string> = {
                                        aluguel: 'Apenas Aluguel',
                                        intervalo: 'Apenas Intervalo',
                                        aluguel_intervalo: 'Aluguel + Intervalo',
                                    };
                                    return (
                                        <div key={rental.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                            <div className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-base font-black text-slate-800 truncate">{rental.course_name}</h3>
                                                        <span className="text-[9px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">#{rental.class_code}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1"><MapPin size={12} className="text-teal-500" /> {rental.city}</span>
                                                        <span className="font-bold text-slate-700">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(rental.rental_value))}
                                                        </span>
                                                        <span>{typeLabels[rental.rental_type] || rental.rental_type}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} className="text-slate-400" />
                                                            Enviado em {rental.created_at ? new Date(rental.created_at).toLocaleDateString('pt-BR') : '--'}
                                                        </span>
                                                    </div>
                                                    {rental.admin_notes && rental.status !== 'pendente' && (
                                                        <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Observação da Administração</p>
                                                            <p className="text-xs text-slate-600">{rental.admin_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={clsx("text-[9px] font-black px-3 py-1.5 rounded-full border uppercase", statusColors[rental.status] || 'bg-slate-50 text-slate-500 border-slate-200')}>
                                                        {statusLabels[rental.status] || rental.status}
                                                    </span>
                                                    <button
                                                        onClick={() => handleViewRentalReceipts(rental)}
                                                        className="px-4 py-2 bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                    >
                                                        <ExternalLink size={12} /> Detalhes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'financeiro' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <DollarSign size={24} className="text-emerald-500" /> Meu Financeiro
                            </h2>
                            <button
                                onClick={fetchFinanceiro}
                                disabled={isLoadingFinanceiro}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoadingFinanceiro ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
                            </button>
                        </div>
                        {isLoadingFinanceiro ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
                        ) : !(studio.cnpj || '').replace(/\D/g, '') ? (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                                <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
                                <h3 className="text-lg font-black text-slate-700">CNPJ não cadastrado</h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                                    Não é possível buscar dados financeiros sem um CNPJ vinculado.
                                </p>
                            </div>
                        ) : finReceivables.length === 0 && finPayables.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                                <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-black text-slate-700">Nenhum registro financeiro</h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                                    Não foram encontrados dados de contas a pagar ou receber para este studio.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Receber Total</p>
                                        <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(finPayables.reduce((s, i) => s + (Number(i.valor) || 0), 0))}</h3>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Já Recebido</p>
                                        <h3 className="text-2xl font-black text-teal-600">{formatCurrency(finPayables.filter(i => { const s = (i.status || '').toUpperCase(); return s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO'; }).reduce((s, i) => s + (Number(i.valor_pago || i.valor) || 0), 0))}</h3>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Pagar Total</p>
                                        <h3 className="text-2xl font-black text-red-600">{formatCurrency(finReceivables.reduce((s, i) => s + (Number(i.valor) || 0), 0))}</h3>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Aberto (Pagar)</p>
                                        <h3 className="text-2xl font-black text-amber-600">{formatCurrency(finReceivables.filter(i => { const s = (i.status || '').toUpperCase(); return s !== 'RECEBIDO' && s !== 'LIQUIDADO' && s !== 'PAGO'; }).reduce((s, i) => s + (Number(i.valor) || 0), 0))}</h3>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-end">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Status</label>
                                        <select value={finFilterStatus} onChange={e => setFinFilterStatus(e.target.value as any)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none">
                                            <option value="all">Todos</option>
                                            <option value="pending">Pendentes</option>
                                            <option value="paid">Pagos/Recebidos</option>
                                            <option value="overdue">Vencidos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">De</label>
                                        <input type="date" value={finFilterDateFrom} onChange={e => setFinFilterDateFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Até</label>
                                        <input type="date" value={finFilterDateTo} onChange={e => setFinFilterDateTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Buscar</label>
                                        <input type="text" placeholder="Descrição ou categoria..." value={finFilterSearch} onChange={e => setFinFilterSearch(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                                    </div>
                                    <button onClick={() => { setFinFilterStatus('all'); setFinFilterDateFrom(''); setFinFilterDateTo(''); setFinFilterSearch(''); }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">Limpar</button>
                                </div>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-2">
                                        <CheckCircle size={14} /> Contas a Receber ({filteredFinPayables.length})
                                    </h3>
                                    {filteredFinPayables.length === 0 ? (
                                        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-400 text-sm font-medium">Nenhum registro encontrado.</div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                                        <th className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Descrição</th>
                                                        <th className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Categoria</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Parcela</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Vencimento</th>
                                                        <th className="text-right px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Valor</th>
                                                        <th className="text-right px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Recebido</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredFinPayables.map((item, idx) => {
                                                        const s = (item.status || '').toUpperCase();
                                                        const isPaid = s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO';
                                                        const today = new Date().toISOString().slice(0, 10);
                                                        const isOverdue = !isPaid && item.data_vencimento && item.data_vencimento < today;
                                                        return (
                                                            <tr key={item.id_conta_azul || item.id || idx} className={clsx("border-b border-slate-50 hover:bg-slate-50/50 transition-colors", isOverdue && "bg-red-50/40")}>
                                                                <td className="px-4 py-3 font-medium text-slate-700 max-w-[200px] truncate">{item.descricao || '--'}</td>
                                                                <td className="px-4 py-3 text-slate-500">{item.categoria_nome || '--'}</td>
                                                                <td className="px-4 py-3 text-center text-slate-500">{item.parcela || '--'}</td>
                                                                <td className="px-4 py-3 text-center text-slate-500">{item.data_vencimento ? new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(item.valor) || 0)}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.valor_pago ? formatCurrency(Number(item.valor_pago)) : '--'}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", isPaid ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                                                        {isPaid ? <CheckCircle size={10} /> : isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                                                                        {item.status || 'Pendente'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2 px-2">
                                        <AlertCircle size={14} /> Contas a Pagar ({filteredFinReceivables.length})
                                    </h3>
                                    {filteredFinReceivables.length === 0 ? (
                                        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-400 text-sm font-medium">Nenhum registro encontrado.</div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                                        <th className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Descrição</th>
                                                        <th className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Categoria</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Parcela</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Vencimento</th>
                                                        <th className="text-right px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Valor</th>
                                                        <th className="text-right px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Pago</th>
                                                        <th className="text-center px-4 py-3 font-black text-slate-400 uppercase text-[9px] tracking-widest">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredFinReceivables.map((item, idx) => {
                                                        const s = (item.status || '').toUpperCase();
                                                        const isPaid = s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO';
                                                        const today = new Date().toISOString().slice(0, 10);
                                                        const isOverdue = !isPaid && item.data_vencimento && item.data_vencimento < today;
                                                        return (
                                                            <tr key={item.id_conta_azul || item.id || idx} className={clsx("border-b border-slate-50 hover:bg-slate-50/50 transition-colors", isOverdue && "bg-red-50/40")}>
                                                                <td className="px-4 py-3 font-medium text-slate-700 max-w-[200px] truncate">{item.descricao || '--'}</td>
                                                                <td className="px-4 py-3 text-slate-500">{item.categoria_nome || '--'}</td>
                                                                <td className="px-4 py-3 text-center text-slate-500">{item.parcela || '--'}</td>
                                                                <td className="px-4 py-3 text-center text-slate-500">{item.data_vencimento ? new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(item.valor) || 0)}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.valor_pago ? formatCurrency(Number(item.valor_pago)) : '--'}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", isPaid ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                                                        {isPaid ? <CheckCircle size={10} /> : isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                                                                        {item.status || 'Pendente'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><FileSignature className="text-teal-600"/> Contratos Pendentes</h3>
                        {pendingContracts.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-slate-200 text-slate-400">Nenhum contrato pendente no momento.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pendingContracts.map(c => (
                                    <div key={c.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col border-l-8 border-l-teal-500">
                                        <h3 className="text-xl font-black text-slate-800 mb-2">{c.title}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-8">Emitido em {new Date(c.createdAt).toLocaleDateString()}</p>
                                        <button 
                                            onClick={() => setSigningContract(c)}
                                            className="mt-auto bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-600/20"
                                        >
                                            <FileSignature size={18}/> Assinar Agora
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {rentalFormClass && (
                <CourseRentalForm
                    studio={studio}
                    classData={rentalFormClass}
                    onClose={() => setRentalFormClass(null)}
                    onSuccess={() => { if (myRentals.length > 0) fetchMyRentals(); }}
                />
            )}

            {viewingRentalReceipts && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl my-8 animate-in zoom-in-95 overflow-hidden">
                        <div className="px-8 py-6 border-b bg-gradient-to-r from-teal-600 to-cyan-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white">Detalhes do Aluguel</h2>
                                <p className="text-teal-200 text-xs font-medium mt-1">
                                    {viewingRentalReceipts.rental.course_name} — #{viewingRentalReceipts.rental.class_code}
                                </p>
                            </div>
                            <button onClick={() => setViewingRentalReceipts(null)} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cidade</p>
                                    <p className="text-sm font-bold text-slate-700">{viewingRentalReceipts.rental.city}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Turma</p>
                                    <p className="text-sm font-bold text-slate-700">#{viewingRentalReceipts.rental.class_code}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tipo</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {{ aluguel: 'Apenas Aluguel', intervalo: 'Apenas Intervalo', aluguel_intervalo: 'Aluguel + Intervalo' }[viewingRentalReceipts.rental.rental_type] || viewingRentalReceipts.rental.rental_type}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Valor</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(viewingRentalReceipts.rental.rental_value))}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
                                    <FileText size={14} className="text-purple-600" /> Comprovantes Anexados
                                </h3>
                                {isLoadingReceipts ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-600" size={24} /></div>
                                ) : viewingRentalReceipts.receipts.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-sm font-bold text-slate-400">Nenhum comprovante anexado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {viewingRentalReceipts.receipts.map((rc, idx) => (
                                            <a
                                                key={rc.id}
                                                href={rc.receipt_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
                                            >
                                                <FileText size={20} className="text-purple-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-purple-800">Comprovante {idx + 1}</p>
                                                    <p className="text-[10px] text-purple-500 truncate">{rc.receipt_url.split('/').pop()}</p>
                                                </div>
                                                <ExternalLink size={14} className="text-purple-400 shrink-0 ml-auto" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {viewingRentalReceipts.rental.admin_notes && viewingRentalReceipts.rental.status !== 'pendente' && (
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Observação da Administração</p>
                                    <p className="text-sm text-blue-800">{viewingRentalReceipts.rental.admin_notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setViewingRentalReceipts(null)}
                                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Assinatura Interno */}
            {signingContract && (
                <div className="fixed inset-0 z-[400] bg-white overflow-y-auto animate-in zoom-in-95">
                    <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                        <button onClick={() => setSigningContract(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
                            <ChevronLeft size={20}/> Voltar ao Portal
                        </button>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processo de Assinatura Segura</span>
                    </div>
                    <ContractSigning 
                        contract={signingContract} 
                        onFinish={() => {
                            setSigningContract(null);
                            fetchPendingContracts();
                            setActiveTab('dashboard');
                        }}
                    />
                </div>
            )}

            <SupportTicketModal 
                isOpen={showSupportModal} 
                onClose={() => { setShowSupportModal(false); fetchSupportNotifications(); }}
                senderId={studio.id}
                senderName={studio.fantasyName}
                senderEmail={studio.email}
                senderRole="studio"
            />

            <footer className="py-12 text-center text-slate-300">
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
};