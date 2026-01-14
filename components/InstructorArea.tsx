import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap,
  Newspaper, Bell, Sparkles, X, Clock, Image as ImageIcon,
  ArrowRight, Info, Plane, Coffee, Bed, Map, DollarSign, Package, Monitor,
  FileCheck, LayoutDashboard, FileText, CheckCircle, LifeBuoy, FileSignature, ChevronLeft,
  MonitorPlay, Play, CheckCircle2, Circle, Video, Download, Paperclip
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { Teacher } from './TeachersManager';
import { Banner, TeacherNews, Contract, SupportTicket, OnlineCourse, CourseModule, CourseLesson } from '../types';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import clsx from 'clsx';

interface InstructorAreaProps {
  instructor: Teacher;
  onLogout: () => void;
}

export const InstructorArea: React.FC<InstructorAreaProps> = ({ instructor, onLogout }) => {
  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'contracts' | 'pending_contracts' | 'trainings'>('dashboard');
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
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal do Instrutor</span>
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
              <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-6 grayscale opacity-30" />
          </div>
      </footer>
    </div>
  );
};