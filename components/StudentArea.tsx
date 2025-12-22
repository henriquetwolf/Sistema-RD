
import React, { useEffect, useState } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2, List,
    PieChart, Send, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

// Helper for date display
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
    const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mySurveys, setMySurveys] = useState<SurveyModel[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState<SurveyModel | null>(null);
    const [surveyInitialAnswers, setSurveyInitialAnswers] = useState<Record<string, any>>({});
    
    // Event Registration Modal (simplificado para o escopo)
    const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);
    const [isSavingReg, setIsSavingReg] = useState(false);

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
            // Pegar todos os códigos de turma das negociações do aluno
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
                        id: r.id,
                        eventId: r.event_id,
                        workshopId: r.workshop_id,
                        studentId: r.student_id,
                        studentName: r.student_name,
                        studentEmail: r.student_email,
                        registeredAt: r.created_at
                    }));
                    setMyRegistrations(mappedRegs);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGICA DE PESQUISA INTELIGENTE (CORRIGIDA) ---
    const openSurvey = (survey: SurveyModel) => {
        // Usar a primeira negociação válida do aluno para extrair dados
        const deal = student.deals[0];
        if (!deal) return;

        // Encontrar a turma vinculada à negociação no estado carregado
        const studentClass = classes.find(c => 
            (deal.class_mod_1 && c.mod_1_code === deal.class_mod_1) || 
            (deal.class_mod_2 && c.mod_2_code === deal.class_mod_2)
        );
        
        const initial: Record<string, any> = {};
        
        survey.questions.forEach(q => {
            if (q.systemMapping) {
                switch(q.systemMapping) {
                    // Nome do Cliente na Negociação (Normalmente company_name no VOLL CRM)
                    case 'student_name': 
                        initial[q.id] = deal.company_name || deal.contact_name || student.name; 
                        break;
                    
                    case 'product_name': 
                        initial[q.id] = deal.product_name || ''; 
                        break;
                    
                    case 'state': 
                        initial[q.id] = studentClass?.state || deal.course_state || ''; 
                        break;
                    
                    case 'city': 
                        initial[q.id] = studentClass?.city || deal.course_city || ''; 
                        break;
                    
                    case 'class_mod1': 
                        initial[q.id] = deal.class_mod_1 || ''; 
                        break;
                    
                    case 'class_mod2': 
                        initial[q.id] = deal.class_mod_2 || ''; 
                        break;
                    
                    case 'instructor_mod1': 
                        // instructor_mod_1 é a chave no banco de dados (crm_classes)
                        initial[q.id] = studentClass?.instructor_mod_1 || ''; 
                        break;
                    
                    case 'instructor_mod2': 
                        initial[q.id] = studentClass?.instructor_mod_2 || ''; 
                        break;
                    
                    case 'studio': 
                        initial[q.id] = studentClass?.studio_mod_1 || ''; 
                        break;
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
        <FormViewer 
            form={activeSurvey} 
            onBack={() => setActiveSurvey(null)} 
            studentId={student.deals[0]?.id} 
            initialAnswers={surveyInitialAnswers} 
            onSuccess={handleSurveyFinish}
        />
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold border-2 border-white shadow-sm">
                            <UserCircle size={24} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-800 leading-tight">Olá, {student.name.split(' ')[0]}</h1>
                            <p className="text-xs text-slate-500">Área do Aluno VOLL</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sair"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {mySurveys.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-white p-4 rounded-2xl shadow-sm text-amber-600">
                                <PieChart size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-black text-amber-900 mb-1">Pesquisa de Opinião Pendente</h3>
                                <p className="text-sm text-amber-700 mb-2">Sua opinião é fundamental para melhorarmos nossos treinamentos!</p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    {mySurveys.map(s => (
                                        <button key={s.id} onClick={() => openSurvey(s)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md">
                                            Responder: {s.title} <ArrowRight size={14}/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {banners.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map(banner => (
                            <a key={banner.id} href={banner.linkUrl || '#'} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover max-h-40" />
                            </a>
                        ))}
                    </div>
                )}

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <button onClick={() => setActiveTab('classes')} className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'classes' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}><GraduationCap size={18} /> Minhas Turmas</button>
                    <button onClick={() => setActiveTab('products')} className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'products' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}><BookOpen size={18} /> Produtos Digitais</button>
                    <button onClick={() => setActiveTab('events')} className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'events' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}><Mic size={18} /> Eventos</button>
                    <button onClick={() => setActiveTab('certificates')} className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'certificates' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}><Award size={18} /> Certificados</button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'classes' && (
                        <div className="space-y-4">
                            {classes.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">Nenhuma turma presencial encontrada.</div>
                            ) : (
                                classes.map(cls => (
                                    <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-slate-400">#{cls.class_code}</span>
                                            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", cls.status === 'Confirmado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
                                                {cls.status}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">{cls.course}</h3>
                                        <div className="flex items-center gap-1 text-sm text-slate-600 mb-4"><MapPin size={16} className="text-slate-400" /> {cls.city}/{cls.state}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 1</span>
                                                <div className="flex items-center gap-2 text-slate-700 mb-1"><Calendar size={14} className="text-purple-600" /> {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}</div>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 2</span>
                                                <div className="flex items-center gap-2 text-slate-700 mb-1"><Calendar size={14} className="text-orange-600" /> {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    {activeTab === 'products' && (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                            Acesso aos materiais digitais disponível em sua plataforma de estudos.
                        </div>
                    )}
                    {activeTab === 'events' && (
                        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                            Nenhum evento com inscrições abertas no momento.
                        </div>
                    )}
                    {activeTab === 'certificates' && (
                        <div className="space-y-4">
                            {certificates.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">Nenhum certificado emitido.</div>
                            ) : (
                                certificates.map(cert => (
                                    <div key={cert.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Award size={24}/></div>
                                            <div><h4 className="font-bold text-slate-800">{cert.crm_certificates?.title}</h4><p className="text-xs text-slate-400">Emitido em {new Date(cert.issued_at).toLocaleDateString()}</p></div>
                                        </div>
                                        <a href={`/?certificateHash=${cert.hash}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><ExternalLink size={20}/></a>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
