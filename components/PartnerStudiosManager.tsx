
import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, DollarSign, User, 
  Dumbbell, CheckSquare, Paperclip, Filter, RefreshCw
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
  const [filterMethodology, setFilterMethodology] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // IBGE State (Form)
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // IBGE State (Filters)
  const [filterCities, setFilterCities] = useState<IBGECity[]>([]);

  useEffect(() => {
      fetchStudios();
      ibgeService.getStates().then(setStates);
  }, []);

  // Fetch Cities when Form State changes
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

  // Fetch Cities when Filter State changes
  useEffect(() => {
      if (filterState) {
          ibgeService.getCities(filterState).then(setFilterCities);
          setFilterCity(''); // Reset city on state change
      } else {
          setFilterCities([]);
          setFilterCity('');
      }
  }, [filterState]);

  // Click outside to close menu
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
      if (!formData.fantasyName) {
          alert("Nome Fantasia é obrigatório.");
          return;
      }
      setIsSaving(true);
      try {
          await appBackend.savePartnerStudio(formData);
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
      if (window.confirm("Excluir este studio parceiro?")) {
          try {
              await appBackend.deletePartnerStudio(id);
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

  const clearFilters = () => {
      setSearchTerm('');
      setFilterState('');
      setFilterCity('');
      setFilterStatus('');
      setFilterMethodology('');
  };

  const filtered = studios.filter(s => {
      const matchesSearch = 
          (s.fantasyName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.responsibleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesState = !filterState || s.state === filterState;
      const matchesCity = !filterCity || s.city === filterCity;
      const matchesStatus = !filterStatus || s.status === filterStatus;
      const matchesMethod = !filterMethodology || s.methodology === filterMethodology;

      return matchesSearch && matchesState && matchesCity && matchesStatus && matchesMethod;
  });

  const hasActiveFilters = searchTerm || filterState || filterCity || filterStatus || filterMethodology;

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
                <p className="text-slate-500 text-sm">Gestão de locais parceiros para cursos.</p>
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
         {/* Search Bar */}
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

         {/* Filter Row */}
         <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center text-slate-400 mr-2">
                <Filter size={16} />
                <span className="text-xs font-bold uppercase ml-1">Filtros:</span>
            </div>

            {/* Filter: UF */}
            <select 
                value={filterState} 
                onChange={e => setFilterState(e.target.value)}
                className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500 w-32"
            >
                <option value="">Todos Estados</option>
                {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
            </select>

            {/* Filter: City */}
            <select 
                value={filterCity} 
                onChange={e => setFilterCity(e.target.value)}
                disabled={!filterState}
                className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500 w-40 disabled:bg-slate-50 disabled:text-slate-300"
            >
                <option value="">Todas Cidades</option>
                {filterCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>

            {/* Filter: Status */}
            <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500"
            >
                <option value="">Todos Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
            </select>

            {/* Filter: Methodology */}
            <select 
                value={filterMethodology} 
                onChange={e => setFilterMethodology(e.target.value)}
                className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 outline-none focus:border-teal-500"
            >
                <option value="">Todas Metodologias</option>
                <option value="Clássico">Clássico</option>
                <option value="Contemporâneo">Contemporâneo</option>
                <option value="Misto">Misto</option>
            </select>

            {/* Clear Button */}
            {hasActiveFilters && (
                <button 
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-2 rounded-lg transition-colors ml-auto"
                >
                    <X size={14} /> Limpar
                </button>
            )}
         </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
              <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
          ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Building2 size={32} className="text-slate-300" />
                  </div>
                  <p>Nenhum studio encontrado.</p>
                  {hasActiveFilters && <button onClick={clearFilters} className="text-teal-600 text-sm mt-1 hover:underline">Limpar filtros</button>}
              </div>
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

                          <h3 className="font-bold text-slate-800 text-lg mb-1 truncate" title={studio.fantasyName}>{studio.fantasyName}</h3>
                          <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                              <MapPin size={14} /> {studio.city}/{studio.state}
                          </div>

                          <div className="space-y-2 text-xs text-slate-600">
                              <p className="flex items-center gap-2"><User size={12} className="text-slate-400" /> {studio.responsibleName}</p>
                              <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {studio.phone}</p>
                          </div>
                      </div>
                      
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Dumbbell size={12}/> Equipamentos: {
                              (studio.qtyReformer || 0) + (studio.qtyCadillac || 0) + (studio.qtyChair || 0) + (studio.qtyLadderBarrel || 0)
                          }</span>
                          <span>{studio.sizeM2 ? `${studio.sizeM2}m²` : '-'}</span>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Studio' : 'Novo Studio Parceiro'}</h3>
                        <p className="text-sm text-slate-500">Cadastro de local para realização de cursos.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* SEÇÃO 1: Identificação */}
                    <div>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User size={16} /> Identificação & Contato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Situação</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Responsável pelo Studio</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.responsibleName} onChange={e => handleInputChange('responsibleName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Responsável</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                                <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome 2º Contato</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.secondContactName} onChange={e => handleInputChange('secondContactName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone 2º Contato</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.secondContactPhone} onChange={e => handleInputChange('secondContactPhone', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 2: Empresa & Localização */}
                    <div>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Building2 size={16} /> Dados da Empresa
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.fantasyName} onChange={e => handleInputChange('fantasyName', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.legalName} onChange={e => handleInputChange('legalName', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone do Studio</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studioPhone} onChange={e => handleInputChange('studioPhone', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.state}
                                    onChange={e => {
                                        handleInputChange('state', e.target.value);
                                        handleInputChange('city', '');
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
                                    value={formData.city}
                                    onChange={e => handleInputChange('city', e.target.value)}
                                    disabled={!formData.state || isLoadingCities}
                                >
                                    <option value="">{isLoadingCities ? '...' : 'Selecione'}</option>
                                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">País</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.country} onChange={e => handleInputChange('country', e.target.value)} />
                            </div>
                            
                            {/* Detalhes Fisicos */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">M² do Studio</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.sizeM2} onChange={e => handleInputChange('sizeM2', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Alunos</label>
                                <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studentCapacity} onChange={e => handleInputChange('studentCapacity', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Aluguel (Valor)</label>
                                <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.rentValue} onChange={e => handleInputChange('rentValue', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Atuação</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studioType} onChange={e => handleInputChange('studioType', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Studio no Site</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.nameOnSite} onChange={e => handleInputChange('nameOnSite', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 3: Financeiro */}
                    <div>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <DollarSign size={16} /> Dados Bancários
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Banco</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Agência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.agency} onChange={e => handleInputChange('agency', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Conta</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.account} onChange={e => handleInputChange('account', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Beneficiário</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.beneficiary} onChange={e => handleInputChange('beneficiary', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Chave PIX</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.pixKey} onChange={e => handleInputChange('pixKey', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 4: Equipamentos & Infra */}
                    <div>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Dumbbell size={16} /> Equipamentos e Metodologia
                        </h4>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Metodologia</label>
                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white md:w-1/3" value={formData.methodology} onChange={e => handleInputChange('methodology', e.target.value)}>
                                <option value="">Selecione...</option>
                                <option value="Clássico">Pilates Clássico</option>
                                <option value="Contemporâneo">Pilates Contemporâneo</option>
                                <option value="Misto">Misto</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            
                            {/* Reformer */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-teal-600" checked={formData.hasReformer} onChange={e => handleInputChange('hasReformer', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Reformer?</span>
                                </label>
                                {formData.hasReformer && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Qtd:</span>
                                        <input type="number" className="w-16 px-2 py-1 border rounded text-sm" value={formData.qtyReformer} onChange={e => handleInputChange('qtyReformer', parseInt(e.target.value))} />
                                    </div>
                                )}
                            </div>

                            {/* Ladder Barrel */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-teal-600" checked={formData.hasLadderBarrel} onChange={e => handleInputChange('hasLadderBarrel', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Ladder Barrel?</span>
                                </label>
                                {formData.hasLadderBarrel && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Qtd:</span>
                                        <input type="number" className="w-16 px-2 py-1 border rounded text-sm" value={formData.qtyLadderBarrel} onChange={e => handleInputChange('qtyLadderBarrel', parseInt(e.target.value))} />
                                    </div>
                                )}
                            </div>

                            {/* Chair */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-teal-600" checked={formData.hasChair} onChange={e => handleInputChange('hasChair', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Chair?</span>
                                </label>
                                {formData.hasChair && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Qtd:</span>
                                        <input type="number" className="w-16 px-2 py-1 border rounded text-sm" value={formData.qtyChair} onChange={e => handleInputChange('qtyChair', parseInt(e.target.value))} />
                                    </div>
                                )}
                            </div>

                            {/* Cadillac */}
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-teal-600" checked={formData.hasCadillac} onChange={e => handleInputChange('hasCadillac', e.target.checked)} />
                                    <span className="text-sm text-slate-700">Possui Cadillac?</span>
                                </label>
                                {formData.hasCadillac && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Qtd:</span>
                                        <input type="number" className="w-16 px-2 py-1 border rounded text-sm" value={formData.qtyCadillac} onChange={e => handleInputChange('qtyCadillac', parseInt(e.target.value))} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Infra Extra */}
                        <div className="mt-4 flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-teal-600" checked={formData.hasChairsForCourse} onChange={e => handleInputChange('hasChairsForCourse', e.target.checked)} />
                                <span className="text-sm text-slate-700">Possui cadeiras para curso?</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-teal-600" checked={formData.hasTv} onChange={e => handleInputChange('hasTv', e.target.checked)} />
                                <span className="text-sm text-slate-700">Possui TV?</span>
                            </label>
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Máxima de Kits</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm md:w-1/3" value={formData.maxKitsCapacity} onChange={e => handleInputChange('maxKitsCapacity', e.target.value)} />
                        </div>
                    </div>

                    {/* SEÇÃO 5: Outros */}
                    <div>
                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Paperclip size={16} /> Anexos
                        </h4>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl h-24 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                            <CheckSquare size={24} className="mb-2" />
                            <span className="text-sm">Adicionar fotos ou documentos</span>
                            <input type="file" className="hidden" multiple />
                        </div>
                        <div className="mt-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Link Pasta Drive/Dropbox</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-blue-600 underline" value={formData.attachments} onChange={e => handleInputChange('attachments', e.target.value)} placeholder="https://..." />
                        </div>
                    </div>

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
