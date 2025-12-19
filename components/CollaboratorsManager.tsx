
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, User, 
  Mail, ArrowLeft, Save, Briefcase, Edit2, Trash2,
  MapPin, FileText, DollarSign, Heart, Bus, AlertCircle, Phone, Loader2, X, 
  Shield, Lock, Unlock, Calendar, GraduationCap, Building, CreditCard,
  TrendingUp, ExternalLink, Smartphone, FileSearch, ShieldCheck
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

export const CollaboratorsManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'documentos' | 'endereco' | 'financeiro' | 'contratual'>('pessoal');
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
        id: d.id, fullName: d.full_name, socialName: d.social_name, birthDate: d.birth_date, maritalStatus: d.marital_status, spouseName: d.spouse_name, fatherName: d.father_name, motherName: d.mother_name, genderIdentity: d.gender_identity, racialIdentity: d.racial_identity, educationLevel: d.education_level, photo_url: d.photo_url, email: d.email, phone: d.phone, cellphone: d.cellphone, corporatePhone: d.corporate_phone, operator: d.operator, address: d.address, cep: d.cep, complement: d.complement, birthState: d.birth_state, birthCity: d.birth_city, state: d.state, currentCity: d.current_city, emergencyName: d.emergency_name, emergencyPhone: d.emergency_phone, admissionDate: d.admission_date, previousAdmissionDate: d.previous_admission_date, role: d.role, roleId: d.role_id, password: d.password, headquarters: d.headquarters, department: d.department, salary: d.salary, hiringMode: d.hiring_mode, hiringCompany: d.hiring_company, workHours: d.work_hours, breakTime: d.break_time, workDays: d.work_days, presentialDays: d.presential_days, superiorId: d.superior_id, experiencePeriod: d.experience_period, hasOtherJob: d.has_other_job, status: d.status, contractType: d.contract_type, cpf: d.cpf, rg: d.rg, rgIssuer: d.rg_issuer, rgIssueDate: d.rg_issue_date, rgState: d.rg_state, ctpsNumber: d.ctps_number, ctpsSeries: d.ctps_series, ctpsState: d.ctps_state, ctpsIssueDate: d.ctps_issue_date, pisNumber: d.pis_number, reservistNumber: d.reservist_number, docsFolderLink: d.docs_folder_link, legalAuth: d.legal_auth, bankAccountInfo: d.bank_account_info, hasInsalubrity: d.has_insalubrity, insalubrityPercent: d.insalubrity_percent, hasDangerPay: d.has_danger_pay, transportVoucherInfo: d.transport_voucher_info, busLineHomeWork: d.bus_line_home_work, busQtyHomeWork: d.bus_qty_home_work, busLineWorkHome: d.bus_line_work_home, busQtyWorkHome: d.bus_qty_work_home, ticketValue: d.ticket_value, fuelVoucherValue: d.fuel_voucher_value, hasMealVoucher: d.has_meal_voucher, hasFoodVoucher: d.has_food_voucher, hasHomeOfficeAid: d.has_home_office_aid, hasHealthPlan: d.has_health_plan, hasDentalPlan: d.has_dental_plan, bonusInfo: d.bonus_info, bonusValue: d.bonus_value, commissionInfo: d.commission_info, commissionPercent: d.commission_percent, hasDependents: d.has_dependents, dependentName: d.dependent_name, dependentDob: d.dependent_dob, dependentKinship: d.dependent_kinship, dependentCpf: d.dependent_cpf, resignationDate: d.resignation_date, demissionReason: d.demission_reason, demissionDocs: d.demission_docs, vacationPeriods: d.vacation_periods, observations: d.observations
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

  const filtered = collaborators.filter(c => c.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800">Equipe VOLL</h2><p className="text-slate-500 text-sm">Gestão completa de RH e acessos.</p></div>
        </div>
        <button onClick={() => { setFormData(getEmptyCollaborator()); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"><Plus size={18} /> Novo Colaborador</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin" /></div> : filtered.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group relative">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg overflow-hidden border border-white shadow-sm">
                    {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : c.fullName.charAt(0)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setFormData(c); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Edit2 size={16} /></button>
                </div>
            </div>
            <h3 className="font-bold text-slate-800 truncate">{c.fullName}</h3>
            <p className="text-xs text-slate-500 mb-4">{c.department} • {c.role || 'S/ Cargo'}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200"><X size={24}/></button>
                </div>

                <div className="flex bg-slate-100 px-8 py-2 gap-2 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                    {['pessoal', 'documentos', 'endereco', 'financeiro', 'contratual'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider", activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>{tab}</button>
                    ))}
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {activeTab === 'pessoal' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
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
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} />
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pai</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mãe</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'documentos' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RG</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Emissor RG</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rgIssuer} onChange={e => setFormData({...formData, rgIssuer: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PIS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.pisNumber} onChange={e => setFormData({...formData, pisNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº CTPS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsNumber} onChange={e => setFormData({...formData, ctpsNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Série CTPS</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsSeries} onChange={e => setFormData({...formData, ctpsSeries: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Emissão CTPS</label><input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.ctpsIssueDate} onChange={e => setFormData({...formData, ctpsIssueDate: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reservista</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.reservistNumber} onChange={e => setFormData({...formData, reservistNumber: e.target.value})} /></div>
                        </div>
                    )}

                    {/* ... Restante das abas Endereço, Financeiro e Contratual com todos os campos ... */}
                    {activeTab === 'endereco' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                            <div className="md:col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CEP</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} /></div>
                            <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complemento/Bairro</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cidade</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.currentCity} onChange={e => setFormData({...formData, currentCity: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} /></div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 border-t">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 font-medium">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-10 py-2.5 rounded-lg font-bold flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : <Save />} Salvar Colaborador</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
