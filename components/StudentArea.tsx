
import React, { useEffect, useState, useMemo } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio, Product, CourseModule, CourseLesson } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportTicketModal } from './SupportTicketModal';
import { 
    LogOut, GraduationCap, BookOpen, Award, Calendar, MapPin, 
    Video, Download, Loader2, User, Sparkles, Bell, PieChart, ArrowRight, Trophy, ChevronRight, Zap, LifeBuoy, Play, Lock as LockIcon, X, CheckCircle, CheckCircle2,
    Info, ShieldCheck, List, Circle, CheckSquare
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates' | 'events' | 'surveys'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [digitalProducts, setDigitalProducts] = useState<Product[]>([]);
    const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>([]);
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
    
    // LMS Player States
    const [activeCourse, setActiveCourse] = useState<Product | null>(null);
    const [activeModules, setActiveModules] = useState<CourseModule[]>([]);
    const [activeLessons, setActiveLessons] = useState<Record<string, CourseLesson[]>>({});
    const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null);
    const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
    const [isIssuingAuto, setIsIssuingAuto] = useState(false);
    
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mySurveys, setMySurveys] = useState<SurveyModel[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState<SurveyModel | null>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    useEffect(() => {
        loadStudentData();
        loadBanners();
        loadSurveys();
        fetchSupportNotifications();
        loadDigitalCatalog();
        loadProgress();
    }, [student]);

    const fetchSupportNotifications = async () => {
        try {
            // Fixed: Explicitly treating deal as any.
            const mainDealId = (student.deals[0] as any)?.id;
            if (mainDealId) {
                const tickets = await appBackend.getSupportTicketsBySender(mainDealId);
                const pending = tickets.filter(t => t.status === 'pending').length;
                setPendingTicketsCount(pending);
            }
        } catch (e) {}
    };

    const loadDigitalCatalog = async () => {
        try {
            const { data } = await appBackend.client.from('crm_products').select('*').eq('category', 'Curso Online').eq('status', 'active');
            if (data) setDigitalProducts(data);
            // Fixed: Explicitly treating deal as any.
            const mainDealId = (student.deals[0] as any)?.id;
            if (mainDealId) {
                const access = await appBackend.getStudentCourseAccess(mainDealId);
                setUnlockedCourseIds(access);
            }
        } catch (e) {}
    };

    const loadProgress = async () => {
        // Fixed: Explicitly treating deal as any.
        const mainDealId = (student.deals[0] as any)?.id;
        if (mainDealId) {
            const progress = await appBackend.getLessonProgress(mainDealId);
            setCompletedLessonIds(progress);
        }
    };

    const loadSurveys = async () => {
        try {
            const mainDeal = student.deals[0];
            if (mainDeal) {
                // Fixed: Explicitly treating mainDeal as any to fix 'unknown' type error.
                const surveys = await appBackend.getEligibleSurveysForStudent((mainDeal as any).id);
                setMySurveys(surveys);
            }
        } catch (e) { console.error(e); }
    };

    const loadStudentData = async () => {
        setIsLoading(true);
        try {
            // Fixed: Explicitly typed deal elements as any to avoid inference as unknown.
            const mod1Codes = student.deals.map((d: any) => d.class_mod_1).filter(Boolean);
            const mod2Codes = student.deals.map((d: any) => d.class_mod_2).filter(Boolean);
            const allCodes = Array.from(new Set([...mod1Codes, ...mod2Codes]));
            if (allCodes.length > 0) {
                const { data } = await appBackend.client.from('crm_classes').select('*').or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                if (data) setClasses(data);
            }
            // Fixed: Explicitly typed deal elements as any to avoid inference as unknown.
            const dealIds = student.deals.map((d: any) => d.id);
            if (dealIds.length > 0) {
                const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('*').in('student_deal_id', dealIds);
                if (issuedCerts) setCertificates(issuedCerts);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const toggleLesson = async (lessonId: string) => {
        // Fixed: Explicitly treating deal as any.
        const mainDealId = (student.deals[0] as any)?.id;
        if (!mainDealId) return;
        
        const isCompleted = completedLessonIds.includes(lessonId);
        await appBackend.toggleLessonProgress(mainDealId, lessonId, !isCompleted);
        setCompletedLessonIds(prev => isCompleted ? prev.filter(id => id !== lessonId) : [...prev, lessonId]);
    };

    const openCoursePlayer = async (course: Product) => {
        if (!unlockedCourseIds.includes(course.id)) return;
        setActiveCourse(course);
        setIsLoadingPlayer(true);
        try {
            const mods = await appBackend.getCourseModules(course.id);
            setActiveModules(mods);
            const map: Record<string, CourseLesson[]> = {};
            let firstLesson: CourseLesson | null = null;
            for (const m of mods) {
                const les = await appBackend.getCourseLessons(m.id);
                map[m.id] = les;
                if (!firstLesson && les.length > 0) firstLesson = les[0];
            }
            setActiveLessons(map);
            setCurrentLesson(firstLesson);
        } catch (e) { alert("Erro ao abrir conteúdo."); } finally { setIsLoadingPlayer(false); }
    };

    const loadBanners = async () => {
        try { const data = await appBackend.getBanners('student'); setBanners(data); } catch (e) {}
    };

    const getCourseProgress = (courseId: string) => {
        // Encontra todas as aulas deste curso (precisaria carregar de antemão ou estimar)
        // Como o carregamento é sob demanda no player, vamos simular ou usar os dados se disponíveis
        if (activeCourse?.id === courseId) {
            const allLessons = Object.values(activeLessons).flat();
            if (allLessons.length === 0) return 0;
            const completedInCourse = allLessons.filter(l => completedLessonIds.includes(l.id)).length;
            return Math.round((completedInCourse / allLessons.length) * 100);
        }
        return 0; // Valor default enquanto não abre
    };

    const handleIssueAutoCertificate = async () => {
        if (!activeCourse || !activeCourse.certificateTemplateId) return;
        setIsIssuingAuto(true);
        try {
            // Fixed: Explicitly treating deal as any.
            const mainDealId = (student.deals[0] as any)?.id;
            if (!mainDealId) return;
            const hash = await appBackend.issueCertificate(mainDealId, activeCourse.certificateTemplateId);
            alert("Certificado emitido com sucesso! Você pode visualizá-lo na aba Certificados.");
            loadStudentData(); // Refresh list
        } catch (e: any) {
            alert("Erro ao emitir: " + e.message);
        } finally {
            setIsIssuingAuto(false);
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            const videoId = match[2];
            return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&showinfo=0&controls=1&autohide=1&fs=1`;
        }
        return url;
    };

    if (activeSurvey) return <FormViewer form={activeSurvey} onBack={() => setActiveSurvey(null)} studentId={student.deals[0]?.id} onSuccess={() => { setActiveSurvey(null); loadSurveys(); }} />;

    if (activeCourse) {
        const progress = getCourseProgress(activeCourse.id);
        const hasCertIssued = certificates.some(c => c.student_deal_id === student.deals[0]?.id && c.certificate_template_id === activeCourse.certificateTemplateId);

        return (
            <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col animate-in fade-in duration-300">
                <header className="bg-slate-900/80 border-b border-white/10 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveCourse(null)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
                        <div>
                            <h2 className="text-white font-black leading-tight">{activeCourse.name}</h2>
                            <div className="flex items-center gap-3">
                                <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10}/> Ambiente VOLL</p>
                                <div className="h-1 w-20 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black text-white/40">{progress}% Concluído</span>
                            </div>
                        </div>
                    </div>
                    {progress === 100 && activeCourse.certificateTemplateId && !hasCertIssued && (
                        <button onClick={handleIssueAutoCertificate} disabled={isIssuingAuto} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg animate-bounce">
                            {isIssuingAuto ? <Loader2 size={16} className="animate-spin"/> : <Trophy size={16}/>}
                            Emitir Certificado
                        </button>
                    )}
                </header>
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <main className="flex-1 bg-black flex flex-col relative overflow-hidden group/player">
                        {currentLesson ? (
                            <>
                                <div className="flex-1 relative overflow-hidden">
                                    {/* Overlay de proteção invisível no topo do vídeo (oculta título e share) */}
                                    <div className="absolute top-0 left-0 w-full h-[15%] z-20 cursor-default"></div>
                                    <iframe 
                                        src={getEmbedUrl(currentLesson.videoUrl)} 
                                        className="absolute inset-0 w-full h-full z-10" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="p-8 bg-slate-900 border-t border-white/5 text-white shrink-0 shadow-2xl relative z-30">
                                    <div className="max-w-4xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <span className="text-teal-500 text-[10px] font-black uppercase tracking-widest block mb-2">Módulo: {activeModules.find(m => m.id === currentLesson.moduleId)?.title}</span>
                                            <h3 className="text-2xl font-black mb-3">{currentLesson.title}</h3>
                                            <p className="text-white/60 text-sm whitespace-pre-wrap leading-relaxed max-w-3xl">{currentLesson.description || "Inicie seus estudos agora."}</p>
                                        </div>
                                        <button 
                                            onClick={() => toggleLesson(currentLesson.id)}
                                            className={clsx(
                                                "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 border-2",
                                                completedLessonIds.includes(currentLesson.id) ? "bg-teal-600/20 border-teal-500 text-teal-400" : "bg-white text-slate-900 border-white hover:bg-teal-500 hover:border-teal-500 hover:text-white"
                                            )}
                                        >
                                            {completedLessonIds.includes(currentLesson.id) ? <><CheckCircle size={18}/> Aula Concluída</> : <><Circle size={18}/> Marcar como Concluída</>}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/20 uppercase font-black tracking-[0.3em] gap-4">
                                <Play size={64} className="opacity-10"/>
                                Selecione uma aula na lateral
                            </div>
                        )}
                    </main>
                    <aside className="w-full md:w-96 bg-slate-900 border-l border-white/10 flex flex-col overflow-y-auto custom-scrollbar-dark shrink-0">
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <h4 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"><List size={16} className="text-teal-500"/> Grade de Conteúdo</h4>
                        </div>
                        <div className="p-4 space-y-6">
                            {activeModules.map(mod => (
                                <div key={mod.id} className="space-y-2">
                                    <div className="px-4 py-2 bg-white/5 rounded-xl text-white/90 text-[10px] font-black uppercase tracking-[0.1em] border border-white/5">{mod.title}</div>
                                    <div className="space-y-1">
                                        {activeLessons[mod.id]?.map(les => {
                                            const isDone = completedLessonIds.includes(les.id);
                                            return (
                                                <button 
                                                    key={les.id} 
                                                    onClick={() => setCurrentLesson(les)} 
                                                    className={clsx(
                                                        "w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all relative group", 
                                                        currentLesson?.id === les.id ? "bg-teal-600 text-white shadow-lg ring-1 ring-white/20" : "text-white/40 hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all", currentLesson?.id === les.id ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10")}>
                                                        {isDone ? <CheckSquare size={14} className="text-teal-400" /> : <Play size={14} className={currentLesson?.id === les.id ? "fill-white" : "fill-white/20"}/>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className={clsx("text-xs font-bold truncate", isDone && currentLesson?.id !== les.id && "text-white/20")}>{les.title}</p>
                                                        <p className="text-[9px] font-black opacity-40 uppercase tracking-tighter">Aula {les.order}</p>
                                                    </div>
                                                    {currentLesson?.id === les.id && <div className="absolute right-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                                                </button>
                                            );
                                        })}
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowSupportModal(true)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 font-bold text-xs relative">
                            <LifeBuoy size={20} /> Suporte {pendingTicketsCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">{pendingTicketsCount}</span>}
                        </button>
                        <span className="text-sm font-black text-slate-800 hidden sm:block">{student.name}</span>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 rounded-xl transition-all"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                {mySurveys.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Bell size={14} className="text-amber-500" /> Pendências e Feedbacks</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mySurveys.map(s => (
                                <div key={s.id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group">
                                    <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform"><PieChart size={32} /></div>
                                    <div className="flex-1"><h4 className="font-black text-slate-800 mb-1">{s.title}</h4><p className="text-sm text-slate-500">Sua opinião é vital.</p></div>
                                    <button onClick={() => setActiveSurvey(s)} className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all"><ArrowRight size={20} /></button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto gap-1">
                    {[{ id: 'classes', label: 'Cursos Presenciais', icon: GraduationCap, color: 'text-purple-600' }, { id: 'products', label: 'Cursos Online VOLL', icon: Zap, color: 'text-amber-500' }, { id: 'certificates', label: 'Certificados', icon: Award, color: 'text-emerald-600' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all", activeTab === tab.id ? "bg-white text-slate-800 shadow-md" : "text-slate-500 hover:bg-white/40")}>
                            <tab.icon size={20} className={clsx(activeTab === tab.id ? tab.color : "text-slate-400")} /> {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden border-b-8 border-b-purple-500">
                                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{cls.course}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-4"><MapPin size={16} /> {cls.city}, {cls.state}</div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-500">#{cls.class_code}</span>
                                </div>
                            ))}
                            {classes.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <GraduationCap className="mx-auto text-slate-200 mb-4" size={48}/>
                                    <p className="font-bold text-slate-400">Nenhuma matrícula presencial localizada.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {digitalProducts.map(course => {
                                const isUnlocked = unlockedCourseIds.includes(course.id);
                                return (
                                    <div key={course.id} className={clsx("bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all", isUnlocked ? "hover:shadow-2xl" : "opacity-80 grayscale")}>
                                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                                            {course.thumbnailUrl ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Play size={40}/></div>}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                                    <LockIcon size={40} className="mb-2 text-amber-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Acesso Bloqueado</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col">
                                            <h3 className="font-black text-slate-800 text-lg mb-3 leading-tight">{course.name}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2 flex-1 leading-relaxed mb-4">{course.description}</p>
                                            
                                            {isUnlocked ? (
                                                <button onClick={() => openCoursePlayer(course)} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Assistir Agora</button>
                                            ) : (
                                                <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando liberação financeira.</p></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'certificates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {certificates.map(cert => (
                                <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-600"><Trophy size={32}/></div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 text-lg">Certificado VOLL</h4>
                                        <p className="text-xs text-slate-400 font-bold">Emitido em: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                    </div>
                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-4 bg-emerald-500 text-white rounded-2xl transition-all active:scale-95"><Download size={24}/></a>
                                </div>
                            ))}
                            {certificates.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <Award className="mx-auto text-slate-200 mb-4" size={48}/>
                                    <p className="font-bold text-slate-400">Nenhum certificado liberado até o momento.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <SupportTicketModal 
                isOpen={showSupportModal} 
                onClose={() => { setShowSupportModal(false); fetchSupportNotifications(); }}
                senderId={student.deals[0]?.id || 'guest'}
                senderName={student.name}
                senderEmail={student.email}
                senderRole="student"
            />
        </div>
    );
};
