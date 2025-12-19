
import React, { useState, useEffect } from 'react';
import { 
  Store, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, Calendar, FileText, 
  CheckSquare, DollarSign, User, Building, Paperclip, Briefcase, Map as MapIcon, List,
  Navigation, AlertTriangle, CheckCircle, Building2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import * as L from 'leaflet';

// Fix for default Leaflet marker icon missing in some build environments
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const PotentialIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// --- Types ---
export interface Franchise {
  id: string;
  saleNumber: string;
  contractStartDate: string;
  inaugurationDate: string;
  salesConsultant: string;
  franchiseeName: string;
  cpf: string;
  companyName: string;
  cnpj: string;
  phone: string;
  email: string;
  residentialAddress: string;
  commercialState: string;
  commercialCity: string;
  commercialAddress: string;
  commercialNeighborhood: string;
  latitude: string;
  longitude: string;
  kmStreetPoint: string;
  kmCommercialBuilding: string;
  studioStatus: string;
  studioSizeM2: string;
  equipmentList: string;
  royaltiesValue: string;
  bankAccountInfo: string;
  hasSignedContract: boolean;
  contractEndDate: string;
  isRepresentative: boolean;
  partner1Name: string;
  partner2Name: string;
  franchiseeFolderLink: string;
  pathInfo: string;
  observations: string;
}

interface FranchisesManagerProps {
  onBack: () => void;
}

const MapFlyTo = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 14);
    }, [center, map]);
    return null;
};

