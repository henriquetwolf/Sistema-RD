
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MoreVertical, User, 
  Mail, ArrowLeft, Save, Briefcase, Edit2, Trash2,
  MapPin, FileText, DollarSign, Heart, Bus, AlertCircle, Phone, Loader2, X, Shield, Lock, Unlock
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
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
              presential_days: d.presential_days,
              superior_id: d.superior_id,
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
        has_insalubrity: formData.has_insalubrity,
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
            await appBackend.logActivity({ action: 'update', module: 'collaborators', details: `Editou colaborador: ${formData.fullName}`, recordId: formData.id });
        } else {
            // Create
            const { data: created, error } = await appBackend.client
                .from('crm_collaborators')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            await appBackend.logActivity({ action: 'create', module: 'collaborators', details: `Cadastrou colaborador: ${formData.fullName}`, recordId: created.id });
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
      const target = collaborators.find(c => c.id === id);
      if (window.confirm('Tem certeza que deseja remover este colaborador do banco de dados?')) {
          try {
              const { error } = await appBackend.client.from('crm_collaborators').delete().eq('id', id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'delete', module: 'collaborators', details: `Excluiu colaborador: ${target?.fullName}`, recordId: id });
              fetchCollaborators();
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
      setActiveMenuId(null);
  };
  
  // (Resto do componente inalterado)
