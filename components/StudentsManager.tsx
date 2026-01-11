
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X, MonitorPlay, Zap, ChevronRight, Check, Save
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { OnlineCourse } from '../types';
import clsx from 'clsx';

interface StudentsManagerProps {
  onBack: () => void;
}

interface StudentDeal {
    id: string;
    contact_name: string;
    company_name: string;
    cpf: string;
    email: string;
    phone: string;
    product_name: string;
    status: string;
    stage: string;
    student_access_enabled: boolean;
    class_mod_1?: string;
    class_mod_2?: string;
}

interface CertStatus {
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([]);
  const [certificates, setCertificates] = useState<Record<string, CertStatus>>({});
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Unlock Modal State
  const [unlockModalStudent, setUnlockModalStudent] = useState<StudentDeal | null>(null);
  const [studentAccessedIds, setStudentAccessedIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  useEffect(() => {
    fetchData();
    loadCourses();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const { data, error } = await appBackend.client.from('crm_deals').select('*').eq('stage', 'closed').order('contact_name', { ascending: true });
        if (error) throw error;
        
        const deals = data.map((s: any) => ({ ...s, student_access_enabled: s.student_access_enabled !== false }));
        setStudents(deals);

        if (deals.length > 0) {
            const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('student_deal_id, hash, issued_at').in('student_deal_id', deals.map(d => d.id));
            const certMap: Record<string, CertStatus> = {};
            issuedCerts?.forEach((c: any) => { certMap[c.student_deal_id] = { hash: c.hash, issuedAt: c.issued_at }; });
            setCertificates(certMap);

            const { data: prods } = await appBackend.client.from('crm_products').select('name, certificate_template_id').not('certificate_template_id', 'is', null);
            const templateMap: Record<string, string> = {};
            prods?.forEach((p: any) => { templateMap[p.name] = p.certificate_template_id; });
            setProductTemplates(templateMap);
        }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadCourses = async () => {
      const data = await appBackend.getOnlineCourses();
      setOnlineCourses(data || []);
  };

  const openUnlockModal = async (student: StudentDeal) => {
      setUnlockModalStudent(student);
      setIsSavingAccess(true);
      try {
          // Chamada direta ao Supabase para garantir nomes de coluna snake_case
          const { data, error } = await appBackend.client
              .from('crm_student_course_access')
              .select('course_id')
              .eq('student_deal_id', student.id);
          
          if (error) throw error;
          setStudentAccessedIds((data || []).map(d => d.course_id));
      } catch (e) {
          console.error("Erro ao carregar acessos:", e);
      } finally {
          setIsSavingAccess(false);
      }
  };

  const toggleAccess = (courseId: string) => {
      setStudentAccessedIds(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const saveAccessChanges = async () => {
      if (!unlockModalStudent) return;
      setIsSavingAccess(true);
      try {
          // 1. Limpa todos os acessos atuais (Delete)
          const { error: delErr } = await appBackend.client
            .from('crm_student_course_access')
            .delete()
            .eq('student_deal_id', unlockModalStudent.id);
          
          if (delErr) throw delErr;

          // 2. Insere os novos selecionados (Insert)
          if (studentAccessedIds.length > 0) {
              const inserts = studentAccessedIds.map(cid => ({ 
                  student_deal_id: unlockModalStudent.id, 
                  course_id: cid, 
                  unlocked_at: new Date().toISOString() 
              }));
              
              const { error: insertError } = await appBackend.client
                  .from('crm_student_course_access')
                  .insert(inserts);
              
              if (insertError) throw insertError;
          }
          alert("Acessos atualizados com sucesso!");
          setUnlockModalStudent(null);
      } catch (e: any) { 
          alert("Erro ao salvar acessos: " + e.message); 
      } finally { 
          setIsSavingAccess(false); 
      }
  };

  const handleIssueCertificate = async (student: StudentDeal) => {
      const templateId = productTemplates[student.product_name || ''];
      if (!templateId) return;
      if (!window.confirm(`Emitir certificado para ${student.contact_name}?`)) return;
      try {
          const hash = await appBackend.issueCertificate(student.id, templateId);
          setCertificates(prev => ({ ...prev, [student.id]: { hash, issuedAt: new Date().toISOString() } }));
      } catch (e: any) { alert(e.message); }
  };

  const filtered = students.filter(s => (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-teal-600" /> Alunos</h2><p className="text-slate-500 text-sm">Liberação de cursos e certificados.</p></div>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-teal-600 transition-colors"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm" /></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
            {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div> : (
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Produto Base</th>
                            <th className="px-6 py-4 text-center">Certificado</th>
                            <th className="px-6 py-4 text-center">Cursos Online</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(s => {
                            const cert = certificates[s.id];
                            return (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800">{s.company_name || s.contact_name}</td>
                                    <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-black uppercase">{s.product_name || 'Geral'}</span></td>
                                    <td className="px-6 py-4 text-center">
                                        {cert ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-1.5 bg-slate-100 rounded hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-all"><Eye size={14}/></a>
                                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?certificateHash=${cert.hash}`); setCopiedLink(cert.hash); setTimeout(() => setCopiedLink(null), 2000); }} className={clsx("p-1.5 rounded transition-all", copiedLink === cert.hash ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400")}><CheckCircle size={14}/></button>
                                            </div>
                                        ) : <span className="text-[10px] text-slate-300">N/A</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openUnlockModal(s)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 active:scale-95 transition-all"><MonitorPlay size={14}/> Liberar Cursos</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {unlockModalStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                    <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                        <div><h3 className="text-xl font-black text-slate-800">Liberar Cursos Online</h3><p className="text-sm text-slate-500">Aluno: <strong className="text-indigo-600">{unlockModalStudent.company_name || unlockModalStudent.contact_name}</strong></p></div>
                        <button onClick={() => setUnlockModalStudent(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 text-xs text-amber-800 mb-2"><Zap size={18} className="shrink-0 text-amber-500"/><p>Marque os cursos que este aluno deve ter acesso no Portal.</p></div>
                        <div className="grid grid-cols-1 gap-3">
                            {onlineCourses.map(course => (
                                <div key={course.id} onClick={() => toggleAccess(course.id)} className={clsx("p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group", studentAccessedIds.includes(course.id) ? "bg-indigo-50 border-indigo-500 shadow-sm" : "bg-white border-slate-100 hover:border-indigo-200")}>
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-12 h-12 rounded-xl border-2 flex items-center justify-center", studentAccessedIds.includes(course.id) ? "bg-indigo-600 text-white border-white/20" : "bg-slate-50 text-slate-300 border-slate-100 group-hover:text-indigo-400")}><MonitorPlay size={24} /></div>
                                        <p className="font-black text-slate-800 text-sm">{course.title}</p>
                                    </div>
                                    <div className={clsx("w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all", studentAccessedIds.includes(course.id) ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 text-transparent")}><Check size={18} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl"><button onClick={() => setUnlockModalStudent(null)} className="px-6 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button><button onClick={saveAccessChanges} disabled={isSavingAccess} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">{isSavingAccess ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Acessos</button></div>
                </div>
            </div>
        )}
    </div>
  );
};
