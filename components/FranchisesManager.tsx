
import React, { useState, useEffect } from 'react';
import { 
  Store, Plus, Search, MoreVertical, MapPin, Phone, Mail, 
  ArrowLeft, Save, X, Edit2, Trash2, Loader2, Calendar, FileText, 
  DollarSign, User, Building2, Map as MapIcon, List,
  Navigation, AlertTriangle, CheckCircle, Briefcase, Info
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';

export interface Franchise {
  id: string; saleNumber: string; contractStartDate: string; inaugurationDate: string; salesConsultant: string; franchiseeName: string; cpf: string; companyName: string; cnpj: string; phone: string; email: string; residentialAddress: string; commercialState: string; commercialCity: string; commercialAddress: string; commercialNeighborhood: string; latitude: string; longitude: string; kmStreetPoint: string; kmCommercialBuilding: string; studioStatus: string; studioSizeM2: string; equipmentList: string; royaltiesValue: string; bankAccountInfo: string; hasSignedContract: boolean; contractEndDate: string; isRepresentative: boolean; partner1Name: string; partner2Name: string; franchiseeFolderLink: string; pathInfo: string; observations: string;
}

export const FranchisesManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState: Franchise = {
      id: '', saleNumber: '', contractStartDate: '', inaugurationDate: '', salesConsultant: '', franchiseeName: '', cpf: '', companyName: '', cnpj: '', phone: '', email: '', residentialAddress: '', commercialState: '', commercialCity: '', commercialAddress: '', commercialNeighborhood: '', latitude: '', longitude: '', kmStreetPoint: '', kmCommercialBuilding: '', studioStatus: 'Em implantação', studioSizeM2: '', equipmentList: '', royaltiesValue: '', bankAccountInfo: '', hasSignedContract: false, contractEndDate: '', isRepresentative: false, partner1Name: '', partner2Name: '', franchiseeFolderLink: '', pathInfo: '', observations: ''
  };

  const [formData, setFormData] = useState<Franchise>(initialFormState);

  useEffect(() => { fetchFranchises(); }, []);

  const fetchFranchises = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client.from('crm_franchises').select('*').order('franchisee_name', { ascending: true });
          if (error) throw error;
          setFranchises((data || []).map((d: any) => ({
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
              kmStreetPoint: d.km_street_point?.toString() || '', 
              kmCommercialBuilding: d.km_commercial_building?.toString() || '', 
              studioStatus: d.studio_status || 'Em implantação', 
              studioSizeM2: d.studio_size_m2 || '', 
              equipmentList: d.equipment_list || '', 
              royaltiesValue: d.royalties_value || '', 
              bankAccountInfo: d.bank_account_info || '', 
              hasSignedContract: d.has_signed_contract || false, 
              contractEndDate: d.contract_end_date || '', 
              isRepresentative: d.is_representative || false, 
              partner1Name: d.partner_1_name || '', 
              partner2Name: d.partner_2_name || '', 
              franchiseeFolderLink: d.franchisee_folder_link || '', 
              pathInfo: d.path_info || '', 
              observations: d.observations || ''
          })));
      } catch (e: any) {
          console.error("Erro ao buscar franquias:", e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSave = async () => {
      if (!formData.franchiseeName) { alert("Nome do franqueado é obrigatório."); return; }
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
          if (formData.id) await appBackend.client.from('crm_franchises').update(payload).eq('id', formData.id);
          else await appBackend.client.from('crm_franchises').insert([payload]);
          await fetchFranchises(); setShowModal(false);
      } catch (e: any) { alert(`Erro ao salvar: ${e.message}`); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Deseja realmente excluir esta franquia?")) {
          try {
              await appBackend.client.from('crm_franchises').delete().eq('id', id);
              fetchFranchises();
          } catch(e: any) { alert(`Erro: ${e.message}`); }
      }
  };

  const filtered = franchises.filter(f => 
      (f.franchiseeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Store className="text-teal-600" /> Franquias</h2>
            </div>
            <button onClick={() => { setFormData(initialFormState); setShowModal(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Nova Franquia</button>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar por franqueado ou empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring