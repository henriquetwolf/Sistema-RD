import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap,
  Newspaper, Bell, Sparkles, X, Clock, Image as ImageIcon,
  ArrowRight, Info, Plane, Coffee, Bed, Map, DollarSign, Package, Monitor,
  FileCheck, LayoutDashboard, FileText, CheckCircle, LifeBuoy, FileSignature, ChevronLeft,
  MonitorPlay, Play, CheckCircle2, Circle, Video, Download, Paperclip, AlertTriangle, Edit3, Lock, History, ChevronDown
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { Teacher } from './TeachersManager';
import { Banner, TeacherNews, Contract, SupportTicket, OnlineCourse, CourseModule, CourseLesson, CourseClosing, CourseClosingExpense, CourseClosingHistory } from '../types';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import { CourseClosingForm } from './CourseClosingForm';
import { VOLL_LOGO_BASE64 } from '../utils/constants';
import clsx from 'clsx';

interface InstructorAreaProps {
  instructor: Teacher;
  onLogout: () => void;
}

export const InstructorArea: React.FC<InstructorAreaProps> = ({ instructor, onLogout }) => {
  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'contracts' | 'pending_contracts' | 'trainings' | 'financeiro' | 'fechamentos'>('dashboard');
  const [classes, setClasses] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [news, setNews] = useState<TeacherNews[]>([]);
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [seenNewsIds, setSeenNewsIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [viewingDetails, setViewingDetails] = useState<any | null>(null);
  const [selectedNews, setSelectedNews] = useState<TeacherNews | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const [courseClosingClass, setCourseClosingClass] = useState<any | null>(null);

  // Estados para Fechamentos
  const [myClosings, setMyClosings] = useState<CourseClosing[]>([]);
  const [isLoadingClosings, setIsLoadingClosings] = useState(false);
  const [viewingClosingExpenses, setViewingClosingExpenses] = useState<{ closing: CourseClosing; expenses: CourseClosingExpense[] } | null>(null);
  const [isLoadingClosingExpenses, setIsLoadingClosingExpenses] = useState(false);
  const [editingClosing, setEditingClosing] = useState<{ closing: CourseClosing; expenses: CourseClosingExpense[] } | null>(null);
  const [closingHistory, setClosingHistory] = useState<CourseClosingHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Estados para Financeiro
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [isLoadingFinanceiro, setIsLoadingFinanceiro] = useState(false);
  const [finFilterStatus, setFinFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [finFilterDateFrom, setFinFilterDateFrom] = useState('');
  const [finFilterDateTo, setFinFilterDateTo] = useState('');
  const [finFilterSearch, setFinFilterSearch] = useState('');

  // Estados para Treinamentos (Produtos Digitais)
  const [trainings, setTrainings] = useState<any[]>([]);
  const [playingCourse, setPlayingCourse] = useState<OnlineCourse | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [courseStructure, setCourseStructure] = useState<{ modules: CourseModule[], lessons: Record<string, CourseLesson[]> } | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  useEffect(() => {
    fetchMyClasses();
    fetchBanners();
    fetchNews();
    fetchMyContracts();
    fetchPendingContracts();
    fetchSupportNotifications();
    fetchTrainings();
    
    const saved = localStorage.getItem(`seen_news_${instructor.id}`);
    if (saved) {
        try {
            setSeenNewsIds(JSON.parse(saved));
        } catch (e) {
            setSeenNewsIds([]);
        }
    }
  }, [instructor]);

  const fetchPendingContracts = async () => {
      try {
          const contracts = await appBackend.getPendingContractsByEmail(instructor.email);
          setPendingContracts(contracts);
      } catch (e) {
          console.error("Erro ao buscar contratos pendentes:", e);
      }
  };

  const fetchSupportNotifications = async () => {
      try {
          const tickets = await appBackend.getSupportTicketsBySender(instructor.id);
          const pending = tickets.filter(t => t.status === 'pending').length;
          setPendingTicketsCount(pending);
      } catch (e) {
          console.error("Erro ao buscar notificações de suporte:", e);
      }
  };

  const fetchMyClosings = async () => {
      setIsLoadingClosings(true);
      try {
          const data = await appBackend.fetchInstructorClosings(instructor.id);
          setMyClosings(data);
      } catch (e) {
          console.error("Erro ao buscar fechamentos:", e);
      } finally {
          setIsLoadingClosings(false);
      }
  };

  const handleViewClosingExpenses = async (closing: CourseClosing) => {
      setIsLoadingClosingExpenses(true);
      setIsLoadingHistory(true);
      setClosingHistory([]);
      setExpandedHistoryId(null);
      setViewingClosingExpenses({ closing, expenses: [] });
      try {
          const [expData, histData] = await Promise.all([
              appBackend.fetchCourseClosingExpenses(closing.id),
              appBackend.fetchCourseClosingHistory(closing.id).catch(() => [] as CourseClosingHistory[]),
          ]);
          setViewingClosingExpenses({ closing, expenses: expData });
          setClosingHistory(histData);
      } catch (e) {
          console.error("Erro ao buscar despesas:", e);
      } finally {
          setIsLoadingClosingExpenses(false);
          setIsLoadingHistory(false);
      }
  };

  const handleEditClosing = async (closing: CourseClosing) => {
      try {
          const expenses = await appBackend.fetchCourseClosingExpenses(closing.id);
          setEditingClosing({ closing, expenses });
      } catch (e) {
          console.error("Erro ao buscar despesas para edição:", e);
      }
  };

  const fetchNews = async () => {
      try {
          const data = await appBackend.getTeacherNews();
          setNews(data);
      } catch (e) {
          console.error("Erro ao buscar novidades:", e);
      }
  };

  const fetchBanners = async () => {
      try {
          const data = await appBackend.getBanners('instructor');
          setBanners(data);
      } catch (e) {
          console.error("Failed to load banners", e);
      }
  };

  const fetchMyContracts = async () => {
      try {
          const allContracts = await appBackend.getContracts();
          const filtered = allContracts.filter(c => 
            c.signers.some(s => s.email.toLowerCase() === instructor.email.toLowerCase() && s.status === 'signed')
          );
          setMyContracts(filtered);
      } catch (e) {
          console.error("Erro ao buscar contratos do instrutor:", e);
      }
  };

  const fetchMyClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .or(`instructor_mod_1.eq."${instructor.fullName}",instructor_mod_2.eq."${instructor.fullName}"`)
        .order('date_mod_1', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (e) {
      console.error("Erro ao buscar turmas do instrutor:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainings = async () => {
      try {
          const { data } = await appBackend.client
              .from('crm_products')
              .select('*')
              .contains('target_areas', ['instructor'])
              .eq('status', 'active');
          if (data) setTrainings(data);
      } catch (e) {}
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const applyFinFilter = (arr: any[]) => {
      const today = new Date().toISOString().slice(0, 10);
      return arr.filter(item => {
          if (finFilterStatus === 'paid') {
              const s = (item.status || '').toUpperCase();
              if (s !== 'RECEBIDO' && s !== 'LIQUIDADO' && s !== 'PAGO') return false;
          } else if (finFilterStatus === 'pending') {
              const s = (item.status || '').toUpperCase();
              if (s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO') return false;
              if (item.data_vencimento && item.data_vencimento < today) return false;
          } else if (finFilterStatus === 'overdue') {
              const s = (item.status || '').toUpperCase();
              if (s === 'RECEBIDO' || s === 'LIQUIDADO' || s === 'PAGO') return false;
              if (!item.data_vencimento || item.data_vencimento >= today) return false;
          }
          if (finFilterDateFrom && item.data_vencimento && item.data_vencimento < finFilterDateFrom) return false;
          if (finFilterDateTo && item.data_vencimento && item.data_vencimento > finFilterDateTo) return false;
          if (finFilterSearch) {
              const q = finFilterSearch.toLowerCase();
              if (!(item.descricao || '').toLowerCase().includes(q) && !(item.categoria_nome || '').toLowerCase().includes(q)) return false;
          }
          return true;
      });
  };

  const filteredReceivables = useMemo(() => applyFinFilter(receivables), [receivables, finFilterStatus, finFilterDateFrom, finFilterDateTo, finFilterSearch]);
  const filteredPayables = useMemo(() => applyFinFilter(payables), [payables, finFilterStatus, finFilterDateFrom, finFilterDateTo, finFilterSearch]);

  const fetchFinanceiro = async () => {
      setIsLoadingFinanceiro(true);
      try {
          const rawCpf = (instructor.cpf || '').trim();
          const cleanCpf = rawCpf.replace(/\D/g, '');
          const rawCnpj = (instructor.cnpj || '').trim();
          const cleanCnpj = rawCnpj.replace(/\D/g, '');

          const docVariants = new Set<string>();
          if (cleanCpf.length >= 11) {
              docVariants.add(cleanCpf);
              docVariants.add(rawCpf);
              if (cleanCpf.length === 11) docVariants.add(cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
          }
          if (cleanCnpj.length >= 14) {
              docVariants.add(cleanCnpj);
              docVariants.add(rawCnpj);
              docVariants.add(cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
          }

          const queries: Promise<any>[] = [];

          if (docVariants.size > 0) {
              const variants = [...docVariants];
              queries.push(
                  appBackend.client.from('conta_azul_contas_receber').select('*').in('contato_cpf', variants).order('data_vencimento', { ascending: false }),
                  appBackend.client.from('conta_azul_contas_pagar').select('*').in('contato_cpf', variants).order('data_vencimento', { ascending: false }),
              );
          } else {
              queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
          }

          const nameVariants = [...new Set([instructor.fullName?.trim(), instructor.companyName?.trim()].filter(Boolean))] as string[];
          if (nameVariants.length > 0) {
              for (const name of nameVariants) {
                  queries.push(
                      appBackend.client.from('conta_azul_contas_receber').select('*').ilike('contato_nome', `%${name}%`).order('data_vencimento', { ascending: false }),
                      appBackend.client.from('conta_azul_contas_pagar').select('*').ilike('fornecedor_nome', `%${name}%`).order('data_vencimento', { ascending: false }),
                  );
              }
          }

          const results = await Promise.all(queries);
          const allReceber: any[] = [];
          const allPagar: any[] = [];
          allReceber.push(...(results[0]?.data || []));
          allPagar.push(...(results[1]?.data || []));
          for (let i = 2; i < results.length; i += 2) {
              allReceber.push(...(results[i]?.data || []));
              if (results[i + 1]) allPagar.push(...(results[i + 1]?.data || []));
          }

          const dedup = (arr: any[]) => {
              const seen = new Map<string, any>();
              for (const item of arr) {
                  const key = item.id_conta_azul || item.id;
                  const existing = seen.get(key);
                  if (!existing || (item.synced_at && (!existing.synced_at || item.synced_at > existing.synced_at))) {
                      seen.set(key, item);
                  }
              }
              return Array.from(seen.values());
          };

          setReceivables(dedup(allReceber));
          setPayables(dedup(allPagar));
      } catch (e) {
          console.error("Erro ao buscar dados financeiros:", e);
      } finally {
          setIsLoadingFinanceiro(false);
      }
  };

  const handleOpenCoursePlayer = async (product: any) => {
      setIsLoading(true);
      try {
          const onlineCourses = await appBackend.getOnlineCourses();
          const course = onlineCourses.find(c => c.title.toLowerCase() === product.name.toLowerCase());
          
          if (!course) {
              alert("Conteúdo técnico deste treinamento ainda não configurado.");
              return;
          }

          const mods = await appBackend.getCourseModules(course.id);
          const lessonsMap: Record<string, CourseLesson[]> = {};
          let firstLesson: CourseLesson | null = null;
          for (const mod of mods) {
              const lessons = await appBackend.getModuleLessons(mod.id);
              lessonsMap[mod.id] = lessons;
              if (!firstLesson && lessons.length > 0) firstLesson = lessons[0];
          }
          setCourseStructure({ modules: mods, lessons: lessonsMap });
          setPlayingCourse(course);
          setActiveLesson(firstLesson);
      } catch (e) {} finally { setIsLoading(false); }
  };

  const markNewsAsSeen = (item: TeacherNews) => {
      if (!seenNewsIds.includes(item.id)) {
          const updated = [...seenNewsIds, item.id];
          setSeenNewsIds(updated);
          localStorage.setItem(`seen_news_${instructor.id}`, JSON.stringify(updated));
      }
      setSelectedNews(item);
  };

  const unreadCount = useMemo(() => {
      return news.filter(n => !seenNewsIds.includes(n.id)).length;
  }, [news, seenNewsIds]);

  if (playingCourse && courseStructure) {
      return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans animate-in fade-in">
              <header className="bg-slate-800/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
                  <button onClick={() => setPlayingCourse(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all font-bold text-sm">
                      <ChevronLeft size={20}/> Voltar
                  </button>
                  <h2 className="text-sm font-black uppercase tracking-widest text-orange-400">{playingCourse.title}</h2>
                  <div className="w-24"></div>
              </header>
              <div className="flex-1 flex overflow-hidden">
                  <main className="flex-1 overflow-y-auto custom-scrollbar-dark p-8">
                      {activeLesson ? (
                          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                              <div className="aspect-video bg-black rounded-[2rem] shadow-2xl overflow-hidden border border-white/5 relative">
                                  {activeLesson.videoUrl ? (
                                      <div 
                                          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0"
                                          dangerouslySetInnerHTML={{ __html: activeLesson.videoUrl }}
                                      />
                                  ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                          <Video size={64} className="opacity-20 mb-4" />
                                          <p className="font-bold">Esta aula não possui vídeo.</p>
                                      </div>
                                  )}
                              </div>
                              <div className="space-y-4">
                                  <h1 className="text-3xl font-black">{activeLesson.title}</h1>
                                  <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{activeLesson.description || 'Nenhuma descrição.'}</p>
                                  {(activeLesson.materials || []).length > 0 && (
                                      <div className="pt-6">
                                          <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-4">Materiais de Apoio</h4>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              {activeLesson.materials.map((mat, i) => (
                                                  <a key={i} href={mat.url} target="_blank" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                                                      <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg group-hover:scale-110 transition-transform"><FileText size={18}/></div>
                                                      <span className="text-xs font-bold text-slate-200 truncate">{mat.name}</span>
                                                      <Download size={14} className="ml-auto text-slate-500" />
                                                  </a>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex items-center justify-center text-slate-500 italic">Selecione uma aula para começar.</div>
                      )}
                  </main>
                  <aside className="w-80 bg-slate-800/30 border-l border-white/5 flex flex-col shrink-0">
                      <div className="p-6 border-b border-white/5">
                          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Conteúdo do Treinamento</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-4 space-y-4">
                          {courseStructure.modules.map(mod => (
                              <div key={mod.id} className="space-y-2">
                                  <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-2 mb-3">{mod.title}</h4>
                                  <div className="space-y-1">
                                      {(courseStructure.lessons[mod.id] || []).map(lesson => (
                                          <button 
                                              key={lesson.id} 
                                              onClick={() => setActiveLesson(lesson)}
                                              className={clsx(
                                                  "w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all group",
                                                  activeLesson?.id === lesson.id ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                                              )}
                                          >
                                              <div className={clsx("mt-0.5 shrink-0", activeLesson?.id === lesson.id ? "text-white" : "text-slate-600")}>
                                                  <Play size={16}/>
                                              </div>
                                              <div className="min-w-0">
                                                  <p className={clsx("text-xs font-bold truncate", activeLesson?.id === lesson.id ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>{lesson.title}</p>
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </aside>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black border-2 border-orange-100 shadow-sm overflow-hidden">
                {instructor.photoUrl ? (
                    <img src={instructor.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    instructor.fullName.substring(0, 1)
                )}
             </div>
             <div>
                <h1 className="text-sm font-black text-slate-800 leading-tight">{instructor.fullName}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal do Instrutor</span>
                    {instructor.teacherLevel && (
                        <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                            <GraduationCap size={10} /> {instructor.teacherLevel}
                        </span>
                    )}
                    {instructor.levelHonorarium > 0 && (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                            <DollarSign size={10} /> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(instructor.levelHonorarium)}
                        </span>
                    )}
                    {unreadCount > 0 && (
                        <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
                            <Bell size={10} fill="currentColor" /> {unreadCount} NOVAS
                        </div>
                    )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => { setShowSupportModal(true); setPendingTicketsCount(0); }}
                className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 flex items-center gap-2 font-bold text-xs relative"
            >
                <LifeBuoy size={20} /> Suporte
                {pendingTicketsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                        {pendingTicketsCount}
                    </span>
                )}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button 
                onClick={onLogout}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                title="Sair"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
        
        {/* Notificação de Contratos Pendentes */}
        {pendingContracts.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-amber-500/10 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md">
                        <FileSignature size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-amber-900">Assinaturas Pendentes</h3>
                        <p className="text-sm text-amber-700 font-medium">Existem {pendingContracts.length} documentos aguardando sua assinatura digital.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setActiveViewTab('pending_contracts')}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
                >
                    Assinar Agora
                </button>
            </div>
        )}

        <div className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveViewTab('dashboard')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'dashboard' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
                onClick={() => setActiveViewTab('trainings')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'trainings' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <MonitorPlay size={18} /> Treinamentos e Materiais
            </button>
            <button 
                onClick={() => { setActiveViewTab('financeiro'); if (receivables.length === 0 && payables.length === 0) fetchFinanceiro(); }}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'financeiro' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <DollarSign size={18} /> Financeiro
            </button>
            <button 
                onClick={() => { setActiveViewTab('fechamentos'); if (myClosings.length === 0) fetchMyClosings(); }}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'fechamentos' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <FileText size={18} /> Fechamentos
                {myClosings.length > 0 && (
                    <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px]">{myClosings.length}</span>
                )}
            </button>
            <button
                onClick={() => setActiveViewTab('pending_contracts')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap relative",
                    activeViewTab === 'pending_contracts' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <FileSignature size={18} /> Assinar
                {pendingContracts.length > 0 && (
                    <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">{pendingContracts.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveViewTab('contracts')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'contracts' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <FileCheck size={18} /> Histórico
                {myContracts.length > 0 && (
                    <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px]">{myContracts.length}</span>
                )}
            </button>
        </div>

        {activeViewTab === 'dashboard' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
                {banners.length > 0 && (
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map(banner => (
                            <a 
                                key={banner.id}
                                href={banner.linkUrl || '#'}
                                target={banner.linkUrl ? "_blank" : "_self"}
                                rel="noreferrer"
                                className={clsx(
                                    "block rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border-4 border-white",
                                    !banner.linkUrl && "cursor-default"
                                )}
                            >
                                <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover max-h-48" />
                            </a>
                        ))}
                    </section>
                )}

                {news.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Newspaper size={14} className="text-orange-600" /> Mural de Novidades
                            </h3>
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                            {news.map(item => {
                                const isUnseen = !seenNewsIds.includes(item.id);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => markNewsAsSeen(item)}
                                        className={clsx(
                                            "min-w-[280px] md:min-w-[320px] bg-white rounded-[2rem] p-5 border-2 transition-all cursor-pointer group relative overflow-hidden",
                                            isUnseen ? "border-orange-500 shadow-lg shadow-orange-500/5 ring-4 ring-orange-50" : "border-slate-100 hover:border-orange-200"
                                        )}
                                    >
                                        {isUnseen && (
                                            <div className="absolute top-4 right-4 w-3 h-3 bg-orange-600 rounded-full border-2 border-white shadow-sm z-10"></div>
                                        )}
                                        <div className="flex gap-4 items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={clsx("text-sm font-black truncate mb-1", isUnseen ? "text-orange-900" : "text-slate-700")}>{item.title}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{item.content}</p>
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                    <Clock size={10}/> {new Date(item.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                        <GraduationCap size={24} className="text-purple-600" /> Minhas Turmas Programadas
                    </h2>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-purple-600 mb-2" />
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronizando agenda...</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Calendar size={40} />
                            </div>
                            <h3 className="text-lg font-black text-slate-700">Nenhuma turma para exibir</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
                                Você será notificado assim que for escalado para um novo curso.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map(cls => {
                                const isMod1 = cls.instructor_mod_1 === instructor.fullName;
                                const isMod2 = cls.instructor_mod_2 === instructor.fullName;
                                
                                return (
                                    <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col group border-b-8 border-b-purple-500">
                                        <div className="p-8 flex-1">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-4 bg-purple-50 rounded-3xl text-purple-600 group-hover:rotate-12 transition-transform">
                                                    <Calendar size={32} />
                                                </div>
                                                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-500">#{cls.class_code}</span>
                                            </div>

                                            <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight min-h-[56px] line-clamp-2" title={cls.course}>
                                                {cls.course}
                                            </h3>
                                            
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
                                                <MapPin size={16} className="text-purple-500" />
                                                {cls.city}, {cls.state}
                                            </div>

                                            <div className="space-y-3 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                                                {isMod1 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Módulo 1</span>
                                                        <span className="text-xs font-black text-slate-700">
                                                            {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </span>
                                                    </div>
                                                )}
                                                {isMod2 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Módulo 2</span>
                                                        <span className="text-xs font-black text-slate-700">
                                                            {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col border-t border-slate-100 bg-slate-50">
                                            <button 
                                                onClick={() => setViewingDetails(cls)}
                                                className="px-8 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-white transition-all border-b border-slate-100 group/det"
                                            >
                                                <span className="flex items-center gap-2"><Info size={14} /> Ver Detalhes Logísticos</span>
                                                <ChevronRight size={14} className="group-hover/det:translate-x-1 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => setCourseClosingClass(cls)}
                                                className="px-8 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-white transition-all border-b border-slate-100 group/closing"
                                            >
                                                <span className="flex items-center gap-2"><FileText size={14} /> Fechamento de Curso</span>
                                                <ChevronRight size={14} className="group-hover/closing:translate-x-1 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => setSelectedClass({
                                                    id: cls.id,
                                                    course: cls.course,
                                                    city: cls.city,
                                                    state: cls.state,
                                                    mod1Code: cls.mod_1_code,
                                                    mod2Code: cls.mod_2_code,
                                                    dateMod1: cls.date_mod_1,
                                                    dateMod2: cls.date_mod_2
                                                })}
                                                className="px-8 py-5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500 hover:text-purple-700 hover:bg-white transition-all group/btn"
                                            >
                                                Ver Lista de Alunos
                                                <ArrowRight size={18} className="text-slate-300 group-hover/btn:translate-x-1 group-hover/btn:text-purple-600 transition-all" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        ) : activeViewTab === 'trainings' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <MonitorPlay size={24} className="text-orange-600" /> Treinamentos e Materiais
                    </h2>
                </div>

                {trainings.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-700">Nenhum treinamento liberado</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
                            Seu material didático e treinamentos técnicos aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trainings.map(product => (
                            <div key={product.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group cursor-pointer" onClick={() => handleOpenCoursePlayer(product)}>
                                <div className="h-48 relative overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                            <MonitorPlay size={48} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-xl">
                                            <Play size={24} className="text-orange-600 fill-orange-600 ml-1" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{product.category}</span>
                                    <h3 className="font-black text-slate-800 mb-2 leading-tight">{product.name}</h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-medium">{product.description}</p>
                                    <div className="mt-auto flex items-center text-xs font-black text-orange-600 uppercase tracking-widest">
                                        Acessar Conteúdo <ArrowRight size={14} className="ml-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : activeViewTab === 'financeiro' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <DollarSign size={24} className="text-orange-600" /> Meu Financeiro
                    </h2>
                    <button onClick={fetchFinanceiro} disabled={isLoadingFinanceiro} className="text-xs font-bold text-slate-400 hover:text-orange-600 flex items-center gap-1.5 transition-all disabled:opacity-50">
                        <Loader2 size={14} className={isLoadingFinanceiro ? 'animate-spin' : 'hidden'} /> Atualizar
                    </button>
                </div>

                {isLoadingFinanceiro ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500 mb-4" />
                        <p className="text-sm font-bold text-slate-400">Carregando dados financeiros...</p>
                    </div>
                ) : !instructor.cpf?.replace(/\D/g, '') && !instructor.cnpj?.replace(/\D/g, '') && receivables.length === 0 && payables.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <DollarSign size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-black text-slate-700">CPF/CNPJ não cadastrado</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                            Seu CPF ou CNPJ não está vinculado ao seu cadastro. Entre em contato com a administração para atualizar seus dados.
                        </p>
                    </div>
                ) : receivables.length === 0 && payables.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-700">Nenhum registro financeiro</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                            Não foram encontradas contas a receber ou a pagar vinculadas ao seu cadastro.
                        </p>
                    </div>
                ) : (
                    <>
                        {(receivables.length > 0 || payables.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase">A Receber (Total)</p>
                                    <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(payables.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0))}</p>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase">Já Recebido</p>
                                    <p className="text-xl font-black text-blue-700 mt-1">{formatCurrency(payables.reduce((s: number, p: any) => s + (Number(p.valor_pago) || 0), 0))}</p>
                                </div>
                                <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                                    <p className="text-[10px] font-black text-red-600 uppercase">A Pagar (Total)</p>
                                    <p className="text-xl font-black text-red-700 mt-1">{formatCurrency(receivables.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0))}</p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase">Em Aberto (Pagar)</p>
                                    <p className="text-xl font-black text-amber-700 mt-1">{formatCurrency(receivables.reduce((s: number, r: any) => s + ((Number(r.valor) || 0) - (Number(r.valor_pago) || 0)), 0))}</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[140px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Status</label>
                                <select value={finFilterStatus} onChange={e => setFinFilterStatus(e.target.value as any)} className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none">
                                    <option value="all">Todos</option>
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago / Recebido</option>
                                    <option value="overdue">Vencido</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[130px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">De</label>
                                <input type="date" value={finFilterDateFrom} onChange={e => setFinFilterDateFrom(e.target.value)} className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                            </div>
                            <div className="flex-1 min-w-[130px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Até</label>
                                <input type="date" value={finFilterDateTo} onChange={e => setFinFilterDateTo(e.target.value)} className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                            </div>
                            <div className="flex-[2] min-w-[180px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Buscar</label>
                                <input type="text" placeholder="Descrição ou categoria..." value={finFilterSearch} onChange={e => setFinFilterSearch(e.target.value)} className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                            </div>
                            {(finFilterStatus !== 'all' || finFilterDateFrom || finFilterDateTo || finFilterSearch) && (
                                <button onClick={() => { setFinFilterStatus('all'); setFinFilterDateFrom(''); setFinFilterDateTo(''); setFinFilterSearch(''); }} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase px-3 py-2">Limpar</button>
                            )}
                        </div>

                        {/* Contas a Receber (dados de contas_pagar da empresa = o que o instrutor recebe) */}
                        <div>
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-600"/> Contas a Receber
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">{filteredPayables.length}</span>
                            </h3>
                            {filteredPayables.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                    <DollarSign size={40} className="mx-auto opacity-20 mb-3"/>
                                    <p className="font-bold text-sm">Nenhuma conta a receber encontrada</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Descrição</th>
                                                    <th className="px-4 py-3 text-left">Categoria</th>
                                                    <th className="px-4 py-3 text-center">Parcela</th>
                                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                    <th className="px-4 py-3 text-right">Recebido</th>
                                                    <th className="px-4 py-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredPayables.map((p: any) => {
                                                    const isPaid = p.status?.toUpperCase() === 'PAGO' || p.status?.toUpperCase() === 'LIQUIDADO';
                                                    const isOverdue = !isPaid && p.data_vencimento && new Date(p.data_vencimento) < new Date();
                                                    return (
                                                        <tr key={p.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-slate-700 truncate max-w-[250px]">{p.descricao || '--'}</p>
                                                                {p.numero_documento && <p className="text-[10px] text-slate-400 mt-0.5">Doc: {p.numero_documento}</p>}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs">{p.categoria_nome || '--'}</td>
                                                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                                                                {p.parcela_numero && p.total_parcelas ? `${p.parcela_numero}/${p.total_parcelas}` : '--'}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs">
                                                                <span className={clsx("font-bold", isOverdue ? "text-red-600" : "text-slate-600")}>
                                                                    {p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(p.valor) || 0)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(Number(p.valor_pago) || 0)}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border uppercase",
                                                                    isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                    isOverdue ? "bg-red-50 text-red-700 border-red-200" :
                                                                    "bg-amber-50 text-amber-700 border-amber-200"
                                                                )}>{isPaid ? 'RECEBIDO' : isOverdue ? 'VENCIDO' : 'PENDENTE'}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between text-xs font-bold text-slate-500">
                                        <span>Total: {filteredPayables.length} registro(s)</span>
                                        <div className="flex gap-4">
                                            <span>Valor total: <span className="text-slate-800">{formatCurrency(filteredPayables.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0))}</span></span>
                                            <span>Total recebido: <span className="text-emerald-600">{formatCurrency(filteredPayables.reduce((s: number, p: any) => s + (Number(p.valor_pago) || 0), 0))}</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contas a Pagar (dados de contas_receber da empresa = o que o instrutor deve) */}
                        <div>
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-red-500"/> Contas a Pagar
                                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">{filteredReceivables.length}</span>
                            </h3>
                            {filteredReceivables.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                    <DollarSign size={40} className="mx-auto opacity-20 mb-3"/>
                                    <p className="font-bold text-sm">Nenhuma conta a pagar encontrada</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Descrição</th>
                                                    <th className="px-4 py-3 text-left">Categoria</th>
                                                    <th className="px-4 py-3 text-center">Parcela</th>
                                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                                    <th className="px-4 py-3 text-right">Valor</th>
                                                    <th className="px-4 py-3 text-right">Pago</th>
                                                    <th className="px-4 py-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredReceivables.map((r: any) => {
                                                    const isPaid = r.status?.toUpperCase() === 'RECEBIDO' || r.status?.toUpperCase() === 'LIQUIDADO';
                                                    const isOverdue = !isPaid && r.data_vencimento && new Date(r.data_vencimento) < new Date();
                                                    return (
                                                        <tr key={r.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-slate-700 truncate max-w-[250px]">{r.descricao || '--'}</p>
                                                                {r.numero_documento && <p className="text-[10px] text-slate-400 mt-0.5">Doc: {r.numero_documento}</p>}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs">{r.categoria_nome || '--'}</td>
                                                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                                                                {r.parcela_numero && r.total_parcelas ? `${r.parcela_numero}/${r.total_parcelas}` : '--'}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs">
                                                                <span className={clsx("font-bold", isOverdue ? "text-red-600" : "text-slate-600")}>
                                                                    {r.data_vencimento ? new Date(r.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(Number(r.valor) || 0)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(Number(r.valor_pago) || 0)}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border uppercase",
                                                                    isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                    isOverdue ? "bg-red-50 text-red-700 border-red-200" :
                                                                    "bg-amber-50 text-amber-700 border-amber-200"
                                                                )}>{isPaid ? 'PAGO' : isOverdue ? 'VENCIDO' : 'PENDENTE'}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between text-xs font-bold text-slate-500">
                                        <span>Total: {filteredReceivables.length} registro(s)</span>
                                        <div className="flex gap-4">
                                            <span>Valor total: <span className="text-slate-800">{formatCurrency(filteredReceivables.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0))}</span></span>
                                            <span>Total pago: <span className="text-emerald-600">{formatCurrency(filteredReceivables.reduce((s: number, r: any) => s + (Number(r.valor_pago) || 0), 0))}</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        ) : activeViewTab === 'fechamentos' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileText size={24} className="text-emerald-500" /> Meus Fechamentos de Curso
                    </h2>
                </div>
                {isLoadingClosings ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
                ) : myClosings.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-700">Nenhum fechamento enviado</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                            Quando você enviar um fechamento de curso, ele aparecerá aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myClosings.map(closing => {
                            const statusColors: Record<string, string> = {
                                pendente: 'bg-amber-50 text-amber-700 border-amber-200',
                                aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                rejeitado: 'bg-red-50 text-red-700 border-red-200',
                            };
                            const statusLabels: Record<string, string> = {
                                pendente: 'Pendente',
                                aprovado: 'Aprovado',
                                rejeitado: 'Rejeitado',
                            };
                            const isRejected = closing.status === 'rejeitado';
                            const isApproved = closing.status === 'aprovado';
                            return (
                                <div key={closing.id} className={clsx(
                                    "bg-white rounded-[2rem] border shadow-sm overflow-hidden hover:shadow-lg transition-all",
                                    isRejected ? "border-red-300 ring-2 ring-red-100" : "border-slate-200"
                                )}>
                                    {isRejected && (
                                        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex gap-3 items-start">
                                            <div className="shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                                                <AlertTriangle size={16} className="text-red-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black text-red-800 uppercase tracking-wide mb-1">Fechamento Rejeitado</h4>
                                                {closing.admin_notes && (
                                                    <p className="text-sm text-red-700 leading-relaxed">{closing.admin_notes}</p>
                                                )}
                                                <p className="text-[10px] font-bold text-red-400 mt-2">Clique em "Editar" para corrigir e reenviar.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-base font-black text-slate-800 truncate">{closing.course_name}</h3>
                                                <span className="text-[9px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">#{closing.class_code}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1"><MapPin size={12} className="text-purple-500" /> {closing.city}</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {closing.date_start ? new Date(closing.date_start + 'T00:00:00').toLocaleDateString('pt-BR') : '--'} — {closing.date_end ? new Date(closing.date_end + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    Enviado em {closing.created_at ? new Date(closing.created_at).toLocaleDateString('pt-BR') : '--'}
                                                </span>
                                            </div>
                                            {closing.admin_notes && closing.status === 'aprovado' && (
                                                <div className="mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                                    <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Observação da Administração</p>
                                                    <p className="text-xs text-emerald-700">{closing.admin_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={clsx("text-[9px] font-black px-3 py-1.5 rounded-full border uppercase", statusColors[closing.status] || 'bg-slate-50 text-slate-500 border-slate-200')}>
                                                {statusLabels[closing.status] || closing.status}
                                            </span>
                                            {isRejected && (
                                                <button
                                                    onClick={() => handleEditClosing(closing)}
                                                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 hover:text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <Edit3 size={12} /> Editar
                                                </button>
                                            )}
                                            {isApproved && (
                                                <span className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-default" title="Fechamento aprovado não pode ser editado">
                                                    <Lock size={12} /> Finalizado
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleViewClosingExpenses(closing)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                            >
                                                <ExternalLink size={12} /> Detalhes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        ) : activeViewTab === 'pending_contracts' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                    <FileSignature size={24} className="text-amber-500" /> Contratos Aguardando Assinatura
                </h2>
                {pendingContracts.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <CheckCircle size={40} className="mx-auto text-green-500 opacity-20 mb-4" />
                        <h3 className="text-lg font-black text-slate-700">Tudo em dia!</h3>
                        <p className="text-slate-500 text-sm font-medium">Não há documentos pendentes para você no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pendingContracts.map(c => (
                            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all border-l-8 border-l-amber-500">
                                <h3 className="text-xl font-black text-slate-800 mb-2">{c.title}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-8">Pendente desde {new Date(c.createdAt).toLocaleDateString()}</p>
                                <button 
                                    onClick={() => setSigningContract(c)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <FileSignature size={18}/> Assinar Documento Agora
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileCheck size={24} className="text-teal-600" /> Meus Contratos Assinados
                    </h2>
                </div>

                {myContracts.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-700">Nenhum contrato assinado</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
                            Seus documentos e termos de prestação de serviço assinados digitalmente aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myContracts.map(contract => {
                            const mySigner = contract.signers.find(s => s.email.toLowerCase() === instructor.email.toLowerCase());
                            return (
                                <div key={contract.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all">
                                            <FileCheck size={24} />
                                        </div>
                                        <div className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <CheckCircle size={10} /> Assinado
                                        </div>
                                    </div>
                                    <h3 className="font-black text-slate-800 mb-2 truncate" title={contract.title}>{contract.title}</h3>
                                    <div className="space-y-1.5 mb-6 flex-1">
                                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar size={12}/> Emitido: {new Date(contract.createdAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5"><Clock size={12}/> Assinado em: {mySigner?.signedAt ? new Date(mySigner.signedAt).toLocaleDateString() : 'Recentemente'}</p>
                                    </div>
                                    <button 
                                        onClick={() => setViewingContract(contract)}
                                        className="w-full py-4 bg-slate-50 hover:bg-teal-600 hover:text-white text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 border border-slate-100"
                                    >
                                        Visualizar Documento
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Modal de Assinatura Interno */}
      {signingContract && (
          <div className="fixed inset-0 z-[400] bg-white overflow-y-auto animate-in zoom-in-95">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                  <button onClick={() => setSigningContract(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
                      <ChevronLeft size={20}/> Cancelar Assinatura
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinatura Digital Segura</span>
              </div>
              <ContractSigning 
                  contract={signingContract} 
                  onFinish={() => {
                      setSigningContract(null);
                      fetchPendingContracts();
                      fetchMyContracts();
                      setActiveViewTab('contracts');
                  }}
              />
          </div>
      )}

      {selectedClass && (
          <ClassStudentsViewer 
              classItems={[selectedClass]} 
              onClose={() => setSelectedClass(null)} 
              variant="modal"
              hideFinancials={true} 
              canTakeAttendance={true} 
          />
      )}

      {viewingDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-[2.5rem]">
                      <div>
                          <h3 className="text-2xl font-black text-slate-800 leading-tight">{viewingDetails.course}</h3>
                          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Detalhes Logísticos #{viewingDetails.class_code}</p>
                      </div>
                      <button onClick={() => setViewingDetails(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={24} /></button>
                  </div>
                  
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          
                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-purple-600 uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-purple-100">
                                  <Calendar size={16}/> Logística Módulo 1
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cód. Módulo</p>
                                      <p className="text-xs font-mono font-bold text-slate-700 truncate">{viewingDetails.mod_1_code || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Data</p>
                                      <p className="text-xs font-bold text-slate-700">{viewingDetails.date_mod_1 ? new Date(viewingDetails.date_mod_1).toLocaleDateString() : '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Studio / Local</p>
                                      <p className="text-sm font-bold text-slate-800 flex items-center gap-1"><MapPin size={12} className="text-purple-600"/> {viewingDetails.studio_mod_1 || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Passagem / Voo</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Plane size={14} className="text-indigo-500"/> {viewingDetails.ticket_mod_1 || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Hotel e Localização</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Bed size={14} className="text-blue-500"/> {viewingDetails.hotel_mod_1 || '--'}</p>
                                      {viewingDetails.hotel_loc_mod_1 && <p className="text-[10px] text-slate-400 mt-1 italic flex items-center gap-1"><Map size={10}/> {viewingDetails.hotel_loc_mod_1}</p>}
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Coffee Break</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Coffee size={14} className="text-amber-600"/> {viewingDetails.coffee_mod_1 || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ajuda de Custo</p>
                                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1"><DollarSign size={14}/> {viewingDetails.cost_help_1 || '--'}</p>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-orange-100">
                                  <Calendar size={16}/> Logística Módulo 2
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cód. Módulo</p>
                                      <p className="text-xs font-mono font-bold text-slate-700 truncate">{viewingDetails.mod_2_code || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Data</p>
                                      <p className="text-xs font-bold text-slate-700">{viewingDetails.date_mod_2 ? new Date(viewingDetails.date_mod_2).toLocaleDateString() : '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Passagem / Voo</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Plane size={14} className="text-indigo-500"/> {viewingDetails.ticket_mod_2 || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Hotel e Localização</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Bed size={14} className="text-blue-500"/> {viewingDetails.hotel_mod_2 || '--'}</p>
                                      {viewingDetails.hotel_loc_mod_2 && <p className="text-[10px] text-slate-400 mt-1 italic flex items-center gap-1"><Map size={10}/> {viewingDetails.hotel_loc_mod_2}</p>}
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Coffee Break</p>
                                      <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Coffee size={14} className="text-amber-600"/> {viewingDetails.coffee_mod_2 || '--'}</p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ajuda de Custo</p>
                                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1"><DollarSign size={14}/> {viewingDetails.cost_help_2 || '--'}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                   <Package size={16} className="text-teal-600"/> Materiais Disponíveis
                               </h4>
                               <p className="text-sm font-bold text-slate-700 leading-relaxed">{viewingDetails.material || 'Nenhum material registrado.'}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                   <Monitor size={16} className="text-indigo-600"/> Infraestrutura Técnica
                               </h4>
                               <p className="text-sm font-bold text-slate-700 leading-relaxed">{viewingDetails.infrastructure || 'Nenhum registro técnico.'}</p>
                          </div>
                      </div>

                      {viewingDetails.observations && (
                          <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
                               <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                   <Info size={14}/> Observações Importantes
                               </h4>
                               <p className="text-sm text-amber-900 leading-relaxed italic">{viewingDetails.observations}</p>
                          </div>
                      )}
                  </div>

                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] flex justify-end">
                      <button onClick={() => setViewingDetails(null)} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg">
                          Fechar Detalhes
                      </button>
                  </div>
              </div>
          </div>
      )}

      {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Newspaper size={24}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedNews.title}</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Publicado em {new Date(selectedNews.createdAt).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedNews(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      {selectedNews.imageUrl && (
                          <div className="w-full h-64 rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                              <img src={selectedNews.imageUrl} className="w-full h-full object-cover" />
                          </div>
                      )}
                      <div className="prose prose-slate max-w-none">
                          <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                              {selectedNews.content}
                          </p>
                      </div>
                  </div>
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] flex justify-end">
                      <button onClick={() => setSelectedNews(null)} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg">
                          Entendi
                      </button>
                  </div>
              </div>
          </div>
      )}

      {viewingContract && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl"><FileCheck size={24}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-800 leading-tight">{viewingContract.title}</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cópia do Contrato Assinado Digitalmente</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingContract(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                      <div className="bg-white p-12 rounded-xl shadow-inner border border-slate-100 prose prose-slate max-w-none font-serif">
                          <div className="mb-10 text-center border-b pb-6">
                              <h1 className="text-2xl font-black text-slate-900 uppercase">{viewingContract.title}</h1>
                          </div>
                          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {viewingContract.content}
                          </div>
                          <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                              {viewingContract.signers.map(signer => (
                                  <div key={signer.id} className="flex flex-col items-center">
                                      <div className="h-16 w-full border-b border-slate-800 flex items-center justify-center mb-2 overflow-hidden">
                                          {signer.signatureData && <img src={signer.signatureData} className="max-h-12" alt="Signature" />}
                                      </div>
                                      <span className="text-[10px] font-black uppercase text-slate-800">{signer.name}</span>
                                      <span className="text-[9px] text-slate-400">{signer.email}</span>
                                      {signer.signedAt && <span className="text-[8px] text-green-600 font-bold mt-1">ASSINADO EM {new Date(signer.signedAt).toLocaleString()}</span>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] flex justify-end">
                      <button onClick={() => setViewingContract(null)} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg">
                          Fechar Documento
                      </button>
                  </div>
              </div>
          </div>
      )}

      {courseClosingClass && (
          <CourseClosingForm
              instructor={instructor}
              classData={courseClosingClass}
              onClose={() => setCourseClosingClass(null)}
              onSuccess={() => { if (myClosings.length > 0) fetchMyClosings(); }}
          />
      )}

      {editingClosing && (
          <CourseClosingForm
              instructor={instructor}
              classData={{
                  id: editingClosing.closing.class_id,
                  class_code: editingClosing.closing.class_code,
                  course: editingClosing.closing.course_name,
                  city: editingClosing.closing.city,
              }}
              existingClosing={editingClosing.closing}
              existingExpenses={editingClosing.expenses}
              onClose={() => setEditingClosing(null)}
              onSuccess={() => { setEditingClosing(null); fetchMyClosings(); }}
          />
      )}

      {viewingClosingExpenses && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl my-8 animate-in zoom-in-95 overflow-hidden">
                  <div className="px-8 py-6 border-b bg-gradient-to-r from-emerald-600 to-teal-700 flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-black text-white">Detalhes do Fechamento</h2>
                          <p className="text-emerald-200 text-xs font-medium mt-1">
                              {viewingClosingExpenses.closing.course_name} — #{viewingClosingExpenses.closing.class_code}
                          </p>
                      </div>
                      <button onClick={() => setViewingClosingExpenses(null)} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cidade</p>
                              <p className="text-sm font-bold text-slate-700">{viewingClosingExpenses.closing.city}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Turma</p>
                              <p className="text-sm font-bold text-slate-700">#{viewingClosingExpenses.closing.class_code}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Início</p>
                              <p className="text-sm font-bold text-slate-700">{viewingClosingExpenses.closing.date_start ? new Date(viewingClosingExpenses.closing.date_start + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Término</p>
                              <p className="text-sm font-bold text-slate-700">{viewingClosingExpenses.closing.date_end ? new Date(viewingClosingExpenses.closing.date_end + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                          </div>
                      </div>

                      <div>
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
                              <DollarSign size={14} className="text-emerald-600" /> Despesas Informadas
                          </h3>
                          {isLoadingClosingExpenses ? (
                              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
                          ) : viewingClosingExpenses.expenses.length === 0 ? (
                              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  <p className="text-sm font-bold text-slate-400">Nenhuma despesa registrada</p>
                              </div>
                          ) : (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                          <tr>
                                              <th className="px-4 py-2.5 text-left">Categoria</th>
                                              <th className="px-4 py-2.5 text-right">Valor</th>
                                              <th className="px-4 py-2.5 text-left">Observação</th>
                                              <th className="px-4 py-2.5 text-center">Comprovante</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {viewingClosingExpenses.expenses.map(ex => (
                                              <tr key={ex.id} className="hover:bg-slate-50">
                                                  <td className="px-4 py-3 font-bold text-slate-700">{ex.category}</td>
                                                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ex.amount)}
                                                  </td>
                                                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{ex.observation || '--'}</td>
                                                  <td className="px-4 py-3 text-center">
                                                      {ex.receipt_url ? (
                                                          <a href={ex.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800">
                                                              <ExternalLink size={12} /> Ver
                                                          </a>
                                                      ) : (
                                                          <span className="text-xs text-slate-400">--</span>
                                                      )}
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                      <tfoot className="bg-slate-50 border-t">
                                          <tr>
                                              <td className="px-4 py-3 font-black text-xs text-slate-500 uppercase">Total</td>
                                              <td className="px-4 py-3 text-right font-black text-slate-800">
                                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                      viewingClosingExpenses.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
                                                  )}
                                              </td>
                                              <td colSpan={2}></td>
                                          </tr>
                                      </tfoot>
                                  </table>
                              </div>
                          )}
                      </div>

                      {viewingClosingExpenses.closing.admin_notes && viewingClosingExpenses.closing.status !== 'pendente' && (
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                              <p className="text-[9px] font-black text-blue-500 uppercase mb-1">Observação da Administração</p>
                              <p className="text-sm text-blue-800">{viewingClosingExpenses.closing.admin_notes}</p>
                          </div>
                      )}

                      {/* Histórico de edições */}
                      {isLoadingHistory ? (
                          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
                      ) : closingHistory.length > 0 && (
                          <div>
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
                                  <History size={14} className="text-amber-500" /> Histórico de Edições ({closingHistory.length})
                              </h3>
                              <div className="space-y-2">
                                  {closingHistory.map(h => {
                                      const snap = h.snapshot as any;
                                      const expSnap = (h.expenses_snapshot || []) as any[];
                                      const isExpanded = expandedHistoryId === h.id;
                                      return (
                                          <div key={h.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                              <button
                                                  onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                                                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
                                              >
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded border">V{h.version}</span>
                                                      <div>
                                                          <p className="text-xs font-bold text-slate-600">
                                                              {h.edited_at ? new Date(h.edited_at).toLocaleString('pt-BR') : '--'}
                                                          </p>
                                                          {h.reason && (
                                                              <p className="text-[10px] text-slate-400 mt-0.5">Motivo: {h.reason}</p>
                                                          )}
                                                      </div>
                                                  </div>
                                                  <ChevronDown size={14} className={clsx("text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                                              </button>
                                              {isExpanded && (
                                                  <div className="px-4 pb-4 border-t border-slate-200 bg-white space-y-3">
                                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                                                          <div>
                                                              <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
                                                              <p className="text-xs font-bold text-slate-700">{snap.status || '--'}</p>
                                                          </div>
                                                          <div>
                                                              <p className="text-[9px] font-black text-slate-400 uppercase">Início</p>
                                                              <p className="text-xs font-bold text-slate-700">{snap.date_start ? new Date(snap.date_start + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                                                          </div>
                                                          <div>
                                                              <p className="text-[9px] font-black text-slate-400 uppercase">Término</p>
                                                              <p className="text-xs font-bold text-slate-700">{snap.date_end ? new Date(snap.date_end + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                                                          </div>
                                                          <div>
                                                              <p className="text-[9px] font-black text-slate-400 uppercase">PIX</p>
                                                              <p className="text-xs font-bold text-slate-700 truncate">{snap.pix_key || '--'}</p>
                                                          </div>
                                                      </div>
                                                      {snap.admin_notes && (
                                                          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                                              <p className="text-[9px] font-black text-red-400 uppercase mb-0.5">Obs. Admin</p>
                                                              <p className="text-xs text-red-700">{snap.admin_notes}</p>
                                                          </div>
                                                      )}
                                                      {expSnap.length > 0 && (
                                                          <div>
                                                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Despesas desta versão</p>
                                                              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                                                  <table className="w-full text-xs">
                                                                      <thead className="bg-slate-100 text-[9px] uppercase font-bold text-slate-500">
                                                                          <tr>
                                                                              <th className="px-3 py-2 text-left">Categoria</th>
                                                                              <th className="px-3 py-2 text-right">Valor</th>
                                                                              <th className="px-3 py-2 text-left">Obs.</th>
                                                                          </tr>
                                                                      </thead>
                                                                      <tbody className="divide-y divide-slate-100">
                                                                          {expSnap.map((ex: any, i: number) => (
                                                                              <tr key={i}>
                                                                                  <td className="px-3 py-2 font-medium text-slate-700">{ex.category}</td>
                                                                                  <td className="px-3 py-2 text-right font-medium text-slate-700">
                                                                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(ex.amount) || 0)}
                                                                                  </td>
                                                                                  <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">{ex.observation || '--'}</td>
                                                                              </tr>
                                                                          ))}
                                                                      </tbody>
                                                                  </table>
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                          <button
                              onClick={() => setViewingClosingExpenses(null)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl transition-all"
                          >
                              Fechar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <SupportTicketModal 
          isOpen={showSupportModal} 
          onClose={() => { setShowSupportModal(false); fetchSupportNotifications(); }}
          senderId={instructor.id}
          senderName={instructor.fullName}
          senderEmail={instructor.email}
          senderRole="instructor"
          instructorProfile={instructor}
      />

      <footer className="py-12 text-center text-slate-400 bg-white/40 border-t border-slate-200 mt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
          <div className="flex justify-center gap-6">
              <img src={VOLL_LOGO_BASE64} alt="VOLL" className="h-6 grayscale opacity-30" />
          </div>
      </footer>
    </div>
  );
};