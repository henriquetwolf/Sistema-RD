
import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, DollarSign, User, 
  Dumbbell, CheckSquare, Paperclip, Filter, RefreshCw, KeyRound,
  Users, Layers, Ruler, Tv, Info, Globe
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { PartnerStudio } from '../types';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';

interface PartnerStudiosManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: PartnerStudio = {
    id: '',
    status: 'active',
    responsibleName: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    secondContactName: '',
    secondContactPhone: '',
    fantasyName: '',
    legalName: '',
    cnpj: '',
    studioPhone: '',
    address: '',
    city: '',
    state: '',
    country: 'Brasil',
    sizeM2: '',
    studentCapacity: '',
    rentValue: '',
    methodology: '',
    studioType: '',
    nameOnSite: '',
    bank: '',
    agency: '',
    account: '',
    beneficiary: '',
    pixKey: '',
    hasReformer: false,
    qtyReformer: 0,
    hasLadderBarrel: false,
    qtyLadderBarrel: 0,
    hasChair: false,
    qtyChair: 0,
    hasCadillac: false,
    qtyCadillac: 0,
    hasChairsForCourse: false,
    hasTv: false,
    maxKitsCapacity: '',
    attachments: ''
};

const METHODOLOGIES = ['Clássico', 'Contemporâneo', 'Ambos', 'Outro'];
const STUDIO_TYPES = ['Franquia', 'Licenciado', 'Parceiro Independente', 'Próprio'];

