
import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, MoreVertical, Edit2, Trash2, 
  ArrowLeft, Save, X, Loader2, Calendar, FileText, 
  Truck, AlertCircle, RefreshCw, LayoutList, Building, ArrowUpCircle, ArrowDownCircle, Paperclip,
  /* Fix: Added missing CheckCircle2 import from lucide-react */
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { InventoryRecord, PartnerStudio } from '../types';

interface InventoryManagerProps {
  onBack: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ onBack }) => {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [studios, setStudios] = useState<PartnerStudio[]>([]);
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
      const [invData, studioData] = await Promise.all([
        appBackend.getInventory(),
        appBackend.getPartnerStudios()
      ]);
      setRecords(invData);
      setStudios(studioData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleEdit = (record: InventoryRecord) => {
    setFormData(record);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const filtered = records.filter(r => 
    r.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.observations.toLowerCase().includes(searchTerm.toLowerCase()) ||
    studios.find(s => s.id === r.studioId)?.fantasyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-teal-600" /> Controle de Estoque
            </h2>
            <p className="text-slate-500 text-sm">Gestão de materiais e logística de studios.</p>
          </div>
        </div>
        <button 
          onClick={() => { setFormData(initialFormState); setShowModal(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} /> Novo Registro
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por código de rastreio, studio ou obs..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto flex-1">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">Nenhum registro encontrado.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Data / Tipo</th>
                <th className="px-6 py-4">Studio / Rastreio</th>
                <th className="px-6 py-4">Materiais</th>
                <th className="px-6 py-4">Conferência</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(record => {
                const studio = studios.find(s => s.id === record.studioId);
                const isEntry = record.type === 'entry';
                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{new Date(record.registrationDate).toLocaleDateString()}</span>
                        <span className={clsx("flex items-center gap-1 text-[10px] font-bold uppercase", isEntry ? "text-green-600" : "text-orange-600")}>
                          {isEntry ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                          {isEntry ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{studio?.fantasyName || '--'}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Truck size={10} /> {record.trackingCode || 'S/ Rastreio'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase font-bold text-slate-500">
                        <div className="flex justify-between"><span>Nova 2 em 1:</span> <span className="text-slate-800 ml-2">{record.itemApostilaNova}</span></div>
                        <div className="flex justify-between"><span>Sacochila:</span> <span className="text-slate-800 ml-2">{record.itemSacochila}</span></div>
                        <div className="flex justify-between"><span>Clássico:</span> <span className="text-slate-800 ml-2">{record.itemApostilaClassico}</span></div>
                        <div className="flex justify-between"><span>Lápis:</span> <span className="text-slate-800 ml-2">{record.itemLapis}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.conferenceDate ? (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 size={14} />
                          {new Date(record.conferenceDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Pendente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 menu-btn"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {activeMenuId === record.id && (
                        <div className="absolute right-10 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                          <button onClick={() => handleEdit(record)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Edit2 size={12} /> Editar
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={20} className="text-teal-600" />
                {formData.id ? 'Editar Registro' : 'Novo Lançamento de Estoque'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Tipo de Movimentação */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setFormData({...formData, type: 'entry'})}
                  className={clsx(
                    "flex-1 py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2",
                    formData.type === 'entry' ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-100 text-slate-400 grayscale"
                  )}
                >
                  <ArrowUpCircle size={20} /> Entrada
                </button>
                <button 
                  onClick={() => setFormData({...formData, type: 'exit'})}
                  className={clsx(
                    "flex-1 py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2",
                    formData.type === 'exit' ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-100 text-slate-400 grayscale"
                  )}
                >
                  <ArrowDownCircle size={20} /> Saída
                </button>
              </div>

              {/* Materiais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Apostilas</h4>
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Acessórios</h4>
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

              {/* Logística */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Registro</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.registrationDate} onChange={e => setFormData({...formData, registrationDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Studio Parceiro</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white" 
                    value={formData.studioId} 
                    onChange={e => setFormData({...formData, studioId: e.target.value})}
                  >
                    <option value="">Nenhum / Próprio</option>
                    {studios.map(s => <option key={s.id} value={s.id}>{s.fantasyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código de Rastreamento</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={formData.trackingCode} onChange={e => setFormData({...formData, trackingCode: e.target.value})} placeholder="Insira o valor aqui" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Conferência</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.conferenceDate} onChange={e => setFormData({...formData, conferenceDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Insira o valor aqui" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Anexos</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl h-24 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Paperclip size={24} className="mb-1" />
                  <span className="text-xs font-medium">Adicionar fotos ou documentos</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
