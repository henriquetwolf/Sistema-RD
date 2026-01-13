
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, RefreshCw,
  Home, List, LayoutGrid, User
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CommunityParticipant } from '../types';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import clsx from 'clsx';

interface CommunityManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: CommunityParticipant = {
  id: '',
  fullName: '',
  state: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  createdAt: ''
};

export const CommunityManager: React.FC<CommunityManagerProps> = ({ onBack }) => {
  const [participants, setParticipants] = useState<CommunityParticipant[]>([]);
  const [formData, setFormData] = useState<CommunityParticipant>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    fetchParticipants();
    ibgeService.getStates().then(setStates);
  }, []);

  useEffect(() => {
    if (formData.state) {
      setIsLoadingCities(true);
      ibgeService.getCities(formData.state).then(data => {
        setCities(data);
        setIsLoadingCities(false);
      });
    } else {
      setCities([]);
    }
  }, [formData.state]);

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      const data = await appBackend.getCommunityParticipants();
      setParticipants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.email) {
      alert("Nome e E-mail são obrigatórios.");
      return;
    }
    setIsSaving(true);
    try {
      await appBackend.saveCommunityParticipant(formData);
      await fetchParticipants();
      setShowModal(false);
      setFormData(INITIAL_FORM);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Excluir este participante da comunidade?")) {
      try {
        await appBackend.deleteCommunityParticipant(id);
        setParticipants(prev => prev.filter(p => p.id !== id));
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  const filtered = participants.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-teal-600" /> Área de Comunidade
            </h2>
            <p className="text-slate-500 text-sm">Gestão de participantes e rede de networking.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
            <button onClick={() => setViewMode('cards')} className={clsx("p-2 rounded-md transition-all", viewMode === 'cards' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}>
              <LayoutGrid size={18}/>
            </button>
            <button onClick={() => setViewMode('list')} className={clsx("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400")}>
              <List size={18}/>
            </button>
          </div>
          <button 
            onClick={() => { setFormData(INITIAL_FORM); setShowModal(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={18} /> Novo Participante
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, e-mail ou cidade..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {p.fullName.charAt(0)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setFormData(p); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{p.fullName}</h3>
              <div className="space-y-2 mt-4 text-sm text-slate-500">
                <p className="flex items-center gap-2"><MapPin size={14}/> {p.city}/{p.state}</p>
                <p className="flex items-center gap-2"><Mail size={14}/> {p.email}</p>
                <p className="flex items-center gap-2"><Phone size={14}/> {p.phone}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Nenhum participante encontrado.</div>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nome Completo</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-800">{p.fullName}</td>
                  <td className="px-6 py-4 text-slate-500">{p.city}/{p.state}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.email}</span>
                      <span className="text-xs text-slate-400">{p.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setFormData(p); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 animate-in zoom-in-95 flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Participante' : 'Novo Participante'}</h3>
                <p className="text-sm text-slate-500">Membro da Comunidade VOLL.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={24}/></button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Completo *</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                    placeholder="Nome completo do participante"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail *</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Estado (UF)</label>
                  <select 
                    className="w-full px-4 py-2 border rounded-xl text-sm bg-white" 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value, city: ''})}
                  >
                    <option value="">Selecione...</option>
                    {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade</label>
                  <select 
                    className="w-full px-4 py-2 border rounded-xl text-sm bg-white disabled:opacity-50" 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    disabled={!formData.state || isLoadingCities}
                  >
                    <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    placeholder="Rua, número, bairro..."
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 font-bold text-sm">Cancelar</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Participante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