export const PartnerStudiosManager: React.FC<PartnerStudiosManagerProps> = ({ onBack }) => {
  const [studios, setStudios] = useState<PartnerStudio[]>([]);
  const [formData, setFormData] = useState<PartnerStudio>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // IBGE State (Form)
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [filterCities, setFilterCities] = useState<IBGECity[]>([]);

  useEffect(() => {
      fetchStudios();
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

  useEffect(() => {
      if (filterState) {
          ibgeService.getCities(filterState).then(setFilterCities);
          setFilterCity('');
      } else {
          setFilterCities([]);
          setFilterCity('');
      }
  }, [filterState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchStudios = async () => {
      setIsLoading(true);
      try {
          const data = await appBackend.getPartnerStudios();
          setStudios(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleInputChange = (field: keyof PartnerStudio, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (!formData.fantasyName || !formData.email) {
          alert("Nome Fantasia e E-mail são obrigatórios.");
          return;
      }
      setIsSaving(true);
      try {
          const isUpdate = !!formData.id;
          await appBackend.savePartnerStudio(formData);
          await appBackend.logActivity({ 
              action: isUpdate ? 'update' : 'create', 
              module: 'partner_studios', 
              details: `${isUpdate ? 'Editou' : 'Cadastrou'} studio parceiro: ${formData.fantasyName}`,
              recordId: formData.id || undefined
          });
          await fetchStudios();
          setShowModal(false);
          setFormData(INITIAL_FORM);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      const target = studios.find(s => s.id === id);
      if (window.confirm("Excluir este studio parceiro?")) {
          try {
              await appBackend.deletePartnerStudio(id);
              await appBackend.logActivity({ action: 'delete', module: 'partner_studios', details: `Excluiu studio parceiro: ${target?.fantasyName}`, recordId: id });
              setStudios(prev => prev.filter(s => s.id !== id));
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  const openEdit = (studio: PartnerStudio) => {
      setFormData(studio);
      setShowModal(true);
      setActiveMenuId(null);
  };

  const filtered = studios.filter(s => {
      const matchesSearch = 
          (s.fantasyName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.responsibleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesState = !filterState || s.state === filterState;
      const matchesCity = !filterCity || s.city === filterCity;
      const matchesStatus = !filterStatus || s.status === filterStatus;

      return matchesSearch && matchesState && matchesCity && matchesStatus;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="text-teal-600" /> Studios Parceiros
                </h2>
                <p className="text-slate-500 text-sm">Gestão completa de locais parceiros e infraestrutura.</p>
            </div>
        </div>
        <button 
            onClick={() => { setFormData(INITIAL_FORM); setShowModal(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Studio
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por nome, responsável ou cidade..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
         </div>

         <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center text-slate-400 mr-2">
                <Filter size={16} />
                <span className="text-xs font-bold uppercase ml-1">Filtros:</span>
            </div>

            <select value={filterState} onChange={e => setFilterState(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500 w-32">
                <option value="">Todos Estados</option>
                {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
            </select>

            <select value={filterCity} onChange={e => setFilterCity(e.target.value)} disabled={!filterState} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500 w-40 disabled:bg-slate-50">
                <option value="">Todas Cidades</option>
                {filterCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500">
                <option value="">Todos Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
            </select>

            { (searchTerm || filterState || filterStatus) && (
                <button onClick={() => { setSearchTerm(''); setFilterState(''); setFilterStatus(''); }} className="text-xs text-red-500 font-bold hover:underline ml-auto">Limpar Filtros</button>
            )}
         </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
              <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
          ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">Nenhum studio encontrado.</div>
          ) : (
              filtered.map(studio => (
                  <div key={studio.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                      <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-3">
                              <span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide", studio.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                  {studio.status === 'active' ? 'Ativo' : 'Inativo'}
                              </span>
                              <div className="relative">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === studio.id ? null : studio.id); }}
                                      className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 menu-btn"
                                  >
                                      <MoreVertical size={18} />
                                  </button>
                                  {activeMenuId === studio.id && (
                                      <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                          <button onClick={() => openEdit(studio)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                              <Edit2 size={12} /> Editar
                                          </button>
                                          <button onClick={() => handleDelete(studio.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                              <Trash2 size={12} /> Excluir
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{studio.fantasyName}</h3>
                          <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                              <MapPin size={14} /> {studio.city}/{studio.state}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-4">
                              <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Ref</span>
                                  <span className="text-xs font-bold text-slate-700">{studio.qtyReformer || 0}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Cad</span>
                                  <span className="text-xs font-bold text-slate-700">{studio.qtyCadillac || 0}</span>
                              </div>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600 border-t border-slate-50 pt-3">
                              <p className="flex items-center gap-2 truncate"><User size={12} className="text-slate-400" /> {studio.responsibleName}</p>
                              <p className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> {studio.email}</p>
                          </div>
                      </div>
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {studio.studioType || 'Parceiro'}
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Full Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Ficha do Studio Parceiro' : 'Cadastro de Studio Parceiro'}</h3>
                        <p className="text-sm text-slate-500">Dados técnicos, administrativos e lista de equipamentos.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                    
                    {/* SECTION: IDENTIFICAÇÃO E ACESSO */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User size={16} /> Identificação e Acesso
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Status de Acesso</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                                    <option value="active">Ativo (Permite Login)</option>
                                    <option value="inactive">Inativo (Acesso Bloqueado)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia do Studio *</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-teal-800" value={formData.fantasyName} onChange={e => handleInputChange('fantasyName', e.target.value)} placeholder="Ex: Pilates Health & Balance" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome no Site</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.nameOnSite} onChange={e => handleInputChange('nameOnSite', e.target.value)} />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Login (Obrigatório) *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input type="email" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><KeyRound size={12}/> Senha para Área do Studio</label>
                                <input type="text" className="w-full px-3 py-2 border border-teal-200 bg-teal-50 rounded-lg text-sm font-bold text-teal-900" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} placeholder="Defina a senha" />
                            </div>
                        </div>
                    </section>

                    {/* SECTION: RESPONSÁVEIS */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Users size={16} /> Responsáveis e Contatos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Responsável Legal</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.responsibleName} onChange={e => handleInputChange('responsibleName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF do Responsável</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Principal</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Segundo Contato (Opcional)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.secondContactName} onChange={e => handleInputChange('secondContactName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Segundo Contato</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.secondContactPhone} onChange={e => handleInputChange('secondContactPhone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone do Studio</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studioPhone} onChange={e => handleInputChange('studioPhone', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    {/* SECTION: DADOS EMPRESARIAIS E ENDEREÇO */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            {/* Fixed compilation error: changed Building to Building2 */}
                            <Building2 size={16} /> Empresa e Localização
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.legalName} onChange={e => handleInputChange('legalName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">País</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.country} onChange={e => handleInputChange('country', e.target.value)} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.state} onChange={e => { handleInputChange('state', e.target.value); handleInputChange('city', ''); }}>
                                    <option value="">Selecione...</option>
                                    {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} disabled={!formData.state || isLoadingCities}>
                                    <option value="">{isLoadingCities ? '...' : 'Selecione'}</option>
                                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* SECTION: OPERAÇÃO E FINANCEIRO */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <DollarSign size={16} /> Operação e Financeiro
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tamanho (M²)</label>
                                <div className="relative">
                                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.sizeM2} onChange={e => handleInputChange('sizeM2', e.target.value)} placeholder="Ex: 120" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Alunos</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studentCapacity} onChange={e => handleInputChange('studentCapacity', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor do Aluguel p/ Cursos</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700" value={formData.rentValue} onChange={e => handleInputChange('rentValue', e.target.value)} placeholder="R$ 0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Studio</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.studioType} onChange={e => handleInputChange('studioType', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {STUDIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Metodologia Principal</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.methodology} onChange={e => handleInputChange('methodology', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {METHODOLOGIES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            
                            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Banco / PIX</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} placeholder="Banco" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Agência</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.agency} onChange={e => handleInputChange('agency', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Conta</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.account} onChange={e => handleInputChange('account', e.target.value)} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Chave PIX</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.pixKey} onChange={e => handleInputChange('pixKey', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Beneficiário da Conta</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.beneficiary} onChange={e => handleInputChange('beneficiary', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    {/* SECTION: EQUIPAMENTOS */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Dumbbell size={16} /> Lista de Equipamentos (Padrão VOLL)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Reformer */}
                            <div className={clsx("p-4 rounded-xl border-2 transition-all", formData.hasReformer ? "bg-teal-50 border-teal-500" : "bg-white border-slate-100 opacity-60")}>
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasReformer} onChange={e => handleInputChange('hasReformer', e.target.checked)} />
                                    <span className="font-bold text-slate-700">Reformer</span>
                                </label>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantidade</label>
                                    <input type="number" disabled={!formData.hasReformer} className="w-full px-2 py-1 border rounded text-sm" value={formData.qtyReformer} onChange={e => handleInputChange('qtyReformer', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {/* Cadillac */}
                            <div className={clsx("p-4 rounded-xl border-2 transition-all", formData.hasCadillac ? "bg-teal-50 border-teal-500" : "bg-white border-slate-100 opacity-60")}>
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasCadillac} onChange={e => handleInputChange('hasCadillac', e.target.checked)} />
                                    <span className="font-bold text-slate-700">Cadillac</span>
                                </label>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantidade</label>
                                    <input type="number" disabled={!formData.hasCadillac} className="w-full px-2 py-1 border rounded text-sm" value={formData.qtyCadillac} onChange={e => handleInputChange('qtyCadillac', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {/* Chair */}
                            <div className={clsx("p-4 rounded-xl border-2 transition-all", formData.hasChair ? "bg-teal-50 border-teal-500" : "bg-white border-slate-100 opacity-60")}>
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasChair} onChange={e => handleInputChange('hasChair', e.target.checked)} />
                                    <span className="font-bold text-slate-700">Chair</span>
                                </label>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantidade</label>
                                    <input type="number" disabled={!formData.hasChair} className="w-full px-2 py-1 border rounded text-sm" value={formData.qtyChair} onChange={e => handleInputChange('qtyChair', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {/* Ladder Barrel */}
                            <div className={clsx("p-4 rounded-xl border-2 transition-all", formData.hasLadderBarrel ? "bg-teal-50 border-teal-500" : "bg-white border-slate-100 opacity-60")}>
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasLadderBarrel} onChange={e => handleInputChange('hasLadderBarrel', e.target.checked)} />
                                    <span className="font-bold text-slate-700">Ladder Barrel</span>
                                </label>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantidade</label>
                                    <input type="number" disabled={!formData.hasLadderBarrel} className="w-full px-2 py-1 border rounded text-sm" value={formData.qtyLadderBarrel} onChange={e => handleInputChange('qtyLadderBarrel', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION: INFRAESTRUTURA PARA CURSOS */}
                    <section>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <CheckSquare size={16} /> Infraestrutura p/ Cursos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasChairsForCourse} onChange={e => handleInputChange('hasChairsForCourse', e.target.checked)} />
                                    <span className="text-sm text-slate-700 font-medium">Possui cadeiras extras para alunos do curso?</span>
                                </label>
                                <div className="h-px bg-slate-200"></div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasTv} onChange={e => handleInputChange('hasTv', e.target.checked)} />
                                    <span className="text-sm text-slate-700 font-medium flex items-center gap-1"><Tv size={14}/> Possui TV ou Projetor no local?</span>
                                </label>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Máxima de Kits de Curso</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.maxKitsCapacity} onChange={e => handleInputChange('maxKitsCapacity', e.target.value)} placeholder="Ex: 15 kits" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Anexos / Link de Pasta (Fotos/Vistoria)</label>
                                    <div className="relative">
                                        <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                        <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-blue-600 underline" value={formData.attachments} onChange={e => handleInputChange('attachments', e.target.value)} placeholder="Link do Google Drive / Dropbox" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Studio
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
