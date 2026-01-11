
import React, { useEffect, useState, useMemo } from 'react';
import { StudentSession, OnlineCourse, CourseModule, CourseLesson, StudentCourseAccess, StudentLessonProgress, Banner } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    LogOut, GraduationCap, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, CheckCircle, Clock, X, Info, Layers, 
    PieChart, Send, ArrowRight, Sparkles, Bell, Trophy, ChevronRight, Book, ListTodo, LifeBuoy,
    MonitorPlay, Lock, Play, Circle, CheckCircle2, ChevronLeft, FileText, Smartphone, Paperclip, Youtube,
    Mic
} from 'lucide-react';
import { SupportTicketModal } from './SupportTicketModal';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'online_courses' | 'certificates' | 'events'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    
    // Online Courses State
    const [allCourses, setAllCourses] = useState<OnlineCourse[]>([]);
    const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>([]);
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
    
    // Player State
    const [playingCourse, setPlayingCourse] = useState<OnlineCourse | null>(null);
    const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
    const [courseStructure, setCourseStructure] = useState<{ modules: CourseModule[], lessons: Record<string, CourseLesson[]> } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    const mainDealId = student.deals[0]?.id;

    useEffect(() => {
        loadBaseData();
        loadBanners();
        loadOnlineCourses();
        fetchSupportNotifications();
    }, [student]);

    const fetchSupportNotifications = async () => {
        if (!mainDealId) return;
        try {
            const tickets = await appBackend.getSupportTicketsBySender(mainDealId);
            setPendingTicketsCount(tickets.filter(t => t.status === 'pending').length);
        } catch (e) {}
    };

    const loadBaseData = async () => {
        setIsLoading(true);
        try {
            const dealIds = student.deals.map(d => d.id);
            const allCodes = Array.from(new Set(student.deals.flatMap(d => [d.class_mod_1, d.class_mod_2]).filter(Boolean)));
            if (allCodes.length > 0) {
                const { data } = await appBackend.client.from('crm_classes').select('*').or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                if (data) setClasses(data);
            }
            if (dealIds.length > 0) {
                const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('*, crm_certificates(title)').in('student_deal_id', dealIds);
                setCertificates(issuedCerts || []);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const loadBanners = async () => {
        try { 
            // Tenta puxar banners ativos cadastrados no Painel de Configurações
            const data = await appBackend.getBanners('student'); 
            setBanners(data || []); 
        } catch (e) {
            console.error("Erro ao carregar banners:", e);
        }
    };

    const loadOnlineCourses = async () => {
        if (!mainDealId) return;
        try {
            const [coursesData, accessIds, progressIds] = await Promise.all([
                appBackend.getOnlineCourses(),
                appBackend.getStudentCourseAccess(mainDealId),
                appBackend.getStudentLessonProgress(mainDealId)
            ]);
            setAllCourses(coursesData || []);
            setUnlockedCourseIds(accessIds || []);
            setCompletedLessonIds(progressIds || []);
        } catch (e) { console.error(e); }
    };

    const handleOpenCoursePlayer = async (course: OnlineCourse) => {
        if (!unlockedCourseIds.includes(course.id)) return;
        setIsLoading(true);
        try {
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
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const handleToggleLessonComplete = async (lessonId: string) => {
        if (!mainDealId || !playingCourse) return;
        const isCurrentlyCompleted = completedLessonIds.includes(lessonId);
        const newStatus = !isCurrentlyCompleted;
        
        try {
            await appBackend.toggleLessonProgress(mainDealId, lessonId, newStatus);
            const updatedProgress = newStatus 
                ? [...completedLessonIds, lessonId] 
                : completedLessonIds.filter(id => id !== lessonId);
            setCompletedLessonIds(updatedProgress);

            if (newStatus && playingCourse.certificateTemplateId) {
                const allLessonIdsInCourse = courseStructure?.modules.flatMap(m => (courseStructure.lessons[m.id] || []).map(l => l.id)) || [];
                const isFinished = allLessonIdsInCourse.every(id => updatedProgress.includes(id));
                
                if (isFinished) {
                    const alreadyHasCert = certificates.some(c => c.student_deal_id === mainDealId && c.certificate_template_id === playingCourse.certificateTemplateId);
                    if (!alreadyHasCert) {
                        await appBackend.issueCertificate(mainDealId, playingCourse.certificateTemplateId);
                        loadBaseData();
                        alert("🎉 Parabéns! Você concluiu o curso e seu certificado foi gerado!");
                    }
                }
            }
        } catch (e) { console.error(e); }
    };

    const activeCourseProgress = useMemo(() => {
        if (!courseStructure || !playingCourse) return 0;
        const allLessons = courseStructure.modules.flatMap(m => courseStructure.lessons[m.id] || []);
        if (allLessons.length === 0) return 0;
        const completed = allLessons.filter(l => completedLessonIds.includes(l.id)).length;
        return Math.round((completed / allLessons.length) * 100);
    }, [courseStructure, completedLessonIds, playingCourse]);

    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return '';
        let id = '';
        if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : '';
    };

    if (playingCourse && courseStructure) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans animate-in fade-in">
                <header className="bg-slate-800/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
                    <button onClick={() => setPlayingCourse(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all font-bold text-sm">
                        <ChevronLeft size={20}/> Voltar ao Portal
                    </button>
                    <div className="flex flex-col items-center">
                        <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">{playingCourse.title}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${activeCourseProgress}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black">{activeCourseProgress}% Concluído</span>
                        </div>
                    </div>
                    <div className="w-24"></div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 overflow-y-auto custom-scrollbar-dark p-8 space-y-8">
                        {activeLesson ? (
                            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="aspect-video bg-black rounded-[2rem] shadow-2xl overflow-hidden border border-white/5 relative">
                                    {activeLesson.videoUrl ? (
                                        <iframe 
                                            src={getYouTubeEmbedUrl(activeLesson.videoUrl)} 
                                            className="w-full h-full" 
                                            allowFullScreen 
                                            title={activeLesson.title}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                            <Video size={64} className="opacity-20 mb-4" />
                                            <p className="font-bold">Esta aula não possui vídeo vinculado.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                    <div className="flex-1 space-y-4">
                                        <h1 className="text-3xl font-black">{activeLesson.title}</h1>
                                        <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{activeLesson.description || 'Nenhuma descrição adicional.'}</p>
                                        
                                        {(activeLesson.materials || []).length > 0 && (
                                            <div className="pt-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-4">Materiais de Apoio</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {activeLesson.materials.map((mat, i) => (
                                                        <a key={i} href={mat.url} target="_blank" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                                                            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg group-hover:scale-110 transition-transform"><FileText size={18}/></div>
                                                            <span className="text-xs font-bold text-slate-200 truncate">{mat.name}</span>
                                                            <Download size={14} className="ml-auto text-slate-500" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full md:w-64 shrink-0">
                                        <button 
                                            onClick={() => handleToggleLessonComplete(activeLesson.id)}
                                            className={clsx(
                                                "w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                                completedLessonIds.includes(activeLesson.id) 
                                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                    : "bg-white text-slate-900 hover:bg-slate-100"
                                            )}
                                        >
                                            {completedLessonIds.includes(activeLesson.id) ? <><CheckCircle2 size={20}/> Concluída!</> : <><Circle size={20}/> Marcar como Concluída</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">Selecione uma aula para começar.</div>
                        )}
                    </main>

                    <aside className="w-80 bg-slate-800/30 border-l border-white/5 flex flex-col shrink-0">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Conteúdo do Curso</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-4 space-y-4">
                            {courseStructure.modules.map(mod => (
                                <div key={mod.id} className="space-y-2">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2 mb-3">{mod.title}</h4>
                                    <div className="space-y-1">
                                        {(courseStructure.lessons[mod.id] || []).map(lesson => {
                                            const isCurrent = activeLesson?.id === lesson.id;
                                            const isDone = completedLessonIds.includes(lesson.id);
                                            return (
                                                <button 
                                                    key={lesson.id} 
                                                    onClick={() => setActiveLesson(lesson)}
                                                    className={clsx(
                                                        "w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all group",
                                                        isCurrent ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className={clsx("mt-0.5 shrink-0 transition-colors", isDone ? "text-emerald-500" : isCurrent ? "text-white" : "text-slate-600 group-hover:text-slate-400")}>
                                                        {isDone ? <CheckCircle2 size={16}/> : <Play size={16}/>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={clsx("text-xs font-bold truncate", isCurrent ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>{lesson.title}</p>
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Vídeo Aula</span>
                                                    </div>
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
                    <div className="flex items-center gap-6">
                        <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                        <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <GraduationCap size={14} className="text-purple-600" /> Portal do Aluno
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowSupportModal(true)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative">
                            <LifeBuoy size={20} />
                            {pendingTicketsCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">{pendingTicketsCount}</span>}
                        </button>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-sm font-black text-slate-800 leading-none">{student.name}</span>
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">Matrícula Ativa</span>
                        </div>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-inner"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                
                {/* Banner Section - Restaurado p/ usar os banners do banco */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[250px]">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/30 backdrop-blur-md"><Sparkles size={12} className="text-amber-400" /> Bem-vindo de volta!</div>
                            <h2 className="text-3xl font-black mb-3 tracking-tight leading-tight">Olá, <span className="text-purple-200">{student.name.split(' ')[0]}</span>!</h2>
                            <p className="text-purple-100/80 text-base leading-relaxed font-medium">Continue sua jornada acadêmica na maior rede de Pilates do mundo.</p>
                        </div>
                    </section>

                    <div className="overflow-hidden rounded-[2.5rem] shadow-xl border-4 border-white relative group h-full bg-slate-200">
                        {banners.length > 0 ? (
                            <a href={banners[0].linkUrl || '#'} target={banners[0].linkUrl ? "_blank" : "_self"} className="block w-full h-full">
                                <img src={banners[0].imageUrl} alt={banners[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            </a>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-400 flex flex-col items-center justify-center p-8 text-center text-white">
                                <Sparkles size={48} className="mb-4 opacity-30" />
                                <h3 className="font-black text-xl mb-1">Novas Formações VOLL</h3>
                                <p className="text-xs opacity-80 uppercase tracking-widest font-bold">Conheça os lançamentos da temporada</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Formações Presenciais', icon: GraduationCap, color: 'text-purple-600' },
                        { id: 'online_courses', label: 'Meus Cursos Online', icon: MonitorPlay, color: 'text-indigo-600' },
                        { id: 'events', label: 'Eventos', icon: Mic, color: 'text-amber-600' },
                        { id: 'certificates', label: 'Meus Diplomas', icon: Award, color: 'text-emerald-600' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex-1 min-w-[140px] py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all", activeTab === tab.id ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-100" : "text-slate-500 hover:text-slate-800")}>
                            <tab.icon size={20} className={activeTab === tab.id ? tab.color : "text-slate-400"} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {classes.length === 0 ? <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300"><GraduationCap size={48} className="mb-4 opacity-20"/> <p className="font-bold">Nenhuma formação presencial ativa.</p></div> : classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all overflow-hidden border-b-8 border-b-purple-500">
                                    <h3 className="text-xl font-black text-slate-800 mb-4 leading-tight">{cls.course}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-6 font-bold uppercase tracking-widest"><MapPin size={16} className="text-purple-500" /> {cls.city}, {cls.state}</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Módulo 01</span>
                                            <div className="flex items-center gap-2 font-black text-slate-700 text-xs"><Calendar size={14} className="text-purple-500" /> {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A confirmar'}</div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Módulo 02</span>
                                            <div className="flex items-center gap-2 font-black text-slate-700 text-xs"><Calendar size={14} className="text-orange-500" /> {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A confirmar'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'online_courses' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allCourses.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-slate-400 italic font-bold border-2 border-dashed rounded-3xl">Você ainda não possui cursos online liberados.</div>
                            ) : allCourses.map(course => {
                                const isUnlocked = unlockedCourseIds.includes(course.id);
                                return (
                                    <div 
                                        key={course.id} 
                                        onClick={() => isUnlocked && handleOpenCoursePlayer(course)}
                                        className={clsx(
                                            "bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all overflow-hidden border border-slate-200 flex flex-col group",
                                            !isUnlocked ? "opacity-50 grayscale cursor-default" : "cursor-pointer"
                                        )}
                                    >
                                        <div className="h-48 relative overflow-hidden">
                                            {course.imageUrl ? (
                                                <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={course.title} />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><MonitorPlay size={48} /></div>
                                            )}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                                    <Lock size={32} className="mb-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando Liberação</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="font-black text-slate-800 mb-2 leading-tight">{course.title}</h3>
                                            <p className="text-xs text-slate-500 line-clamp-2 mb-6">{course.description}</p>
                                            <div className="mt-auto flex items-center justify-between">
                                                {isUnlocked ? (
                                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">Assistir Agora <ArrowRight size={14}/></span>
                                                ) : (
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Indisponível</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'certificates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {certificates.length === 0 ? <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300"><Award size={48} className="mb-4 opacity-20"/> <p className="font-bold">Nenhum certificado emitido.</p></div> : certificates.map(cert => (
                                <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-600 group-hover:rotate-12 transition-transform shadow-inner"><Trophy size={32}/></div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{cert.crm_certificates?.title}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Emitido: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                    </div>
                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all active:scale-95"><Download size={24}/></a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <SupportTicketModal isOpen={showSupportModal} onClose={() => { setShowSupportModal(false); fetchSupportNotifications(); }} senderId={mainDealId || 'guest'} senderName={student.name} senderEmail={student.email} senderRole="student" />
        </div>
    );
};
