
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X, MonitorPlay, Zap, ChevronRight, Check, Save, FileText, ShoppingBag, CreditCard,
  List, DollarSign, XCircle, Tag, MapPin, Building, User, Briefcase, Hash, Info, Map, FileSpreadsheet, RotateCcw
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { OnlineCourse } from '../types';
import clsx from 'clsx';

declare const XLSX: any;

interface StudentsManagerProps {
  onBack: () => void;
}

interface StudentDeal {
    id: string;
    deal_number?: number;
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
    // Campos adicionais do CRM
    source?: string;
    campaign?: string;
    entry_value?: number;
    installments?: number;
    installment_value?: number;
    first_due_date?: string;
    receipt_link?: string;
    transaction_code?: string;
    zip_code?: string;
    address?: string;
    address_number?: string;
    registration_data?: string;
    observation?: string;
    course_state?: string;
    course_city?: string;
    billing_cnpj?: string;
    billing_company_name?: string;
}

interface ItemRef {
    id: string;
    name: string;
    isCrm: boolean;
}

interface GroupedStudent {
    cpf: string;
    email: string;
    name: string;
    deals: StudentDeal[];
    presential: ItemRef[];
    digital: ItemRef[];
    events: ItemRef[];
}

interface CertStatus {
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'cpf_search' | 'exclusions'>('list');
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
  const [isSearchingCpf, setIsLoadingCpf] = useState(false);

  // Unlock Modal State
  const [unlockModalStudent, setUnlockModalStudent] = useState<GroupedStudent | null>(null);
  const [studentAccessedIds, setStudentAccessedIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // View Only Deal State
  const [viewingDeal, setViewingDeal] = useState<StudentDeal | null>(null);

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

  const getGroupedStudents = (filteredDeals: StudentDeal[]) => {
      const groups: Record<string, GroupedStudent> = {};

      filteredDeals.forEach(deal => {
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
          const itemRef: ItemRef = { id: deal.id, name: prodName, isCrm: true };

          if (deal.product_type === 'Presencial') {
              groups[key].presential.push(itemRef);
          } else if (deal.product_type === 'Digital') {
              groups[key].digital.push(itemRef);
          } else if (deal.product_type === 'Evento') {
              groups[key].events.push(itemRef);
          } else {
              groups[key].digital.push(itemRef);
          }
      });

      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  };

  const groupedStudents = useMemo(() => {
    const activeDeals = deals.filter(d => d.status !== 'excluido');
    return getGroupedStudents(activeDeals);
  }, [deals]);

  const excludedGroupedStudents = useMemo(() => {
    const excludedDeals = deals.filter(d => d.status === 'excluido');
    return getGroupedStudents(excludedDeals);
  }, [deals]);

  const currentGroupedList = activeSubTab === 'exclusions' ? excludedGroupedStudents : groupedStudents;

  const filtered = currentGroupedList.filter(s => 
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

  const handleDeleteItem = async (dealId: string, itemName: string) => {
      if (!window.confirm(`Deseja realmente excluir "${itemName}"? Ele será movido para a aba de Exclusões.`)) return;
      
      try {
          // Soft delete: muda o status para 'excluido'
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'excluido' })
            .eq('id', dealId);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir item: " + e.message);
      }
  };

