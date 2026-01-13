import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  // Added missing icons: List, DollarSign, XCircle
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X, MonitorPlay, Zap, ChevronRight, Check, Save, FileText, ShoppingBag, CreditCard,
  List, DollarSign, XCircle
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
    value: number;
    payment_method: string;
    created_at: string;
    student_access_enabled: boolean;
    class_mod_1?: string;
    class_mod_2?: string;
}

interface CertStatus {
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'cpf_search'>('list');
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([]);
  const [certificates, setCertificates] = useState<Record<string, CertStatus>>({});
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // CPF Search State
  const [cpfSearchQuery, setCpfSearchQuery] = useState('');
  const [searchResultDeals, setSearchResultDeals] = useState<StudentDeal[]>([]);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);

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

  const handleCpfSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanCpf = cpfSearchQuery.replace(/\D/g, '');
      if (cleanCpf.length < 3) return;

      setIsSearchingCpf(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .ilike('cpf', `%${cleanCpf}%`)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setSearchResultDeals(data || []);
      } catch (e) {
          console.error("Erro na busca por CPF:", e);
      } finally {
          setIsSearchingCpf(false);
      }
  };

  const openUnlockModal = async (student: StudentDeal) => {
      setUnlockModalStudent(student);
      setIsSavingAccess(true);
      try {
          const { data, error } = await appBackend.client
              .from('crm_student_course_access')
              .select('course_id')
              .eq('student_deal_id', student.id);
          
          if (error) throw error;
          setStudentAccessedIds((data || []).map(d => d.course_id));
      } catch (e) {
          console.error("Erro ao carregar acessos:", e);
      } finally {
          setIsSearchingCpf(false);
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
          const { error: delErr } = await appBackend.client
            .from('crm_student_course_access')
            .delete()
            .eq('student_deal_id', unlockModalStudent.id);
          
          if (delErr) throw delErr;

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
      if (!templateId) {
          alert("Este produto não possui um modelo de certificado vinculado.");
          return;
      }
      if (!window.confirm(`Deseja emitir agora o certificado para ${student.contact_name}?`)) return;
      try {
          const hash = await appBackend.issueCertificate(student.id, templateId);
          setCertificates(prev => ({ ...prev, [student.id]: { hash, issuedAt: new Date().toISOString() } }));
          alert("Certificado emitido com sucesso!");
      } catch (e: any) { alert(e.message); }
  };

  const filtered = students.filter(s => (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-teal-600" /> Alunos</h2><p className="text-slate-500 text-sm">Liberação de cursos e certificados.</p></div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                <button 
                    onClick={() => setActiveSubTab('list')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'list' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <List size={14}/> Lista Geral
                </button>
                <button 
                    onClick={() => setActiveSubTab('cpf_search')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'cpf_search' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Search size={14}/> Compras por CPF
                </button>
            </div>
        </div>

        {activeSubTab === 'list' ? (
            <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar aluno pelo nome ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium" />
                    </div>
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
                    {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div> : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
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
                                            <td className="px-6 py-4 font-bold text-slate-800">{s.contact_name || s.company_name}</td>
                                            <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-indigo-100">{s.product_name || 'Geral'}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {cert ? (
                                                        <>
                                                            <a 
                                                                href={`/?certificateHash=${cert.hash}`} 
                                                                target="_blank" 
                                                                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm" 
                                                                title="Visualizar Certificado"
                                                            >
                                                                <Eye size={16}/>
                                                            </a>
                                                            <button 
                                                                onClick={() => { 
                                                                    navigator.clipboard.writeText(`${window.location.origin}/?certificateHash=${cert.hash}`); 
                                                                    setCopiedLink(cert.hash); 
                                                                    setTimeout(() => setCopiedLink(null), 2000); 
                                                                }} 
                                                                className={clsx(
                                                                    "p-1.5 border rounded-lg transition-all shadow-sm", 
                                                                    copiedLink === cert.hash ? "bg-green-50 text-green-600 border-green-200" : "bg-white text-slate-500 border-slate-200 hover:bg-teal-50"
                                                                )}
                                                                title="Copiar Link de Autenticidade"
                                                            >
                                                                {copiedLink === cert.hash ? <CheckCircle size={16}/> : <ExternalLink size={16}/>}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleIssueCertificate(s)}
                                                            className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-100 hover:bg-amber-100 transition-all"
                                                        >
                                                            Liberar Agora
                                                        </button>
                                                    )}
                                                </div>
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
            </>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mb-4">
                            <ShoppingBag size={32}/>
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Histórico de Compras</h3>
                        <p className="text-sm text-slate-500 mt-2">Insira o CPF do aluno abaixo para listar todos os produtos e cursos já adquiridos no sistema.</p>
                    </div>

                    <form onSubmit={handleCpfSearch} className="max-w-md mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="000.000.000-00" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                                value={cpfSearchQuery}
                                onChange={e => setCpfSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSearchingCpf}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearchingCpf ? <Loader2 size={18} className="animate-spin" /> : <Search size={18}/>}
                            Buscar
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    {searchResultDeals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResultDeals.map(deal => (
                                <div key={deal.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col group border-l-4 border-l-teal-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                                            <ShoppingBag size={20}/>
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter border",
                                            deal.stage === 'closed' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {deal.stage === 'closed' ? 'Matriculado' : 'Lead'}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-2">{deal.product_name || 'Produto Não Identificado'}</h4>
                                    <div className="space-y-1.5 mb-6 flex-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Calendar size={14} className="text-slate-300"/> Adquirido em: {new Date(deal.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <DollarSign size={14} className="text-slate-300"/> Valor: {formatCurrency(deal.value)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <CreditCard size={14} className="text-slate-300"/> Pagamento: {deal.payment_method || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 border-t pt-4">
                                        <button 
                                            onClick={() => openUnlockModal(deal)}
                                            className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Gerenciar Acesso
                                        </button>
                                        <a 
                                            href={`mailto:${deal.email}`}
                                            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl transition-all"
                                            title="Enviar E-mail"
                                        >
                                            <Mail size={16}/>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !isSearchingCpf && cpfSearchQuery.length > 0 ? (
                        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                            <XCircle size={48} className="opacity-10 mb-4"/>
                            <p className="font-bold">Nenhum registro localizado</p>
                            <p className="text-xs">O CPF informado não possui compras registradas no CRM.</p>
                        </div>
                    ) : null}
                </div>
            </div>
        )}

        {unlockModalStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
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
