
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
    
    // Event Registration Modal
    const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);
    const [eventWorkshops, setEventWorkshops] = useState<Workshop[]>([]);
    const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]); // Blocks state
    const [workshopCounts, setWorkshopCounts] = useState<Record<string, number>>({}); // workshopId -> count (GLOBAL COUNT)
    const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]); // workshop IDs
    const [isSavingReg, setIsSavingReg] = useState(false);

    // My Agenda View Modal
    const [showMyAgenda, setShowMyAgenda] = useState<EventModel | null>(null);

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
            // 1. Load Classes
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

            // 2. Load Certificates
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
            // Fetch All Events
            const eventsData = await appBackend.getEvents();
            setEvents(eventsData);

            // Fetch My Registrations (Using student ID/Email)
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

    // --- LOGICA DE PESQUISA INTELIGENTE ---
    const openSurvey = (survey: SurveyModel) => {
        const deal = student.deals[0];
        const studentClass = classes.find(c => c.mod_1_code === deal.class_mod_1 || c.mod_2_code === deal.class_mod_2);
        
        const initial: Record<string, any> = {};
        
        survey.questions.forEach(q => {
            if (q.systemMapping) {
                switch(q.systemMapping) {
                    case 'student_name': initial[q.id] = student.name; break;
                    case 'product_name': initial[q.id] = deal.product_name; break;
                    case 'state': initial[q.id] = studentClass?.state || ''; break;
                    case 'city': initial[q.id] = studentClass?.city || ''; break;
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
        loadSurveys(); // Recarregar para sumir o aviso
    };

    const handleOpenEvent = async (event: EventModel) => {
        setSelectedEvent(event);
        setIsLoading(true);
        try {
            // 1. Get Workshops and Blocks
            const [ws, blks] = await Promise.all([
                appBackend.getWorkshops(event.id),
                appBackend.getBlocks(event.id)
            ]);
            setEventWorkshops(ws);
            setEventBlocks(blks);

            // 2. Get All Registrations for this event (to calc available spots)
            const allRegs = await appBackend.getEventRegistrations(event.id);
            
            const counts: Record<string, number> = {};
            ws.forEach(w => counts[w.id] = 0);
            allRegs.forEach(r => {
                if (counts[r.workshopId] !== undefined) counts[r.workshopId]++;
            });
            setWorkshopCounts(counts);

            // 3. Set My Selections
            const myRegsForEvent = myRegistrations.filter(r => r.eventId === event.id);
            setSelectedWorkshops(myRegsForEvent.map(r => r.workshopId));

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // New: Handle View My Agenda
    const handleViewAgenda = async (event: EventModel) => {
        setShowMyAgenda(event);
        setIsLoading(true);
        try {
            // Fetch workshops just to show details
            const ws = await appBackend.getWorkshops(event.id);
            setEventWorkshops(ws);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleWorkshop = (wId: string) => {
        // Find the workshop
        const workshop = eventWorkshops.find(w => w.id === wId);
        if (!workshop) return;

        // Find the block
        const block = eventBlocks.find(b => b.id === workshop.blockId);
        
        const isCurrentlySelected = selectedWorkshops.includes(wId);

        // --- SELECTION LOGIC ---
        if (!isCurrentlySelected) {
            // 1. Check Capacity (Smart Check)
            const amIInDbForThis = myRegistrations.some(r => r.workshopId === wId);
            const globalCount = workshopCounts[wId] || 0;
            const countOthers = globalCount - (amIInDbForThis ? 1 : 0);
            
            if (countOthers >= workshop.spots) {
                alert("Desculpe, este workshop já está lotado.");
                return;
            }

            // 2. Check Block Limit
            if (block) {
                const selectedInBlock = selectedWorkshops.filter(id => {
                    const w = eventWorkshops.find(ew => ew.id === id);
                    return w?.blockId === block.id;
                });

                if (selectedInBlock.length >= block.maxSelections) {
                    if (block.maxSelections === 1) {
                        const toRemove = selectedInBlock[0];
                        setSelectedWorkshops(prev => [...prev.filter(id => id !== toRemove), wId]);
                        return;
                    } else {
                        alert(`Limite atingido para "${block.title}". Você só pode escolher ${block.maxSelections}. Desmarque uma opção anterior.`);
                        return;
                    }
                }
            }

            // Add
            setSelectedWorkshops(prev => [...prev, wId]);
        } else {
            // Remove
            setSelectedWorkshops(prev => prev.filter(id => id !== wId));
        }
    };

    const handleSaveRegistration = async () => {
        if (!selectedEvent) return;
        setIsSavingReg(true);
        try {
            // Use main student ID (Deal ID)
            const studentId = student.deals[0]?.id;
            const studentName = student.name;
            const studentEmail = student.email;

            await appBackend.saveEventRegistrations(selectedEvent.id, studentId, studentName, studentEmail, selectedWorkshops);
            
            alert("Agenda atualizada com sucesso!");
            
            // Refresh
            await loadEventsData();
            setSelectedEvent(null);
        } catch (e: any) {
            alert(`Erro ao salvar: ${e.message}`);
        } finally {
            setIsSavingReg(false);
        }
    };

    // Filter Products based on deals (Digital Products)
    const myProducts = student.deals.filter(d => d.product_type === 'Digital');

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'Confirmado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Concluído': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelado': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Planejamento
        }
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
            {/* Header */}
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
                
                {/* SURVEY HIGHLIGHT SECTION */}
                {mySurveys.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-white p-4 rounded-2xl shadow-sm text-amber-600">
                                <PieChart size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-black text-amber-900 mb-1">Pesquisa de Opinião Pendente</h3>
                                <p className="text-sm text-amber-700 mb-2">Você tem {mySurveys.length} pesquisa(s) de satisfação disponível(is). Sua opinião é muito importante!</p>
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

                {/* BANNERS SECTION */}
                {/* ... (Rest remains same) */}
