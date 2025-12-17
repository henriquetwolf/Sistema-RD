
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, ArrowUpCircle, ArrowDownCircle, 
  Calendar, MapPin, Truck, FileText, Paperclip, Save, X, 
  Loader2, Trash2, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { StockMovement, PartnerStudio } from '../types';

interface StockManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: StockMovement = {
    id: '',
    type: 'out', // Default to Saída since it's likely more common for shipping
    date: new Date().toISOString().split('T')[0],
    conferenceDate: '',
    items: {
        apostila2em1: 0,
        apostilaClassico: 0,
        sacochila: 0,
        lapis: 0
    },
    partnerStudioId: '',
    partnerStudioName: '',
    trackingCode: '',
    observations: '',
    attachments: '',
    createdAt: ''
};

export const StockManager: React.FC<StockManagerProps> = ({ onBack }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [studios, setStudios] = useState<PartnerStudio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

  // Form State
  const [formData, setFormData] = useState<StockMovement>(INITIAL_FORM);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [movementsData, studiosData] = await Promise.all([
              appBackend.getStockMovements(),
              appBackend.getPartnerStudios()
          ]);
          setMovements(movementsData);
          setStudios(studiosData);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const calculateStock = () => {
      const totals = {
          apostila2em1: 0,
          apostilaClassico: 0,
          sacochila: 0,
          lapis: 0
      };

      movements.forEach(m => {
          const multiplier = m.type === 'in' ? 1 : -1;
          totals.apostila2em1 += (m.items.apostila2em1 || 0) * multiplier;
          totals.apostilaClassico += (m.items.apostilaClassico || 0) * multiplier;
          totals.sacochila += (m.items.sacochila || 0) * multiplier;
          totals.lapis += (m.items.lapis || 0) * multiplier;
      });

      return totals;
  };

  const currentStock = calculateStock();

  const handleSave = async () => {
      // Validate
      const hasItems = Object.values(formData.items).some((v: any) => v > 0);
      if (!hasItems) {
          alert("Adicione a quantidade de pelo menos um item.");
          return;
      }
      
      setIsSaving(true);
      try {
          // Resolve Partner Name if ID selected
          let finalData = { ...formData };
          if (formData.partnerStudioId) {
              const studio = studios.find(s => s.id === formData.partnerStudioId);
              if (studio) finalData.partnerStudioName = studio.fantasyName;
          }

          await appBackend.saveStockMovement(finalData);
          await fetchData();
          setShowModal(false);
          setFormData(INITIAL_FORM);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Excluir este registro de estoque?")) {
          try {
              await appBackend.deleteStockMovement(id);
              fetchData();
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  const handleItemChange = (field: keyof typeof INITIAL_FORM.items, value: string) => {
      const num = parseInt(value) || 0;
      setFormData(prev => ({
          ...prev,
          items: {
              ...prev.items,
              [field]: num
          }
      }));
  };

  const openNew = () => {
      setFormData(INITIAL_FORM);
      setShowModal(true);
  };

  const filtered = movements.filter(m => {
      const matchesSearch = 
        (m.partnerStudioName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (m.trackingCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || m.type === filterType;

      return matchesSearch && matchesType;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <Package size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Controle de Estoque
                    </h2>
                    <p className="text-slate-500 text-sm">Gestão de materiais e logística de envio.</p>
                </div>
            </div>
            <button 
                onClick={openNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Novo Registro
            </button>
        </div>

        {/* Dashboard Cards (Current Stock) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Apostila Nova (2 em 1)</p>
                <p className={clsx("text-2xl font-bold", currentStock.apostila2em1 < 10 ? "text-red-600" : "text-slate-800")}>
                    {currentStock.apostila2em1}
                </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Apostila Clássico</p>
                <p className={clsx("text-2xl font-bold", currentStock.apostilaClassico < 10 ? "text-red-600" : "text-slate-800")}>
                    {currentStock.apostilaClassico}
                </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Sacochila</p>
                <p className={clsx("text-2xl font-bold", currentStock.sacochila < 10 ? "text-red-600" : "text-slate-800")}>
                    {currentStock.sacochila}
                </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Lápis</p>
                <p className={clsx("text-2xl font-bold", currentStock.lapis < 10 ? "text-red-600" : "text-slate-800")}>
                    {currentStock.lapis}
                </p>
            </div>
        </div>

        {/* List & Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por studio ou código..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setFilterType('all')}
                        className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterType === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilterType('in')}
                        className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterType === 'in' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Entradas
                    </button>
                    <button 
                        onClick={() => setFilterType('out')}
                        className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filterType === 'out' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Saídas
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Tipo / Data</th>
                            <th className="px-6 py-4">Itens</th>
                            <th className="px-6 py-4">Destino / Obs</th>
                            <th className="px-6 py-4">Rastreio</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                        ) : (
                            filtered.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {m.type === 'in' ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-green-200">
                                                    <ArrowUpCircle size={12} /> Entrada
                                                </span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-red-200">
                                                    <ArrowDownCircle size={12} /> Saída
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-slate-500 text-xs font-mono">{new Date(m.date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {m.items.apostila2em1 > 0 && <span className="bg-slate-100 border px-1.5 rounded">2em1: <b>{m.items.apostila2em1}</b></span>}
                                            {m.items.apostilaClassico > 0 && <span className="bg-slate-100 border px-1.5 rounded">Clássico: <b>{m.items.apostilaClassico}</b></span>}
                                            {m.items.sacochila > 0 && <span className="bg-slate-100 border px-1.5 rounded">Sacochila: <b>{m.items.sacochila}</b></span>}
                                            {m.items.lapis > 0 && <span className="bg-slate-100 border px-1.5 rounded">Lápis: <b>{m.items.lapis}</b></span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate">
                                        <div className="font-bold text-slate-700">{m.partnerStudioName || '-'}</div>
                                        <div className="text-xs text-slate-400 truncate">{m.observations}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        {m.trackingCode || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <h3 className="font-bold text-slate-800">Novo Registro de Estoque</h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                        
                        {/* Type Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setFormData({...formData, type: 'in'})}
                                className={clsx("flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all", formData.type === 'in' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                <ArrowUpCircle size={16} /> Entrada
                            </button>
                            <button 
                                onClick={() => setFormData({...formData, type: 'out'})}
                                className={clsx("flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all", formData.type === 'out' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                <ArrowDownCircle size={16} /> Saída
                            </button>
                        </div>

                        <div className="border-t border-b border-slate-100 py-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Itens</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Apostila Nova (2 em 1)</label>
                                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.items.apostila2em1} onChange={e => handleItemChange('apostila2em1', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Apostila Clássico</label>
                                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.items.apostilaClassico} onChange={e => handleItemChange('apostilaClassico', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Sacochila</label>
                                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.items.sacochila} onChange={e => handleItemChange('sacochila', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Lápis</label>
                                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.items.lapis} onChange={e => handleItemChange('lapis', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Calendar size={12}/> Data de Registro</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><MapPin size={12}/> Studio Parceiro (Destino/Origem)</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.partnerStudioId || ''}
                                    onChange={e => setFormData({...formData, partnerStudioId: e.target.value})}
                                >
                                    <option value="">Selecionar uma opção</option>
                                    {studios.map(s => (
                                        <option key={s.id} value={s.id}>{s.fantasyName} - {s.city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Truck size={12}/> Código de rastreamento</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.trackingCode} onChange={e => setFormData({...formData, trackingCode: e.target.value})} placeholder="Insira o valor aqui" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FileText size={12}/> Observações</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20 resize-none" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Insira o valor aqui" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Calendar size={12}/> DATA DE CONFERÊNCIA</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.conferenceDate} onChange={e => setFormData({...formData, conferenceDate: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Paperclip size={12}/> Anexos</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-blue-600 underline" value={formData.attachments} onChange={e => setFormData({...formData, attachments: e.target.value})} placeholder="Link do arquivo (Drive/Dropbox)" />
                            </div>
                        </div>

                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
