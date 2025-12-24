
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, Calendar, FileText, 
  DollarSign, User, Building, Map as MapIcon, List,
  Navigation, AlertTriangle, CheckCircle, Briefcase, Globe, Info, Ruler, Dumbbell,
  AlertCircle, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Franchise } from '../types';

interface FranchisesManagerProps {
  onBack: () => void;
}

const INITIAL_FORM_STATE: Franchise = {
    id: '',
    saleNumber: '',
    contractStartDate: '',
    inaugurationDate: '',
    salesConsultant: '',
    franchiseeName: '',
    cpf: '',
    companyName: '',
    cnpj: '',
    phone: '',
    email: '',
    residentialAddress: '',
    commercialState: '',
    commercialCity: '',
    commercialAddress: '',
    commercialNeighborhood: '',
    latitude: '',
    longitude: '',
    exclusivityRadiusKm: '',
    kmStreetPoint: '',
    kmCommercialBuilding: '',
    studioStatus: 'Em implantação',
    studioSizeM2: '',
    equipmentList: '',
    royaltiesValue: '',
    bankAccountInfo: '',
    hasSignedContract: false,
    contractEndDate: '',
    isRepresentative: false,
    partner1Name: '',
    partner2Name: '',
    franchiseeFolderLink: '',
    pathInfo: '',
    observations: ''
};

// Componente auxiliar para centralizar o mapa quando uma franquia for selecionada
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, 15);
  return null;
};

