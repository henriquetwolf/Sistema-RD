
import React, { useEffect, useState, useMemo } from 'react';
import { StudentSession, OnlineCourse, CourseModule, CourseLesson, StudentCourseAccess, StudentLessonProgress, Banner, Contract, EventModel, Workshop, EventRegistration, EventBlock } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    LogOut, GraduationCap, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, CheckCircle, Clock, X, Info, Layers, 
    PieChart, Send, ArrowRight, Sparkles, Bell, Trophy, ChevronRight, Book, ListTodo, LifeBuoy,
    MonitorPlay, Lock, Play, Circle, CheckCircle2, ChevronLeft, FileText, Smartphone, Paperclip, Youtube,
    Mic, RefreshCw, FileSignature, CheckSquare, Users, Building, User
} from 'lucide-react';
import { SupportTicketModal } from './SupportTicketModal';
import { ContractSigning } from './ContractSigning';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
    logoUrl?: string;
}

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout, logoUrl }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'online_courses' | 'certificates' | 'events' | 'contracts'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [eventsList, setEventsList] = useState<EventModel[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
    const [signingContract, setSigningContract] = useState<Contract | null>(null);
    
    // Logística de Turmas
    const [viewingClassDetails, setViewingClassDetails] = useState<any | null>(null);

    const [viewingEvent, setViewingEvent] = useState<EventModel | null>(null);
    const [eventWorkshops, setEventWorkshops] = useState<Workshop[]>([]);
    const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
    const [workshopOccupation, setWorkshopOccupation] = useState<Record<string, number>>({});
    const [isRegistering, setIsRegistering] = useState<string | null>(null);

    const [allCourses, setAllCourses] = useState<OnlineCourse[]>([]);
    const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>([]);
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
    
    const [playingCourse, setPlayingCourse] = useState<OnlineCourse | null>(null);
    const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
    const [courseStructure, setCourseStructure] = useState<{ modules: CourseModule[], lessons: Record<string, CourseLesson[]> } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    const studentDealIds = useMemo(() => student.deals.map(d => String(d.id)), [student.deals]);
    const mainDealId = useMemo(() => student.deals[0]?.id, [student.deals]);

    useEffect(() => {
        loadBaseData();
        loadBanners();
        loadOnlineCourses();
        loadEvents();
        fetchSupportNotifications();
        fetchPendingContracts();
    }, [student]);

    useEffect(() => {
        if (activeTab === 'certificates') loadCertificates();
        if (activeTab === 'contracts') fetchPendingContracts();
        if (activeTab === 'events') loadEvents();
    }, [activeTab]);

    const fetchPendingContracts = async () => {
        try {
            const contracts = await appBackend.getPendingContractsByEmail(student.email);
            setPendingContracts(contracts);
        } catch (e) {
            console.error("Erro ao carregar contratos pendentes:", e);
        }
    };

    const fetchSupportNotifications = async () => {
        if (!mainDealId) return;
        try {
            const tickets = await appBackend.getSupportTicketsBySender(String(mainDealId));
            setPendingTicketsCount(tickets.filter(t => t.status === 'pending').length);
        } catch (e) {}
    };

    const loadCertificates = async () => {
        const dealIds = student.deals.map(d => d.id);
        if (dealIds.length === 0) return;
        try {
            const { data: issuedCerts, error } = await appBackend.client
                .from('crm_student_certificates')
                .select('*, crm_certificates(title)')
                .in('student_deal_id', dealIds)
                .order('issued_at', { ascending: false });
            if (error) throw error;
            setCertificates(issuedCerts || []);
        } catch (err) {
            console.error("Erro ao carregar diplomas:", err);
        }
    };

    const loadEvents = async () => {
        try {
            const { data } = await appBackend.client.from('crm_events').select('*').order('created_at', { ascending: false });
            const purchasedProductNames = student.deals.map(d => d.product_name);
            const filtered = (data || []).filter(evt => purchasedProductNames.includes(evt.name));
            setEventsList(filtered);
        } catch (e) {
            console.error("Erro ao carregar eventos:", e);
        }
    };

    const fetchOccupationMap = async (eventId: string) => {
        try {
            const { data, error } = await appBackend.client
                .from('crm_event_registrations')
                .select('workshop_id')
                .eq('event_id', eventId);
            if (error) throw error;
            
            const map: Record<string, number> = {};
            (data || []).forEach(reg => {
                const wsId = String(reg.workshop_id);
                map[wsId] = (map[wsId] || 0) + 1;
            });
            setWorkshopOccupation(map);
        } catch (e) {
            console.error("Erro ao calcular ocupação:", e);
        }
    };

    const handleOpenEventProgram = async (evt: EventModel) => {
        setViewingEvent(evt);
        setIsLoading(true);
        try {
            const [ws, blks, regs] = await Promise.all([
                appBackend.getWorkshops(evt.id),
                appBackend.getBlocks(evt.id),
                appBackend.getEventRegistrations(evt.id)
            ]);
            setEventWorkshops(ws);
            setEventBlocks(blks);
            await fetchOccupationMap(evt.id);
            
            const userEmail = (student.email || '').toLowerCase().trim();
            setMyRegistrations(regs.filter(r => {
                const regEmail = (r.studentEmail || '').toLowerCase().trim();
                const isEmailMatch = regEmail !== '' && regEmail === userEmail;
                const isIdMatch = studentDealIds.includes(String(r.studentId));
                return isEmailMatch || isIdMatch;
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const isEventLocked = useMemo(() => {
        return myRegistrations.some(r => r.locked);
    }, [myRegistrations]);

    const handleToggleRegistration = async (workshop: Workshop) => {
        if (isEventLocked) {
            alert("Suas escolhas estão bloqueadas pela administração e não podem ser alteradas.");
            return;
        }
        if (!viewingEvent) return;
        const studentIdToUse = mainDealId;
        if (!studentIdToUse) {
            alert("Erro de identificacao. Tente fazer login novamente.");
            return;
        }
        
        const currentReg = myRegistrations.find(r => String(r.workshopId) === String(workshop.id));
        const isRegistered = !!currentReg;
        
        if (isRegistered) {
            if (!window.confirm("Deseja cancelar sua inscricao neste workshop?")) return;
            setIsRegistering(workshop.id);
            try {
                const { error } = await appBackend.client.from('crm_event_registrations').delete().eq('id', currentReg.id);
                if (error) throw error;
                setMyRegistrations(prev => prev.filter(r => r.id !== currentReg.id));
                await fetchOccupationMap(viewingEvent.id);
            } catch (e: any) { 
                alert("Erro ao cancelar: " + (e.message || "Falha de comunicacao")); 
            }
            finally { setIsRegistering(null); }
        } else {
            const block = eventBlocks.find(b => String(b.id) === String(workshop.blockId));
            const blockRegs = myRegistrations.filter(r => {
                const ws = eventWorkshops.find(w => String(w.id) === String(r.workshopId));
                return ws && String(ws.blockId) === String(workshop.blockId);
            });

            if (block && blockRegs.length >= block.maxSelections) {
                alert(`Limite de ${block.maxSelections} selecao(oes) para este bloco (${block.title}) atingido.`);
                return;
            }

            setIsRegistering(workshop.id);
            try {
                const { count, error: countErr } = await appBackend.client
                    .from('crm_event_registrations')
                    .select('id', { count: 'exact', head: true })
                    .eq('workshop_id', workshop.id);
                
                if (countErr) throw countErr;
                
                if (count !== null && count >= workshop.spots) {
                    alert("Desculpe, este workshop ja esta lotado.");
                    return;
                }

                const dbPayload = {
                    id: crypto.randomUUID(),
                    event_id: viewingEvent.id,
                    workshop_id: workshop.id,
                    student_id: studentIdToUse,
                    student_name: student.name,
                    student_email: student.email,
                    created_at: new Date().toISOString()
                };
                
                const { error: insertErr } = await appBackend.client.from('crm_event_registrations').insert([dbPayload]);
                if (insertErr) throw insertErr;
                
                setMyRegistrations(prev => [...prev, {
                    id: dbPayload.id,
                    eventId: dbPayload.event_id,
                    workshopId: String(dbPayload.workshop_id),
                    studentId: String(dbPayload.student_id),
                    studentName: dbPayload.student_name,
                    studentEmail: dbPayload.student_email,
                    registeredAt: dbPayload.created_at
                }]);
                await fetchOccupationMap(viewingEvent.id);
            } catch (e: any) { 
                alert("Erro ao realizar inscricao: " + (e.message || "Falha de rede")); 
            }
            finally { setIsRegistering(null); }
        }
    };

    const loadBaseData = async () => {
        setIsLoading(true);
        try {
            const allCodes = Array.from(new Set(student.deals.flatMap(d => [d.class_mod_1, d.class_mod_2]).filter(Boolean)));
            if (allCodes.length > 0) {
                const { data } = await appBackend.client.from('crm_classes').select('*').or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                if (data) setClasses(data);
            }
            await loadCertificates();
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const loadBanners = async () => {
        try { 
            const data = await appBackend.getBanners('student'); 
            setBanners(data || []); 
        } catch (e) {}
    };

    const loadOnlineCourses = async () => {
        if (!mainDealId) return;
        try {
            const [coursesData, accessIds, progressIds] = await Promise.all([
                appBackend.getOnlineCourses(),
                appBackend.getStudentCourseAccess(String(mainDealId)),
                appBackend.getStudentLessonProgress(String(mainDealId))
            ]);
            setAllCourses(coursesData || []);
            setUnlockedCourseIds(accessIds || []);
            setCompletedLessonIds(progressIds || []);
        } catch (e) {}
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
        } catch (e) {} finally { setIsLoading(false); }
    };

    const handleToggleLessonComplete = async (lessonId: string) => {
        if (!mainDealId || !playingCourse) return;
        const isCurrentlyCompleted = completedLessonIds.includes(lessonId);
        const newStatus = !isCurrentlyCompleted;
        try {
            await appBackend.toggleLessonProgress(String(mainDealId), lessonId, newStatus);
            const updatedProgress = newStatus 
                ? [...completedLessonIds, lessonId] 
                : completedLessonIds.filter(id => id !== lessonId);
            setCompletedLessonIds(updatedProgress);
            if (newStatus && playingCourse.certificateTemplateId) {
                const allLessonIdsInCourse = courseStructure?.modules.flatMap(m => (courseStructure.lessons[m.id] || []).map(l => l.id)) || [];
                const isFinished = allLessonIdsInCourse.every(id => updatedProgress.includes(id));
                if (isFinished) {
                    const alreadyHasCert = certificates.some(c => c.certificate_template_id === playingCourse.certificateTemplateId);
                    if (!alreadyHasCert) {
                        await appBackend.issueCertificate(String(mainDealId), playingCourse.certificateTemplateId);
                        await loadCertificates(); 
                        alert("Parabens! Voce concluiu o curso e seu diploma esta disponivel na aba Meus Diplomas!");
                    }
                }
            }
        } catch (e) {}
    };

    const activeCourseProgress = useMemo(() => {
        if (!courseStructure || !playingCourse) return 0;
        const allLessons = courseStructure.modules.flatMap(m => courseStructure.lessons[m.id] || []);
        if (allLessons.length === 0) return 0;
        const completed = allLessons.filter(l => completedLessonIds.includes(l.id)).length;
        return Math.round((completed / allLessons.length) * 100);
    }, [courseStructure, completedLessonIds, playingCourse]);

    const studentFirstName = useMemo(() => {
        const rawName = student.name || '';
        const namePart = rawName.trim().split(' ')[0];
        if (!namePart || namePart.toLowerCase() === 'aluno') return 'Aluno';
        return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }, [student.name]);

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
                            <span className="text-[10px] font-black">{activeCourseProgress}% Concluido</span>
                        </div>
                    </div>
                    <div className="w-24"></div>
                </header>
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 overflow-y-auto custom-scrollbar-dark p-8 space-y-8">
                        {activeLesson ? (
                            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="aspect-video bg-black rounded-[2rem] shadow-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                                    {activeLesson.videoUrl ? (
                                        <div 
                                            className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0"
                                            dangerouslySetInnerHTML={{ __html: activeLesson.videoUrl }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                            <Video size={64} className="opacity-20 mb-4" />
                                            <p className="font-bold">Esta aula nao possui video.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                    <div className="flex-1 space-y-4">
                                        <h1 className="text-3xl font-black">{activeLesson.title}</h1>
                                        <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{activeLesson.description || 'Nenhuma descricao.'}</p>
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
                                            {completedLessonIds.includes(activeLesson.id) ? <><CheckCircle2 size={20}/> Concluida!</> : <><Circle size={20}/> Marcar como Concluida</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">Selecione uma aula.</div>
                        )}
                    </main>
                    <aside className="w-80 bg-slate-800/30 border-l border-white/5 flex flex-col shrink-0">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Conteudo do Curso</h3>
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
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Video Aula</span>
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
                        <img src={logoUrl || "https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png"} alt="VOLL" className="h-8 max-w-[150px] object-contain" />
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
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">Matricula Ativa</span>
                        </div>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-inner"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                {pendingContracts.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-bounce-subtle shadow-lg shadow-amber-500/10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <FileSignature size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-amber-900">Voce tem {pendingContracts.length} contrato(s) pendente(s)</h3>
                                <p className="text-sm text-amber-700 font-medium">Por favor, realize a assinatura digital.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveTab('contracts')}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
                        >
                            Assinar Agora
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[250px]">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/30 backdrop-blur-md"><Sparkles size={12} className="text-amber-400" /> Bem-vindo!</div>
                            <h2 className="text-3xl font-black mb-3 tracking-tight leading-tight">Ola, <span className="text-white">{studentFirstName}</span>!</h2>
                            <p className="text-purple-100/80 text-base leading-relaxed font-medium">Sua jornada academica continua aqui.</p>
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
                                <h3 className="font-black text-xl mb-1">Novas Formacoes VOLL</h3>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Presenciais', icon: GraduationCap, color: 'text-purple-600' },
                        { id: 'online_courses', label: 'Cursos Online', icon: MonitorPlay, color: 'text-indigo-600' },
                        { id: 'events', label: 'Eventos', icon: Mic, color: 'text-amber-600' },
                        { id: 'certificates', label: 'Meus Diplomas', icon: Award, color: 'text-emerald-600' },
                        { id: 'contracts', label: 'Assinaturas', icon: FileSignature, color: 'text-amber-600', badge: pendingContracts.length }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all relative", activeTab === 'id' ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-100" : "text-slate-500 hover:text-slate-800")}>
                            <tab.icon size={20} className={activeTab === tab.id ? tab.color : "text-slate-400"} />
                            {tab.label}
                            {tab.badge ? (
                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{tab.badge}</span>
                            ) : null}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {classes.length === 0 ? (
                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300">
                                    <GraduationCap size={48} className="mb-4 opacity-20"/> 
                                    <p className="font-bold">Nenhuma formacao presencial ativa.</p>
                                </div>
                            ) : classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all overflow-hidden border-b-8 border-b-purple-500 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-slate-800 mb-4 leading-tight">{cls.course}</h3>
                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-6 font-bold uppercase tracking-widest"><MapPin size={16} className="text-purple-500" /> {cls.city}, {cls.state}</div>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Modulo 01</span>
                                                <div className="flex items-center gap-2 font-black text-slate-700 text-xs"><Calendar size={14} className="text-purple-500" /> {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A confirmar'}</div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Modulo 02</span>
                                                <div className="flex items-center gap-2 font-black text-slate-700 text-xs"><Calendar size={14} className="text-orange-500" /> {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A confirmar'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setViewingClassDetails(cls)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Info size={16}/> Ver Informações Completas
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'online_courses' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allCourses.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-slate-400 italic font-bold border-2 border-dashed rounded-3xl">Voce ainda nao possui cursos online.</div>
                            ) : allCourses.map(course => {
                                const isUnlocked = unlockedCourseIds.includes(course.id);
                                return (
                                    <div key={course.id} onClick={() => isUnlocked && handleOpenCoursePlayer(course)} className={clsx("bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all overflow-hidden border border-slate-200 flex flex-col group", !isUnlocked ? "opacity-50 grayscale cursor-default" : "cursor-pointer")}>
                                        <div className="h-48 relative overflow-hidden">
                                            {course.imageUrl ? <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={course.title} /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><MonitorPlay size={48} /></div>}
                                            {!isUnlocked && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white"><Lock size={32} className="mb-2" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Aguardando Liberacao</span></div>}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="font-black text-slate-800 mb-2 leading-tight">{course.title}</h3>
                                            <div className="mt-auto flex items-center justify-between">{isUnlocked ? <span className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">Assistir Agora <ArrowRight size={14}/></span> : <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Indisponivel</span>}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'events' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {eventsList.length === 0 ? (
                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300"><Mic size={48} className="mb-4 opacity-20"/><p className="font-bold">Nenhum evento disponivel.</p></div>
                            ) : eventsList.map(evt => (
                                <div key={evt.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all flex flex-col border-b-8 border-b-amber-500">
                                    <div className="flex justify-between items-start mb-4"><div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><Mic size={24} /></div>{evt.registrationOpen && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">Inscricoes Abertas</span>}</div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{evt.name}</h3>
                                    <div className="space-y-2 mb-8"><div className="flex items-center gap-2 text-xs text-slate-600 font-bold"><MapPin size={14} className="text-amber-500" /> {evt.location}</div></div>
                                    <button onClick={() => handleOpenEventProgram(evt)} className="mt-auto w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg">Ver Programacao / Inscricao</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'certificates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-full flex justify-end mb-4"><button onClick={loadCertificates} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-teal-600 transition-colors"><RefreshCw size={14}/> Atualizar Lista</button></div>
                            {certificates.length === 0 ? (
                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300"><Award size={48} className="mb-4 opacity-20"/><p className="font-bold">Nenhum certificado emitido.</p></div>
                            ) : certificates.map(cert => (
                                <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-600 group-hover:rotate-12 transition-transform shadow-inner"><Trophy size={32}/></div>
                                    <div className="flex-1"><h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{cert.crm_certificates?.title}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Emitido em {new Date(cert.issued_at).toLocaleDateString()}</p></div>
                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all active:scale-95"><Download size={24}/></a>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'contracts' && (
                        <div className="space-y-6">
                            {pendingContracts.length === 0 ? (
                                <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-slate-300"><CheckCircle size={48} className="mb-4 opacity-20"/><p className="font-bold">Voce nao possui assinaturas pendentes.</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {pendingContracts.map(c => (
                                        <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col border-l-8 border-l-amber-500">
                                            <h3 className="text-xl font-black text-slate-800 mb-2">{c.title}</h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-6">Pendente desde {new Date(c.createdAt).toLocaleDateString()}</p>
                                            <button onClick={() => setSigningContract(c)} className="mt-auto bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-600/20"><FileSignature size={18}/> Assinar Documento</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Detalhes da Turma Presencial */}
            {viewingClassDetails && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-[2.5rem]">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight">{viewingClassDetails.course}</h3>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Informações Logísticas da Turma</p>
                            </div>
                            <button onClick={() => setViewingClassDetails(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-purple-600 uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-purple-100">
                                        <Calendar size={16}/> Módulo 1
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Local do Curso (Studio)</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><Building size={18} className="text-purple-600"/> {viewingClassDetails.studio_mod_1 || 'A definir'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Instrutor(a)</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-purple-600"/> {viewingClassDetails.instructor_mod_1 || 'A definir'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Data</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-purple-600"/> {viewingClassDetails.date_mod_1 ? new Date(viewingClassDetails.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-orange-100">
                                        <Calendar size={16}/> Módulo 2
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Local do Curso (Studio)</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><Building size={18} className="text-orange-600"/> {viewingClassDetails.studio_mod_1 || 'A definir'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Instrutor(a)</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-orange-600"/> {viewingClassDetails.instructor_mod_2 || 'A definir'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Data</p>
                                            <p className="text-base font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-orange-600"/> {viewingClassDetails.date_mod_2 ? new Date(viewingClassDetails.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {viewingClassDetails.observations && (
                                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Info size={16}/> Avisos Importantes para o Aluno
                                    </h4>
                                    <p className="text-sm text-amber-900 leading-relaxed font-medium italic whitespace-pre-wrap">{viewingClassDetails.observations}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] flex justify-end">
                            <button onClick={() => setViewingClassDetails(null)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95 shadow-lg">
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingEvent && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{viewingEvent.name}</h3>
                                <p className="text-sm text-slate-500 font-medium">Escolha os workshops que deseja participar.</p>
                                {isEventLocked && (
                                    <div className="mt-2 inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                                        <Lock size={12}/> Suas escolhas estão bloqueadas pela administração.
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setViewingEvent(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                            {isLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin text-amber-500 mb-4" size={40}/><p className="font-bold">Carregando...</p></div>
                            ) : eventBlocks.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 italic">Programacao em breve.</div>
                            ) : (
                                <div className="space-y-10">
                                    {eventBlocks.sort((a, b) => a.date.localeCompare(b.date)).map(block => {
                                        const blockWS = eventWorkshops.filter(w => String(w.blockId) === String(block.id));
                                        const myBlockRegs = myRegistrations.filter(r => blockWS.some(w => String(w.id) === String(r.workshopId)));
                                        return (
                                            <div key={block.id} className="space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-2 gap-2">
                                                    <div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Clock size={18}/></div><div><h4 className="font-black text-slate-800 uppercase tracking-tight">{block.title}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(block.date).toLocaleDateString('pt-BR')}</p></div></div>
                                                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{myBlockRegs.length} / {block.maxSelections} Selecoes</div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {blockWS.map(ws => {
                                                        const isSelected = myRegistrations.some(r => String(r.workshopId) === String(ws.id));
                                                        const occupied = workshopOccupation[String(ws.id)] || 0;
                                                        const remaining = Math.max(0, ws.spots - occupied);
                                                        const isDisabled = isEventLocked || isRegistering !== null || (!isSelected && (myBlockRegs.length >= block.maxSelections || remaining <= 0));
                                                        return (
                                                            <div key={ws.id} className={clsx("p-5 rounded-3xl border-2 transition-all flex flex-col group", isSelected ? "border-teal-500 bg-teal-50/30" : "border-slate-100 hover:border-indigo-200 bg-white")}>
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="flex items-center gap-2"><div className={clsx("w-8 h-8 rounded-full flex items-center justify-center transition-all", isSelected ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600")}><CheckSquare size={16}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ws.time}</span></div>
                                                                    <div className={clsx("flex items-center gap-1 text-[10px] font-black uppercase", remaining <= 5 && remaining > 0 ? "text-orange-500" : remaining === 0 ? "text-red-500" : "text-slate-400")}>
                                                                        <Users size={12}/> {remaining} / {ws.spots} livres
                                                                    </div>
                                                                </div>
                                                                <h5 className="font-black text-slate-800 text-base mb-1 leading-tight">{ws.title}</h5>
                                                                <p className="text-xs text-indigo-600 font-bold mb-4 flex items-center gap-1"><Mic size={14}/> {ws.speaker}</p>
                                                                <button onClick={() => handleToggleRegistration(ws)} disabled={isDisabled && !isSelected} className={clsx("mt-auto w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2", is