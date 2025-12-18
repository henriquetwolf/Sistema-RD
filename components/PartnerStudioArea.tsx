
import React, { useState, useEffect } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, Package, Building2, 
  ChevronRight, Inbox, Truck, Clock, CheckCircle2, User, Info,
  ArrowDownCircle, ArrowUpCircle, CheckSquare, Save, X, MessageSquare
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
  const [isLoading, setIsLoading] = useState(false);

  // States para o processo de confirmação
  const [confirmingRecord, setConfirmingRecord] = useState<InventoryRecord | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studio]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar turmas vinculadas ao Studio
      const { data: classesData } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .eq('studio_mod_1', studio.fantasyName)
        .order('date_mod_1', { ascending: true });

      // 2. Buscar envios de materiais (tipo 'exit')
      const { data: invData } = await appBackend.client
        .from('crm_inventory')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('type', 'exit')
        .order('registration_date', { ascending: false });

      setClasses(classesData || []);
      setInventory((invData || []).map((d: any) => ({
        id: d.id, 
        type: d.type, 
        itemApostilaNova: d.item_apostila_nova, 
        itemApostilaClassico: d.item_apostila_classico, 
        itemSacochila: d.item_sacochila, 
        itemLapis: d.item_lapis, 
        registrationDate: d.registration_date, 
        studioId: d.studio_id, 
        trackingCode: d.tracking_code, 
        observations: d.observations || '', 
        conferenceDate: d.conference_date || '', 
        attachments: d.attachments
      })));
    } catch (e) {
      console.error("Erro ao carregar dados do portal:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirmingRecord) return;
    
    setIsConfirming(true);
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Atualiza o registro com a data de hoje e anexa a observação do parceiro
        const updatedRecord: InventoryRecord = {
            ...confirmingRecord,
            conferenceDate: today,
            observations: confirmNote.trim() 
                ? `${confirmingRecord.observations ? confirmingRecord.observations + ' | ' : ''}Nota do Studio: ${confirmNote}`
                : confirmingRecord.observations
        };

        await appBackend.saveInventoryRecord(updatedRecord);
        await fetchData(); // Recarrega a lista
        setConfirmingRecord(null);
        setConfirmNote('');
        alert("Recebimento confirmado com sucesso!");
    } catch (e: any) {
        alert(`Erro ao confirmar recebimento: ${e.message}`);
    } finally {
        setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold border-2 border-white shadow-sm">
                <Building2 size={24} />
             </div>
             <div>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">{studio.fantasyName}</h1>
                <p className="text-xs text-slate-500">Portal do Studio Parceiro</p>
             </div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-5xl mx-auto px-4 flex">
              <button 
                onClick={() => setActiveTab('classes')}
                className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'classes' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                  Turmas Programadas
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={clsx("px-6 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'inventory' ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                  Materiais Enviados
              </button>
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
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-teal-600"/> Agenda de Cursos</h2>
                            <span className="text-xs font-medium text-slate-400">{classes.length} turmas</span>
                        </div>
                        {classes.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 font-medium">Nenhuma turma vinculada ao seu studio no momento.</div>
                        ) : (
                            classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", cls.status === 'Confirmado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
                                                {cls.status}
                                            </span>
                                            <span className="text-xs font-mono text-slate-400">#{cls.class_code}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{cls.course}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {cls.city}/{cls.state}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Módulo 1</p>
                                            <p className="font-bold text-teal-700">{cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Módulo 2</p>
                                            <p className="font-bold text-orange-700">{cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Inbox size={20} className="text-teal-600"/> Materiais e Logística</h2>
                            <span className="text-xs font-medium text-slate-400">{inventory.length} remessas</span>
                        </div>
                        {inventory.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">Nenhum material enviado ainda.</div>
                        ) : (
                            inventory.map(record => (
                                <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Truck size={24}/></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">Remessa de Materiais</p>
                                                <p className="text-xs text-slate-500">Enviado em: {new Date(record.registrationDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start md:items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Código de Rastreio</span>
                                            <span className="text-sm font-mono font-bold text-teal-700">{record.trackingCode || 'S/ Código'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Apostila Nova</p>
                                            <p className="text-xl font-black text-slate-700">{record.itemApostilaNova}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Apostila Clás.</p>
                                            <p className="text-xl font-black text-slate-700">{record.itemApostilaClassico}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sacochilas</p>
                                            <p className="text-xl font-black text-slate-700">{record.itemSacochila}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Lápis</p>
                                            <p className="text-xl font-black text-slate-700">{record.itemLapis}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-slate-50">
                                        <div className="flex-1">
                                            {record.observations && (
                                                <div className="flex gap-2 items-start text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                                                    <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
                                                    <span>{record.observations}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="shrink-0 flex items-center gap-3 w-full md:w-auto">
                                            {record.conferenceDate ? (
                                                <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                                                    <CheckCircle2 size={14} /> Recebido em {new Date(record.conferenceDate).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-amber-600 text-xs font-bold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                                                        <Clock size={14} /> Chegada Pendente
                                                    </div>
                                                    <button 
                                                        onClick={() => { setConfirmingRecord(record); setConfirmNote(''); }}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <CheckSquare size={16} /> Confirmar Recebimento
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        )}
      </main>

      {/* MODAL DE CONFIRMAÇÃO */}
      {confirmingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="text-teal-600" size={20} />
                        <h3 className="font-bold text-slate-800">Confirmar Recebimento</h3>
                      </div>
                      <button onClick={() => setConfirmingRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                          <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-blue-800 font-bold mb-1">Atenção:</p>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Você está confirmando a chegada física dos materiais hoje, <strong>{new Date().toLocaleDateString()}</strong>. Verifique se as quantidades batem com o resumo abaixo.
                            </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="p-2 border rounded-lg bg-slate-50 flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Nova</span>
                              <span className="font-bold text-slate-700">{confirmingRecord.itemApostilaNova}</span>
                          </div>
                          <div className="p-2 border rounded-lg bg-slate-50 flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Clás.</span>
                              <span className="font-bold text-slate-700">{confirmingRecord.itemApostilaClassico}</span>
                          </div>
                          <div className="p-2 border rounded-lg bg-slate-50 flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Saco.</span>
                              <span className="font-bold text-slate-700">{confirmingRecord.itemSacochila}</span>
                          </div>
                          <div className="p-2 border rounded-lg bg-slate-50 flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Lápis</span>
                              <span className="font-bold text-slate-700">{confirmingRecord.itemLapis}</span>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                              <MessageSquare size={14} className="text-teal-600" /> Observações do Studio (Opcional)
                          </label>
                          <textarea 
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm h-28 resize-none outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all bg-slate-50"
                            placeholder="Algum item faltante? A caixa chegou danificada? Deixe seu feedback aqui..."
                            value={confirmNote}
                            onChange={e => setConfirmNote(e.target.value)}
                          ></textarea>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button 
                        onClick={() => setConfirmingRecord(null)} 
                        className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleConfirmReceipt}
                        disabled={isConfirming}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                          {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Confirmar Agora
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      <footer className="mt-auto p-8 text-center bg-white border-t border-slate-100 no-print">
          <p className="text-xs text-slate-400">Sistema VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
          <div className="mt-2 flex justify-center gap-4 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
              <span>Matriz</span>
              <span>•</span>
              <span>Studios Parceiros</span>
              <span>•</span>
              <span>Logística</span>
          </div>
      </footer>
    </div>
  );
};
