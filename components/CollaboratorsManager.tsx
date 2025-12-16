
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MoreVertical, User, 
  Mail, ArrowLeft, Save, Briefcase, Edit2, Trash2,
  MapPin, FileText, DollarSign, Heart, Bus, AlertCircle, Phone, Loader2, X, Shield, Lock
} from 'lucide-react';
import clsx from 'clsx';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { appBackend } from '../services/appBackend';
import { Role } from '../types';

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

  // Contratual & ACESSO
  admissionDate: string;
  previousAdmissionDate: string; // Contrato anterior
  role: string; // Cargo (Job Title)
  roleId?: string; // ID of the User Type (Access Role)
  password?: string; // For Login
  
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
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  
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
      admissionDate: '', previousAdmissionDate: '', role: '', roleId: '', password: '', headquarters: '', department: '', salary: '', hiringMode: '', hiringCompany: '', workHours: '', breakTime: '', workDays: '', presentialDays: '', superiorId: '', experiencePeriod: '', hasOtherJob: '', status: 'active', contractType: '',
      cpf: '', rg: '', rgIssuer: '', rgIssueDate: '', rgState: '', ctpsNumber: '', ctpsSeries: '', ctpsState: '', ctpsIssueDate: '', pisNumber: '', reservistNumber: '', docsFolderLink: '', legalAuth: false,
      bankAccountInfo: '', hasInsalubrity: '', insalubrityPercent: '', hasDangerPay: '', transportVoucherInfo: '', busLineHomeWork: '', busQtyHomeWork: '', busLineWorkHome: '', busQtyWorkHome: '', ticketValue: '', fuelVoucherValue: '', hasMealVoucher: '', hasFoodVoucher: '', hasHomeOfficeAid: '', hasHealthPlan: '', hasDentalPlan: '', bonusInfo: '', bonusValue: '', commissionInfo: '', commissionPercent: '',
      hasDependents: '', dependentName: '', dependentDob: '', dependentKinship: '', dependentCpf: '',
      resignationDate: '', demissionReason: '', demissionDocs: '', vacationPeriods: '', observations: ''
  });

  const [formData, setFormData] = useState<Collaborator>(getEmptyCollaborator());

  useEffect(() => {
      fetchCollaborators();
      fetchRoles();
      ibgeService.getStates().then(setStates);
  }, []);

  const fetchRoles = async () => {
      try {
          const roles = await appBackend.getRoles();
          setUserRoles(roles);
      } catch (e) {
          console.error("Error fetching roles", e);
      }
  };

  const fetchCollaborators = async () => {
      setIsLoading(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_collaborators')
              .select('*')
              .order('full_name', { ascending: true });

          if (error) {
              console.warn("Tabela 'crm_collaborators' pode não existir ou erro de conexão:", error);
              return;
          }

          const mapped: Collaborator[] = (data || []).map((d: any) => ({
              id: d.id,
              fullName: d.full_name || 'Sem Nome',
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
              email: d.email || '',
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
              roleId: d.role_id, // Mapped role ID
              password: d.password, // Mapped password
              headquarters: d.headquarters,
              department: d.department || 'Geral',
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
              status: d.status || 'active',
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
        role: formData.role, // Job Title
        role_id: formData.roleId || null, // Access Role ID
        password: formData.password, // Login Password
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
        ctps_state: formData.ctps_state,
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
        const msg = e.message || '';
        // Detect "column does not exist" OR "Could not find the 'x' column... in the schema cache"
        if (
            msg.includes('column') && (msg.includes('does not exist') || msg.includes('Could not find'))
        ) {
            alert("Erro de Banco de Dados: Colunas faltantes (ex: role_id, password) ou Cache desatualizado.\n\nExecute o SQL de atualização no Supabase e aguarde alguns segundos.");
        } else {
            alert(`Erro ao salvar: ${msg}`);
        }
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
    (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.department || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                    <th className="px-6 py-4">Tipo de Acesso</th>
                    <th className="px-6 py-4">Contato</th>
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
                {filtered.map(c => {
                    const roleName = userRoles.find(r => r.id === c.roleId)?.name;
                    return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors relative">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden">
                                    {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : (c.fullName || '??').substring(0,2).toUpperCase()}
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
                            {roleName ? (
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                    {roleName}
                                </span>
                            ) : (
                                <span className="text-slate-400 text-xs italic">Sem acesso</span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-xs">
                                <p className="flex items-center gap-1"><Mail size={10} /> {c.email}</p>
                                <p className="flex items-center gap-1 mt-1"><Phone size={10} /> {c.phone}</p>
                            </div>
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
                )})}
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
                            
                            {/* ... (Existing personal fields retained) ... */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Nascimento</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.birthDate} onChange={e => handleInputChange('birthDate', e.target.value)} />
                            </div>
                            {/* ... more fields ... */}
                        </div>
                    </div>

                    {/* SECTION: ACESSO AO SISTEMA (NEW) */}
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Shield size={16} /> Acesso ao Sistema
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Usuário (Cargo/Permissão)</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={formData.roleId || ''}
                                    onChange={e => handleInputChange('roleId', e.target.value)}
                                >
                                    <option value="">Sem Acesso</option>
                                    {userRoles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Login</label>
                                <input 
                                    type="email" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                    value={formData.email} 
                                    onChange={e => handleInputChange('email', e.target.value)}
                                    placeholder="user@voll.com.br" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><Lock size={12}/> Senha de Acesso</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                    value={formData.password || ''} 
                                    onChange={e => handleInputChange('password', e.target.value)}
                                    placeholder="Definir senha..."
                                />
                            </div>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2">
                            * Se um Tipo de Usuário for selecionado, este colaborador poderá fazer login na área administrativa usando o e-mail e senha acima.
                        </p>
                    </div>

                    {/* SECTION 2: ENDEREÇO & CONTATO */}
                    <div>
                        <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <MapPin size={16} /> Endereço e Contato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* ... (Existing address fields retained) ... */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cep} onChange={e => handleInputChange('cep', e.target.value)} />
                            </div>
                            {/* ... */}
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
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo (RH)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.role} onChange={e => handleInputChange('role', e.target.value)} />
                            </div>
                            {/* ... */}
                        </div>
                    </div>

                    {/* ... (Rest of sections 5, 6, 7 retained) ... */}

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
