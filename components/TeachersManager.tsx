import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  School, Plus, Search, MoreVertical, User, Users,
  Mail, ArrowLeft, Save, Edit2, Trash2,
  MapPin, FileText, Phone, Loader2, X, Shield, Lock, Unlock,
  Briefcase, DollarSign, Award, GraduationCap, Calendar, 
  Building, CreditCard, Truck, Info, CheckCircle2, AlertCircle, Smartphone, Map, Filter, Eraser, Sparkles, Image as ImageIcon, Send, History, Newspaper, Upload
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { TeacherNews, InstructorLevel } from '../types';
import clsx from 'clsx';

export interface Teacher {
    id: string; fullName: string; email: string; phone: string; photoUrl: string;
    rg: string; cpf: string; birthDate: string; maritalStatus: string; motherName: string; address: string; district: string; city: string; state: string; cep: string; emergencyContactName: string; emergencyContactPhone: string; profession: string; councilNumber: string; isCouncilActive: boolean; cnpj: string; companyName: string; hasCnpjActive: boolean; academicFormation: string; otherFormation: string; courseType: string; teacherLevel: string; levelHonorarium: number; isActive: boolean; bank: string; agency: string; accountNumber: string; accountDigit: string; hasPjAccount: boolean; pixKeyPj: string; pixKeyPf: string; regionAvailability: string; weekAvailability: string; shirtSize: string; hasNotebook: boolean; hasVehicle: boolean; hasStudio: boolean; studioAddress: string; additional1: string; valueAdditional1: string; dateAdditional1: string; additional2: string; valueAdditional2: string; dateAdditional2: string; additional3: string; valueAdditional3: string; dateAdditional3: string;
    password?: string;
}

interface TeachersManagerProps {
  onBack: () => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'news'>('teachers');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [news, setNews] = useState<TeacherNews[]>([]);
  const [instructorLevels, setInstructorLevels] = useState<InstructorLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  
  const initialFormState: Teacher = {
    id: '', fullName: '', email: '', phone: '', photoUrl: '',
    rg: '', cpf: '', birthDate: '', maritalStatus: '', motherName: '', address: '', district: '', city: '', state: '', cep: '', emergencyContactName: '', emergencyContactPhone: '', profession: '', councilNumber: '', isCouncilActive: true, cnpj: '', companyName: '', hasCnpjActive: true, academicFormation: '', otherFormation: '', courseType: '', teacherLevel: '', levelHonorarium: 0, isActive: true, bank: '', agency: '', accountNumber: '', accountDigit: '', hasPjAccount: true, pixKeyPj: '', pixKeyPf: '', regionAvailability: '', weekAvailability: '', shirtSize: '', hasNotebook: true, hasVehicle: true, hasStudio: false, studioAddress: '', additional1: '', valueAdditional1: '', dateAdditional1: '', additional2: '', valueAdditional2: '', dateAdditional2: '', additional3: '', valueAdditional3: '', dateAdditional3: ''
  };

  const [formData, setFormData] = useState<Teacher>(initialFormState);
  const [newsFormData, setNewsFormData] = useState<Partial<TeacherNews>>({ title: '', content: '', imageUrl: '' });

