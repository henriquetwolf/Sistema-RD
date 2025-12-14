import React, { useState, useEffect } from 'react';
import { 
  Store, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, Calendar, FileText, 
  CheckSquare, DollarSign, User, Building, Paperclip, Briefcase
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';

// --- Types ---
export interface Franchise {
  id: string;
  // Venda & Datas
  saleNumber: string;
  contractStartDate: string;
  inaugurationDate: string;
  salesConsultant: string;
  
  // Identificação
  franchiseeName: string;
  cpf: string;
  companyName: string; // Razão Social
  cnpj: string;
  
  // Contato
  phone: string;
  email: string;
  residentialAddress: string;
  
  // Localização Comercial (Studio)
  commercialState: string;
  commercialCity: string;
  commercialAddress: string;
  commercialNeighborhood: string;
  latitude: string;
  longitude: string;
  kmStreetPoint: string;
  kmCommercialBuilding: string;
  
  // Detalhes do Studio
  studioStatus: string;
  studioSizeM2: string;
  equipmentList: string;
  
  // Financeiro & Contrato
  royaltiesValue: string;
  bankAccountInfo: string;
  hasSignedContract: boolean;
  contractEndDate: string;
  isRepresentative: boolean;
  
  // Sócios
  partner1Name: string;
  partner2Name: string;
  
  // Outros
  franchiseeFolderLink: string;
  pathInfo: string; // Campo "Caminho"
  observations: string;
}

interface FranchisesManagerProps {
  onBack: () => void;
}

export const FranchisesManager: React.FC<FranchisesManagerProps> = ({ onBack }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const initialFormState: Franchise = {
      id: '',
      saleNumber: '', contractStartDate: '', inaugurationDate: '', salesConsultant: '',
      franchiseeName: '', cpf: '', companyName: '', cnpj: '',
      phone: '', email: '', residentialAddress: '',
      commercialState: '', commercialCity: '', commercialAddress: '', commercialNeighborhood: '', latitude: '', longitude: '', kmStreetPoint: '', kmCommercialBuilding: '',
      studioStatus: 'Em implantação', studioSizeM2: '', equipmentList: '',
      royaltiesValue: '', bankAccountInfo: '', hasSignedContract: false, contractEndDate: '', isRepresentative: false,
      partner1Name: '', partner2Name: '',
      franchiseeFolderLink: '', pathInfo: '', observations: ''
  };

  const [formData, setFormData] = useState<Franchise>(initialFormState);

  useEffect(() => {
      fetchFranchises();
      ibgeService.getStates().then(setStates);
  }, []);

  useEffect(() => {
      if (formData.commercialState) {
          setIsLoadingCities(true);
          ibgeService.getCities(formData.commercialState).then(data => {
              setCities(data);
              setIsLoadingCities(false);
          });
      } else {
          setCities([]);
      }
  }, [formData.commercialState]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.franchise-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchFranchises = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_franchises')
              .select('*')
              .order('franchisee_name', { ascending: true });

          if (error) {
              if (error.message.includes('does not exist')) {
                  alert("Tabela 'crm_franchises' não encontrada. Vá em Configurações > Diagnóstico para criar a tabela.");
              }
              throw error;
          }

          const mapped: Franchise[] = (data || []).map((d: any) => ({
              id: d.id,
              saleNumber: d.sale_number,
              contractStartDate: d.contract_start_date,
              inaugurationDate: d.inauguration_date,
              salesConsultant: d.sales_consultant,
              franchiseeName: d.franchisee_name,
              cpf: d.cpf,
              companyName: d.company_name,
              cnpj: d.cnpj,
              phone: d.phone,
              email: d.email,
              residentialAddress: d.residential_address,
              commercialState: d.commercial_state,
              commercialCity: d.commercial_city,
              commercialAddress: d.commercial_address,
              commercialNeighborhood: d.commercial_neighborhood,
              latitude: d.latitude,
              longitude: d.longitude,
              kmStreetPoint: d.km_street_point,
              kmCommercialBuilding: d.km_commercial_building,
              studioStatus: d.studio_status,
              studioSizeM2: d.studio_size_m2,
              equipmentList: d.equipment_list,
              royaltiesValue: d.royalties_value,
              bankAccountInfo: d.bank_account_info,
              hasSignedContract: d.has_signed_contract,
              contractEndDate: d.contract_end_date,
              isRepresentative: d.is_representative,
              partner1Name: d.partner_1_name,
              partner2Name: d.partner_2_name,
              franchiseeFolderLink: d.franchisee_folder_link,
              pathInfo: d.path_info,
              observations: d.observations
          }));
          setFranchises(mapped);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleInputChange = (field: keyof Franchise, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (!formData.franchiseeName) {
          alert("Nome do franqueado é obrigatório.");
          return;
      }

      setIsSaving(true);
      const payload = {
          sale_number: formData.saleNumber,
          contract_start_date: formData.contractStartDate || null,
          inauguration_date: formData.inaugurationDate || null,
          sales_consultant: formData.salesConsultant,
          franchisee_name: formData.franchiseeName,
          cpf: formData.cpf,
          company_name: formData.companyName,
          cnpj: formData.cnpj,
          phone: formData.phone,
          email: formData.email,
          residential_address: formData.residentialAddress,
          commercial_state: formData.commercialState,
          commercial_city: formData.commercialCity,
          commercial_address: formData.commercialAddress,
          commercial_neighborhood: formData.commercialNeighborhood,
          latitude: formData.latitude,
          longitude: formData.longitude,
          km_street_point: formData.kmStreetPoint,
          km_commercial_building: formData.kmCommercialBuilding,
          studio_status: formData.studioStatus,
          studio_size_m2: formData.studioSizeM2,
          equipment_list: formData.equipmentList,
          royalties_value: formData.royaltiesValue,
          bank_account_info: formData.bankAccountInfo,
          has_signed_contract: formData.hasSignedContract,
          contract_end_date: formData.contractEndDate || null,
          is_representative: formData.isRepresentative,
          partner_1_name: formData.partner1Name,
          partner_2_name: formData.partner2Name,
          franchisee_folder_link: formData.franchiseeFolderLink,
          path_info: formData.pathInfo,
          observations: formData.observations
      };

      try {
          if (formData.id) {
              await appBackend.client.from('crm_franchises').update(payload).eq('id', formData.id);
          } else {
              await appBackend.client.from('crm_franchises').insert([payload]);
          }
          await fetchFranchises();
          setShowModal(false);
          setFormData(initialFormState);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Excluir esta franquia?")) {
          await appBackend.client.from('crm_franchises').delete().eq('id', id);
          fetchFranchises();
      }
  };

  const handleEdit = (item: Franchise) => {
      setFormData({ ...item });
      setShowModal(true);
      setActiveMenuId(null);
  };

  const filtered = franchises.filter(f => 
      f.franchiseeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.commercialCity.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                        <Store className="text-teal-600" /> Gestão de Franquias
                    </h2>
                    <p className="text-slate-500 text-sm">Controle de unidades franqueadas e implantação.</p>
                </div>
            </div>
            <button 
                onClick={() => { setFormData(initialFormState); setShowModal(true); }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
                <Plus size={18} /> Nova Franquia
            </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por franqueado ou cidade..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
            ) : filtered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400">Nenhuma franquia encontrada.</div>
            ) : (
                filtered.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <span className={clsx(
                                    "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide",
                                    item.studioStatus === 'Ativo' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                )}>
                                    {item.studioStatus || 'Status N/A'}
                                </span>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 franchise-menu-btn"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {activeMenuId === item.id && (
                                        <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                            <button onClick={() => handleEdit(item)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                <Edit2 size={12} /> Editar
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={12} /> Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-1">{item.franchiseeName}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                <MapPin size={12} /> {item.commercialCity}/{item.commercialState}
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> {item.phone || '-'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" /> {item.email || '-'}
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                            <span>Venda: {item.saleNumber}</span>
                            <span>{item.contractStartDate ? new Date(item.contractStartDate).toLocaleDateString() : 'S/ Data'}</span>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Modal Form */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Franquia' : 'Cadastro de Franquia'}</h3>
                            <p className="text-sm text-slate-500">Dados cadastrais da unidade e do franqueado.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        
                        {/* 1. Dados da Venda */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Briefcase size={16} /> Dados da Venda
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">NÚMERO DA VENDA</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.saleNumber} onChange={e => handleInputChange('saleNumber', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Início Contrato</label>
                                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.contractStartDate} onChange={e => handleInputChange('contractStartDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data Inauguração</label>
                                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.inaugurationDate} onChange={e => handleInputChange('inaugurationDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Consultor Resp.</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.salesConsultant} onChange={e => handleInputChange('salesConsultant', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Identificação e Contato */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <User size={16} /> Identificação e Contato
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">NOME FRANQUEADO</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.franchiseeName} onChange={e => handleInputChange('franchiseeName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">CPF</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                                    <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                                </div>
                                <div className="lg:col-span-4">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Residencial</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.residentialAddress} onChange={e => handleInputChange('residentialAddress', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Localização Comercial */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <MapPin size={16} /> Localização Comercial (Studio)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Estado (Comercial)</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                        value={formData.commercialState}
                                        onChange={e => {
                                            handleInputChange('commercialState', e.target.value);
                                            handleInputChange('commercialCity', '');
                                        }}
                                    >
                                        <option value="">Selecione...</option>
                                        {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade (Comercial)</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" 
                                        value={formData.commercialCity} 
                                        onChange={e => handleInputChange('commercialCity', e.target.value)}
                                        disabled={!formData.commercialState || isLoadingCities}
                                    >
                                        <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                                        {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Comercial</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.commercialAddress} onChange={e => handleInputChange('commercialAddress', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro (Comercial)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.commercialNeighborhood} onChange={e => handleInputChange('commercialNeighborhood', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Latitude</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.latitude} onChange={e => handleInputChange('latitude', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Longitude</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.longitude} onChange={e => handleInputChange('longitude', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">KM Ponto de Rua</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.kmStreetPoint} onChange={e => handleInputChange('kmStreetPoint', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">KM Prédio Comercial</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.kmCommercialBuilding} onChange={e => handleInputChange('kmCommercialBuilding', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* 4. Detalhes Studio e Negócio */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Building size={16} /> Detalhes do Negócio
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status do Studio</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studioStatus} onChange={e => handleInputChange('studioStatus', e.target.value)} placeholder="Ex: Ativo, Em Obras..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tamanho (M²)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.studioSizeM2} onChange={e => handleInputChange('studioSizeM2', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Equipamento</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.equipmentList} onChange={e => handleInputChange('equipmentList', e.target.value)} />
                                </div>
                                
                                <div className="md:col-span-3">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit">
                                        <input type="checkbox" className="rounded text-teal-600" checked={formData.isRepresentative} onChange={e => handleInputChange('isRepresentative', e.target.checked)} />
                                        <span className="text-sm text-slate-700 font-medium">Franqueado é Representante?</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 5. Financeiro e Contrato */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <DollarSign size={16} /> Financeiro e Contrato
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Royalties</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.royaltiesValue} onChange={e => handleInputChange('royaltiesValue', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dados Bancários</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.bankAccountInfo} onChange={e => handleInputChange('bankAccountInfo', e.target.value)} />
                                </div>
                                
                                <div className="md:col-span-3 flex items-center gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded text-teal-600" checked={formData.hasSignedContract} onChange={e => handleInputChange('hasSignedContract', e.target.checked)} />
                                        <span className="text-sm text-slate-700 font-bold">Tem contrato assinado?</span>
                                    </label>
                                    
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-slate-600">Data Final Contrato:</label>
                                        <input type="date" className="px-2 py-1 border border-slate-300 rounded text-sm bg-white" value={formData.contractEndDate} onChange={e => handleInputChange('contractEndDate', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Sócios e Outros */}
                        <div>
                            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <CheckSquare size={16} /> Sócios e Documentação
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Sócio 1</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.partner1Name} onChange={e => handleInputChange('partner1Name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Sócio 2</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.partner2Name} onChange={e => handleInputChange('partner2Name', e.target.value)} />
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Pasta do Franqueado (Link)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-blue-600 underline" value={formData.franchiseeFolderLink} onChange={e => handleInputChange('franchiseeFolderLink', e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Caminho</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.pathInfo} onChange={e => handleInputChange('pathInfo', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                                    <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20 resize-none" value={formData.observations} onChange={e => handleInputChange('observations', e.target.value)}></textarea>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Anexos</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl h-24 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <Paperclip size={24} className="mb-2" />
                                        <span className="text-sm">Adicionar Anexos</span>
                                        <input type="file" className="hidden" multiple />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Franquia
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
