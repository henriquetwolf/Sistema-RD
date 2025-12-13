import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MoreVertical, User, 
  Mail, ArrowLeft, Save, Briefcase, Edit2, Trash2,
  MapPin, FileText, DollarSign, Heart, Bus, AlertCircle, Phone, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { appBackend } from '../services/appBackend';

// --- Types ---
export interface Collaborator {
  id: string;
  // Pessoal
  fullName: string;
  socialName: string;
  birthDate: string;
  maritalStatus: string;
  spouseName: string;
  fatherName: string;
  motherName: string;
  genderIdentity: string;
  racialIdentity: string;
  educationLevel: string;
  photoUrl: string;
  
  // Contato & Endereço
  email: string;
  phone: string;
  cellphone: string;
  corporatePhone: string;
  operator: string; // Operadora
  address: string;
  cep: string;
  complement: string;
  
  birthState: string; // Novo
  birthCity: string; // Cidade Natal
  
  state: string; // Novo UF Atual
  currentCity: string; // Cidade Atual
  
  emergencyName: string;
  emergencyPhone: string;

  // Contratual
  admissionDate: string;
  previousAdmissionDate: string; // Contrato anterior
  role: string; // Cargo
  headquarters: string; // Sede
  department: string; // Setor
  salary: string;
  hiringMode: string; // Modalidade
  hiringCompany: string; // Empresa Contratante
  workHours: string;
  breakTime: string;
  workDays: string;
  presentialDays: string;
  superiorId: string;
  experiencePeriod: string;
  hasOtherJob: string; // Outro vinculo?
  status: 'active' | 'inactive';
  contractType: string; // Contrato/Pagamento

  // Documentação
  cpf: string;
  rg: string;
  rgIssuer: string;
  rgIssueDate: string;
  rgState: string;
  ctpsNumber: string;
  ctpsSeries: string;
  ctpsState: string;
  ctpsIssueDate: string;
  pisNumber: string;
  reservistNumber: string;
  docsFolderLink: string;
  legalAuth: boolean; // Autorizo arquivamento...

  // Financeiro & Benefícios
  bankAccountInfo: string;
  hasInsalubrity: string;
  insalubrityPercent: string;
  hasDangerPay: string; // Periculosidade
  transportVoucherInfo: string; // Vale Deslocamento/Combustível
  busLineHomeWork: string;
  busQtyHomeWork: string;
  busLineWorkHome: string;
  busQtyWorkHome: string;
  ticketValue: string;
  fuelVoucherValue: string;
  hasMealVoucher: string; // Refeição
  hasFoodVoucher: string; // Alimentação
  hasHomeOfficeAid: string;
  hasHealthPlan: string;
  hasDentalPlan: string;
  bonusInfo: string; // Regras, Período
  bonusValue: string;
  commissionInfo: string; // Regras
  commissionPercent: string;

  // Dependentes (Simplificado para 1, expansível em banco relacional)
  hasDependents: string;
  dependentName: string;
  dependentDob: string;
  dependentKinship: string;
  dependentCpf: string;

  // Desligamento & Outros
  resignationDate: string;
  demissionReason: string; // Motivo 2a data ou demissao
  demissionDocs: string;
  vacationPeriods: string;
  observations: string; // Anexos/Obs
}

// --- Mock Data (Initial structure only) ---
export const MOCK_COLLABORATORS: Collaborator[] = [];

const DEPARTMENTS = ['Comercial', 'Marketing', 'Financeiro', 'Web / TI', 'Suporte', 'Logística', 'RH', 'Diretoria'];
const HEADQUARTERS = ['Matriz - SP', 'Filial - RS', 'Filial - MG', 'Home Office Total'];

interface CollaboratorsManagerProps {
  onBack: () => void;
}

