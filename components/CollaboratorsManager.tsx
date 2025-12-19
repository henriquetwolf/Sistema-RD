
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, User, 
  Mail, ArrowLeft, Save, Briefcase, Edit2, Trash2,
  MapPin, FileText, DollarSign, Heart, Bus, AlertCircle, Phone, Loader2, X, 
  Shield, Lock, Unlock, Calendar, GraduationCap, Building, CreditCard,
  TrendingUp, ExternalLink, Smartphone, FileSearch, ShieldCheck, UserPlus,
  Baby, Home, Wallet, Activity, ClipboardList, Info
} from 'lucide-react';
import clsx from 'clsx';
import { ibgeService, IBGEUF, IBGECity } from '../services/ibgeService';
import { appBackend } from '../services/appBackend';
import { Role } from '../types';

export interface Collaborator {
  id: string; fullName: string; socialName: string; birthDate: string; maritalStatus: string; spouseName: string; fatherName: string; motherName: string; genderIdentity: string; racialIdentity: string; educationLevel: string; photoUrl: string; email: string; phone: string; cellphone: string; corporatePhone: string; operator: string; address: string; cep: string; complement: string; birthState: string; birthCity: string; state: string; currentCity: string; emergencyName: string; emergencyPhone: string; admissionDate: string; previousAdmissionDate: string; role: string; roleId?: string; password?: string; headquarters: string; department: string; salary: string; hiringMode: string; hiringCompany: string; workHours: string; breakTime: string; workDays: string; presentialDays: string; superiorId: string; experiencePeriod: string; hasOtherJob: string; status: 'active' | 'inactive'; contractType: string; cpf: string; rg: string; rgIssuer: string; rgIssueDate: string; rgState: string; ctpsNumber: string; ctpsSeries: string; ctpsState: string; ctpsIssueDate: string; pisNumber: string; reservistNumber: string; docsFolderLink: string; legalAuth: boolean; bankAccountInfo: string; hasInsalubrity: string; insalubrityPercent: string; hasDangerPay: string; transportVoucherInfo: string; busLineHomeWork: string; busQtyHomeWork: string; busLineWorkHome: string; busQtyWorkHome: string; ticketValue: string; fuelVoucherValue: string; hasMealVoucher: string; hasFoodVoucher: string; hasHomeOfficeAid: string; hasHealthPlan: string; hasDentalPlan: string; bonusInfo: string; bonusValue: string; commissionInfo: string; commissionPercent: string; hasDependents: string; dependentName: string; dependentDob: string; dependentKinship: string; dependentCpf: string; resignationDate: string; demissionReason: string; demissionDocs: string; vacationPeriods: string; observations: string;
}

const DEPARTMENTS = ['Comercial', 'Marketing', 'Financeiro', 'Web / TI', 'Suporte', 'Logística', 'RH', 'Diretoria'];
const HEADQUARTERS = ['Matriz - SP', 'Filial - RS', 'Filial - MG', 'Home Office Total'];
const EDUCATION_LEVELS = ['Médio', 'Superior Incompleto', 'Superior Completo', 'Pós-Graduação', 'Mestrado/Doutorado'];

