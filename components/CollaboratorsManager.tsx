
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

export interface Collaborator {
  id: string;
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
  email: string;
  phone: string;
  cellphone: string;
  corporatePhone: string;
  operator: string;
  address: string;
  cep: string;
  complement: string;
  birthState: string;
  birthCity: string;
  state: string;
  currentCity: string;
  emergencyName: string;
  emergencyPhone: string;
  admissionDate: string;
  previousAdmissionDate: string;
  role: string;
  roleId?: string;
  password?: string;
  headquarters: string;
  department: string;
  salary: string;
  hiringMode: string;
  hiringCompany: string;
  workHours: string;
  breakTime: string;
  workDays: string;
  presentialDays: string;
  superiorId: string;
  experiencePeriod: string;
  hasOtherJob: string;
  status: 'active' | 'inactive';
  contractType: string;
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
  legalAuth: boolean;
  bankAccountInfo: string;
  hasInsalubrity: string;
  insalubrityPercent: string;
  hasDangerPay: string;
  transportVoucherInfo: string;
  busLineHomeWork: string;
  busQtyHomeWork: string;
  busLineWorkHome: string;
  busQtyWorkHome: string;
  ticketValue: string;
  fuelVoucherValue: string;
  hasMealVoucher: string;
  hasFoodVoucher: string;
  hasHomeOfficeAid: string;
  hasHealthPlan: string;
  hasDentalPlan: string;
  bonusInfo: string;
  bonusValue: string;
  commissionInfo: string;
  commissionPercent: string;
  hasDependents: string;
  dependentName: string;
  dependentDob: string;
  dependentKinship: string;
  dependentCpf: string;
  resignationDate: string;
  demissionReason: string;
  demissionDocs: string;
  vacationPeriods: string;
  observations: string;
}

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
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [currentCities, setCurrentCities] = useState<IBGECity[]>([]);
  const [birthCities, setBirthCities] = useState<IBGECity[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getEmptyCollaborator = (): Collaborator => ({
    id: '', fullName: '', socialName: '', birthDate: '', maritalStatus: '', spouseName: '', fatherName: '', motherName: '', genderIdentity: '', racialIdentity: '', educationLevel: '', photoUrl: '', email: '', phone: '', cellphone: '', corporatePhone: '', operator: '', address: '', cep: '', complement: '', birthState: '', birthCity: '', currentCity: '', state: '', emergencyName: '', emergencyPhone: '', admissionDate: '', previousAdmissionDate: '', role: '', roleId: '', password: '', headquarters: '', department: 'Comercial', salary: '', hiringMode: '', hiringCompany: '', workHours: '', breakTime: '', workDays: '', presentialDays: '', superiorId: '', experiencePeriod: '', hasOtherJob: '', status: 'active', contractType: '', cpf: '', rg: '', rgIssuer: '', rgIssueDate: '', rgState: '', ctpsNumber: '', ctpsSeries: '', ctpsState: '', ctpsIssueDate: '', pisNumber: '', reservistNumber: '', docsFolderLink: '', legalAuth: false, bankAccountInfo: '', hasInsalubrity: '', insalubrityPercent: '', hasDangerPay: '', transportVoucherInfo: '', busLineHomeWork: '', busQtyHomeWork: '', busLineWorkHome: '', busQtyWorkHome: '', ticketValue: '', fuelVoucherValue: '', hasMealVoucher: '', hasFoodVoucher: '', hasHomeOfficeAid: '', hasHealthPlan: '', hasDentalPlan: '', bonusInfo: '', bonusValue: '', commissionInfo: '', commissionPercent: '', hasDependents: '', dependentName: '', dependentDob: '', dependentKinship: '', dependentCpf: '', resignationDate: '', demissionReason: '', demissionDocs: '', vacationPeriods: '', observations: ''
  });

  const [formData, setFormData] = useState<Collaborator>(getEmptyCollaborator());

  useEffect(() => {
    fetchCollaborators();
    fetchRoles();
    ibgeService.getStates().then(setStates);
  }, []);

  const fetchRoles = async () => {
    try { const roles = await appBackend.getRoles(); setUserRoles(roles); } catch (e) { console.error(e); }
  };

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client.from('crm_collaborators').select('*').order('full_name', { ascending: true });
      if (error) throw error;
      setCollaborators((data || []).map((d: any) => ({
        id: d.id, fullName: d.full_name, socialName: d.social_name, birthDate: d.birth_date, maritalStatus: d.marital_status, spouseName: d.spouse_name, fatherName: d.father_name, motherName: d.mother_name, genderIdentity: d.gender_identity, racialIdentity: d.racial_identity, educationLevel: d.education_level, photoUrl: d.photo_url, email: d.email, phone: d.phone, cellphone: d.cellphone, corporatePhone: d.corporate_phone, operator: d.operator, address: d.address, cep: d.cep, complement: d.complement, birthState: d.birth_state, birthCity: d.birth_city, state: d.state, currentCity: d.current_city, emergencyName: d.emergency_name, emergencyPhone: d.emergency_phone, admissionDate: d.admission_date, previousAdmissionDate: d.previous_admission_date, role: d.role, roleId: d.role_id, password: d.password, headquarters: d.headquarters, department: d.department, salary: d.salary, hiringMode: d.hiring_mode, hiringCompany: d.hiring_company, workHours: d.work_hours, breakTime: d.break_time, workDays: d.work_days, presentialDays: d.presential_days, superiorId: d.superior_id, experiencePeriod: d.experience_period, hasOtherJob: d.has_other_job, status: d.status, contractType: d.contract_type, cpf: d.cpf, rg: d.rg, rgIssuer: d.rg_issuer, rgIssueDate: d.rg_issue_date, rgState: d.rg_state, ctpsNumber: d.ctps_number, ctpsSeries: d.ctps_series, ctpsState: d.ctps_state, ctpsIssueDate: d.ctps_issue_date, pisNumber: d.pis_number, reservistNumber: d.reservist_number, docsFolderLink: d.docs_folder_link, legalAuth: d.legal_auth, bankAccountInfo: d.bank_account_info, hasInsalubrity: d.has_insalubrity, insalubrityPercent: d.insalubrity_percent, hasDangerPay: d.has_danger_pay, transportVoucherInfo: d.transport_voucher_info, busLineHomeWork: d.bus_line_home_work, busQtyHomeWork: d.bus_qty_home_work, busLineWorkHome: d.bus_line_work_home, busQtyWorkHome: d.bus_qty_work_home, ticketValue: d.ticket_value, fuelVoucherValue: d.fuel_voucher_value, hasMealVoucher: d.has_meal_voucher, hasFoodVoucher: d.has_food_voucher, hasHomeOfficeAid: d.has_home_office_aid, hasHealthPlan: d.has_health_plan, hasDentalPlan: d.has_dental_plan, bonusInfo: d.bonus_info, bonusValue: d.bonus_value, commissionInfo: d.commission_info, commissionPercent: d.commission_percent, hasDependents: d.has_dependents, dependentName: d.dependent_name, dependentDob: d.dependent_dob, dependentKinship: d.dependent_kinship, dependentCpf: d.dependent_cpf, resignationDate: d.resignation_date, demissionReason: d.demission_reason, demissionDocs: d.demission_docs, vacationPeriods: d.vacation_periods, observations: d.observations
      })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (formData.state) ibgeService.getCities(formData.state).then(setCurrentCities);
    else setCurrentCities([]);
  }, [formData.state]);

  const handleSave = async () => {
    if (!formData.fullName) { alert("Nome é obrigatório"); return; }
    setIsSaving(true);
    const payload = {
        full_name: formData.fullName, email: formData.email, phone: formData.phone, photo_url: formData.photoUrl,
        department: formData.department, status: formData.status, role_id: formData.roleId, password: formData.password,
        cpf: formData.cpf, role: formData.role, hiring_mode: formData.hiringMode
    };
    try {
        if (formData.id) {
            await appBackend.client.from('crm_collaborators').update(payload).eq('id', formData.id);
            await appBackend.logActivity({ action: 'update', module: 'collaborators', details: `Editou: ${formData.fullName}`, recordId: formData.id });
        } else {
            const { data } = await appBackend.client.from('crm_collaborators').insert([payload]).select().single();
            await appBackend.logActivity({ action: 'create', module: 'collaborators', details: `Cadastrou: ${formData.fullName}`, recordId: data?.id });
        }
        await fetchCollaborators();
        setShowModal(false);
    } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const target = collaborators.find(c => c.id === id);
    if (window.confirm('Excluir este colaborador?')) {
        try {
            await appBackend.client.from('crm_collaborators').delete().eq('id', id);
            await appBackend.logActivity({ action: 'delete', module: 'collaborators', details: `Excluiu: ${target?.fullName}`, recordId: id });
            fetchCollaborators();
        } catch (e: any) { alert(e.message); }
    }
  };

  const filtered = collaborators.filter(c => c.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800">Equipe VOLL</h2><p className="text-slate-500 text-sm">Gestão de colaboradores e acesso.</p></div>
        </div>
        <button onClick={() => { setFormData(getEmptyCollaborator()); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Plus size={18} /> Novo Membro</button>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar colaborador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div> : filtered.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white shadow-sm">
                    {c.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : c.fullName.charAt(0)}
                </div>
                <div className="flex gap-1">
                    <button onClick={() => { setFormData(c); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
            </div>
            <h3 className="font-bold text-slate-800 truncate">{c.fullName}</h3>
            <p className="text-xs text-slate-500 mb-4">{c.department} • {c.role}</p>
            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", c.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200"><X size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">NOME COMPLETO</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">E-MAIL</label><input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">CARGO</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">SETOR</label><select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">PERFIL DE ACESSO</label><select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.roleId || ''} onChange={e => setFormData({...formData, roleId: e.target.value})}><option value="">Selecione...</option>{userRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">SENHA DE LOGIN</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-blue-50 font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Defina a senha" /></div>
                    </div>
                </div>
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 border-t">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-600 font-medium">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">{isSaving && <Loader2 size={16} className="animate-spin" />} Salvar Colaborador</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
