
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
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
    product_type?: string;
    status: string;
    stage: string;
    value: number;
    payment_method: string;
    created_at: string;
    student_access_enabled: boolean;
    class_mod_1?: string;
    class_mod_2?: string;
}

interface GroupedStudent {
    cpf: string;
    email: string;
    name: string;
    deals: StudentDeal[];
    presential: string[];
    digital: string[];
    events: string[];
}

interface CertStatus {
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'cpf_search'>('list');
  const [deals, setDeals] = useState<StudentDeal[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([]);
  const [courseAccessMap, setCourseAccessMap] = useState<Record<string, string[]>>({});
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
  const [unlockModalStudent, setUnlockModalStudent] = useState<GroupedStudent | null>(null);
  const [studentAccessedIds, setStudentAccessedIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const { data, error } = await appBackend.client.from('crm_deals').select('*').order('contact_name', { ascending: true });
        if (error) throw error;
        
        const mappedDeals = data.map((s: any) => ({ ...s, student_access_enabled: s.student_access_enabled !== false }));
        setDeals(mappedDeals);

        if (mappedDeals.length > 0) {
            const [issuedCertsRes, prodsRes, coursesRes, accessesRes] = await Promise.all([
                appBackend.client.from('crm_student_certificates').select('student_deal_id, hash, issued_at').in('student_deal_id', mappedDeals.map(d => d.id)),
                appBackend.client.from('crm_products').select('name, certificate_template_id').not('certificate_template_id', 'is', null),
                appBackend.getOnlineCourses(),
                appBackend.client.from('crm_student_course_access').select('student_deal_id, course_id').in('student_deal_id', mappedDeals.map(d => d.id))
            ]);

            const certMap: Record<string, CertStatus> = {};
            issuedCertsRes.data?.forEach((c: any) => { certMap[c.student_deal_id] = { hash: c.hash, issuedAt: c.issued_at }; });
            setCertificates(certMap);

            const templateMap: Record<string, string> = {};
            prodsRes.data?.forEach((p: any) => { templateMap[p.name] = p.certificate_template_id; });
            setProductTemplates(templateMap);

            const courses = coursesRes || [];
            setOnlineCourses(courses);

            const accMap: Record<string, string[]> = {};
            accessesRes.data?.forEach((acc: any) => {
                const course = courses.find(c => c.id === acc.course_id);
                if (course) {
                    if (!accMap[acc.student_deal_id]) accMap[acc.student_deal_id] = [];
                    accMap[acc.student_deal_id].push(course.title);
                }
            });
            setCourseAccessMap(accMap);
        }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const groupedStudents = useMemo(() => {
      const groups: Record<string, GroupedStudent> = {};

      deals.forEach(deal => {
          const cleanCpf = deal.cpf ? deal.cpf.replace(/\D/g, '') : null;
          const key = cleanCpf || deal.email?.toLowerCase().trim() || deal.id;

          if (!groups[key]) {
              groups[key] = {
                  cpf: deal.cpf || '',
                  email: deal.email || '',
                  name: deal.company_name || deal.contact_name || 'Sem Nome',
                  deals: [],
                  presential: [],
                  digital: [],
                  events: []
              };
          }
          
          groups[key].deals.push(deal);
          
          const prodName = deal.product_name || 'Produto Indefinido';
          if (deal.product_type === 'Presencial') {
              if (!groups[key].presential.includes(prodName)) groups[key].presential.push(prodName);
          } else if (deal.product_type === 'Digital') {
              if (!groups[key].digital.includes(prodName)) groups[key].digital.push(prodName);
          } else if (deal.product_type === 'Evento') {
              if (!groups[key].events.includes(prodName)) groups[key].events.push(prodName);
          } else {
              if (!groups[key].digital.includes(prodName)) groups[key].digital.push(prodName);
          }

          // Incluir cursos liberados manualmente na coluna de Produtos Digitais
          const manualCourses = courseAccessMap[deal.id] || [];
          manualCourses.forEach(cName => {
              if (!groups[key].digital.includes(cName)) {
                  groups[key].digital.push(cName);
              }
          });
      });

      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [deals, courseAccessMap]);

  const filtered = groupedStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );

  const formatCPF = (val: string) => {
      if (!val) return '';
      const numbers = val.replace(/\D/g, '');
      return numbers
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value);
      if (formatted.length <= 14) {
          setCpfSearchQuery(formatted);
      }
  };

  const handleCpfSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanCpf = cpfSearchQuery.replace(/\D/g, '');
      if (cleanCpf.length < 3) return;

      setIsSearchingCpf(true);
      try {
          const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
          const { data, error } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .or(`cpf.ilike.%${cleanCpf}%,cpf.ilike.%${formattedCpf}%`)
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setSearchResultDeals(data || []);
      } catch (e) {
          console.error("Erro na busca por CPF:", e);
      } finally {
          setIsSearchingCpf(false);
      }
  };

