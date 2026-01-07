
import React, { useEffect, useState } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportChannel } from './SupportChannel';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2, List,
    PieChart, Send, ArrowRight, Sparkles, Bell, Bookmark, Search, Zap, Trophy, ChevronRight, Book, ListTodo, LifeBuoy, Info
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
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates' | 'events' | 'surveys' | 'support'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [events, setEvents] = useState<EventModel[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mySurveys, setMySurveys] = useState<SurveyModel[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState<SurveyModel | null>(null);
    const [surveyInitialAnswers, setSurveyInitialAnswers] = useState<Record<string, any>>({});
    
    const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [selectedCourseInfo, setSelectedCourseInfo] = useState<CourseInfo | null>(null);
    const [selectedStudioDetails, setSelectedStudioDetails] = useState<PartnerStudio | null>(null);

    useEffect(() => {
        loadStudentData();
        loadBanners();
        loadSurveys();
    }, [student]);

    useEffect(() => {
        if (activeTab === 'events') {
            loadEventsData();
        }
    }, [activeTab]);

    useEffect(() => {
        if (selectedClass) {
            loadCourseInfo(selectedClass.course);
            loadStudioDetails(selectedClass.studio_mod_1);
        } else {
            setSelectedCourseInfo(null);
            setSelectedStudioDetails(null);
        }
    }, [selectedClass]);

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

    const loadBanners = async () => {
        try {
            const data = await appBackend.getBanners('student');
            setBanners(data);
        } catch (e) {
            console.error("Failed to load banners", e);
        }
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

    const loadEventsData = async () => {
        setIsLoading(true);
        try {
            const eventsData = await appBackend.getEvents();
            setEvents(eventsData);
            const mainStudentId = student.deals[0]?.id;
            if (mainStudentId) {
                const { data: regs } = await appBackend.client
                    .from('crm_event_registrations')
                    .select('*')
                    .eq('student_id', mainStudentId);
                if (regs) {
                    const mappedRegs: EventRegistration[] = regs.map((r: any) => ({
                        id: r.id, eventId: r.event_id, workshopId: r.workshop_id, studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email, registeredAt: r.created_at
                    }));
                    setMyRegistrations(mappedRegs);
                }
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
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

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Minimal Transparent Header */}
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
                
                {/* Main Navigation Tabs */}
                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Minhas Turmas', icon: GraduationCap, color: 'text-purple-600' },
                        { id: 'products', label: 'Digital', icon: Zap, color: 'text-amber-500' },
                        { id: 'certificates', label: 'Diplomas', icon: Award, color: 'text-emerald-600' },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy, color: 'text-indigo-600' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={clsx(
                                "flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                                activeTab === tab.id 
                                    ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-100" 
                                    : "text-slate-400 hover:text-slate-800 hover:bg-white/40"
                            )}
                        >
                            <tab.icon size={20} className={clsx("transition-transform", activeTab === tab.id ? `${tab.color} scale-110` : "text-slate-400")} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Tab Content Rendering */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'support' ? (
                        <SupportChannel 
                            userId={student.deals[0]?.id || student.email} 
                            userName={student.name} 
                            userType="student" 
                        />
                    ) : activeTab === 'classes' ? (
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

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-wider">Módulo 01</span>
                                                    <div className="flex items-center gap-2 font-black text-slate-700 text-xs">
                                                        <Calendar size={14} className="text-purple-500" />
                                                        {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-wider">Módulo 02</span>
                                                    <div className="flex items-center gap-2 font-black text-slate-700 text-xs">
                                                        <Calendar size={14} className="text-orange-500" />
                                                        {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx("w-3 h-3 rounded-full shadow-sm", cls.status === 'Confirmado' ? 'bg-green-500' : 'bg-amber-400')}></div>
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{cls.status}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedClass(cls)}
                                                    className="text-xs font-black text-purple-600 hover:text-purple-800 uppercase tracking-widest flex items-center gap-1 group/btn"
                                                >
                                                    Ver Detalhes <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
                            {/* Fix for: Cannot find name 'Info'. Added to imports above. */}
                            <Info className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">Conteúdo em transição</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
