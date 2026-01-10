
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X,
  Zap, Save, CheckCircle2, ShieldCheck, ShoppingBag, Tag, MapPin, DollarSign, Edit2, Check,
  Share2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Product, CertificateModel } from '../types';
import clsx from 'clsx';

interface StudentsManagerProps {
  onBack: () => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<Product[]>([]);
  const [certificates, setCertificates] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<CertificateModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showAccessModal, setShowAccessModal] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);
  const [activeAccessIds, setActiveAccessIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [issuingFor, setIssuingFor] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchDigitalProducts();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
      try {
          const data = await appBackend.getCertificates();
          setTemplates(data);
      } catch (e) {}
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
        // Buscamos apenas os DEALS que chegaram na etapa final de fechamento (pago)
        const { data, error } = await appBackend.client
            .from('crm_deals')
            .select('*')
            .eq('stage', 'closed')
            .order('contact_name', { ascending: true });
        
        if (error) throw error;
        setStudents(data || []);

        // Busca certificados já emitidos para estes alunos
        if (data && data.length > 0) {
            const { data: certs } = await appBackend.client
                .from('crm_student_certificates')
                .select('student_deal_id, hash, issued_at');
            
            const certMap: Record<string, any> = {};
            certs?.forEach((c: any) => {
                certMap[c.student_deal_id] = c;
            });
            setCertificates(certMap);
        }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchDigitalProducts = async () => {
      try {
          const { data } = await appBackend.client.from('crm_products').select('*').eq('category', 'Curso Online').eq('status', 'active');
          if (data) setDigitalProducts(data);
      } catch (e) {}
  };

  const handleIssueCertificate = async (student: any) => {
      // Tenta encontrar um template vinculado ao produto do aluno
      const template = templates.find(t => t.linkedProductId === student.product_name);
      if (!template) {
          alert("Não há modelo de certificado vinculado ao produto: " + (student.product_name || 'Nenhum'));
          return;
      }

      if (!window.confirm(`Liberar certificado para ${student.contact_name}?`)) return;

      setIssuingFor(student.id);
      try {
          const hash = await appBackend.issueCertificate(student.id, template.id);
          setCertificates(prev => ({ ...prev, [student.id]: { hash, issued_at: new Date().toISOString() } }));
          alert("Certificado liberado com sucesso!");
      } catch (e: any) {
          alert("Erro ao emitir: " + e.message);
      } finally {
          setIssuingFor(null);
      }
  };

  const copyCertLink = (hash: string) => {
      const link = `${window.location.origin}/?certificateHash=${hash}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
  };

  const openAccessManager = async (student: any) => {
      setShowAccessModal(student);
      const access = await appBackend.getStudentCourseAccess(student.id);
      setActiveAccessIds(access);
  };

  const handleToggleAccess = (courseId: string) => {
      setActiveAccessIds(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const saveAccessChanges = async () => {
      if (!showAccessModal) return;
      setIsSavingAccess(true);
      try {
          const studentId = showAccessModal.id;
          const currentInDB = await appBackend.getStudentCourseAccess(studentId);
          
          const toAdd = activeAccessIds.filter(id => !currentInDB.includes(id));
          const toRemove = currentInDB.filter(id => !activeAccessIds.includes(id));

          for (const id of toAdd) await appBackend.grantCourseAccess(studentId, id);
          for (const id of toRemove) await appBackend.revokeCourseAccess(studentId, id);

          alert("Acessos ao LMS atualizados!");
          setShowAccessModal(null);
          await appBackend.logActivity({ action: 'update', module: 'students', details: `Liberou acesso a cursos para: ${showAccessModal.contact_name}`, recordId: studentId });
      } catch (e) {
          alert("Erro ao salvar permissões.");
      } finally {
          setIsSavingAccess(false);
      }
  };

  const handleSaveEdit = async () => {
      if (!showEditModal) return;
      setIsSavingEdit(true);
      try {
          const { error } = await appBackend.client.from('crm_deals').update({
              contact_name: showEditModal.contact_name,
              email: showEditModal.email,
              phone: showEditModal.phone,
              cpf: showEditModal.cpf,
              course_city: showEditModal.course_city,
              course_state: showEditModal.course_state
          }).eq('id', showEditModal.id);
          
          if (error) throw error;
          alert("Dados atualizados!");
          setShowEditModal(null);
          fetchData();
      } catch (e: any) {
          alert("Erro ao salvar: " + e.message);
      } finally {
          setIsSavingEdit(false);
      }
  };

  const filtered = students.filter(s => 
    (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cpf || '').includes(searchTerm)
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-teal-600" /> Alunos Matriculados
                    </h2>
                    <p className="text-slate-500 text-sm">Visualizando apenas alunos com pagamento confirmado.</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-black uppercase border border-green-100 shadow-sm flex items-center gap-2">
                    <CheckCircle2 size={16}/> Pagamento Confirmado
                </div>
                <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar por nome, e-mail ou CPF..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-400 border border-slate-100">
                <Users size={14}/> {filtered.length} Alunos
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4">Aluno / Identificação</th>
                        <th className="px-6 py-4">Localização</th>
                        <th className="px-6 py-4">Origem / Campanha</th>
                        <th className="px-6 py-4 text-center">Curso Online</th>
                        <th className="px-6 py-4 text-center">Certificado</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black border border-teal-100 shadow-inner">
                                        {s.contact_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 leading-tight">{s.company_name || s.contact_name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5"><Mail size={10}/> {s.email || '—'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Tag size={10}/> CPF: {s.cpf || '—'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1"><MapPin size={12}/> {s.course_city || '—'}</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-black">{s.course_state || '—'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-indigo-600">{s.source || 'CRM'}</span>
                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]">{s.campaign || 'Sem Campanha'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button onClick={() => openAccessManager(s)} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 mx-auto border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">
                                    <Zap size={14}/> Liberar LMS
                                </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {certificates[s.id] ? (
                                    <button 
                                        onClick={() => copyCertLink(certificates[s.id].hash)}
                                        className={clsx("p-2 rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto border", copiedLink === certificates[s.id].hash ? "bg-teal-600 text-white border-teal-700" : "bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-600 hover:text-white")}
                                        title="Copiar Link do Certificado"
                                    >
                                        <Award size={14}/> 
                                        <span className="text-[9px] font-black uppercase">{copiedLink === certificates[s.id].hash ? 'Link Copiado!' : 'Emitido'}</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleIssueCertificate(s)}
                                        disabled={issuingFor === s.id}
                                        className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 mx-auto border border-amber-100 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {issuingFor === s.id ? <Loader2 size={12} className="animate-spin" /> : <Award size={14}/>}
                                        Liberar Agora
                                    </button>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setShowEditModal(s)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg"><Edit2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && !isLoading && (
                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">Nenhum aluno pago localizado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* ACCESS MODAL (LMS) */}
        {showAccessModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 flex flex-col">
                    <div className="px-10 py-8 border-b flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-[1.5rem] shadow-inner"><ShieldCheck size={28}/></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Gestor de Acesso LMS</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{showAccessModal.company_name || showAccessModal.contact_name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAccessModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-10 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ShoppingBag size={14}/> Cursos Digitais Disponíveis</h4>
                        {digitalProducts.map(course => (
                            <label key={course.id} className={clsx("flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer group", activeAccessIds.includes(course.id) ? "bg-indigo-50 border-indigo-500 shadow-md ring-4 ring-indigo-500/5" : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50")}>
                                <div className="flex items-center gap-4">
                                    <div className={clsx("p-3 rounded-2xl transition-all", activeAccessIds.includes(course.id) ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-100 text-slate-400")}>
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <span className={clsx("font-black text-sm block", activeAccessIds.includes(course.id) ? "text-indigo-900" : "text-slate-600")}>{course.name}</span>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{course.category}</p>
                                    </div>
                                </div>
                                <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", activeAccessIds.includes(course.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200")}>
                                    {activeAccessIds.includes(course.id) && <Check size={14}/>}
                                </div>
                                <input type="checkbox" className="hidden" checked={activeAccessIds.includes(course.id)} onChange={() => handleToggleAccess(course.id)} />
                            </label>
                        ))}
                    </div>
                    <div className="px-10 py-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2rem]">
                        <button onClick={() => setShowAccessModal(null)} className="px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={saveAccessChanges} disabled={isSavingAccess} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                            {isSavingAccess ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Confirmar Acessos
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col overflow-hidden">
                    <div className="px-10 py-8 border-b flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-teal-100 text-teal-600 rounded-[1.5rem]"><Edit2 size={28}/></div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Editar Ficha do Aluno</h3>
                        </div>
                        <button onClick={() => setShowEditModal(null)} className="p-2 text-slate-400 hover:bg-red-50 rounded-full transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-10 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white outline-none" value={showEditModal.contact_name} onChange={e => setShowEditModal({...showEditModal, contact_name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white outline-none" value={showEditModal.email} onChange={e => setShowEditModal({...showEditModal, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CPF</label>
                                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white outline-none" value={showEditModal.cpf} onChange={e => setShowEditModal({...showEditModal, cpf: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <div className="px-10 py-6 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setShowEditModal(null)} className="px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:underline">Cancelar</button>
                        <button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                            {isSavingEdit ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
