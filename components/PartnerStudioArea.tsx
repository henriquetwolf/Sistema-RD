
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, Package, Building2, 
  ChevronRight, Inbox, Truck, Clock, CheckCircle2, User, Info,
  CheckSquare, Save, X, MessageSquare, TrendingDown, History, AlertCircle
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { PartnerStudioSession, InventoryRecord } from '../types';
import clsx from 'clsx';

interface PartnerStudioAreaProps {
  studio: PartnerStudioSession;
  onLogout: () => void;
}

export const PartnerStudioArea: React.FC<PartnerStudioAreaProps> = ({ studio, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'inventory'>('classes');
  const [classes, setClasses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [confirmingRecord, setConfirmingRecord] = useState<InventoryRecord | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studio]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Turmas do Studio
      const { data: classesData } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .eq('studio_mod_1', studio.fantasyName)
        .order('date_mod_1', { ascending: true });

      // 2. Remessas (Entradas no Studio)
      const { data: invData } = await appBackend.client
        .from('crm_inventory')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('type', 'exit')
        .order('registration_date', { ascending: false });

      // 3. Matrículas (Para Programado)
      const { data: dealsData } = await appBackend.client
        .from('crm_deals')
        .select('id, class_mod_1, stage');

      // 4. Presenças (Para Baixa Real)
      const { data: attendData } = await appBackend.client
        .from('crm_attendance')
        .select('student_id, class_id, present')
        .eq('present', true);

      setClasses(classesData || []);
      setAllDeals(dealsData || []);
      setAttendance(attendData || []);
      setInventory((invData || []).map((d: any) => ({
        id: d.id, type: d.type, itemApostilaNova: d.item_apostila_nova, itemApostilaClassico: d.item_apostila_classico, itemSacochila: d.item_sacochila, itemLapis: d.item_lapis, registrationDate: d.registration_date, studioId: d.studio_id, trackingCode: d.tracking_code, observations: d.observations || '', conferenceDate: d.conference_date || '', attachments: d.attachments
      })));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CÁLCULO DE ESTOQUE INTELIGENTE ---
  const stockInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validInventory = inventory || [];
    const validClasses = classes || [];
    const validAttendance = attendance || [];
    const validDeals = allDeals || [];

    // 1. Total Recebido (Físico vindo da Matriz)
    const received = validInventory.reduce((acc, curr) => ({
        nova: acc.nova + (curr.itemApostilaNova || 0),
        classico: acc.classico + (curr.itemApostilaClassico || 0),
        sacochila: acc.sacochila + (curr.itemSacochila || 0),
        lapis: acc.lapis + (curr.itemLapis || 0),
    }), { nova: 0, classico: 0, sacochila: 0, lapis: 0 });

    const consumed = { nova: 0, classico: 0, sacochila: 0, lapis: 0 };
    const scheduled = { nova: 0, classico: 0, sacochila: 0, lapis: 0 };

    validClasses.forEach(cls => {
        if (cls.status !== 'Confirmado' && cls.status !== 'Concluído') return;

        const dateMod2 = cls.date_mod_2 ? new Date(cls.date_mod_2) : null;
        // Gatilho: 3 dias após o fim do Mod 2
        const isFinalizedForStock = (dateMod2 && !isNaN(dateMod2.getTime()))
            ? (new Date(dateMod2.getTime() + 3 * 24 * 60 * 60 * 1000) < today) 
            : false;

        const isCompleta = cls.course?.toLowerCase().includes('completa');
        const isClassico = cls.course?.toLowerCase().includes('clássico');

        if (isFinalizedForStock) {
            // BAIXA REAL: Alunos com presença no Módulo 1
            const classAttendance = validAttendance.filter(a => a.class_id === cls.id);
            const presentCount = new Set(classAttendance.map(a => a.student_id)).size;
            
            if (isCompleta) consumed.nova += presentCount;
            if (isClassico) consumed.classico += presentCount;
            consumed.sacochila += presentCount;
            consumed.lapis += presentCount;
        } else {
            // SAÍDA PROGRAMADA: Todos os matriculados
            const enrolled = validDeals.filter(d => d.class_mod_1 === cls.mod_1_code).length;

            if (isCompleta) scheduled.nova += enrolled;
            if (isClassico) scheduled.classico += enrolled;
            scheduled.sacochila += enrolled;
            scheduled.lapis += enrolled;
        }
    });

    return {
        received,
        consumed,
        scheduled,
        currentInHands: {
            nova: received.nova - consumed.nova,
            classico: received.classico - consumed.classico,
            sacochila: received.sacochila - consumed.sacochila,
            lapis: received.lapis - consumed.lapis,
        }
    };
  }, [inventory, classes, allDeals, attendance]);

  const handleConfirmReceipt = async () => {
    if (!confirmingRecord) return;
    setIsConfirming(true);
    try {
        const today = new Date().toISOString().split('T')[0];
        const updated: InventoryRecord = {
            ...confirmingRecord,
            conferenceDate: today,
            observations: confirmNote.trim() ? `${confirmingRecord.observations} | Obs Studio: ${confirmNote}` : confirmingRecord.observations
        };
        await appBackend.saveInventoryRecord(updated);
        await fetchData();
        setConfirmingRecord(null);
        setConfirmNote('');
        alert("Recebimento confirmado!");
    } catch (e: any) {
        alert("Erro ao confirmar.");
    } finally {
        setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold border-2 border-white shadow-sm"><Building2 size={24} /></div>
             <div><h1 className="text-sm font-bold text-slate-800 leading-tight">{studio.fantasyName}</h1><p className="text-xs text-slate-500">Portal do Studio Parceiro</p></div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-5xl mx-auto px-4 flex">
              <button onClick={() => setActiveTab('classes')} className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'classes' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Turmas Programadas</button>
              <button onClick={() => setActiveTab('inventory')} className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'inventory' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Materiais e Estoque</button>
          </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'classes' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-teal-600"/> Agenda Local</h2>
                        </div>
                        {classes.length === 0 ? <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">Sem turmas vinculadas.</div> : 
                        classes.map(cls => (
                            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", cls.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{cls.status}</span>
                                        <span className="text-xs font-mono text-slate-400">#{cls.class_code}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg">{cls.course}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {cls.city}/{cls.state}</p>
                                </div>
                                <div className="flex gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-center">
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mod 1</p><p className="font-bold text-teal-700">{cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString() : '--'}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mod 2</p><p className="font-bold text-orange-700">{cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString() : '--'}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-8">
                        {/* PAINEL DE CONTROLE DE ESTOQUE LOCAL */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package size={20} className="text-teal-600"/> Gestão de Estoque do Studio</h2>
                                <div className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                    <Clock size={12}/> Autocálculo: Presença M1 + 3 dias
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Apostila Nova', val: stockInfo.currentInHands.nova, sch: stockInfo.scheduled.nova },
                                    { label: 'Apostila Clássico', val: stockInfo.currentInHands.classico, sch: stockInfo.scheduled.classico },
                                    { label: 'Sacochilas', val: stockInfo.currentInHands.sacochila, sch: stockInfo.scheduled.sacochila },
                                    { label: 'Lápis VOLL', val: stockInfo.currentInHands.lapis, sch: stockInfo.scheduled.lapis }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                                            <div className="flex items-baseline gap-1">
                                                <h3 className="text-3xl font-black text-slate-800">{item.val}</h3>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Em mãos</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase">
                                                <TrendingDown size={12}/> -{item.sch} <span className="opacity-60">Programado</span>
                                            </div>
                                            <div className={clsx("text-xs font-black", (item.val - item.sch < 5) ? "text-red-500" : "text-slate-300")}>
                                                Saldo: {item.val - item.sch}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-800 leading-relaxed">
                                <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <strong>Como seu estoque é calculado:</strong> O material é descontado automaticamente <strong>3 dias após</strong> a finalização do Módulo 2. O valor de desconto baseia-se no número de alunos com <strong>presença confirmada</strong> no Módulo 1. A "Saída Programada" mostra o material reservado para turmas que ainda não aconteceram.
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History size={20} className="text-teal-600"/> Histórico de Remessas (Matriz)</h2>
                            {inventory.length === 0 ? <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">Sem remessas recebidas.</div> : 
                            inventory.map(record => (
                                <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Truck size={24}/></div>
                                            <div><p className="text-sm font-bold text-slate-800">Remessa de Materiais</p><p className="text-xs text-slate-500">Postagem: {new Date(record.registrationDate).toLocaleDateString()}</p></div>
                                        </div>
                                        <div className="flex flex-col items-start md:items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de Rastreio</span>
                                            <span className="text-sm font-mono font-bold text-teal-700">{record.trackingCode || 'S/ Código'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                        {[
                                            {l: 'Apostila Nova', v: record.itemApostilaNova},
                                            {l: 'Apostila Clás.', v: record.itemApostilaClassico},
                                            {l: 'Sacochilas', v: record.itemSacochila},
                                            {l: 'Lápis', v: record.itemLapis}
                                        ].map((m, i) => (
                                            <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{m.l}</p>
                                                <p className="text-xl font-black text-slate-700">{m.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                        <div className="text-xs text-slate-500 italic">{record.observations}</div>
                                        {record.conferenceDate ? (
                                            <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5"><CheckCircle2 size={14}/> Recebido em {new Date(record.conferenceDate).toLocaleDateString()}</div>
                                        ) : (
                                            <button onClick={() => { setConfirmingRecord(record); setConfirmNote(''); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm"><CheckSquare size={16}/> Confirmar Recebimento</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    </div>
                )}
            </div>
        )}
      </main>

      {confirmingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckSquare className="text-teal-600" size={20} /> Confirmar Recebimento</h3>
                      <button onClick={() => setConfirmingRecord(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">Você está confirmando que as quantidades listadas na remessa chegaram fisicamente hoje ao studio.</div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-teal-600" /> Observações do Recebimento (Opcional)</label>
                          <textarea className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm h-28 resize-none focus:border-teal-500 outline-none" placeholder="Ex: Caixa levemente danificada, mas material ok..." value={confirmNote} onChange={e => setConfirmNote(e.target.value)} />
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setConfirmingRecord(null)} className="px-6 py-2 text-slate-600 font-bold text-sm">Cancelar</button>
                      <button onClick={handleConfirmReceipt} disabled={isConfirming} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all disabled:opacity-50">{isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Conferência</button>
                  </div>
              </div>
          </div>
      )}
      
      <footer className="mt-auto p-8 text-center bg-white border-t border-slate-100">
          <p className="text-xs text-slate-400">Sistema VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
          <div className="mt-2 flex justify-center gap-4 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
              <span>Matriz</span><span>•</span><span>Studios Parceiros</span><span>•</span><span>Logística</span>
          </div>
      </footer>
    </div>
  );
};
