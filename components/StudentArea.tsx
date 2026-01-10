
import React, { useEffect, useState, useMemo } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio, Product, CourseModule, CourseLesson } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportTicketModal } from './SupportTicketModal';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2, List,
    PieChart, Send, ArrowRight, Sparkles, Bell, Bookmark, Search, Zap, Trophy, ChevronRight, Book, ListTodo, LifeBuoy, Play, Lock as LockIcon, ChevronDown, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates' | 'events' | 'surveys'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [events, setEvents] = useState<EventModel[]>([]);
    const [digitalProducts, setDigitalProducts] = useState<Product[]>([]);
    const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>([]);
    
    // LMS Player States
    const [activeCourse, setActiveCourse] = useState<Product | null>(null);
    const [activeModules, setActiveModules] = useState<CourseModule[]>([]);
    const [activeLessons, setActiveLessons] = useState<Record<string, CourseLesson[]>>({});
    const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null);
    const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
    
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mySurveys, setMySurveys] = useState<SurveyModel[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState<SurveyModel | null>(null);
    const [surveyInitialAnswers, setSurveyInitialAnswers] = useState<Record<string, any>>({});
    
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [selectedCourseInfo, setSelectedCourseInfo] = useState<CourseInfo | null>(null);
    const [selectedStudioDetails, setSelectedStudioDetails] = useState<PartnerStudio | null>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    useEffect(() => {
        loadStudentData();
        loadBanners();
        loadSurveys();
        fetchSupportNotifications();
        loadDigitalCatalog();
    }, [student]);

    const fetchSupportNotifications = async () => {
        try {
            const mainDealId = student.deals[0]?.id;
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
            const mainDealId = student.deals[0]?.id;
            if (mainDealId) {
                const access = await appBackend.getStudentCourseAccess(mainDealId);
                setUnlockedCourseIds(access);
            }
        } catch (e) {}
    };

    const loadSurveys = async () => {
        try {
            const mainDeal = student.deals[0];
            if (mainDeal) {
                const surveys = await appBackend.getEligibleSurveysForStudent(mainDeal.id);
                setMySurveys(surveys);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadStudentData = async () => {
        setIsLoading(true);
        try {
            const mod1Codes = student.deals.map(d => d.class_mod_1).filter(Boolean);
            const mod2Codes = student.deals.map(d => d.class_mod_2).filter(Boolean);
            const allCodes = Array.from(new Set([...mod1Codes, ...mod2Codes]));

            if (allCodes.length > 0) {
                const { data: classesData } = await appBackend.client
                    .from('crm_classes')
                    .select('*')
                    .or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                
                if (classesData) setClasses(classesData);
            }

            const dealIds = student.deals.map(d => d.id);
            if (dealIds.length > 0) {
                const { data: issuedCerts } = await appBackend.client
                    .from('crm_student_certificates')
                    .select('*')
                    .in('student_deal_id', dealIds);
                
                if (issuedCerts && issuedCerts.length > 0) {
                    const templateIds = issuedCerts.map((c: any) => c.certificate_template_id);
                    const { data: templates } = await appBackend.client
                        .from('crm_certificates')
                        .select('id, title')
                        .in('id', templateIds);
                    
                    const mergedCerts = issuedCerts.map((cert: any) => {
                        const template = templates?.find((t: any) => t.id === cert.certificate_template_id);
                        return {
                            ...cert,
                            crm_certificates: { title: template?.title || 'Certificado' }
                        };
                    });
                    
                    setCertificates(mergedCerts);
                } else {
                    setCertificates([]);
                }
            }
        } catch (e) {
            console.error("Erro ao carregar dados do aluno", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCourseInfo = async (courseName: string) => {
        try {
            const { data } = await appBackend.client
                .from('crm_course_info')
                .select('*')
                .eq('course_name', courseName)
                .maybeSingle();
            
            if (data) {
                setSelectedCourseInfo({
                    id: data.id,
                    courseName: data.course_name,
                    details: data.details || '',
                    materials: data.materials || '',
                    requirements: data.requirements || '',
                    updatedAt: data.updated_at
                });
            }
        } catch (e) {}
    };

    const loadStudioDetails = async (fantasyName: string) => {
        if (!fantasyName) return;
        try {
            const { data } = await appBackend.client
                .from('crm_partner_studios')
                .select('*')
                .eq('fantasy_name', fantasyName)
                .maybeSingle();
            
            if (data) {
                setSelectedStudioDetails({
                    id: data.id,
                    status: data.status,
                    responsibleName: data.responsible_name,
                    cpf: data.cpf,
                    phone: data.phone,
                    email: data.email,
                    fantasyName: data.fantasy_name,
                    legalName: data.legal_name,
                    cnpj: data.cnpj,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    country: data.country,
                    hasReformer: data.has_reformer,
                    qtyReformer: data.qty_reformer,
                    hasLadderBarrel: data.has_ladder_barrel,
                    qtyLadderBarrel: data.qty_ladder_barrel,
                    hasChair: data.has_chair,
                    qtyChair: data.qty_chair,
                    hasCadillac: data.has_cadillac,
                    qtyCadillac: data.qty_cadillac,
                    hasChairsForCourse: data.has_chairs_for_course,
                    hasTv: data.has_tv
                });
            }
        } catch (e) {}
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
        } catch (e) {
            alert("Erro ao abrir conteúdo do curso.");
        } finally {
            setIsLoadingPlayer(false);
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('youtube.com/embed/')) return url;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`;
        }
        return url;
    };

    const loadBanners = async () => {
        try {
            const data = await appBackend.getBanners('student');
            setBanners(data);
        } catch (e) {
            console.error("Failed to load banners", e);
        }
    };

    const openSurvey = (survey: SurveyModel) => {
        const deal = student.deals[0];
        if (!deal) return;
        const studentClass = classes.find(c => (deal.class_mod_1 && c.mod_1_code === deal.class_mod_1) || (deal.class_mod_2 && c.mod_2_code === deal.class_mod_2));
        const initial: Record<string, any> = {};
        survey.questions.forEach(q => {
            if (q.systemMapping) {
                switch(q.systemMapping) {
                    case 'student_name': initial[q.id] = deal.company_name || deal.contact_name || student.name; break;
                    case 'product_name': initial[q.id] = deal.product_name || ''; break;
                    case 'state': initial[q.id] = studentClass?.state || deal.course_state || ''; break;
                    case 'city': initial[q.id] = studentClass?.city || deal.course_city || ''; break;
                    case 'class_mod1': initial[q.id] = deal.class_mod_1 || ''; break;
                    case 'class_mod2': initial[q.id] = deal.class_mod_2 || ''; break;
                    case 'instructor_mod1': initial[q.id] = studentClass?.instructor_mod_1 || ''; break;
                    case 'instructor_mod2': initial[q.id] = studentClass?.instructor_mod_2 || ''; break;
                    case 'studio': initial[q.id] = studentClass?.studio_mod_1 || ''; break;
                }
            }
        });
        setSurveyInitialAnswers(initial);
        setActiveSurvey(survey);
    };

    const handleSurveyFinish = () => {
        setActiveSurvey(null);
        loadSurveys(); 
    };

    if (activeSurvey) return (
        <FormViewer form={activeSurvey} onBack={() => setActiveSurvey(null)} studentId={student.deals[0]?.id} initialAnswers={surveyInitialAnswers} onSuccess={handleSurveyFinish} />
    );

    if (activeCourse) {
        return (
            <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col animate-in fade-in duration-300">
                <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveCourse(null)} className="p-2 text-white/60 hover:text-white transition-colors"><X size={24}/></button>
                        <div>
                            <h2 className="text-white font-black leading-tight">{activeCourse.name}</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Plataforma Digital VOLL</p>
                        </div>
                    </div>
                    {currentLesson && (
                        <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                            <Video size={16} className="text-teal-400" />
                            <span className="text-xs font-bold text-white/80">{currentLesson.title}</span>
                        </div>
                    )}
                </header>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <main className="flex-1 bg-black flex flex-col relative overflow-hidden">
                        {currentLesson ? (
                            <>
                                <div className="flex-1 relative">
                                    <iframe 
                                        src={getEmbedUrl(currentLesson.videoUrl)}
                                        className="absolute inset-0 w-full h-full"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="p-8 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 overflow-y-auto max-h-[250px] custom-scrollbar shrink-0">
                                    <h3 className="text-xl font-black text-white mb-2">{currentLesson.title}</h3>
                                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{currentLesson.description || 'Nenhuma descrição para esta aula.'}</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-white/20">
                                <Play size={80} className="mb-4 opacity-10" />
                                <p className="font-black uppercase tracking-widest">Selecione uma aula na lateral</p>
                            </div>
                        )}
                    </main>

                    <aside className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h4 className="text-white text-xs font-black uppercase tracking-[0.2em]">Conteúdo do Curso</h4>
                            <span className="text-white/30 text-[10px] font-mono">{activeModules.length} Módulos</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-2 space-y-2">
                            {activeModules.map(mod => (
                                <div key={mod.id} className="space-y-1">
                                    <div className="px-4 py-3 bg-white/5 rounded-xl flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                        <span className="text-white/90 text-xs font-black uppercase tracking-wider">{mod.title}</span>
                                    </div>
                                    <div className="space-y-1 pl-2">
                                        {(activeLessons[mod.id] || []).map(les => (
                                            <button 
                                                key={les.id} 
                                                onClick={() => setCurrentLesson(les)}
                                                className={clsx(
                                                    "w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all",
                                                    currentLesson?.id === les.id ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20" : "text-white/40 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                {currentLesson?.id === les.id ? <CheckCircle size={16}/> : <Play size={16} className="opacity-40" />}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate leading-tight">{les.title}</p>
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                        <div className="hidden md:flex h-6 w-px bg-slate-200"></div>
                        <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <GraduationCap size={14} className="text-purple-600" />
                            Portal do Aluno
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setShowSupportModal(true); setPendingTicketsCount(0); }}
                            className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 flex items-center gap-2 font-bold text-xs relative"
                        >
                            <LifeBuoy size={20} /> <span className="hidden sm:inline">Suporte</span>
                            {pendingTicketsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                    {pendingTicketsCount}
                                </span>
                            )}
                        </button>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-sm font-black text-slate-800 leading-none">{student.name}</span>
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">Matrícula Ativa</span>
                        </div>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-inner">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                
                {mySurveys.length > 0 && (
                    <section className="space-y-4 animate-in slide-in-from-top-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bell size={14} className="text-amber-500" /> Pendências e Feedbacks
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mySurveys.map(s => (
                                <div key={s.id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group">
                                    <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                                        <PieChart size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 mb-1">{s.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-1">Sua opinião é vital para melhorarmos.</p>
                                    </div>
                                    <button onClick={() => openSurvey(s)} className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-purple-900/20 relative overflow-hidden group flex flex-col justify-between">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/30 backdrop-blur-md">
                                <Sparkles size={12} className="text-amber-400" /> Seja bem-vindo
                            </div>
                            <h2 className="text-3xl font-black mb-3 tracking-tight leading-tight">
                                Olá, <span className="text-purple-200">{student.name.split(' ')[0]}</span>!
                            </h2>
                            <p className="text-purple-100/80 text-base leading-relaxed font-medium mb-6">
                                Acompanhe sua jornada acadêmica e gerencie seus certificados da maior rede de Pilates do mundo.
                            </p>
                        </div>
                        
                        <div className="relative z-10 flex gap-4 mt-auto">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex flex-col items-center justify-center flex-1">
                                <Trophy size={24} className="text-amber-400 mb-1" />
                                <span className="text-xl font-black">{certificates.length}</span>
                                <span className="text-[10px] font-bold uppercase text-purple-200">Certificados</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex flex-col items-center justify-center flex-1">
                                <BookOpen size={24} className="text-teal-400 mb-1" />
                                <span className="text-xl font-black">{classes.length}</span>
                                <span className="text-[10px] font-bold uppercase text-purple-200">Turmas</span>
                            </div>
                        </div>
                    </section>

                    {banners.length > 0 ? (
                        <section className="relative h-full flex flex-col gap-4">
                            <div className="overflow-hidden rounded-[2.5rem] shadow-xl border-4 border-white h-full relative group">
                                <div className="overflow-x-auto no-scrollbar flex h-full snap-x snap-mandatory">
                                    {banners.map(banner => (
                                        <a key={banner.id} href={banner.linkUrl || '#'} target="_blank" rel="noreferrer" className="block min-w-full h-full snap-start relative">
                                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <h4 className="font-bold text-sm">{banner.title}</h4>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>

                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Cursos Presenciais', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { id: 'products', label: 'Cursos Online VOLL', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                        { id: 'certificates', label: 'Certificados', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={clsx(
                                "flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                                activeTab === tab.id 
                                    ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-100" 
                                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                            )}
                        >
                            <tab.icon size={20} className={clsx("transition-transform", activeTab === tab.id ? `${tab.color} scale-110` : "text-slate-400")} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {classes.length === 0 ? (
                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <GraduationCap size={40} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600">Nenhuma turma encontrada</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mt-1">Quando você se matricular em uma nova formação presencial, ela aparecerá aqui.</p>
                                </div>
                            ) : (
                                classes.map(cls => (
                                    <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden border-b-8 border-b-purple-500">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-purple-50 rounded-3xl text-purple-600 group-hover:rotate-12 transition-transform">
                                                <GraduationCap size={32} />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">ID Turma</span>
                                                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-500">#{cls.class_code}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight min-h-[56px] line-clamp-2">{cls.course}</h3>
                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-8 font-medium">
                                            <MapPin size={16} className="text-purple-500" /> 
                                            {cls.city}, {cls.state}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => setSelectedClass(cls)} className="text-xs font-black text-purple-600 hover:text-purple-800 uppercase tracking-widest flex items-center gap-1 group/btn">Ver Detalhes <ChevronRight size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {digitalProducts.map(course => {
                                const isUnlocked = unlockedCourseIds.includes(course.id);
                                return (
                                    <div key={course.id} className={clsx("bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all", isUnlocked ? "hover:shadow-2xl hover:border-amber-400" : "opacity-80 grayscale")}>
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
                                            <h3 className="font-black text-slate-800 text-lg leading-tight mb-3">{course.name}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-8 flex-1">{course.description}</p>
                                            {isUnlocked ? (
                                                <button onClick={() => openCoursePlayer(course)} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                    Continuar Assistindo <Play size={16} fill="currentColor" />
                                                </button>
                                            ) : (
                                                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Você ainda não tem acesso a este conteúdo.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'certificates' && (
                        <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {certificates.length === 0 ? (
                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <Award size={40} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600">Nenhum certificado emitido</h3>
                                </div>
                            ) : (
                                certificates.map(cert => (
                                    <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
                                        <div className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-600 group-hover:rotate-12 transition-transform shadow-inner">
                                            <Trophy size={32}/>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{cert.crm_certificates?.title}</h4>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                <Calendar size={12} />
                                                Emitido: {new Date(cert.issued_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <a href={`/?certificateHash=${cert.hash}`} target="_blank" rel="noreferrer" className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95">
                                            <Download size={24}/>
                                        </a>
                                    </div>
                                ))
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
