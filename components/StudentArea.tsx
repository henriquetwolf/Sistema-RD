import React, { useEffect, useState, useMemo } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio, Product, CourseModule, CourseLesson } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportTicketModal } from './SupportTicketModal';
import { 
    LogOut, GraduationCap, BookOpen, Award, Calendar, MapPin, 
    Video, Download, Loader2, User, Sparkles, Bell, PieChart, ArrowRight, Trophy, ChevronRight, Zap, LifeBuoy, Play, Lock as LockIcon, X, CheckCircle, CheckCircle2
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
        } catch (e) { console.error(e); }
    };

    const loadStudentData = async () => {
        setIsLoading(true);
        try {
            const mod1Codes = student.deals.map(d => d.class_mod_1).filter(Boolean);
            const mod2Codes = student.deals.map(d => d.class_mod_2).filter(Boolean);
            const allCodes = Array.from(new Set([...mod1Codes, ...mod2Codes]));
            if (allCodes.length > 0) {
                const { data } = await appBackend.client.from('crm_classes').select('*').or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                if (data) setClasses(data);
            }
            const dealIds = student.deals.map(d => d.id);
            if (dealIds.length > 0) {
                const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('*').in('student_deal_id', dealIds);
                if (issuedCerts) setCertificates(issuedCerts);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
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

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1` : url;
    };

    if (activeSurvey) return <FormViewer form={activeSurvey} onBack={() => setActiveSurvey(null)} studentId={student.deals[0]?.id} onSuccess={() => { setActiveSurvey(null); loadSurveys(); }} />;

    if (activeCourse) {
        return (
            <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col animate-in fade-in duration-300">
                <header className="bg-slate-900/80 border-b border-white/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveCourse(null)} className="p-2 text-white/60 hover:text-white transition-colors"><X size={24}/></button>
                        <div><h2 className="text-white font-black">{activeCourse.name}</h2><p className="text-white/40 text-[10px] font-bold uppercase">LMS VOLL</p></div>
                    </div>
                </header>
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <main className="flex-1 bg-black flex flex-col relative">
                        {currentLesson ? (
                            <>
                                <div className="flex-1 relative">
                                    <iframe src={getEmbedUrl(currentLesson.videoUrl)} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen></iframe>
                                </div>
                                <div className="p-8 bg-slate-900/50 text-white shrink-0">
                                    <h3 className="text-xl font-black mb-2">{currentLesson.title}</h3>
                                    <p className="text-white/60 text-sm whitespace-pre-wrap">{currentLesson.description}</p>
                                </div>
                            </>
                        ) : <div className="flex-1 flex items-center justify-center text-white/20 uppercase font-black tracking-widest">Selecione uma aula</div>}
                    </main>
                    <aside className="w-full md:w-80 bg-slate-900 border-l border-white/5 flex flex-col overflow-y-auto custom-scrollbar-dark p-4 space-y-4">
                        {activeModules.map(mod => (
                            <div key={mod.id} className="space-y-1">
                                <div className="px-4 py-2 bg-white/5 rounded-xl text-white/90 text-xs font-black uppercase tracking-wider">{mod.title}</div>
                                {activeLessons[mod.id]?.map(les => (
                                    <button key={les.id} onClick={() => setCurrentLesson(les)} className={clsx("w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all", currentLesson?.id === les.id ? "bg-teal-600 text-white" : "text-white/40 hover:bg-white/5")}>
                                        <Play size={14}/> <p className="text-xs font-bold truncate">{les.title}</p>
                                    </button>
                                ))}
                            </div>
                        ))}
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
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 rounded-xl"><LogOut size={18} /></button>
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
                                            <h3 className="font-black text-slate-800 text-lg mb-3">{course.name}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2 flex-1">{course.description}</p>
                                            {isUnlocked ? (
                                                <button onClick={() => openCoursePlayer(course)} className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Assistir Agora</button>
                                            ) : (
                                                <div className="bg-slate-50 p-4 mt-6 rounded-2xl text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Fale com suporte para liberar.</p></div>
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