export const CollaboratorsManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'endereco' | 'contratual' | 'documentos' | 'financeiro' | 'extras'>('pessoal');
  const [states, setStates] = useState<IBGEUF[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);

  const getEmptyCollaborator = (): Collaborator => ({
    id: '', fullName: '', socialName: '', birthDate: '', maritalStatus: '', spouseName: '', fatherName: '', motherName: '', genderIdentity: '', racialIdentity: '', educationLevel: '', photoUrl: '', email: '', phone: '', cellphone: '', corporatePhone: '', operator: '', address: '', cep: '', complement: '', birthState: '', birthCity: '', currentCity: '', state: '', emergencyName: '', emergencyPhone: '', admissionDate: '', previousAdmissionDate: '', role: '', roleId: '', password: '', headquarters: 'Matriz - SP', department: 'Comercial', salary: '', hiringMode: '', hiringCompany: '', workHours: '', breakTime: '', workDays: '', presentialDays: '', superiorId: '', experiencePeriod: '', hasOtherJob: '', status: 'active', contractType: '', cpf: '', rg: '', rgIssuer: '', rgIssueDate: '', rgState: '', ctpsNumber: '', ctpsSeries: '', ctpsState: '', ctpsIssueDate: '', pisNumber: '', reservistNumber: '', docsFolderLink: '', legalAuth: false, bankAccountInfo: '', hasInsalubrity: 'Não', insalubrityPercent: '', hasDangerPay: 'Não', transportVoucherInfo: '', busLineHomeWork: '', busQtyHomeWork: '', busLineWorkHome: '', busQtyWorkHome: '', ticketValue: '', fuelVoucherValue: '', hasMealVoucher: 'Não', hasFoodVoucher: 'Não', hasHomeOfficeAid: 'Não', hasHealthPlan: 'Não', hasDentalPlan: 'Não', bonusInfo: '', bonusValue: '', commissionInfo: '', commissionPercent: '', hasDependents: 'Não', dependentName: '', dependentDob: '', dependentKinship: '', dependentCpf: '', resignationDate: '', demissionReason: '', demissionDocs: '', vacationPeriods: '', observations: ''
  });

  const [formData, setFormData] = useState<Collaborator>(getEmptyCollaborator());

  useEffect(() => {
    fetchCollaborators(); fetchRoles(); ibgeService.getStates().then(setStates);
  }, []);

  useEffect(() => {
    if (formData.state) ibgeService.getCities(formData.state).then(setCities);
  }, [formData.state]);

  const fetchRoles = async () => { try { const roles = await appBackend.getRoles(); setUserRoles(roles); } catch (e) {} };

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client.from('crm_collaborators').select('*').order('full_name', { ascending: true });
      if (error) throw error;
      setCollaborators((data || []).map((d: any) => ({
        id: d.id, fullName: d.full_name, socialName: d.social_name, birthDate: d.birth_date, maritalStatus: d.marital_status, spouseName: d.spouse_name, fatherName: d.father_name, motherName: d.mother_name, genderIdentity: d.gender_identity, racialIdentity: d.racial_identity, educationLevel: d.education_level, photo_url: d.photo_url, email: d.email, phone: d.phone, cellphone: d.cellphone, corporatePhone: d.corporate_phone, operator: d.operator, address: d.address, cep: d.cep, complement: d.complement, birthState: d.birth_state, birthCity: d.birth_city, state: d.state, current_city: d.current_city, emergencyName: d.emergency_name, emergencyPhone: d.emergency_phone, admissionDate: d.admission_date, previousAdmissionDate: d.previous_admission_date, role: d.role, roleId: d.role_id, password: d.password, headquarters: d.headquarters, department: d.department, salary: d.salary, hiringMode: d.hiring_mode, hiringCompany: d.hiring_company, workHours: d.work_hours, breakTime: d.break_time, workDays: d.work_days, presentialDays: d.presential_days, superiorId: d.superior_id, experiencePeriod: d.experience_period, hasOtherJob: d.has_other_job, status: d.status, contractType: d.contract_type, cpf: d.cpf, rg: d.rg, rgIssuer: d.rg_issuer, rgIssueDate: d.rg_issue_date, rgState: d.rg_state, ctpsNumber: d.ctps_number, ctpsSeries: d.ctps_series, ctpsState: d.ctps_state, ctpsIssueDate: d.ctps_issue_date, pisNumber: d.pis_number, reservistNumber: d.reservist_number, docsFolderLink: d.docs_folder_link, legalAuth: d.legal_auth, bankAccountInfo: d.bank_account_info, hasInsalubrity: d.has_insalubrity, insalubrityPercent: d.insalubrity_percent, hasDangerPay: d.has_danger_pay, transportVoucherInfo: d.transport_voucher_info, busLineHomeWork: d.bus_line_home_work, busQtyHomeWork: d.bus_qty_home_work, busLineWorkHome: d.bus_line_work_home, busQtyWorkHome: d.bus_qty_work_home, ticketValue: d.ticket_value, fuelVoucherValue: d.fuel_voucher_value, hasMealVoucher: d.has_meal_voucher, hasFoodVoucher: d.has_food_voucher, hasHomeOfficeAid: d.has_home_office_aid, hasHealthPlan: d.has_health_plan, hasDentalPlan: d.has_dental_plan, bonusInfo: d.bonus_info, bonusValue: d.bonus_value, commissionInfo: d.commission_info, commissionPercent: d.commission_percent, hasDependents: d.has_dependents, dependentName: d.dependent_name, dependentDob: d.dependent_dob, dependentKinship: d.dependent_kinship, dependentCpf: d.dependent_cpf, resignationDate: d.resignation_date, demissionReason: d.demission_reason, demissionDocs: d.demission_docs, vacationPeriods: d.vacation_periods, observations: d.observations
      })));
    } catch (e) {} finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.fullName) { alert("Nome é obrigatório"); return; }
    setIsSaving(true);
    const payload = {
        full_name: formData.fullName, social_name: formData.socialName, birth_date: formData.birthDate || null, marital_status: formData.maritalStatus, spouse_name: formData.spouseName, father_name: formData.fatherName, mother_name: formData.motherName, gender_identity: formData.genderIdentity, racial_identity: formData.racialIdentity, education_level: formData.educationLevel, photo_url: formData.photoUrl, email: formData.email, phone: formData.phone, cellphone: formData.cellphone, corporate_phone: formData.corporatePhone, operator: formData.operator, address: formData.address, cep: formData.cep, complement: formData.complement, birth_state: formData.birthState, birth_city: formData.birthCity, state: formData.state, current_city: formData.currentCity, emergency_name: formData.emergencyName, emergency_phone: formData.emergencyPhone, admission_date: formData.admissionDate || null, previous_admission_date: formData.previousAdmissionDate || null, role: formData.role, role_id: formData.roleId || null, password: formData.password, headquarters: formData.headquarters, department: formData.department, salary: formData.salary, hiring_mode: formData.hiringMode, hiring_company: formData.hiringCompany, work_hours: formData.workHours, break_time: formData.breakTime, work_days: formData.workDays, presential_days: formData.presentialDays, superior_id: formData.superiorId, experience_period: formData.experiencePeriod, has_other_job: formData.hasOtherJob, status: formData.status, contract_type: formData.contractType, cpf: formData.cpf, rg: formData.rg, rg_issuer: formData.rgIssuer, rg_issue_date: formData.rgIssueDate || null, rg_state: formData.rgState, ctps_number: formData.ctpsNumber, ctps_series: formData.ctpsSeries, ctps_state: formData.ctpsState, ctps_issue_date: formData.ctpsIssueDate || null, pis_number: formData.pisNumber, reservist_number: formData.reservistNumber, docs_folder_link: formData.docsFolderLink, legal_auth: formData.legalAuth, bank_account_info: formData.bankAccountInfo, has_insalubrity: formData.hasInsalubrity, insalubrity_percent: formData.insalubrityPercent, has_danger_pay: formData.hasDangerPay, transport_voucher_info: formData.transportVoucherInfo, bus_line_home_work: formData.busLineHomeWork, bus_qty_home_work: formData.busQtyHomeWork, bus_line_work_home: formData.busLineWorkHome, bus_qty_work_home: formData.busQtyWorkHome, ticket_value: formData.ticketValue, fuel_voucher_value: formData.fuelVoucherValue, has_meal_voucher: formData.hasMealVoucher, has_food_voucher: formData.hasFoodVoucher, has_home_office_aid: formData.hasHomeOfficeAid, has_health_plan: formData.hasHealthPlan, has_dental_plan: formData.hasDentalPlan, bonus_info: formData.bonusInfo, bonus_value: formData.bonusValue, commission_info: formData.commissionInfo, commission_percent: formData.commissionPercent, has_dependents: formData.hasDependents, dependent_name: formData.dependentName, dependent_dob: formData.dependentDob || null, dependent_kinship: formData.dependentKinship, dependent_cpf: formData.dependentCpf, resignation_date: formData.resignationDate || null, demission_reason: formData.demissionReason, demission_docs: formData.demissionDocs, vacation_periods: formData.vacationPeriods, observations: formData.observations
    };
    try {
        if (formData.id) await appBackend.client.from('crm_collaborators').update(payload).eq('id', formData.id);
        else await appBackend.client.from('crm_collaborators').insert([payload]);
        await fetchCollaborators(); setShowModal(false);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const target = collaborators.find(c => c.id === id);
    if (window.confirm(`Excluir permanentemente o colaborador ${target?.fullName}?`)) {
        try {
            await appBackend.client.from('crm_collaborators').delete().eq('id', id);
            await fetchCollaborators();
        } catch (e: any) { alert(e.message); }
    }
  };

  const filtered = collaborators.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800">Equipe VOLL</h2><p className="text-slate-500 text-sm">Gestão RH, Contratos e Acessos.</p></div>
        </div>
        <button onClick={() => { setFormData(getEmptyCollaborator()); setActiveTab('pessoal'); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:bg-blue-700 active:scale-95"><Plus size={18} /> Novo Colaborador</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32}/></div> : filtered.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group relative">
            <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white shadow-sm">
                    {c.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : c.fullName.charAt(0)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setFormData(c); setActiveTab('pessoal'); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
            </div>
            <h3 className="font-bold text-slate-800 truncate" title={c.fullName}>{c.fullName}</h3>
            <p className="text-xs text-slate-500 mb-4">{c.department} • {c.role || 'S/ Cargo'}</p>
            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", c.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Cadastro' : 'Novo Cadastro de Equipe'}</h3>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-widest text-blue-600">RH VOLL PILATES GROUP</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={24}/></button>
                </div>

                <div className="flex bg-slate-100 px-8 py-2 gap-2 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'pessoal', label: 'Pessoal', icon: User },
                        { id: 'endereco', label: 'Contato/Ender.', icon: Home },
                        { id: 'contratual', label: 'Contratual', icon: Briefcase },
                        { id: 'documentos', label: 'Documentos', icon: ClipboardList },
                        { id: 'financeiro', label: 'Financeiro/Ben.', icon: Wallet },
                        { id: 'extras', label: 'Extras/Depend.', icon: UserPlus }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2", activeTab === tab.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                            <tab.icon size={14}/> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {/* TAB: PESSOAL */}
                    {activeTab === 'pessoal' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-left-2">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Social</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.socialName} onChange={e => setFormData({...formData, socialName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Nascimento</label>
                                <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado Civil</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro">Solteiro(a)</option><option value="Casado">Casado(a)</option><option value="Divorciado">Divorciado(a)</option><option value="Viúvo">Viúvo(a)</option><option value="União Estável">União Estável</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Cônjuge</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gênero</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.genderIdentity} onChange={e => setFormData({...formData, genderIdentity: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Raça/Etnia</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.racialIdentity} onChange={e => setFormData({...formData, racialIdentity: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escolaridade</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.educationLevel} onChange={e => setFormData({...formData, educationLevel: e.target.value})}>
                                    {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pai</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mãe</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Foto (URL)</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} placeholder="https://..." />
                            </div>
                        </div>
                    )}

                    {/* TAB: ENDEREÇO E CONTATO */}
                    {activeTab === 'endereco' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-left-2">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail Principal</label>
                                <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone Fixo</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Celular/WhatsApp</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cellphone} onChange={e => setFormData({...formData, cellphone: e.target.value})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CEP</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} maxLength={9} />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complemento / Bairro</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF Atual</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {states.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cidade Atual</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50" value={formData.currentCity} onChange={e => setFormData({...formData, currentCity: e.target.value})} disabled={!formData.state}>
                                    <option value="">Selecione...</option>
                                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF Nascimento</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.birthState} onChange={e => setFormData({...formData, birthState: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {states.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cidade Nascimento</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.birthCity} onChange={e => setFormData({...formData, birthCity: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contato Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.emergencyName} onChange={e => setFormData({...formData, emergencyName: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.emergencyPhone} onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {/* TAB: CONTRATUAL */}
                    {activeTab === 'contratual' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-left-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                    <option value="active">Ativo</option><option value="inactive">Inativo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Admissão</label>
                                <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Admissão Ant.</label>
                                <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.previousAdmissionDate} onChange={e => setFormData({...formData, previousAdmissionDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cargo</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departamento</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sede/Unidade</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.headquarters} onChange={e => setFormData({...formData, headquarters: e.target.value})}>
                                    {HEADQUARTERS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modo Contratação</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.hiringMode} onChange={e => setFormData({...formData, hiringMode: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estágio">Estágio</option><option value="Freelancer">Freelancer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Empresa Contratante</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.hiringCompany} onChange={e => setFormData({...formData, hiringCompany: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salário (R$)</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-green-700" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Carga Horária</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.workHours} onChange={e => setFormData({...formData, workHours: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pausa Almoço</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.breakTime} onChange={e => setFormData({...formData, breakTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dias Trabalho</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.workDays} onChange={e => setFormData({...formData, workDays: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Superior Direto</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.superiorId} onChange={e => setFormData({...formData, superiorId: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Período Experiência</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.experiencePeriod} onChange={e => setFormData({...formData, experiencePeriod: e.target.value})} />
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl md:col-span-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Perfil Acesso</label>
                                    <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.roleId || ''} onChange={e => setFormData({...formData, roleId: e.target.value})}>
                                        <option value="">Nenhum acesso</option>
                                        {userRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Senha Sistema</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                        <input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm font-bold text-blue-900" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: DOCUMENTOS */}
                    {activeTab === 'documentos' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-left-2">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RG</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Emissor RG</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rgIssuer} onChange={e => setFormData({...formData, rgIssuer: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF RG</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rgState} onChange={e => setFormData({...formData, rgState: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PIS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.pisNumber} onChange={e => setFormData({...formData, pisNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº CTPS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsNumber} onChange={e => setFormData({...formData, ctpsNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Série CTPS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsSeries} onChange={e => setFormData({...formData, ctpsSeries: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF CTPS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsState} onChange={e => setFormData({...formData, ctpsState: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reservista</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.reservistNumber} onChange={e => setFormData({...formData, reservistNumber: e.target.value})} /></div>
                            <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link Pasta Cloud (Docs)</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm text-blue-600" value={formData.docsFolderLink} onChange={e => setFormData({...formData, docsFolderLink: e.target.value})} placeholder="Google Drive / OneDrive" /></div>
                        </div>
                    )}

                    {/* TAB: FINANCEIRO E BENEFÍCIOS */}
                    {activeTab === 'financeiro' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-2">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard size={14}/> Dados Bancários</h4>
                                <textarea className="w-full px-4 py-2 border rounded-xl text-sm font-mono h-20 resize-none" value={formData.bankAccountInfo} onChange={e => setFormData({...formData, bankAccountInfo: e.target.value})} placeholder="Banco, Agência, Conta, PIX..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Bus size={14}/> Transporte e Auxílio</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Auxílio Combustível</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={formData.fuelVoucherValue} onChange={e => setFormData({...formData, fuelVoucherValue: e.target.value})} /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Passagem (R$)</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={formData.ticketValue} onChange={e => setFormData({...formData, ticketValue: e.target.value})} /></div>
                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Linhas/Itinerário</label><textarea className="w-full px-3 py-1.5 border rounded text-xs h-16 resize-none" value={formData.transportVoucherInfo} onChange={e => setFormData({...formData, transportVoucherInfo: e.target.value})} /></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={14}/> Saúde e Alimentação</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer"><span className="text-xs font-bold">Plano Saúde</span><input type="checkbox" checked={formData.hasHealthPlan === 'Sim'} onChange={e => setFormData({...formData, hasHealthPlan: e.target.checked ? 'Sim' : 'Não'})}/></label>
                                        <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer"><span className="text-xs font-bold">Plano Dental</span><input type="checkbox" checked={formData.hasDentalPlan === 'Sim'} onChange={e => setFormData({...formData, hasDentalPlan: e.target.checked ? 'Sim' : 'Não'})}/></label>
                                        <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer"><span className="text-xs font-bold">Vale Refeição</span><input type="checkbox" checked={formData.hasMealVoucher === 'Sim'} onChange={e => setFormData({...formData, hasMealVoucher: e.target.checked ? 'Sim' : 'Não'})}/></label>
                                        <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer"><span className="text-xs font-bold">Vale Aliment.</span><input type="checkbox" checked={formData.hasFoodVoucher === 'Sim'} onChange={e => setFormData({...formData, hasFoodVoucher: e.target.checked ? 'Sim' : 'Não'})}/></label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: EXTRAS E DEPENDENTES */}
                    {activeTab === 'extras' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-2">
                            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="md:col-span-4 flex items-center gap-2 text-purple-800 font-bold mb-2"><Baby size={20}/> Dependentes</div>
                                <div><label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">Tem Dependentes?</label><select className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.hasDependents} onChange={e => setFormData({...formData, hasDependents: e.target.value})}><option value="Não">Não</option><option value="Sim">Sim</option></select></div>
                                <div className="md:col-span-2"><label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">Nome Dependente</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.dependentName} onChange={e => setFormData({...formData, dependentName: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">CPF Dependente</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.dependentCpf} onChange={e => setFormData({...formData, dependentCpf: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14}/> Observações Gerais</h4>
                                    <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-32 resize-none" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Períodos de Férias</h4>
                                    <textarea className="w-full px-4 py-2 border rounded-xl text-sm h-32 resize-none" value={formData.vacationPeriods} onChange={e => setFormData({...formData, vacationPeriods: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 shrink-0 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <AlertCircle size={14}/> <span>Todos os campos serão salvos independente da aba ativa.</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {formData.id ? 'Salvar Alterações' : 'Contratar Colaborador'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