  const openUnlockModal = async (student: GroupedStudent) => {
      setUnlockModalStudent(student);
      setIsSavingAccess(true);
      const mainDealId = student.deals[0]?.id;
      if (!mainDealId) return;

      try {
          const { data, error } = await appBackend.client
              .from('crm_student_course_access')
              .select('course_id')
              .eq('student_deal_id', mainDealId);
          
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
      const mainDealId = unlockModalStudent.deals[0]?.id;
      if (!mainDealId) return;

      setIsSavingAccess(true);
      try {
          const { error: delErr } = await appBackend.client
            .from('crm_student_course_access')
            .delete()
            .eq('student_deal_id', mainDealId);
          
          if (delErr) throw delErr;

          if (studentAccessedIds.length > 0) {
              const inserts = studentAccessedIds.map(cid => ({ 
                  student_deal_id: mainDealId, 
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
          fetchData(); // Atualiza a listagem principal para refletir os novos cursos na coluna digital
      } catch (e: any) { 
          alert("Erro ao salvar acessos: " + e.message); 
      } finally { 
          setIsSavingAccess(false); 
      }
  };

  const handleIssueCertificate = async (dealId: string, contactName: string, productName: string) => {
      const templateId = productTemplates[productName];
      if (!templateId) {
          alert("Este produto não possui um modelo de certificado vinculado.");
          return;
      }
      if (!window.confirm(`Deseja emitir agora o certificado para ${contactName}?`)) return;
      try {
          const hash = await appBackend.issueCertificate(dealId, templateId);
          setCertificates(prev => ({ ...prev, [dealId]: { hash, issuedAt: new Date().toISOString() } }));
          alert("Certificado emitido com sucesso!");
      } catch (e: any) { alert(e.message); }
  };

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
                        <input type="text" placeholder="Buscar aluno pelo nome, e-mail ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium" />
                    </div>
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
                    {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div> : (
                        <table className="w-full text-left text-sm text-slate-600 border-collapse">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Nome do Aluno</th>
                                    <th className="px-6 py-4">CPF</th>
                                    <th className="px-6 py-4">Curso Presencial</th>
                                    <th className="px-6 py-4">Produtos Digitais</th>
                                    <th className="px-6 py-4">Eventos</th>
                                    <th className="px-6 py-4 text-center">Certificados</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(s => (
                                    <tr key={s.cpf || s.email || s.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{s.name}</span>
                                                <span className="text-[10px] text-slate-400">{s.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-700 whitespace-nowrap">{formatCPF(s.cpf) || '--'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.presential.map(p => <span key={p} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-purple-100">{p}</span>)}
                                                {s.presential.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.digital.map(p => <span key={p} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-indigo-100">{p}</span>)}
                                                {s.digital.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.events.map(p => <span key={p} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-amber-100">{p}</span>)}
                                                {s.events.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 items-center justify-center">
                                                {s.deals.filter(d => !!productTemplates[d.product_name]).map(d => {
                                                    const cert = certificates[d.id];
                                                    return (
                                                        <div key={d.id} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 w-full max-w-[200px]">
                                                            <span className="text-[8px] font-bold text-slate-500 truncate flex-1">{d.product_name}</span>
                                                            {cert ? (
                                                                <div className="flex gap-1">
                                                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-1 bg-white border border-slate-200 rounded text-slate-500 hover:text-teal-600 transition-colors shadow-sm" title="Visualizar"><Eye size={12}/></a>
                                                                    <button 
                                                                        onClick={() => { 
                                                                            navigator.clipboard.writeText(`${window.location.origin}/?certificateHash=${cert.hash}`); 
                                                                            setCopiedLink(cert.hash); 
                                                                            setTimeout(() => setCopiedLink(null), 2000); 
                                                                        }} 
                                                                        className={clsx("p-1 border rounded transition-all shadow-sm", copiedLink === cert.hash ? "bg-green-50 text-green-600 border-green-200" : "bg-white text-slate-500 border-slate-200 hover:bg-teal-50")}
                                                                    >
                                                                        {copiedLink === cert.hash ? <CheckCircle size={12}/> : <ExternalLink size={12}/>}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleIssueCertificate(d.id, s.name, d.product_name)}
                                                                    className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-100 hover:bg-amber-100"
                                                                >
                                                                    Liberar
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {s.deals.every(d => !productTemplates[d.product_name]) && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => openUnlockModal(s)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 active:scale-95 transition-all"><MonitorPlay size={14}/> Liberar Cursos</button>
                                        </td>
                                    </tr>
                                ))}
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
                        <p className="text-sm text-slate-500 mt-2">Insira o CPF do aluno abaixo para listar todos os produtos, eventos e cursos adquiridos.</p>
                    </div>

                    <form onSubmit={handleCpfSearch} className="max-w-md mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="000.000.000-00" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                                value={cpfSearchQuery}
                                onChange={handleCpfChange}
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
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={clsx(
                                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase border",
                                                deal.product_type === 'Evento' ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                                deal.product_type === 'Digital' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                                "bg-teal-50 text-teal-700 border-teal-200"
                                            )}>
                                                {deal.product_type || 'Produto'}
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                                                deal.stage === 'closed' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                            )}>
                                                {deal.stage === 'closed' ? 'Matriculado' : 'Lead'}
                                            </span>
                                        </div>
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
                                            onClick={() => openUnlockModal({
                                                cpf: deal.cpf || '',
                                                email: deal.email || '',
                                                name: deal.company_name || deal.contact_name,
                                                deals: [deal],
                                                presential: [],
                                                digital: [],
                                                events: []
                                            })}
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
                        <div><h3 className="text-xl font-black text-slate-800">Liberar Cursos Online</h3><p className="text-sm text-slate-500">Aluno: <strong className="text-indigo-600">{unlockModalStudent.name}</strong></p></div>
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
