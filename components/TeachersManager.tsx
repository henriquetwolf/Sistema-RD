
import React, { useState, useEffect } from 'react';
import { 
  School, Plus, Search, MoreVertical, User, 
  Mail, ArrowLeft, Save, Edit2, Trash2,
  MapPin, FileText, Phone, Loader2, X, Shield, Lock, Unlock,
  Briefcase, DollarSign, Award, GraduationCap, Calendar
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
        rg: d.rg, cpf: d.cpf, birthDate: d.birth_date, maritalStatus: d.marital_status, motherName: d.mother_name, address: d.address, district: d.district, city: d.city, state: d.state, cep: d.cep, emergencyContactName: d.emergency_contact_name, emergencyContactPhone: d.emergency_contact_phone, profession: d.profession, councilNumber: d.council_number, isCouncilActive: d.is_council_active, cnpj: d.cnpj, companyName: d.company_name, hasCnpjActive: d.has_cnpj_active, academicFormation: d.academic_formation, otherFormation: d.other_formation, courseType: d.course_type, teacherLevel: d.teacher_level, levelHonorarium: Number(d.level_honorarium || 0), isActive: d.is_active, bank: d.bank, agency: d.agency, accountNumber: d.account_number, accountDigit: d.account_digit, hasPjAccount: d.has_pj_account, pixKeyPj: d.pix_key_pj, pixKeyPf: d.pix_key_pf, regionAvailability: d.region_availability, weekAvailability: d.week_availability, shirtSize: d.shirt_size, hasNotebook: d.has_notebook, hasVehicle: d.has_vehicle, hasStudio: d.has_studio, studioAddress: d.studio_address, additional1: d.additional_1, valueAdditional1: d.value_additional_1, dateAdditional1: d.date_additional_1, additional2: d.additional_2, valueAdditional2: d.value_additional_2, dateAdditional2: d.date_additional_2, additional3: d.additional_3, valueAdditional3: d.value_additional_3, dateAdditional3: d.date_additional_3
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.fullName) {
        alert("Nome completo é obrigatório");
        return;
    }

    setIsSaving(true);
    const payload = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        photo_url: formData.photoUrl,
        rg: formData.rg,
        cpf: formData.cpf,
        birth_date: formData.birthDate || null,
        marital_status: formData.maritalStatus,
        mother_name: formData.motherName,
        address: formData.address,
        district: formData.district,
        city: formData.city,
        state: formData.state,
        cep: formData.cep,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        profession: formData.profession,
        council_number: formData.councilNumber,
        is_council_active: formData.isCouncilActive,
        cnpj: formData.cnpj,
        company_name: formData.companyName,
        has_cnpj_active: formData.hasCnpjActive,
        academic_formation: formData.academicFormation,
        other_formation: formData.otherFormation,
        course_type: formData.courseType,
        teacher_level: formData.teacherLevel,
        level_honorarium: formData.levelHonorarium,
        is_active: formData.isActive,
        bank: formData.bank,
        agency: formData.agency,
        account_number: formData.accountNumber,
        account_digit: formData.accountDigit,
        has_pj_account: formData.hasPjAccount,
        pix_key_pj: formData.pixKeyPj,
        pix_key_pf: formData.pixKeyPf,
        region_availability: formData.regionAvailability,
        week_availability: formData.weekAvailability,
        shirt_size: formData.shirtSize,
        has_notebook: formData.hasNotebook,
        has_vehicle: formData.hasVehicle,
        has_studio: formData.hasStudio,
        studio_address: formData.studioAddress,
        additional_1: formData.additional1,
        value_additional_1: formData.valueAdditional1,
        date_additional_1: formData.dateAdditional1 || null,
        additional_2: formData.additional2,
        value_additional_2: formData.valueAdditional2,
        date_additional_2: formData.dateAdditional2 || null,
        additional_3: formData.additional3,
        value_additional_3: formData.valueAdditional3,
        date_additional_3: formData.dateAdditional3 || null
    };

    try {
        if (formData.id) {
            const { error } = await appBackend.client.from('crm_teachers').update(payload).eq('id', formData.id);
            if (error) throw error;
            await appBackend.logActivity({ action: 'update', module: 'teachers', details: `Editou instrutor: ${formData.fullName}`, recordId: formData.id });
        } else {
            const { data: created, error } = await appBackend.client.from('crm_teachers').insert([payload]).select().single();
            if (error) throw error;
            await appBackend.logActivity({ action: 'create', module: 'teachers', details: `Cadastrou instrutor: ${formData.fullName}`, recordId: created.id });
        }
        await fetchTeachers();
        setShowModal(false);
        setFormData(initialFormState);
    } catch (e: any) {
        console.error(e);
        alert(`Erro ao salvar: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      const target = teachers.find(t => t.id === id);
      if (window.confirm("Tem certeza que deseja excluir este instrutor?")) {
          try {
              const { error } = await appBackend.client.from('crm_teachers').delete().eq('id', id);
              if (error) throw error;
              await appBackend.logActivity({ action: 'delete', module: 'teachers', details: `Excluiu instrutor: ${target?.fullName}`, recordId: id });
              setTeachers(prev => prev.filter(t => t.id !== id));
          } catch(e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
      setActiveMenuId(null);
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
            <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><School className="text-orange-600" /> Gestão de Professores</h2><p className="text-slate-500 text-sm">Cadastro docente, honorários e disponibilidade.</p></div>
        </div>
        <button onClick={() => { setFormData(initialFormState); setShowModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Novo Professor</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar professor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
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
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white shadow-sm">
                        {teacher.photoUrl ? <img src={teacher.photoUrl} alt="" className="w-full h-full object-cover" /> : teacher.fullName.substring(0, 1)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => { setFormData(teacher); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{teacher.fullName}</h3>
                <div className="space-y-2 text-sm text-slate-500 mb-4">
                    <p className="flex items-center gap-2"><Mail size={14} /> {teacher.email}</p>
                    <p className="flex items-center gap-2"><Phone size={14} /> {teacher.phone}</p>
                    <p className="flex items-center gap-2"><MapPin size={14} /> {teacher.city || 'Cidade não inf.'}</p>
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Professor' : 'Novo Professor'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200"><X size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">NOME COMPLETO</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">E-MAIL</label><input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">TELEFONE</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">HONORÁRIO BASE (R$)</label><input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.levelHonorarium} onChange={e => setFormData({...formData, levelHonorarium: Number(e.target.value)})} /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">CIDADE</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-orange-600" /><span className="text-sm font-bold text-slate-700">Professor Ativo?</span></label>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 border-t">
                    <button onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-600 font-medium">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">{isSaving && <Loader2 size={16} className="animate-spin" />} Salvar Professor</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
