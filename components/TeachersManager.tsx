
import React, { useState, useEffect } from 'react';
import { 
  School, Plus, Search, MoreVertical, User, 
  Mail, ArrowLeft, Save, Edit2, Trash2,
  MapPin, FileText, Phone, Loader2, X, Shield, Lock, Unlock,
  Briefcase, DollarSign, Award, GraduationCap, Calendar, 
  Building, CreditCard, Truck, Info, CheckCircle2, AlertCircle, Smartphone, Map
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';

export interface Teacher {
    id: string; fullName: string; email: string; phone: string; photoUrl: string;
    rg: string; cpf: string; birthDate: string; maritalStatus: string; motherName: string; address: string; district: string; city: string; state: string; cep: string; emergencyContactName: string; emergencyContactPhone: string; profession: string; councilNumber: string; isCouncilActive: boolean; cnpj: string; companyName: string; hasCnpjActive: boolean; academicFormation: string; otherFormation: string; courseType: string; teacherLevel: string; levelHonorarium: number; isActive: boolean; bank: string; agency: string; accountNumber: string; accountDigit: string; hasPjAccount: boolean; pixKeyPj: string; pixKeyPf: string; regionAvailability: string; weekAvailability: string; shirtSize: string; hasNotebook: boolean; hasVehicle: boolean; hasStudio: boolean; studioAddress: string; additional1: string; valueAdditional1: string; dateAdditional1: string; additional2: string; valueAdditional2: string; dateAdditional2: string; additional3: string; valueAdditional3: string; dateAdditional3: string;
}

interface TeachersManagerProps {
  onBack: () => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({ onBack }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const initialFormState: Teacher = {
    id: '', fullName: '', email: '', phone: '', photoUrl: '',
    rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '', address: '', district: '', city: '', state: '', cep: '', emergencyContactName: '', emergencyContactPhone: '', profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true, academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', levelHonorarium: 0, isActive: true, bank: '', agency: '', accountNumber: '', accountDigit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '', regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '', additional1: '', valueAdditional1: '', dateAdditional1: '', additional2: '', valueAdditional2: '', dateAdditional2: '', additional3: '', valueAdditional3: '', dateAdditional3: ''
  };

  const [formData, setFormData] = useState<Teacher>(initialFormState);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client
        .from('crm_teachers')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      setTeachers((data || []).map((d: any) => ({
        id: d.id, fullName: d.full_name, email: d.email, phone: d.phone, photoUrl: d.photo_url,
        rg: d.rg, cpf: d.cpf, birthDate: d.birth_date, maritalStatus: d.marital_status, motherName: d.mother_name, address: d.address, district: d.district, city: d.city, state: d.state, cep: d.cep, emergency_contact_name: d.emergency_contact_name, emergency_contact_phone: d.emergency_contact_phone, profession: d.profession, council_number: d.council_number, is_council_active: d.is_council_active, cnpj: d.cnpj, company_name: d.company_name, has_cnpj_active: d.has_cnpj_active, academic_formation: d.academic_formation, other_formation: d.other_formation, course_type: d.course_type, teacher_level: d.teacher_level, levelHonorarium: Number(d.level_honorarium || 0), isActive: d.is_active, bank: d.bank, agency: d.agency, account_number: d.account_number, account_digit: d.account_digit, has_pj_account: d.has_pj_account, pix_key_pj: d.pix_key_pj, pix_key_pf: d.pix_key_pf, region_availability: d.region_availability, week_availability: d.week_availability, shirt_size: d.shirt_size, has_notebook: d.has_notebook, has_vehicle: d.has_vehicle, has_studio: d.has_studio, studio_address: d.studio_address, additional_1: d.additional_1, value_additional_1: d.value_additional_1, date_additional_1: d.date_additional_1, additional_2: d.additional_2, value_additional_2: d.value_additional_2, date_additional_2: d.date_additional_2, additional_3: d.additional_3, value_additional_3: d.value_additional_3, date_additional_3: d.date_additional_3
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.fullName) { alert("Nome completo é obrigatório"); return; }
    setIsSaving(true);
    const payload = {
        full_name: formData.fullName, email: formData.email, phone: formData.phone, photo_url: formData.photoUrl,
        rg: formData.rg, cpf: formData.cpf, birth_date: formData.birthDate || null, marital_status: formData.maritalStatus, mother_name: formData.motherName,
        address: formData.address, district: formData.district, city: formData.city, state: formData.state, cep: formData.cep,
        emergency_contact_name: formData.emergencyContactName, emergency_contact_phone: formData.emergencyContactPhone,
        profession: formData.profession, council_number: formData.councilNumber, is_council_active: formData.isCouncilActive,
        cnpj: formData.cnpj, company_name: formData.companyName, has_cnpj_active: formData.hasCnpjActive,
        academic_formation: formData.academicFormation, other_formation: formData.otherFormation, course_type: formData.courseType,
        teacher_level: formData.teacherLevel, level_honorarium: formData.levelHonorarium, is_active: formData.isActive,
        bank: formData.bank, agency: formData.agency, account_number: formData.accountNumber, account_digit: formData.accountDigit,
        has_pj_account: formData.hasPjAccount, pix_key_pj: formData.pixKeyPj, pix_key_pf: formData.pixKeyPf,
        region_availability: formData.regionAvailability, week_availability: formData.weekAvailability,
        shirt_size: formData.shirtSize, has_notebook: formData.hasNotebook, has_vehicle: formData.hasVehicle,
        has_studio: formData.hasStudio, studio_address: formData.studioAddress,
        additional_1: formData.additional1, value_additional_1: formData.valueAdditional1, date_additional_1: formData.dateAdditional1 || null,
        additional_2: formData.additional2, value_additional_2: formData.valueAdditional2, date_additional_2: formData.dateAdditional2 || null,
        additional_3: formData.additional3, value_additional_3: formData.valueAdditional3, date_additional_3: formData.dateAdditional3 || null
    };

    try {
        if (formData.id) {
            await appBackend.client.from('crm_teachers').update(payload).eq('id', formData.id);
            await appBackend.logActivity({ action: 'update', module: 'teachers', details: `Editou instrutor: ${formData.fullName}`, recordId: formData.id });
        } else {
            const { data: created } = await appBackend.client.from('crm_teachers').insert([payload]).select().single();
            await appBackend.logActivity({ action: 'create', module: 'teachers', details: `Cadastrou instrutor: ${formData.fullName}`, recordId: created?.id });
        }
        await fetchTeachers();
        setShowModal(false);
        setFormData(initialFormState);
    } catch (e: any) {
        alert(`Erro ao salvar: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      const target = teachers.find(t => t.id === id);
      if (window.confirm(`Tem certeza que deseja excluir o instrutor ${target?.fullName}?`)) {
          try {
              await appBackend.client.from('crm_teachers').delete().eq('id', id);
              await appBackend.logActivity({ action: 'delete', module: 'teachers', details: `Excluiu instrutor: ${target?.fullName}`, recordId: id });
              setTeachers(prev => prev.filter(t => t.id !== id));
          } catch(e: any) { alert(`Erro ao excluir: ${e.message}`); }
      }
  };

  const filtered = teachers.filter(t => 
    t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><School className="text-orange-600" /> Gestão de Professores</h2><p className="text-slate-500 text-sm">Cadastro docente, honorários e logística.</p></div>
        </div>
        <button onClick={() => { setFormData(initialFormState); setShowModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Novo Professor</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-orange-600" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhum professor encontrado.</div>
        ) : (
          filtered.map(teacher => (
            <div key={teacher.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group relative">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white shadow-sm">
                        {teacher.photoUrl ? <img src={teacher.photoUrl} alt="" className="w-full h-full object-cover" /> : teacher.fullName.charAt(0)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => { setFormData(teacher); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{teacher.fullName}</h3>
                <div className="space-y-2 text-sm text-slate-500 mb-4">
                    <p className="flex items-center gap-2 truncate"><Mail size={14} /> {teacher.email}</p>
                    <p className="flex items-center gap-2"><Smartphone size={14} /> {teacher.phone}</p>
                    <p className="flex items-center gap-2"><MapPin size={14} /> {teacher.city || 'Não inf.'} - {teacher.state}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase", teacher.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{teacher.isActive ? 'Ativo' : 'Inativo'}</span>
                    <span className="text-xs font-bold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(teacher.levelHonorarium)}</span>
                </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in zoom-in-95 flex flex-col max-h-[95vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Professor' : 'Novo Professor'}</h3>
                        <p className="text-xs text-slate-500">Preencha todos os dados técnicos e logísticos.</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                    {/* SEÇÃO 1: DADOS PESSOAIS */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><User size={16}/> Dados Pessoais e Identificação</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Nascimento</label>
                                <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado Civil</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="Solteiro">Solteiro(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Divorciado">Divorciado(a)</option>
                                    <option value="Viúvo">Viúvo(a)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome da Mãe</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RG</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 2: ENDEREÇO E CONTATO */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><MapPin size={16}/> Endereço e Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Principal</label>
                                <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CEP</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Logradouro / Endereço</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bairro</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cidade</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} maxLength={2} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 3: EMERGÊNCIA */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><AlertCircle size={16}/> Contato de Emergência</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Contato</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone de Emergência</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 4: PROFISSIONAL E FORMAÇÃO */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><GraduationCap size={16}/> Dados Profissionais e Formação</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Profissão</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº do Conselho</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.councilNumber} onChange={e => setFormData({...formData, councilNumber: e.target.value})} />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isCouncilActive} onChange={e => setFormData({...formData, isCouncilActive: e.target.checked})} className="rounded text-orange-600" /><span className="text-xs font-bold text-slate-700 uppercase">Conselho Ativo?</span></label>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Curso</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.courseType} onChange={e => setFormData({...formData, courseType: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Formação Acadêmica</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={formData.academicFormation} onChange={e => setFormData({...formData, academicFormation: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outras Formações / Cursos</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none" value={formData.otherFormation} onChange={e => setFormData({...formData, otherFormation: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 5: FINANCEIRO E PJ */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><DollarSign size={16}/> Administrativo e Financeiro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nível Docente</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.teacherLevel} onChange={e => setFormData({...formData, teacherLevel: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Honorário (R$)</label>
                                <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-green-700" value={formData.levelHonorarium} onChange={e => setFormData({...formData, levelHonorarium: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNPJ (Se PJ)</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-orange-600" /><span className="text-xs font-bold text-slate-700 uppercase">Professor Ativo?</span></label>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razão Social PJ</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasCnpjActive} onChange={e => setFormData({...formData, hasCnpjActive: e.target.checked})} className="rounded text-orange-600" /><span className="text-xs font-bold text-slate-700 uppercase">CNPJ Ativo?</span></label>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasPjAccount} onChange={e => setFormData({...formData, hasPjAccount: e.target.checked})} className="rounded text-orange-600" /><span className="text-xs font-bold text-slate-700 uppercase">Conta é PJ?</span></label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Banco</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agência</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.agency} onChange={e => setFormData({...formData, agency: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Conta</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dígito</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.accountDigit} onChange={e => setFormData({...formData, accountDigit: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chave PIX PJ</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.pixKeyPj} onChange={e => setFormData({...formData, pixKeyPj: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chave PIX PF</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.pixKeyPf} onChange={e => setFormData({...formData, pixKeyPf: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 6: LOGÍSTICA E DISPONIBILIDADE */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><Truck size={16}/> Logística e Disponibilidade</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Disponibilidade de Região</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.regionAvailability} onChange={e => setFormData({...formData, regionAvailability: e.target.value})} placeholder="Ex: Sudeste, Todo Brasil..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Disponibilidade de Dias (Semana)</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.weekAvailability} onChange={e => setFormData({...formData, weekAvailability: e.target.value})} placeholder="Ex: Seg a Sex, Apenas Finais de Semana..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tamanho da Camiseta</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={formData.shirtSize} onChange={e => setFormData({...formData, shirtSize: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    <option value="P">P</option>
                                    <option value="M">M</option>
                                    <option value="G">G</option>
                                    <option value="GG">GG</option>
                                    <option value="XG">XG</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-1 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasNotebook} onChange={e => setFormData({...formData, hasNotebook: e.target.checked})} className="rounded text-orange-600" /><span className="text-[10px] font-bold text-slate-700 uppercase">Notebook?</span></label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasVehicle} onChange={e => setFormData({...formData, hasVehicle: e.target.checked})} className="rounded text-orange-600" /><span className="text-[10px] font-bold text-slate-700 uppercase">Veículo Próprio?</span></label>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasStudio} onChange={e => setFormData({...formData, hasStudio: e.target.checked})} className="rounded text-orange-600" /><span className="text-[10px] font-bold text-slate-700 uppercase">Possui Studio Próprio?</span></label>
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço do Studio Próprio (Se houver)</label>
                                <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.studioAddress} onChange={e => setFormData({...formData, studioAddress: e.target.value})} disabled={!formData.hasStudio} />
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 7: CAMPOS ADICIONAIS / FLEXÍVEIS */}
                    <section>
                        <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-orange-100 pb-2"><Plus size={16}/> Informações Adicionais</h4>
                        <div className="space-y-4">
                            {[1, 2, 3].map(num => (
                                <div key={num} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título do Campo {num}</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" value={(formData as any)[`additional${num}`]} onChange={e => setFormData({...formData, [`additional${num}`]: e.target.value} as any)} placeholder="Ex: Bônus Evento X" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                        <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" value={(formData as any)[`valueAdditional${num}`]} onChange={e => setFormData({...formData, [`valueAdditional${num}`]: e.target.value} as any)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Referência</label>
                                        <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white" value={(formData as any)[`dateAdditional${num}`]} onChange={e => setFormData({...formData, [`dateAdditional${num}`]: e.target.value} as any)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="px-8 py-5 bg-slate-50 flex justify-between items-center gap-3 shrink-0 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <AlertCircle size={14}/>
                        <span>Os campos com (*) são obrigatórios para salvamento.</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {formData.id ? 'Salvar Alterações' : 'Cadastrar Professor'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
