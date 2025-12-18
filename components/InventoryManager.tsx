import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, MoreVertical, Edit2, Trash2, 
  ArrowLeft, Save, X, Loader2, Calendar, FileText, 
  Truck, AlertCircle, RefreshCw, LayoutList, Building, ArrowUpCircle, ArrowDownCircle, Paperclip,
  CheckCircle2, Info, TrendingUp, Inbox, Clock, MapPin, AlertTriangle, BarChart3, List, History
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { InventoryRecord, PartnerStudio } from '../types';

interface InventoryManagerProps {
  onBack: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'movements' | 'studios'>('movements');
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [studios, setStudios] = useState<PartnerStudio[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const initialFormState: InventoryRecord = {
      id: '',
      type: 'entry',
      itemApostilaNova: 0,
      itemApostilaClassico: 0,
      itemSacochila: 0,
      itemLapis: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      studioId: '',
      trackingCode: '',
      observations: '',
      conferenceDate: '',
      attachments: ''
  };

  const [formData, setFormData] = useState<InventoryRecord>(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invData, studioData, classesData, dealsData, attendData] = await Promise.all([
        appBackend.getInventory(),
        appBackend.getPartnerStudios(),
        appBackend.client.from('crm_classes').select('*'),
        appBackend.client.from('crm_deals').select('id, class_mod_1, stage'),
        appBackend.client.from('crm_attendance').select('student_id, class_id, present').eq('present', true)
      ]);
      
      setRecords(invData || []);
      setStudios(studioData || []);
      setClasses(classesData.data || []);
      setDeals(dealsData.data || []);
      setAttendance(attendData.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE ESTOQUE DA MATRIZ (SALDO TOTAL) ---
  const matrizStock = useMemo(() => {
    return records.reduce((acc, curr) => {
      const multiplier = curr.type === 'entry' ? 1 : -1;
      return {
        nova: acc.nova + (curr.itemApostilaNova * multiplier),
        classico: acc.classico + (curr.itemApostilaClassico * multiplier),
        sacochila: acc.sacochila + (curr.itemSacochila * multiplier),
        lapis: acc.lapis + (curr.itemLapis * multiplier)
      };
    }, { nova: 0, classico: 0, sacochila: 0, lapis: 0 });
  }, [records]);

  // --- LÓGICA DE ESTOQUE POR STUDIO ---
  const studiosStockReport = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return studios.map(studio => {
          // 1. Total Recebido (Movimentações 'exit' da matriz para este studio)
          const received = records
            .filter(r => r.studioId === studio.id && r.type === 'exit')
            .reduce((acc, curr) => ({
                nova: acc.nova + (curr.itemApostilaNova || 0),
                classico: acc.classico + (curr.itemApostilaClassico || 0),
                sacochila: acc.sacochila + (curr.itemSacochila || 0),
                lapis: acc.lapis + (curr.itemLapis || 0),
            }), { nova: 0, classico: 0, sacochila: 0, lapis: 0 });

          const consumed = { nova: 0, classico: 0, sacochila: 0, lapis: 0 };
          const scheduled = { nova: 0, classico: 0, sacochila: 0, lapis: 0 };

          // 2. Filtrar turmas deste studio
          const studioClasses = classes.filter(c => c.studio_mod_1 === studio.fantasyName);

          studioClasses.forEach(cls => {
              if (cls.status !== 'Confirmado' && cls.status !== 'Concluído') return;

              const dateMod2 = cls.date_mod_2 ? new Date(cls.date_mod_2) : null;
              const isFinalized = dateMod2 
                ? (new Date(dateMod2.getTime() + 3 * 24 * 60 * 60 * 1000) < today) 
                : false;

              const isCompleta = cls.course?.toLowerCase().includes('completa');
              const isClassico = cls.course?.toLowerCase().includes('clássico');

              if (isFinalized) {
                  // Consumo Real: Presenças confirmadas
                  const presentCount = new Set(attendance.filter(a => a.class_id === cls.id).map(a => a.student_id)).size;
                  if (isCompleta) consumed.nova += presentCount;
                  if (isClassico) consumed.classico += presentCount;
                  consumed.sacochila += presentCount;
                  consumed.lapis += presentCount;
              } else {
                  // Programado: Matrículas no CRM
                  const enrolled = deals.filter(d => d.class_mod_1 === cls.mod_1_code).length;
                  if (isCompleta) scheduled.nova += enrolled;
                  if (isClassico) scheduled.classico += enrolled;
                  scheduled.sacochila += enrolled;
                  scheduled.lapis += enrolled;
              }
          });

          return {
              ...studio,
              stockInHands: {
                  nova: received.nova - consumed.nova,
                  classico: received.classico - consumed.classico,
                  sacochila: received.sacochila - consumed.sacochila,
                  lapis: received.lapis - consumed.lapis,
              },
              scheduled
          };
      });
  }, [studios, records, classes, deals, attendance]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await appBackend.saveInventoryRecord(formData);
      await fetchData();
      setShowModal(false);
      setFormData(initialFormState);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Excluir este registro de estoque?")) {
      try {
        await appBackend.deleteInventoryRecord(id);
        setRecords(prev => prev.filter(r => r.id !== id));
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  // Fixed: Added handleEdit function to populate the form with existing record data
  const handleEdit = (record: InventoryRecord) => {
    setFormData({ ...record });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const filteredMovements = records.filter(r => 
    r.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.observations.toLowerCase().includes(searchTerm.toLowerCase()) ||
    studios.find(s => s.id === r.studioId)?.fantasyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudiosReport = studiosStockReport.filter(s => 
      s.fantasyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-teal-600" /> Controle de Estoque
            </h2>
            <p className="text-slate-500 text-sm">Gestão de materiais e logística da Matriz.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center mr-2">
                <button 
                    onClick={() => { setActiveTab('movements'); setSearchTerm(''); }}
                    className={clsx("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", activeTab === 'movements' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <History size={16} /> Movimentações
                </button>
                <button 
                    onClick={() => { setActiveTab('studios'); setSearchTerm(''); }}
                    className={clsx("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", activeTab === 'studios' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Building size={16} /> Visão por Studio
                </button>
            </div>
            <button 
                onClick={() => { setFormData(initialFormState); setShowModal(true); }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Novo Registro
            </button>
        </div>
      </div>

      {/* KPI da Matriz (Sempre visível) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
              { label: 'Apostila Nova', val: matrizStock.nova, color: 'teal' },
              { label: 'Apostila Clássico', val: matrizStock.classico, color: 'indigo' },
              { label: 'Sacochilas VOLL', val: matrizStock.sacochila, color: 'orange' },
              { label: 'Lápis VOLL', val: matrizStock.lapis, color: 'blue' }
          ].map((item, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-3 opacity-10"><Inbox size={48} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <h3 className="text-2xl font-black text-slate-800">{item.val.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">NA MATRIZ</span></h3>
              </div>
          ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={activeTab === 'movements' ? "Buscar por código de rastreio ou studio..." : "Buscar por nome do studio, cidade ou UF..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-20 flex-1 items-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
        ) : activeTab === 'movements' ? (
          /* ABA MOVIMENTAÇÕES */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="px-6 py-4">Data / Tipo</th>
                    <th className="px-6 py-4">Origem / Destino</th>
                    <th className="px-6 py-4">Rastreio</th>
                    <th className="px-6 py-4">Materiais</th>
                    <th className="px-6 py-4">Conferência</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredMovements.map(record => {
                    const studio = studios.find(s => s.id === record.studioId);
                    const isEntry = record.type === 'entry';
                    return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{new Date(record.registrationDate).toLocaleDateString()}</span>
                            <span className={clsx("flex items-center gap-1 text-[10px] font-bold uppercase w-fit px-1.5 py-0.5 rounded", isEntry ? "text-green-700 bg-green-50" : "text-orange-700 bg-orange-50")}>
                            {isEntry ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                            {isEntry ? 'Entrada' : 'Saída'}
                            </span>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{studio?.fantasyName || 'VOLL MATRIZ'}</span>
                            <span className="text-[10px] text-slate-400">{isEntry ? 'Origem de Fabricante' : 'Envio da Matriz'}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{record.trackingCode || '--'}</td>
                        <td className="px-6 py-4">
                            <div className="text-[10px] grid grid-cols-2 gap-x-2 gap-y-0.5">
                                <span className="opacity-60">Nova: {record.itemApostilaNova}</span>
                                <span className="opacity-60">Clas: {record.itemApostilaClassico}</span>
                                <span className="opacity-60">Saco: {record.itemSacochila}</span>
                                <span className="opacity-60">Láp: {record.itemLapis}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                        {record.conferenceDate ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle2 size={14} /> {new Date(record.conferenceDate).toLocaleDateString()}
                            </div>
                        ) : (
                            <span className="text-xs text-slate-300 italic flex items-center gap-1"><Clock size={12}/> Pendente</span>
                        )}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                        <button onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"><MoreVertical size={18} /></button>
                        {activeMenuId === record.id && (
                            <div className="absolute right-10 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                            <button onClick={() => handleEdit(record)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12} /> Editar</button>
                            <button onClick={() => handleDelete(record.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Excluir</button>
                            </div>
                        )}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
          </div>
        ) : (
          /* ABA VISÃO POR STUDIO */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-4">Studio / Local</th>
                        <th className="px-6 py-4 text-center">Apostila Nova</th>
                        <th className="px-6 py-4 text-center">Apostila Cláss.</th>
                        <th className="px-6 py-4 text-center">Sacochilas</th>
                        <th className="px-6 py-4 text-center">Lápis</th>
                        <th className="px-6 py-4 text-center">Status Geral</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudiosReport.map(s => {
                        const items = [
                            { real: s.stockInHands.nova, prog: s.scheduled.nova },
                            { real: s.stockInHands.classico, prog: s.scheduled.classico },
                            { real: s.stockInHands.sacochila, prog: s.scheduled.sacochila },
                            { real: s.stockInHands.lapis, prog: s.scheduled.lapis },
                        ];
                        const anyDanger = items.some(i => i.real - i.prog < 5);

                        return (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{s.fantasyName}</span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-tighter"><MapPin size={10}/> {s.city}/{s.state}</span>
                                    </div>
                                </td>
                                {items.map((item, idx) => (
                                    <td key={idx} className="px-6 py-4">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black text-slate-700">{item.real}</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-bold">real</span>
                                            </div>
                                            <div className={clsx("text-[10px] font-bold uppercase tracking-tighter", item.prog > 0 ? "text-orange-500" : "text-slate-300")}>
                                                Prog: {item.prog}
                                            </div>
                                            <div className={clsx("text-[10px] font-black mt-1 px-1.5 rounded", item.real - item.prog < 5 ? "bg-red-50 text-red-600" : "text-slate-300")}>
                                                Saldo: {item.real - item.prog}
                                            </div>
                                        </div>
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-center">
                                    {anyDanger ? (
                                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 mx-auto w-fit border border-red-100">
                                            <AlertTriangle size={12}/> Necessita Remessa
                                        </div>
                                    ) : (
                                        <div className="bg-teal-50 text-teal-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 mx-auto w-fit border border-teal-100">
                                            <CheckCircle2 size={12}/> Estoque OK
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-xs text-blue-800 shadow-sm animate-in fade-in delay-200">
          <Info className="text-blue-600 shrink-0" size={18} />
          <div>
              <strong>Como funciona o Estoque dos Studios:</strong><br/>
              O <strong>Estoque Real</strong> é o que o studio confirmou recebimento. <br/>
              O <strong>Estoque Programado</strong> é reservado automaticamente com base no número de alunos matriculados no CRM para turmas confirmadas/concluídas que ainda não atingiram o gatilho de 3 dias pós Mod 2.
          </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={20} className="text-teal-600" />
                {formData.id ? 'Editar Registro' : 'Lançamento de Movimentação'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Tipo de Operação</label>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setFormData({...formData, type: 'entry', studioId: ''})}
                        className={clsx(
                            "flex-1 py-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-1",
                            formData.type === 'entry' ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-100 text-slate-400 grayscale"
                        )}
                    >
                        <div className="flex items-center gap-2"><ArrowUpCircle size={20} /> Entrada de Materiais</div>
                        <span className="text-[10px] font-medium text-center">Abastecendo estoque da Matriz<br/>(Compra de fornecedor)</span>
                    </button>
                    <button 
                        onClick={() => setFormData({...formData, type: 'exit'})}
                        className={clsx(
                            "flex-1 py-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-1",
                            formData.type === 'exit' ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-100 text-slate-400 grayscale"
                        )}
                    >
                        <div className="flex items-center gap-2"><ArrowDownCircle size={20} /> Saída (Envio p/ Studio)</div>
                        <span className="text-[10px] font-medium text-center">Retirando da VOLL MATRIZ<br/>e enviando para parceiro</span>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Inbox size={14}/> Apostilas</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Apostila Nova (2 em 1)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.itemApostilaNova} onChange={e => setFormData({...formData, itemApostilaNova: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Apostila Clássico</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.itemApostilaClassico} onChange={e => setFormData({...formData, itemApostilaClassico: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Package size={14}/> Acessórios</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sacochila</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.itemSacochila} onChange={e => setFormData({...formData, itemSacochila: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lápis</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.itemLapis} onChange={e => setFormData({...formData, itemLapis: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data da Operação</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.registrationDate} onChange={e => setFormData({...formData, registrationDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {formData.type === 'exit' ? 'Studio de Destino' : 'Observação da Origem'}
                  </label>
                  {formData.type === 'exit' ? (
                      <select 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" 
                        value={formData.studioId} 
                        onChange={e => setFormData({...formData, studioId: e.target.value})}
                        required
                      >
                        <option value="">Selecione o Destino...</option>
                        {studios.map(s => <option key={s.id} value={s.id}>{s.fantasyName} ({s.city})</option>)}
                      </select>
                  ) : (
                      <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500" value="ENTRADA FORNECEDOR" readOnly />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cód. Rastreio</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={formData.trackingCode} onChange={e => setFormData({...formData, trackingCode: e.target.value})} placeholder="Para envios ao studio" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Observações Gerais</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Algum detalhe extra?" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-600/20">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};