  const handleRestoreItem = async (dealId: string, itemName: string) => {
      if (!window.confirm(`Deseja restaurar "${itemName}"?`)) return;
      
      try {
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'active' }) // Ou outro status padrão apropriado
            .eq('id', dealId);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao restaurar item: " + e.message);
      }
  };

  const handlePermanentDelete = async (dealId: string, itemName: string) => {
      if (!window.confirm(`ATENÇÃO: Deseja excluir PERMANENTEMENTE "${itemName}"? Esta ação não pode ser desfeita.`)) return;
      
      try {
          const { error } = await appBackend.client.from('crm_deals').delete().eq('id', dealId);
          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir permanentemente: " + e.message);
      }
  };

  const handleDeleteStudent = async (student: GroupedStudent) => {
      if (!window.confirm(`Deseja excluir o aluno ${student.name} e todos os seus itens? Eles serão movidos para Exclusões.`)) return;
      
      try {
          const dealIds = student.deals.map(d => d.id);
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ status: 'excluido' })
            .in('id', dealIds);

          if (error) throw error;
          fetchData();
      } catch (e: any) {
          alert("Erro ao excluir aluno: " + e.message);
      }
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

      setIsLoadingCpf(true);
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
          setIsLoadingCpf(false);
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

  const handleViewDealDetails = (dealId: string) => {
      const deal = deals.find(d => d.id === dealId) || searchResultDeals.find(d => d.id === dealId);
      if (deal) setViewingDeal(deal);
  };

  const exportToExcel = () => {
    if (filtered.length === 0) return;

    const dataToExport = filtered.map(s => ({
        'Nome': s.name,
        'E-mail': s.email,
        'CPF': formatCPF(s.cpf),
        'Produtos Presenciais': s.presential.map(p => p.name).join(', '),
        'Produtos Digitais': s.digital.map(p => p.name).join(', '),
        'Eventos': s.events.map(p => p.name).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, `Lista_Alunos_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                <button 
                    onClick={() => setActiveSubTab('exclusions')}
                    className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeSubTab === 'exclusions' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Trash2 size={14}/> Exclusões
                </button>
            </div>
        </div>

        {(activeSubTab === 'list' || activeSubTab === 'exclusions') ? (
            <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar aluno pelo nome, e-mail ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={exportToExcel}
                            disabled={filtered.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                        >
                            <FileSpreadsheet size={16} /> Exportar Excel
                        </button>
                        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><RefreshCw size={20} className={clsx(isLoading && "animate-spin")} /></button>
                    </div>
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
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(s => (
                                    <tr key={s.cpf || s.email || s.name} className="hover:bg-slate-50 transition-colors group">
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
                                                {s.presential.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:border-purple-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-purple-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
                                                {s.presential.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.digital.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-indigo-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
                                                {s.digital.length === 0 && <span className="text-slate-300 italic text-[10px]">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.events.map(p => (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => p.isCrm && handleViewDealDetails(p.id)}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all",
                                                            activeSubTab === 'exclusions' ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 hover:border-amber-300"
                                                        )}
                                                    >
                                                        {p.isCrm && <span className={clsx("px-1 rounded-[2px] text-[7px] mr-0.5", activeSubTab === 'exclusions' ? "bg-red-600 text-white" : "bg-amber-600 text-white")}>CRM</span>}
                                                        {p.name}
                                                        {activeSubTab === 'exclusions' ? (
                                                            <div className="flex gap-1 ml-1">
                                                                <RotateCcw size={10} onClick={(e) => { e.stopPropagation(); handleRestoreItem(p.id, p.name); }} className="hover:text-green-600" />
                                                                <X size={10} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(p.id, p.name); }} className="hover:text-red-900" />
                                                            </div>
                                                        ) : (
                                                            <X size={10} onClick={(e) => { e.stopPropagation(); handleDeleteItem(p.id, p.name); }} className="hover:text-red-600 ml-1" />
                                                        )}
                                                    </button>
                                                ))}
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
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleDeleteStudent(s)} className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Excluir Aluno"><Trash2 size={16} /></button>
                                            </div>
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
                                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase border flex items-center gap-1",
                                                deal.product_type === 'Evento' ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                                deal.product_type === 'Digital' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                                "bg-teal-50 text-teal-700 border-teal-200"
                                            )}>
                                                <span className="bg-indigo-600 text-white px-1 rounded-[2px] text-[7px]">CRM</span>
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
                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-2 cursor-pointer hover:text-teal-600" onClick={() => handleViewDealDetails(deal.id)}>{deal.product_name || 'Produto Não Identificado'}</h4>
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
                                        <button onClick={() => handleDeleteItem(deal.id, deal.product_name)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-all" title="Excluir Compra"><Trash2 size={16}/></button>
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

        {/* VIEW ONLY DEAL MODAL */}
        {viewingDeal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20"><Briefcase size={24}/></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Negociação Comercial</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Nº {viewingDeal.deal_number} • <span className="text-indigo-600">Visualização de Registro</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setViewingDeal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            
                            {/* DADOS DO CLIENTE */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><User size={14}/> Dados do Cliente</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Nome / Empresa</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.company_name || viewingDeal.contact_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CPF</p>
                                        <p className="text-sm font-bold text-slate-800">{formatCPF(viewingDeal.cpf) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">E-mail</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Mail size={12} className="text-slate-300"/> {viewingDeal.email || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Telefone</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Phone size={12} className="text-slate-300"/> {viewingDeal.phone || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* DADOS DA COMPRA */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><ShoppingBag size={14}/> Detalhes da Compra</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Produto / Curso</p>
                                        <p className="text-sm font-bold text-indigo-700">{viewingDeal.product_name || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Tipo</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.product_type || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Valor Total</p>
                                        <p className="text-sm font-black text-green-700">{formatCurrency(viewingDeal.value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Data Venda</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(viewingDeal.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Forma Pagto.</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.payment_method || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Entrada</p>
                                        <p className="text-sm font-bold text-slate-800">{formatCurrency(viewingDeal.entry_value || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Parcelamento</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.installments || 1}x {formatCurrency(viewingDeal.installment_value || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* TURMA E LOCALIZAÇÃO */}
                            {(viewingDeal.class_mod_1 || viewingDeal.course_city) && (
                                <div className="lg:col-span-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><MapPin size={14}/> Turma e Localização</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cidade / UF</p>
                                            <p className="text-sm font-bold text-slate-800">{viewingDeal.course_city || '--'} / {viewingDeal.course_state || '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cód. Turma Mod 1</p>
                                            <p className="text-sm font-mono font-bold text-slate-600">{viewingDeal.class_mod_1 || '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cód. Turma Mod 2</p>
                                            <p className="text-sm font-mono font-bold text-slate-600">{viewingDeal.class_mod_2 || '--'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DADOS DE FATURAMENTO */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><Building size={14}/> Faturamento Interno</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Empresa</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.billing_company_name || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CNPJ</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{viewingDeal.billing_cnpj || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ADMIN E STATUS */}
                            <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2"><Hash size={14}/> Administrativo</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Status</p>
                                        <span className="text-xs font-black bg-slate-100 px-2 py-0.5 rounded border uppercase">{viewingDeal.status}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Etapa Funil</p>
                                        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase">{viewingDeal.stage}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Fonte</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.source || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Campanha</p>
                                        <p className="text-sm font-bold text-slate-800">{viewingDeal.campaign || '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* OBSERVAÇÕES */}
                            {viewingDeal.observation && (
                                <div className="lg:col-span-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={14}/> Observações</h4>
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm text-amber-900 leading-relaxed italic whitespace-pre-wrap">
                                        {viewingDeal.observation}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="px-10 py-6 bg-slate-50 border-t flex justify-end shrink-0 rounded-b-3xl">
                        <button onClick={() => setViewingDeal(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">Fechar Visualização</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