export const FranchisesManager: React.FC<FranchisesManagerProps> = ({ onBack }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState<'dados' | 'local' | 'studio'>('dados');
  
  const [formData, setFormData] = useState<Franchise>(INITIAL_FORM_STATE);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

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

  const fetchFranchises = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_franchises')
              .select('*')
              .order('franchisee_name', { ascending: true });
          
          if (error) throw error;
          
          setFranchises(data.map((d: any) => ({
              id: d.id,
              saleNumber: d.sale_number || '',
              contractStartDate: d.contract_start_date || '',
              inaugurationDate: d.inauguration_date || '',
              salesConsultant: d.sales_consultant || '',
              franchiseeName: d.franchisee_name || '',
              cpf: d.cpf || '',
              companyName: d.company_name || '',
              cnpj: d.cnpj || '',
              phone: d.phone || '',
              email: d.email || '',
              residentialAddress: d.residential_address || '',
              commercialState: d.commercial_state || '',
              commercialCity: d.commercial_city || '',
              commercialAddress: d.commercial_address || '',
              commercialNeighborhood: d.commercial_neighborhood || '',
              latitude: d.latitude?.toString() || '',
              longitude: d.longitude?.toString() || '',
              exclusivityRadiusKm: d.exclusivity_radius_km?.toString() || '',
              kmStreetPoint: d.km_street_point?.toString() || '',
              kmCommercialBuilding: d.km_commercial_building?.toString() || '',
              studioStatus: d.studio_status || 'Em implantação',
              studioSizeM2: d.studio_size_m2 || '',
              equipmentList: d.equipment_list || '',
              royaltiesValue: d.royalties_value || '',
              bankAccountInfo: d.bank_account_info || '',
              hasSignedContract: !!d.has_signed_contract,
              contractEndDate: d.contract_end_date || '',
              isRepresentative: !!d.is_representative,
              partner1Name: d.partner_1_name || '',
              partner2Name: d.partner_2_name || '',
              franchiseeFolderLink: d.franchisee_folder_link || '',
              pathInfo: d.path_info || '',
              observations: d.observations || ''
          })));
      } catch (e: any) {
          console.error("Erro ao buscar franquias:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleInputChange = (field: keyof Franchise, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (!formData.franchiseeName) {
          alert("O nome do franqueado é obrigatório.");
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
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          exclusivity_radius_km: formData.exclusivityRadiusKm ? parseFloat(formData.exclusivityRadiusKm) : null,
          km_street_point: formData.kmStreetPoint ? parseFloat(formData.kmStreetPoint) : null,
          km_commercial_building: formData.kmCommercialBuilding ? parseFloat(formData.kmCommercialBuilding) : null,
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
              const { error } = await appBackend.client.from('crm_franchises').update(payload).eq('id', formData.id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'update', module: 'franchises', details: `Editou franquia: ${formData.franchiseeName}`, recordId: formData.id });
          } else {
              const { data, error } = await appBackend.client.from('crm_franchises').insert([payload]).select().single();
              if (error) throw error;
              await appBackend.logActivity({ action: 'create', module: 'franchises', details: `Cadastrou nova franquia: ${formData.franchiseeName}`, recordId: data?.id });
          }
          await fetchFranchises();
          setShowModal(false);
          setFormData(INITIAL_FORM_STATE);
      } catch (e: any) {
          alert(`Erro ao salvar: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      const target = franchises.find(f => f.id === id);
      if (window.confirm(`Excluir permanentemente a franquia de ${target?.franchiseeName}?`)) {
          try {
              const { error } = await appBackend.client.from('crm_franchises').delete().eq('id', id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'delete', module: 'franchises', details: `Excluiu franquia: ${target?.franchiseeName}`, recordId: id });
              setFranchises(prev => prev.filter(f => f.id !== id));
          } catch (e: any) {
              alert(`Erro: ${e.message}`);
          }
      }
  };

  const filtered = useMemo(() => {
    return franchises.filter(f => 
        f.franchiseeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.commercialCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [franchises, searchTerm]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Store className="text-teal-600" /> Gestão de Franquias
                    </h2>
                    <p className="text-slate-500 text-sm">Controle de unidades, contratos e mapeamento.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-100 p-1 rounded-lg flex">
                    <button onClick={() => setViewMode('list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2", viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <List size={16} /> Lista
                    </button>
                    <button onClick={() => setViewMode('map')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2", viewMode === 'map' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                        <MapIcon size={16} /> Mapa
                    </button>
                </div>
                <button 
                    onClick={() => { setFormData(INITIAL_FORM_STATE); setActiveTab('dados'); setShowModal(true); }}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={18} /> Nova Unidade
                </button>
            </div>
        </div>

        {viewMode === 'list' ? (
            <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por franqueado, cidade ou empresa..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            Nenhuma franquia encontrada.
                        </div>
                    ) : (
                        filtered.map(item => (
                            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border", 
                                            item.studioStatus === 'Ativo' ? "bg-green-50 text-green-700 border-green-100" : "bg-orange-50 text-orange-700 border-orange-100")}>
                                            {item.studioStatus}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setFormData(item); setActiveTab('dados'); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-teal-600"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{item.franchiseeName}</h3>
                                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin size={12}/> {item.commercialCity}/{item.commercialState}</p>
                                    
                                    <div className="space-y-2 text-xs text-slate-600">
                                        <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {item.phone}</p>
                                        <p className="flex items-center gap-2 truncate"><Mail size={12} className="text-slate-400" /> {item.email}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Venda: {item.saleNumber || '--'}</span>
                                    <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-teal-600"/> {item.exclusivityRadiusKm ? `${item.exclusivityRadiusKm}km` : 'S/ Exclusividade'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] relative z-0">
                <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                    {franchises.filter(f => f.latitude && f.longitude).map(f => {
                        const lat = parseFloat(f.latitude);
                        const lng = parseFloat(f.longitude);
                        const radiusKm = parseFloat(f.exclusivityRadiusKm || '0');
                        
                        return (
                            <React.Fragment key={f.id}>
                                <Marker position={[lat, lng]}>
                                    <Popup>
                                        <div className="p-1">
                                            <h4 className="font-bold text-slate-800">{f.franchiseeName}</h4>
                                            <p className="text-xs text-slate-500">{f.commercialCity}/{f.commercialState}</p>
                                            <p className="text-[10px] font-bold text-teal-600 uppercase mt-1">{f.studioStatus}</p>
                                            {radiusKm > 0 && <p className="text-[9px] text-indigo-500 font-black mt-0.5">ZONA DE EXCLUSIVIDADE: {radiusKm}KM</p>}
                                        </div>
                                    </Popup>
                                </Marker>
                                {radiusKm > 0 && (
                                    <Circle 
                                        center={[lat, lng]} 
                                        radius={radiusKm * 1000} 
                                        pathOptions={{ 
                                            fillColor: '#0d9488', 
                                            fillOpacity: 0.15, 
                                            color: '#0d9488', 
                                            weight: 1.5,
                                            dashArray: '5, 10'
                                        }} 
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </MapContainer>
                <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-lg max-w-xs">
                    <p className="text-xs text-slate-600 font-medium">Exibindo {franchises.filter(f => f.latitude && f.longitude).length} unidades. Círculos tracejados indicam a <strong>Zona de Exclusividade Territorial</strong>.</p>
                </div>
            </div>
        )}

        {/* MODAL FORM */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Ficha da Unidade' : 'Cadastro de Nova Unidade'}</h3>
                            <p className="text-sm text-slate-500">Gestão documental e técnica da franquia.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                    </div>

                    <div className="flex bg-slate-100 px-8 py-2 gap-2 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('dados')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'dados' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <User size={14}/> Franqueado e Venda
                        </button>
                        <button onClick={() => setActiveTab('local')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'local' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <MapPin size={14}/> Localização e Mapeamento
                        </button>
                        <button onClick={() => setActiveTab('studio')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === 'studio' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}>
                            <Building size={14}/> Dados do Studio e Financeiro
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        {activeTab === 'dados' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nº Venda</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 font-mono" value={formData.saleNumber} onChange={e => handleInputChange('saleNumber', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome do Franqueado *</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={formData.franchiseeName} onChange={e => handleInputChange('franchiseeName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CPF</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CNPJ</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Razão Social</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail</label>
                                    <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Consultor de Venda</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.salesConsultant} onChange={e => handleInputChange('salesConsultant', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Início Contrato</label>
                                    <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.contractStartDate} onChange={e => handleInputChange('contractStartDate', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Término Contrato</label>
                                    <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.contractEndDate} onChange={e => handleInputChange('contractEndDate', e.target.value)} />
                                </div>
                                <div className="flex items-center pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border w-full">
                                        <input type="checkbox" className="w-5 h-5 rounded text-teal-600" checked={formData.hasSignedContract} onChange={e => handleInputChange('hasSignedContract', e.target.checked)} />
                                        <span className="text-xs font-bold text-slate-700 uppercase">Contrato Assinado?</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'local' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Estado (UF)</label>
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.commercialState} onChange={e => handleInputChange('commercialState', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cidade</label>
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50" value={formData.commercialCity} onChange={e => handleInputChange('commercialCity', e.target.value)} disabled={!formData.commercialState || isLoadingCities}>
                                            <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                                            {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bairro</label>
                                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.commercialNeighborhood} onChange={e => handleInputChange('commercialNeighborhood', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Endereço do Studio</label>
                                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.commercialAddress} onChange={e => handleInputChange('commercialAddress', e.target.value)} />
                                    </div>
                                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 md:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-amber-700 uppercase flex items-center gap-2 mb-2"><Navigation size={14}/> Coordenadas Geográficas</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">Latitude</label><input type="text" placeholder="-23.5505" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.latitude} onChange={e => handleInputChange('latitude', e.target.value)} /></div>
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">Longitude</label><input type="text" placeholder="-46.6333" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.longitude} onChange={e => handleInputChange('longitude', e.target.value)} /></div>
                                            </div>
                                            <p className="text-[10px] text-amber-600 leading-relaxed"><Info size={10} className="inline mr-1"/> Use coordenadas decimais para exibir a unidade no mapa.</p>
                                        </div>
                                        
                                        <div className="space-y-4 bg-white/50 p-4 rounded-xl border border-amber-200">
                                            <h4 className="text-xs font-black text-indigo-700 uppercase flex items-center gap-2 mb-2"><ShieldCheck size={16}/> Regras de Zoneamento</h4>
                                            <div>
                                                <label className="block text-[10px] font-bold text-indigo-600 mb-1">Raio de Exclusividade Territorial (Km)</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.1" 
                                                        placeholder="Ex: 5" 
                                                        className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white font-bold text-indigo-900" 
                                                        value={formData.exclusivityRadiusKm} 
                                                        onChange={e => handleInputChange('exclusivityRadiusKm', e.target.value)} 
                                                    />
                                                    <span className="text-xs font-bold text-indigo-400">KM</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-indigo-500 leading-relaxed italic">Este valor será plotado no mapa para análise visual de sobreposição entre franqueados.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-amber-700 uppercase flex items-center gap-2 mb-2"><Ruler size={14}/> Distâncias Estratégicas</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">KM Ponto de Rua</label><input type="text" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.kmStreetPoint} onChange={e => handleInputChange('kmStreetPoint', e.target.value)} /></div>
                                                <div><label className="block text-[10px] font-bold text-amber-600 mb-1">KM Prédio Comercial</label><input type="text" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" value={formData.kmCommercialBuilding} onChange={e => handleInputChange('kmCommercialBuilding', e.target.value)} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'studio' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-2">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2"><Building size={16}/> Estrutura</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status Studio</label>
                                            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={formData.studioStatus} onChange={e => handleInputChange('studioStatus', e.target.value)}>
                                                <option value="Ativo">Ativo</option>
                                                <option value="Em implantação">Em implantação</option>
                                                <option value="Distrato">Distrato</option>
                                            </select>
                                        </div>
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Área (M²)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.studioSizeM2} onChange={e => handleInputChange('studioSizeM2', e.target.value)} /></div>
                                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Lista de Equipamentos</label><textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={formData.equipmentList} onChange={e => handleInputChange('equipmentList', e.target.value)} placeholder="Descreva os aparelhos inclusos..." /></div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2"><DollarSign size={16}/> Financeiro e Outros</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Royalties (R$)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-teal-700" value={formData.royaltiesValue} onChange={e => handleInputChange('royaltiesValue', e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Inauguração</label><input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.inaugurationDate} onChange={e => handleInputChange('inaugurationDate', e.target.value)} /></div>
                                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Dados Bancários / Cobrança</label><textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none font-mono text-[11px]" value={formData.bankAccountInfo} onChange={e => handleInputChange('bankAccountInfo', e.target.value)} /></div>
                                        <div className="col-span-2 space-y-3 pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition-colors"><input type="checkbox" className="w-4 h-4 rounded text-teal-600" checked={formData.isRepresentative} onChange={e => handleInputChange('isRepresentative', e.target.checked)} /><span className="text-xs font-bold text-slate-700 uppercase">É Representante Regional?</span></label>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sócios e Pastas Cloud</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sócio 1</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.partner1Name} onChange={e => handleInputChange('partner1Name', e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sócio 2</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.partner2Name} onChange={e => handleInputChange('partner2Name', e.target.value)} /></div>
                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link Pasta Franqueado (Docs)</label><div className="relative"><Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/><input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white text-blue-600 underline" value={formData.franchiseeFolderLink} onChange={e => handleInputChange('franchiseeFolderLink', e.target.value)} placeholder="Link do Drive" /></div></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 shrink-0 border-t">
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                            <AlertCircle size={14}/>
                            <span>Preencha as coordenadas e o raio de exclusividade para mapeamento técnico.</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {formData.id ? 'Salvar Alterações' : 'Cadastrar Franquia'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