export const FranchisesManager: React.FC<FranchisesManagerProps> = ({ onBack }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [potentialLocation, setPotentialLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [conflicts, setConflicts] = useState<{ name: string, distance: number }[]>([]);

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
          if (error) throw error;
          setFranchises((data || []).map((d: any) => ({
              id: d.id, saleNumber: d.sale_number, contractStartDate: d.contract_start_date, inauguration_date: d.inauguration_date, salesConsultant: d.sales_consultant, franchiseeName: d.franchisee_name, cpf: d.cpf, companyName: d.company_name, cnpj: d.cnpj, phone: d.phone, email: d.email, residentialAddress: d.residential_address, commercialState: d.commercial_state, commercialCity: d.commercial_city, commercialAddress: d.commercial_address, commercialNeighborhood: d.commercial_neighborhood, latitude: d.latitude, longitude: d.longitude, kmStreetPoint: d.km_street_point, kmCommercialBuilding: d.km_commercial_building, studioStatus: d.studio_status, studioSizeM2: d.studio_size_m2, equipmentList: d.equipment_list, royaltiesValue: d.royalties_value, bankAccountInfo: d.bank_account_info, hasSignedContract: d.has_signed_contract, contractEndDate: d.contract_end_date, isRepresentative: d.is_representative, partner1Name: d.partner_1_name, partner2Name: d.partner_2_name, franchiseeFolderLink: d.franchisee_folder_link, pathInfo: d.path_info, observations: d.observations
          })));
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
      if (!formData.franchiseeName) { alert("Nome do franqueado é obrigatório."); return; }
      setIsSaving(true);
      const payload = {
          sale_number: formData.saleNumber, contract_start_date: formData.contractStartDate || null, inauguration_date: formData.inaugurationDate || null, sales_consultant: formData.salesConsultant, franchisee_name: formData.franchiseeName, cpf: formData.cpf, company_name: formData.companyName, cnpj: formData.cnpj, phone: formData.phone, email: formData.email, residential_address: formData.residentialAddress, commercial_state: formData.commercialState, commercial_city: formData.commercialCity, commercial_address: formData.commercialAddress, commercial_neighborhood: formData.commercialNeighborhood, latitude: formData.latitude, longitude: formData.longitude, km_street_point: formData.kmStreetPoint, km_commercial_building: formData.kmCommercialBuilding, studio_status: formData.studioStatus, studio_size_m2: formData.studioSizeM2, equipment_list: formData.equipmentList, royalties_value: formData.royaltiesValue, bank_account_info: formData.bankAccountInfo, has_signed_contract: formData.hasSignedContract, contract_end_date: formData.contractEndDate || null, is_representative: formData.isRepresentative, partner_1_name: formData.partner1Name, partner_2_name: formData.partner2Name, franchisee_folder_link: formData.franchiseeFolderLink, path_info: formData.pathInfo, observations: formData.observations
      };
      try {
          const isUpdate = !!formData.id;
          if (isUpdate) {
              await appBackend.client.from('crm_franchises').update(payload).eq('id', formData.id);
              await appBackend.logActivity({ action: 'update', module: 'franchises', details: `Editou unidade franqueada: ${formData.franchiseeName}`, recordId: formData.id });
          } else {
              const { data } = await appBackend.client.from('crm_franchises').insert([payload]).select().single();
              await appBackend.logActivity({ action: 'create', module: 'franchises', details: `Cadastrou nova unidade franqueada: ${formData.franchiseeName}`, recordId: data?.id });
          }
          await fetchFranchises();
          setShowModal(false);
          setFormData(initialFormState);
      } catch (e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
      const target = franchises.find(f => f.id === id);
      if(window.confirm("Excluir esta franquia?")) {
          await appBackend.client.from('crm_franchises').delete().eq('id', id);
          await appBackend.logActivity({ action: 'delete', module: 'franchises', details: `Excluiu unidade franqueada: ${target?.franchiseeName}`, recordId: id });
          fetchFranchises();
      }
  };

  const handleEdit = (item: Franchise) => { setFormData({ ...item }); setShowModal(true); setActiveMenuId(null); };

  // Fix: Adding handleInputChange which was used in JSX but not defined
  const handleInputChange = (field: keyof Franchise, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1); 
    const dLon = deg2rad(lon2 - lon1); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };
  const deg2rad = (deg: number) => deg * (Math.PI/180);

  const handleAddressSearch = async () => {
      if (!mapSearchQuery) return;
      setIsSearchingMap(true); setPotentialLocation(null); setConflicts([]);
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&countrycodes=br&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon);
              setPotentialLocation({ lat, lng });
              const conflictsFound: { name: string, distance: number }[] = [];
              mapFranchises.forEach(f => {
                  const fLat = parseFloat(f.latitude); const fLng = parseFloat(f.longitude);
                  if (!isNaN(fLat) && !isNaN(fLng)) {
                      const dist = getDistanceFromLatLonInKm(lat, lng, fLat, fLng);
                      if (dist < 1.0) conflictsFound.push({ name: f.franchiseeName, distance: dist });
                  }
              });
              setConflicts(conflictsFound);
          } else { alert("Endereço não encontrado."); }
      } catch (e) { alert("Erro ao buscar endereço."); } finally { setIsSearchingMap(false); }
  };

  const filtered = franchises.filter(f => f.franchiseeName.toLowerCase().includes(searchTerm.toLowerCase()) || f.commercialCity.toLowerCase().includes(searchTerm.toLowerCase()));
  const mapFranchises = filtered.filter(f => !isNaN(parseFloat(f.latitude)) && !isNaN(parseFloat(f.longitude)));
  const mapCenter: [number, number] = mapFranchises.length > 0 ? [mapFranchises.reduce((acc, f) => acc + parseFloat(f.latitude), 0) / mapFranchises.length, mapFranchises.reduce((acc, f) => acc + parseFloat(f.longitude), 0) / mapFranchises.length] : [-14.235, -51.925];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20 h-full flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Store className="text-teal-600" /> Gestão de Franquias</h2><p className="text-slate-500 text-sm">Controle de unidades franqueadas e implantação.</p></div>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                    <button onClick={() => setViewMode('list')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><List size={16} /> Lista</button>
                    <button onClick={() => setViewMode('map')} className={clsx("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'map' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><MapIcon size={16} /> Mapa</button>
                </div>
                <button onClick={() => { setFormData(initialFormState); setShowModal(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Nova Franquia</button>
            </div>
        </div>
        {viewMode === 'list' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por franqueado ou cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"/>
                </div>
            </div>
        )}
        <div className="flex-1 overflow-hidden relative min-h-[500px]">
            {viewMode === 'list' && (
                <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {isLoading ? (<div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" size={32} /></div>) : filtered.length === 0 ? (<div className="col-span-full text-center py-12 text-slate-400">Nenhuma franquia encontrada.</div>) : (
                            filtered.map(item => (
                                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-3"><span className={clsx("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide", item.studioStatus === 'Ativo' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>{item.studioStatus || 'Status N/A'}</span><div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 franchise-menu-btn"><MoreVertical size={18} /></button>
                                        {activeMenuId === item.id && (<div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"><button onClick={() => handleEdit(item)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12} /> Editar</button><button onClick={() => handleDelete(item.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Excluir</button></div>)}</div></div>
                                        <h3 className="font-bold text-slate-800 text-lg mb-1">{item.franchiseeName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4"><MapPin size={12} /> {item.commercialCity}/{item.commercialState}</div>
                                        <div className="space-y-2 text-sm text-slate-600"><div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {item.phone || '-'}</div><div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {item.email || '-'}</div></div>
                                    </div>
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs text-slate-500"><span>Venda: {item.saleNumber}</span><span>{item.contractStartDate ? new Date(item.contractStartDate).toLocaleDateString() : 'S/ Data'}</span></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {viewMode === 'map' && (
                <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
                    <div className="absolute top-4 left-4 z-[1000] w-full max-w-sm flex flex-col gap-2"><div className="bg-white rounded-lg shadow-lg border border-slate-200 flex items-center p-1"><div className="pl-3 text-slate-400"><Search size={18} /></div><input type="text" className="w-full px-3 py-2 outline-none text-sm text-slate-700 bg-transparent" placeholder="Verificar nova localização (Endereço)" value={mapSearchQuery} onChange={(e) => setMapSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}/>{mapSearchQuery && (<button onClick={() => {setMapSearchQuery(''); setPotentialLocation(null); setConflicts([]);}} className="p-2 text-slate-400 hover:text-slate-600"><X size={16} /></button>)}<button onClick={handleAddressSearch} disabled={isSearchingMap || !mapSearchQuery} className="bg-teal-600 hover:bg-teal-700 text-white rounded p-2 m-1 transition-colors disabled:opacity-50">{isSearchingMap ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}</button></div>
                    {potentialLocation && (<div className={clsx("rounded-lg shadow-lg border p-4 text-sm animate-in slide-in-from-top-2", conflicts.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800")}><div className="flex items-center gap-2 mb-1 font-bold">{conflicts.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}{conflicts.length > 0 ? "Conflito de Raio Detectado!" : "Localização Disponível"}</div><p className="text-xs opacity-90">{conflicts.length > 0 ? `Esta localização invade o raio de 1km de: ${conflicts.map(c => `${c.name} (${c.distance.toFixed(2)}km)`).join(', ')}` : "Nenhum conflito com franquias existentes num raio de 1km."}</p></div>)}</div>
                    {mapFranchises.length === 0 && !potentialLocation ? (<div className="flex flex-col items-center justify-center h-full bg-slate-50"><MapPin size={48} className="text-slate-300 mb-2" /><p className="text-slate-500">Nenhuma franquia com coordenadas encontrada.</p><p className="text-xs text-slate-400">Edite as franquias para adicionar latitude/longitude.</p></div>) : (
                        <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                            {mapFranchises.map(f => { const lat = parseFloat(f.latitude); const lng = parseFloat(f.longitude); return (<React.Fragment key={f.id}><Marker position={[lat, lng]}><Popup><div className="text-sm"><strong className="block text-slate-800 text-base mb-1">{f.franchiseeName}</strong><p className="text-slate-600 mb-1">{f.commercialCity} / {f.commercialState}</p><span className={clsx("inline-block px-2 py-0.5 rounded text-[10px] font-bold", f.studioStatus === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>{f.studioStatus}</span></div></Popup></Marker><Circle center={[lat, lng]} radius={1000} pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.1 }} /></React.Fragment>); })}
                            {potentialLocation && (<React.Fragment><MapFlyTo center={[potentialLocation.lat, potentialLocation.lng]} /><Marker position={[potentialLocation.lat, potentialLocation.lng]} icon={PotentialIcon}><Popup>Nova Localização</Popup></Marker><Circle center={[potentialLocation.lat, potentialLocation.lng]} radius={1000} pathOptions={{ color: conflicts.length > 0 ? '#ef4444' : '#8b5cf6', fillColor: conflicts.length > 0 ? '#ef4444' : '#8b5cf6', fillOpacity: 0.2, dashArray: '5, 5' }} /></React.Fragment>)}
                        </MapContainer>
                    )}
                </div>
            )}
        </div>
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0"><div><h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Franquia' : 'Cadastro de Franquia'}</h3><p className="text-sm text-slate-500">Dados cadastrais da unidade e do franqueado.</p></div><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    <section><h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Briefcase size={16} /> Dados da Venda</h4><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label className="block text-xs font-semibold text-slate-600 mb-1">NÚMERO DA VENDA</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.saleNumber} onChange={e => handleInputChange('saleNumber', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Início Contrato</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.contractStartDate} onChange={e => handleInputChange('contractStartDate', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Data Inauguração</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.inaugurationDate} onChange={e => handleInputChange('inaugurationDate', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Consultor Resp.</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.salesConsultant} onChange={e => handleInputChange('salesConsultant', e.target.value)} /></div></div></section>
                    <section><h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><User size={16} /> Identificação e Contato</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div className="lg:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">NOME FRANQUEADO</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.franchiseeName} onChange={e => handleInputChange('franchiseeName', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">CPF</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => handleInputChange('cnpj', e.target.value)} /></div><div className="lg:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label><input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} /></div><div className="lg:col-span-4"><label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Residencial</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.residentialAddress} onChange={e => handleInputChange('residentialAddress', e.target.value)} /></div></div></section>
                </div>
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100"><button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button><button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Franquia</button></div>
            </div></div>
        )}
    </div>
  );
};