export const CollaboratorsManager: React.FC<CollaboratorsManagerProps> = ({ onBack }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // IBGE State
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [currentCities, setCurrentCities] = useState<IBGECity[]>([]);
  const [birthCities, setBirthCities] = useState<IBGECity[]>([]);
  
  // Actions State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Empty State Generator
  const getEmptyCollaborator = (): Collaborator => ({
      id: '', fullName: '', socialName: '', birthDate: '', maritalStatus: '', spouseName: '', fatherName: '', motherName: '', genderIdentity: '', racialIdentity: '', educationLevel: '', photoUrl: '',
      email: '', phone: '', cellphone: '', corporatePhone: '', operator: '', address: '', cep: '', complement: '', birthState: '', birthCity: '', currentCity: '', state: '', emergencyName: '', emergencyPhone: '',
      admissionDate: '', previousAdmissionDate: '', role: '', headquarters: '', department: '', salary: '', hiringMode: '', hiringCompany: '', workHours: '', breakTime: '', workDays: '', presentialDays: '', superiorId: '', experiencePeriod: '', hasOtherJob: '', status: 'active', contractType: '',
      cpf: '', rg: '', rgIssuer: '', rgIssueDate: '', rgState: '', ctpsNumber: '', ctpsSeries: '', ctpsState: '', ctpsIssueDate: '', pisNumber: '', reservistNumber: '', docsFolderLink: '', legalAuth: false,
      bankAccountInfo: '', hasInsalubrity: '', insalubrityPercent: '', hasDangerPay: '', transportVoucherInfo: '', busLineHomeWork: '', busQtyHomeWork: '', busLineWorkHome: '', busQtyWorkHome: '', ticketValue: '', fuelVoucherValue: '', hasMealVoucher: '', hasFoodVoucher: '', hasHomeOfficeAid: '', hasHealthPlan: '', hasDentalPlan: '', bonusInfo: '', bonusValue: '', commissionInfo: '', commissionPercent: '',
      hasDependents: '', dependentName: '', dependentDob: '', dependentKinship: '', dependentCpf: '',
      resignationDate: '', demissionReason: '', demissionDocs: '', vacationPeriods: '', observations: ''
  });

  const [formData, setFormData] = useState<Collaborator>(getEmptyCollaborator());

  useEffect(() => {
      fetchCollaborators();
      ibgeService.getStates().then(setStates);
  }, []);

  const fetchCollaborators = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_collaborators')
              .select('*')
              .order('full_name', { ascending: true });

          if (error) throw error;

          const mapped: Collaborator[] = (data || []).map((d: any) => ({
              id: d.id,
              fullName: d.full_name,
              socialName: d.social_name || '',
              birthDate: d.birth_date,
              maritalStatus: d.marital_status,
              spouseName: d.spouse_name,
              fatherName: d.father_name,
              motherName: d.mother_name,
              genderIdentity: d.gender_identity,
              racialIdentity: d.racial_identity,
              educationLevel: d.education_level,
              photoUrl: d.photo_url,
              email: d.email,
              phone: d.phone,
              cellphone: d.cellphone,
              corporatePhone: d.corporate_phone,
              operator: d.operator,
              address: d.address,
              cep: d.cep,
              complement: d.complement,
              birthState: d.birth_state,
              birthCity: d.birth_city,
              state: d.state,
              currentCity: d.current_city,
              emergencyName: d.emergency_name,
              emergencyPhone: d.emergency_phone,
              admissionDate: d.admission_date,
              previousAdmissionDate: d.previous_admission_date,
              role: d.role,
              headquarters: d.headquarters,
              department: d.department,
              salary: d.salary,
              hiringMode: d.hiring_mode,
              hiringCompany: d.hiring_company,
              workHours: d.work_hours,
              breakTime: d.break_time,
              workDays: d.work_days,
              presentialDays: d.presential_days,
              superiorId: d.superior_id,
              experiencePeriod: d.experience_period,
              hasOtherJob: d.has_other_job,
              status: d.status,
              contractType: d.contract_type,
              cpf: d.cpf,
              rg: d.rg,
              rgIssuer: d.rg_issuer,
              rgIssueDate: d.rg_issue_date,
              rgState: d.rg_state,
              ctpsNumber: d.ctps_number,
              ctpsSeries: d.ctps_series,
              ctpsState: d.ctps_state,
              ctpsIssueDate: d.ctps_issue_date,
              pisNumber: d.pis_number,
              reservistNumber: d.reservist_number,
              docsFolderLink: d.docs_folder_link,
              legalAuth: d.legal_auth,
              bankAccountInfo: d.bank_account_info,
              hasInsalubrity: d.has_insalubrity,
              insalubrityPercent: d.insalubrity_percent,
              hasDangerPay: d.has_danger_pay,
              transportVoucherInfo: d.transport_voucher_info,
              busLineHomeWork: d.bus_line_home_work,
              busQtyHomeWork: d.bus_qty_home_work,
              busLineWorkHome: d.bus_line_work_home,
              busQtyWorkHome: d.bus_qty_work_home,
              ticketValue: d.ticket_value,
              fuelVoucherValue: d.fuel_voucher_value,
              hasMealVoucher: d.has_meal_voucher,
              hasFoodVoucher: d.has_food_voucher,
              hasHomeOfficeAid: d.has_home_office_aid,
              hasHealthPlan: d.has_health_plan,
              hasDentalPlan: d.has_dental_plan,
              bonusInfo: d.bonus_info,
              bonusValue: d.bonus_value,
              commissionInfo: d.commission_info,
              commissionPercent: d.commission_percent,
              hasDependents: d.has_dependents,
              dependentName: d.dependent_name,
              dependentDob: d.dependent_dob,
              dependentKinship: d.dependent_kinship,
              dependentCpf: d.dependent_cpf,
              resignationDate: d.resignation_date,
              demissionReason: d.demission_reason,
              demissionDocs: d.demission_docs,
              vacationPeriods: d.vacation_periods,
              observations: d.observations
          }));

          setCollaborators(mapped);
      } catch (e: any) {
          console.error("Erro ao carregar colaboradores:", e);
      } finally {
          setIsLoading(false);
      }
  };

  // Fetch cities when state changes (Current Address)
  useEffect(() => {
      if (formData.state) {
          ibgeService.getCities(formData.state).then(setCurrentCities);
      } else {
          setCurrentCities([]);
      }
  }, [formData.state]);

  // Fetch cities when state changes (Birth City)
  useEffect(() => {
      if (formData.birthState) {
          ibgeService.getCities(formData.birthState).then(setBirthCities);
      } else {
          setBirthCities([]);
      }
  }, [formData.birthState]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.actions-menu-btn') === null) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!formData.fullName) {
        alert("O Nome Completo é obrigatório.");
        return;
    }

    setIsSaving(true);

    const payload = {
        full_name: formData.fullName,
        social_name: formData.socialName,
        birth_date: formData.birthDate || null,
        marital_status: formData.maritalStatus,
        spouse_name: formData.spouseName,
        father_name: formData.fatherName,
        mother_name: formData.motherName,
        gender_identity: formData.genderIdentity,
        racial_identity: formData.racialIdentity,
        education_level: formData.educationLevel,
        photo_url: formData.photoUrl,
        email: formData.email,
        phone: formData.phone,
        cellphone: formData.cellphone,
        corporate_phone: formData.corporatePhone,
        operator: formData.operator,
        address: formData.address,
        cep: formData.cep,
        complement: formData.complement,
        birth_state: formData.birthState,
        birth_city: formData.birthCity,
        state: formData.state,
        current_city: formData.currentCity,
        emergency_name: formData.emergencyName,
        emergency_phone: formData.emergencyPhone,
        admission_date: formData.admissionDate || null,
        previous_admission_date: formData.previousAdmissionDate || null,
        role: formData.role,
        headquarters: formData.headquarters,
        department: formData.department,
        salary: formData.salary,
        hiring_mode: formData.hiringMode,
        hiring_company: formData.hiringCompany,
        work_hours: formData.workHours,
        break_time: formData.breakTime,
        work_days: formData.workDays,
        presential_days: formData.presentialDays,
        superior_id: formData.superiorId,
        experience_period: formData.experiencePeriod,
        has_other_job: formData.hasOtherJob,
        status: formData.status,
        contract_type: formData.contractType,
        cpf: formData.cpf,
        rg: formData.rg,
        rg_issuer: formData.rgIssuer,
        rg_issue_date: formData.rgIssueDate || null,
        rg_state: formData.rgState,
        ctps_number: formData.ctpsNumber,
        ctps_series: formData.ctpsSeries,
        ctps_state: formData.ctpsState,
        ctps_issue_date: formData.ctpsIssueDate || null,
        pis_number: formData.pisNumber,
        reservist_number: formData.reservistNumber,
        docs_folder_link: formData.docsFolderLink,
        legal_auth: formData.legalAuth,
        bank_account_info: formData.bankAccountInfo,
        has_insalubrity: formData.hasInsalubrity,
        insalubrity_percent: formData.insalubrityPercent,
        has_danger_pay: formData.hasDangerPay,
        transport_voucher_info: formData.transportVoucherInfo,
        bus_line_home_work: formData.busLineHomeWork,
        bus_qty_home_work: formData.busQtyHomeWork,
        bus_line_work_home: formData.busLineWorkHome,
        bus_qty_work_home: formData.busQtyWorkHome,
        ticket_value: formData.ticketValue,
        fuel_voucher_value: formData.fuelVoucherValue,
        has_meal_voucher: formData.hasMealVoucher,
        has_food_voucher: formData.hasFoodVoucher,
        has_home_office_aid: formData.hasHomeOfficeAid,
        has_health_plan: formData.hasHealthPlan,
        has_dental_plan: formData.hasDentalPlan,
        bonus_info: formData.bonusInfo,
        bonus_value: formData.bonusValue,
        commission_info: formData.commissionInfo,
        commission_percent: formData.commissionPercent,
        has_dependents: formData.hasDependents,
        dependent_name: formData.dependentName,
        dependent_dob: formData.dependentDob || null,
        dependent_kinship: formData.dependentKinship,
        dependent_cpf: formData.dependentCpf,
        resignation_date: formData.resignationDate || null,
        demission_reason: formData.demissionReason,
        demission_docs: formData.demissionDocs,
        vacation_periods: formData.vacationPeriods,
        observations: formData.observations
    };

    try {
        if (formData.id) {
            // Edit
            const { error } = await appBackend.client
                .from('crm_collaborators')
                .update(payload)
                .eq('id', formData.id);
            if (error) throw error;
        } else {
            // Create
            const { error } = await appBackend.client
                .from('crm_collaborators')
                .insert([payload]);
            if (error) throw error;
        }
        await fetchCollaborators();
        setShowModal(false);
    } catch (e: any) {
        console.error(e);
        alert(`Erro ao salvar: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleEdit = (c: Collaborator) => {
      setFormData({ ...c });
      setActiveMenuId(null);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm('Tem certeza que deseja remover este colaborador do banco de dados?')) {
          try {
              const { error } = await appBackend.client.from('crm_collaborators').delete().eq('id', id);
              if (error) throw error;
              fetchCollaborators();
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
      setActiveMenuId(null);
  };

  const openNewModal = () => {
      setFormData(getEmptyCollaborator());
      setShowModal(true);
  };

  const handleInputChange = (field: keyof Collaborator, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filtered = collaborators.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <Users className="text-blue-600" /> Gestão de Colaboradores
                </h2>
                <p className="text-slate-500 text-sm">Cadastro completo de RH e Departamento Pessoal.</p>
            </div>
        </div>
        <button 
            onClick={openNewModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por nome, email ou setor..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
         </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
        ) : (
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                    <th className="px-6 py-4">Nome / Cargo</th>
                    <th className="px-6 py-4">Setor</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Admissão</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum colaborador encontrado.</td>
                    </tr>
                )}
                {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors relative">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden">
                                    {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : c.fullName.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 whitespace-nowrap">{c.fullName}</p>
                                    <p className="text-xs text-slate-400">{c.role || 'Sem cargo'}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                <Briefcase size={14} className="text-slate-400" />
                                {c.department}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-xs">
                                <p className="flex items-center gap-1"><Mail size={10} /> {c.email}</p>
                                <p className="flex items-center gap-1 mt-1"><Phone size={10} /> {c.phone}</p>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            {c.admissionDate ? new Date(c.admissionDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                            <span className={clsx(
                                "px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                                c.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                            )}>
                                {c.status === 'active' ? 'Ativo' : 'Desligado'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === c.id ? null : c.id);
                                }}
                                className={clsx(
                                    "p-2 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 actions-menu-btn transition-colors",
                                    activeMenuId === c.id && "bg-slate-200 text-slate-600"
                                )}
                            >
                                <MoreVertical size={16} />
                            </button>
                            
                            {/* Actions Dropdown */}
                            {activeMenuId === c.id && (
                                <div className="absolute right-10 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <button 
                                        onClick={() => handleEdit(c)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <div className="h-px bg-slate-100 my-0"></div>
                                    <button 
                                        onClick={() => handleDelete(c.id)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        )}
      </div>

      {/* Modal - LARGE FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Ficha do Colaborador' : 'Admissão de Colaborador'}</h3>
                        <p className="text-sm text-slate-500">Preencha todos os dados para o e-Social e RH.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={24}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                    
                    {/* SECTION 1: IDENTIDADE */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <User size={16} /> Dados Pessoais e Identidade
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Social</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.socialName} onChange={e => handleInputChange('socialName', e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Nascimento</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.birthDate} onChange={e => handleInputChange('birthDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Civil</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.maritalStatus} onChange={e => handleInputChange('maritalStatus', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro">Solteiro(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Divorciado">Divorciado(a)</option>
                                    <option value="Viuvo">Viúvo(a)</option>
                                    <option value="Uniao">União Estável</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cônjuge</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.spouseName} onChange={e => handleInputChange('spouseName', e.target.value)} />
                            </div>

                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Mãe</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.motherName} onChange={e => handleInputChange('motherName', e.target.value)} />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Pai</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.fatherName} onChange={e => handleInputChange('fatherName', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Identidade de Gênero</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.genderIdentity} onChange={e => handleInputChange('genderIdentity', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="NaoBinario">Não-Binário</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Identificação Racial</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.racialIdentity} onChange={e => handleInputChange('racialIdentity', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="Branca">Branca</option>
                                    <option value="Preta">Preta</option>
                                    <option value="Parda">Parda</option>
                                    <option value="Amarela">Amarela</option>
                                    <option value="Indigena">Indígena</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Escolaridade</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.educationLevel} onChange={e => handleInputChange('educationLevel', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="Fundamental">Ensino Fundamental</option>
                                    <option value="Medio">Ensino Médio</option>
                                    <option value="Superior">Ensino Superior</option>
                                    <option value="Pos">Pós-Graduação/MBA</option>
                                </select>
                            </div>
                            <div className="lg:col-span-4">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cursos em andamento ou realizados</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-16" value={formData.observations} onChange={e => handleInputChange('observations', e.target.value)}></textarea>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ENDEREÇO & CONTATO */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <MapPin size={16} /> Endereço e Contato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cep} onChange={e => handleInputChange('cep', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Complemento</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.complement} onChange={e => handleInputChange('complement', e.target.value)} />
                            </div>
                            
                            {/* Cidade Atual (Seletor) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado (Atual)</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.state} onChange={e => handleInputChange('state', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1"> Cidade Atual</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" 
                                    value={formData.currentCity} 
                                    onChange={e => handleInputChange('currentCity', e.target.value)}
                                    disabled={!formData.state}
                                >
                                    <option value="">Selecione...</option>
                                    {currentCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>

                            {/* Cidade Natal (Seletor) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado (Natal)</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.birthState} onChange={e => handleInputChange('birthState', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade Natal</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" 
                                    value={formData.birthCity} 
                                    onChange={e => handleInputChange('birthCity', e.target.value)}
                                    disabled={!formData.birthState}
                                >
                                    <option value="">Selecione...</option>
                                    {birthCities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>
                            
                            {/* Contato */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Celular (Pessoal)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cellphone} onChange={e => handleInputChange('cellphone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Fixo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                                <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Contato de Emergência (Nome)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.emergencyName} onChange={e => handleInputChange('emergencyName', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone de Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.emergencyPhone} onChange={e => handleInputChange('emergencyPhone', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: DOCUMENTAÇÃO */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <FileText size={16} /> Documentação Civil
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">RG</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.rg} onChange={e => handleInputChange('rg', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Órgão Emissor</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.rgIssuer} onChange={e => handleInputChange('rgIssuer', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Emissão RG</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.rgIssueDate} onChange={e => handleInputChange('rgIssueDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">UF Emissão RG</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" maxLength={2} value={formData.rgState} onChange={e => handleInputChange('rgState', e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CTPS (Nº Carteira Trabalho)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.ctpsNumber} onChange={e => handleInputChange('ctpsNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Série CTPS</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.ctpsSeries} onChange={e => handleInputChange('ctpsSeries', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">UF CTPS</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" maxLength={2} value={formData.ctpsState} onChange={e => handleInputChange('ctpsState', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Emissão CTPS</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.ctpsIssueDate} onChange={e => handleInputChange('ctpsIssueDate', e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">PIS</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.pisNumber} onChange={e => handleInputChange('pisNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Reservista (Se houver)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.reservistNumber} onChange={e => handleInputChange('reservistNumber', e.target.value)} />
                            </div>
                            <div className="md:col-span-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <input type="checkbox" className="rounded text-blue-600" checked={formData.legalAuth} onChange={e => handleInputChange('legalAuth', e.target.checked)} />
                                    <span className="text-xs text-slate-700 leading-tight">Autorizo o arquivamento e uso dos dados junto aos Módulos: Sistema de Folha de Pagamento, Sindicato, Receita Federal, Previdência Social, CEF, E-Social e MTE.</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: CONTRATUAL */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Briefcase size={16} /> Dados Contratuais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Admissão</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.admissionDate} onChange={e => handleInputChange('admissionDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.role} onChange={e => handleInputChange('role', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Sede</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.headquarters} onChange={e => handleInputChange('headquarters', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {HEADQUARTERS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Setor</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.department} onChange={e => handleInputChange('department', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Salário</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="R$ 0,00" value={formData.salary} onChange={e => handleInputChange('salary', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Modalidade Contratação</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.hiringMode} onChange={e => handleInputChange('hiringMode', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="CLT">CLT</option>
                                    <option value="PJ">PJ</option>
                                    <option value="Estagio">Estágio</option>
                                    <option value="Temporario">Temporário</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa Contratante</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hiringCompany} onChange={e => handleInputChange('hiringCompany', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Contrato/Pagamento</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.contractType} onChange={e => handleInputChange('contractType', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Horário Trabalho</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.workHours} onChange={e => handleInputChange('workHours', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Intervalo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.breakTime} onChange={e => handleInputChange('breakTime', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Dias de Trabalho</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.workDays} onChange={e => handleInputChange('workDays', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Presenciais</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.presentialDays} onChange={e => handleInputChange('presentialDays', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Período de Experiência</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.experiencePeriod} onChange={e => handleInputChange('experiencePeriod', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">ID Superior</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.superiorId} onChange={e => handleInputChange('superiorId', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Outro Vínculo?</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.hasOtherJob} onChange={e => handleInputChange('hasOtherJob', e.target.value)}>
                                    <option value="Nao">Não</option>
                                    <option value="Sim">Sim</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Corporativo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.corporatePhone} onChange={e => handleInputChange('corporatePhone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Operadora</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.operator} onChange={e => handleInputChange('operator', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Admissão Contrato Ant.</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.previousAdmissionDate} onChange={e => handleInputChange('previousAdmissionDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">STATUS</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Desligado/Inativo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: BENEFÍCIOS & TRANSPORTE */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <DollarSign size={16} /> Financeiro e Benefícios
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Conta Bancária (Para Salário)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Banco, Agência, Conta..." value={formData.bankAccountInfo} onChange={e => handleInputChange('bankAccountInfo', e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Insalubridade?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasInsalubrity} onChange={e => handleInputChange('hasInsalubrity', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">% Insalubridade</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.insalubrityPercent} onChange={e => handleInputChange('insalubrityPercent', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Periculosidade</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasDangerPay} onChange={e => handleInputChange('hasDangerPay', e.target.value)} />
                            </div>

                            {/* Transporte */}
                            <div className="md:col-span-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2">
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Bus size={12}/> Vale Transporte</h5>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Linha (Residência &gt; Trabalho)</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.busLineHomeWork} onChange={e => handleInputChange('busLineHomeWork', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd Passagens</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.busQtyHomeWork} onChange={e => handleInputChange('busQtyHomeWork', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Unitário</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.ticketValue} onChange={e => handleInputChange('ticketValue', e.target.value)} />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Linha (Trabalho &gt; Residência)</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.busLineWorkHome} onChange={e => handleInputChange('busLineWorkHome', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd Passagens</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.busQtyWorkHome} onChange={e => handleInputChange('busQtyWorkHome', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Info Vale Deslocamento</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.transportVoucherInfo} onChange={e => handleInputChange('transportVoucherInfo', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Vale Combustível (Diário)</label>
                                        <input type="text" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" value={formData.fuelVoucherValue} onChange={e => handleInputChange('fuelVoucherValue', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Outros Beneficios */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Vale Refeição?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasMealVoucher} onChange={e => handleInputChange('hasMealVoucher', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Vale Alimentação?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasFoodVoucher} onChange={e => handleInputChange('hasFoodVoucher', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Auxílio Home Office?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasHomeOfficeAid} onChange={e => handleInputChange('hasHomeOfficeAid', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Convênio Médico?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasHealthPlan} onChange={e => handleInputChange('hasHealthPlan', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Convênio Odonto?</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.hasDentalPlan} onChange={e => handleInputChange('hasDentalPlan', e.target.value)} />
                            </div>

                            {/* Bonificacao e Comissao */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Regras Bonificação / Período</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20" value={formData.bonusInfo} onChange={e => handleInputChange('bonusInfo', e.target.value)}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Bonificação</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.bonusValue} onChange={e => handleInputChange('bonusValue', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Regras Comissionamento</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20" value={formData.commissionInfo} onChange={e => handleInputChange('commissionInfo', e.target.value)}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">% Comissão</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.commissionPercent} onChange={e => handleInputChange('commissionPercent', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: DEPENDENTES */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <Heart size={16} /> Dependentes
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Possui dependentes?</label>
                                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.hasDependents} onChange={e => handleInputChange('hasDependents', e.target.value)}>
                                    <option value="Nao">Não</option>
                                    <option value="Sim">Sim</option>
                                </select>
                            </div>
                            {formData.hasDependents === 'Sim' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Dependente</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dependentName} onChange={e => handleInputChange('dependentName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Data Nascimento</label>
                                        <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dependentDob} onChange={e => handleInputChange('dependentDob', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Grau Parentesco</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dependentKinship} onChange={e => handleInputChange('dependentKinship', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">CPF Dependente</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.dependentCpf} onChange={e => handleInputChange('dependentCpf', e.target.value)} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SECTION 7: DESLIGAMENTO & OUTROS */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <AlertCircle size={16} /> Desligamento & Anexos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Demissão</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.resignationDate} onChange={e => handleInputChange('resignationDate', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo / 2ª Data de Admissão</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.demissionReason} onChange={e => handleInputChange('demissionReason', e.target.value)} />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Documentos Demissionais</label>
                                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-16" value={formData.demissionDocs} onChange={e => handleInputChange('demissionDocs', e.target.value)}></textarea>
                            </div>
                            
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Períodos de Férias</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="DD/MM/AAAA a DD/MM/AAAA" value={formData.vacationPeriods} onChange={e => handleInputChange('vacationPeriods', e.target.value)} />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Link Pasta Documentos</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-blue-50 text-blue-700" value={formData.docsFolderLink} onChange={e => handleInputChange('docsFolderLink', e.target.value)} placeholder="https://drive.google.com/..." />
                            </div>
                            
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Link Foto Colaborador</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.photoUrl} onChange={e => handleInputChange('photoUrl', e.target.value)} placeholder="URL da imagem" />
                            </div>
                        </div>
                    </div>

                </div>
                
                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-100">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Ficha
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};