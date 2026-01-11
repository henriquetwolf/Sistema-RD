import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, Package, Building2, 
  ChevronRight, Inbox, Truck, Clock, CheckCircle2, User, Info,
  CheckSquare, Save, X, MessageSquare, TrendingDown, History, AlertCircle, LifeBuoy, FileSignature, ChevronLeft
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { PartnerStudioSession, InventoryRecord, SupportTicket, Contract } from '../types';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import clsx from 'clsx';

interface PartnerStudioAreaProps {
  studio: PartnerStudioSession;
  onLogout: () => void;
}

export const PartnerStudioArea: React.FC<PartnerStudioAreaProps> = ({ studio, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'classes' | 'contracts'>('dashboard');
    const [movements, setMovements] = useState<InventoryRecord[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
    const [signingContract, setSigningContract] = useState<Contract | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingMove, setIsSavingMove] = useState<string | null>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

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
                                        <div key={cls.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-teal-500 transition-all">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{cls.course}</h4>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {new Date(cls.date_mod_1).toLocaleDateString()}</p>
                                            </div>
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{cls.status}</span>
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