  const newsFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'teachers') {
        fetchTeachers();
        fetchInstructorLevels();
    }
    else if (activeTab === 'news') fetchNews();
  }, [activeTab]);

  const fetchInstructorLevels = async () => {
      try {
          const levels = await appBackend.getInstructorLevels();
          setInstructorLevels(levels);
      } catch (e) {
          console.error("Erro ao buscar níveis docentes:", e);
      }
  };

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
        rg: d.rg || '', cpf: d.cpf || '', birthDate: d.birth_date || '', maritalStatus: d.marital_status || '', motherName: d.mother_name || '', address: d.address || '', district: d.district || '', city: d.city || '', state: d.state || '', cep: d.cep || '', emergencyContactName: d.emergency_contact_name || '', emergencyContactPhone: d.emergency_contact_phone || '', profession: d.profession || '', councilNumber: d.council_number || '', isCouncilActive: !!d.is_council_active, cnpj: d.cnpj || '', companyName: d.company_name || '', hasCnpjActive: !!d.has_cnpj_active, academicFormation: d.academic_formation || '', otherFormation: d.other_formation || '', courseType: d.course_type || '', teacherLevel: d.teacher_level || '', levelHonorarium: Number(d.level_honorarium || 0), isActive: !!d.is_active, bank: d.bank || '', agency: d.agency || '', accountNumber: d.account_number || '', accountDigit: d.account_digit || '', hasPjAccount: !!d.has_pj_account, pixKeyPj: d.pix_key_pj || '', pixKeyPf: d.pix_key_pf || '', regionAvailability: d.region_availability || '', weekAvailability: d.week_availability || '', shirtSize: d.shirt_size || '', hasNotebook: !!d.has_notebook, hasVehicle: !!d.has_vehicle, hasStudio: !!d.has_studio, studioAddress: d.studio_address || '', additional1: d.additional_1 || '', valueAdditional1: d.value_additional_1 || '', dateAdditional1: d.date_additional_1 || '', additional2: d.additional_2 || '', valueAdditional2: d.value_additional_2 || '', dateAdditional2: d.date_additional_2 || '', additional3: d.additional_3 || '', valueAdditional3: d.value_additional_3 || '', dateAdditional3: d.date_additional_3 || '', password: d.password
      })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchNews = async () => {
      setIsLoading(true);
      try {
          const data = await appBackend.getTeacherNews();
          setNews(data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const label = newStatus ? 'ativar' : 'desativar';
    
    if (!window.confirm(`Deseja realmente ${label} o acesso deste professor?`)) return;

    try {
        const { error } = await appBackend.client
            .from('crm_teachers')
            .update({ is_active: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        setTeachers(prev => prev.map(t => t.id === id ? { ...t, isActive: newStatus } : t));
        const target = teachers.find(t => t.id === id);
        await appBackend.logActivity({ 
            action: 'update', 
            module: 'teachers', 
            details: `${label.toUpperCase()} acesso do professor: ${target?.fullName}`,
            recordId: id
        });
    } catch (e: any) {
        alert(`Erro ao atualizar status: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.fullName) { alert("Nome completo é obrigatório"); return; }
    setIsSaving(true);
    try {
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
            additional_3: formData.additional3, value_additional_3: formData.valueAdditional3, date_additional_3: formData.dateAdditional3 || null,
            password: formData.password
        };
        if (formData.id) await appBackend.client.from('crm_teachers').update(payload).eq('id', formData.id);
        else await appBackend.client.from('crm_teachers').insert([payload]);
        await fetchTeachers(); setShowModal(false);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const target = teachers.find(t => t.id === id);
    if (window.confirm(`Excluir permanentemente o professor ${target?.fullName}?`)) {
        try {
            const { error } = await appBackend.client.from('crm_teachers').delete().eq('id', id);
            if (error) throw error;
            await appBackend.logActivity({ 
              action: 'delete', 
              module: 'teachers', 
              details: `Excluiu cadastro de professor: ${target?.fullName}`, 
              recordId: id 
            });
            await fetchTeachers();
        } catch (e: any) { alert(e.message); }
    }
  };

  const handleLevelChange = (levelName: string) => {
      const selectedLevel = instructorLevels.find(l => l.name === levelName);
      setFormData({
          ...formData,
          teacherLevel: levelName,
          levelHonorarium: selectedLevel ? selectedLevel.honorarium : formData.levelHonorarium
      });
  };

  const handleNewsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewsFormData({ ...newsFormData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveNews = async () => {
      if (!newsFormData.title || !newsFormData.content) {
          alert("Título e conteúdo são obrigatórios.");
          return;
      }
      setIsSaving(true);
      try {
          await appBackend.saveTeacherNews(newsFormData);
          await fetchNews();
          setShowNewsModal(false);
          setNewsFormData({ title: '', content: '', imageUrl: '' });
      } catch (e: any) {
          alert(`Erro ao salvar novidade: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteNews = async (id: string) => {
      if(window.confirm("Excluir esta novidade?")) {
          await appBackend.deleteTeacherNews(id);
          fetchNews();
      }
  };

  const uniqueLevels = useMemo(() => Array.from(new Set(teachers.map(t => t.teacherLevel).filter(Boolean))).sort(), [teachers]);
  const uniqueStates = useMemo(() => Array.from(new Set(teachers.map(t => t.state).filter(Boolean))).sort(), [teachers]);

  const filtered = teachers.filter(t => {
    const matchesSearch = (t.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (t.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? t.isActive : !t.isActive;
    const matchesLevel = levelFilter === 'all' ? true : t.teacherLevel === levelFilter;
    const matchesState = stateFilter === 'all' ? true : t.state === stateFilter;
    return matchesSearch && matchesStatus && matchesLevel && matchesState;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><School className="text-orange-600" /> Gestão de Professores</h2><p className="text-slate-500 text-sm">Cadastro docente e comunicação direta.</p></div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
            <button onClick={() => setActiveTab('teachers')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'teachers' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={14}/> Professores</button>
            <button onClick={() => setActiveTab('news')} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'news' ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Newspaper size={14}/> Novidades</button>
        </div>
      </div>

      {activeTab === 'teachers' ? (
        <>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm" />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500"><option value="all">Status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
                    <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500"><option value="all">Nível</option>{uniqueLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}</select>
                    <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-500"><option value="all">UF</option>{uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}</select>
                    <button onClick={() => { setFormData(initialFormState); setShowModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm whitespace-nowrap"><Plus size={16} /> Novo Professor</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-orange-600" size={32} /></div> : filtered.map(teacher => (
                    <div key={teacher.id} className={clsx("bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group relative", !teacher.isActive && "opacity-60")}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white shadow-sm">{teacher.photoUrl ? <img src={teacher.photoUrl} alt="" className="w-full h-full object-cover" /> : (teacher.fullName || '?').charAt(0)}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleToggleStatus(teacher.id, teacher.isActive)} 
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors", 
                                        teacher.isActive ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-green-500 hover:bg-green-50"
                                    )} 
                                    title={teacher.isActive ? 'Bloquear Acesso' : 'Liberar Acesso'}
                                >
                                    {teacher.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                                <button onClick={() => { setFormData(teacher); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Editar"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{teacher.fullName}</h3>
                        <p className="text-xs text-slate-500 mb-4">{teacher.email} • {teacher.phone}</p>
                        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center"><span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase w-fit", teacher.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{teacher.isActive ? 'Ativo' : 'Inativo'}</span><span className="text-sm font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(teacher.levelHonorarium)}</span></div>
                    </div>
                ))}
            </div>
        </>
      ) : (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-60"></div>
                <div className="relative z-10">
                    <h3 className="text-lg font-black text-slate-800 mb-1">Central de Comunicados</h3>
                    <p className="text-sm text-slate-500">Crie avisos, novidades e atualizações técnicas para sua rede docente.</p>
                </div>
                <button onClick={() => { setNewsFormData({ title: '', content: '', imageUrl: '' }); setShowNewsModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0"><Send size={18} /> Enviar Novidade</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {isLoading ? <div className="col-span-full flex justify-center"><Loader2 className="animate-spin text-orange-600" /></div> : (
                    <>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><History size={14}/> Histórico de Novidades</h4>
                            {news.length === 0 ? <div className="p-20 text-center bg-white border border-slate-100 rounded-3xl text-slate-300 italic">Nenhuma novidade enviada.</div> : news.map((item, idx) => (
                                <div key={item.id} className={clsx("bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 group transition-all", idx === 0 && "ring-2 ring-orange-500 border-orange-200")}>
                                    <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                {idx === 0 && <span className="text-[9px] font-black bg-orange-600 text-white px-1.5 py-0.5 rounded uppercase mb-1 inline-block">Destaque Atual</span>}
                                                <h5 className="font-bold text-slate-800 truncate">{item.title}</h5>
                                            </div>
                                            <button onClick={() => handleDeleteNews(item.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{item.content}</p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase"><Calendar size={10}/> {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center text-orange-600 mb-6 animate-pulse"><Sparkles size={40}/></div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">Comunicação Instantânea</h4>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">Toda novidade criada aqui aparece instantaneamente no portal do instrutor com um alerta de notificação.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {/* NOVIDADES MODAL */}
      {showNewsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 flex flex-col">
                  <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Newspaper size={20} className="text-orange-600"/> Enviar Nova Novidade</h3>
                      <button onClick={() => setShowNewsModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Título do Comunicado</label>
                          <input type="text" className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-2xl text-sm font-bold transition-all outline-none" value={newsFormData.title} onChange={e => setNewsFormData({...newsFormData, title: e.target.value})} placeholder="Ex: Novos Materiais Didáticos Disponíveis" />
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Conteúdo da Mensagem</label>
                          <textarea className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-orange-500 rounded-2xl text-sm h-32 resize-none transition-all outline-none leading-relaxed" value={newsFormData.content} onChange={e => setNewsFormData({...newsFormData, content: e.target.value})} placeholder="Escreva o aviso detalhado aqui..." />
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Imagem de Destaque (Opcional)</label>
                          <div className="flex flex-col gap-4">
                              <div className="flex items-center gap-4">
                                  <button 
                                    onClick={() => newsFileInputRef.current?.click()}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-slate-200"
                                  >
                                      <Upload size={16}/> Selecionar Imagem
                                  </button>
                                  {newsFormData.imageUrl && (
                                      <button 
                                        onClick={() => setNewsFormData({ ...newsFormData, imageUrl: '' })}
                                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                                      >
                                          Remover
                                      </button>
                                  )}
                                  <input 
                                    ref={newsFileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleNewsImageUpload} 
                                  />
                              </div>
                              {newsFormData.imageUrl && (
                                  <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                                      <img src={newsFormData.imageUrl} className="w-full h-full object-cover" />
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
                      <button onClick={() => setShowNewsModal(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSaveNews} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-orange-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Disparar Novidade</button>
                  </div>
              </div>
          </div>
      )}

      {/* PROFESSOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div><h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Professor' : 'Novo Professor'}</h3><p className="text-xs text-slate-500">Preencha todos os dados técnicos e logísticos.</p></div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-10 flex-1">
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Principal (Login)</label>
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
                            <div>
                                <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Senha Sistema</label>
                                <input type="text" className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
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
                                <select 
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-bold" 
                                    value={formData.teacherLevel} 
                                    onChange={e => handleLevelChange(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {instructorLevels.map(lvl => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
                                </select>
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
                <div className="px-8 py-5 bg-slate-50 flex justify-end gap-3 shrink-0 border-t"><button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancelar</button><button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{formData.id ? 'Salvar Alterações' : 'Cadastrar Professor'}</button></div>
            </div>
        </div>
      )}
    </div>
  );
};