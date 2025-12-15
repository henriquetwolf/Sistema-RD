
import React, { useEffect, useState } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2
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
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates' | 'events'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [events, setEvents] = useState<EventModel[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Event Registration Modal
    const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);
    const [eventWorkshops, setEventWorkshops] = useState<Workshop[]>([]);
    const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]); // Blocks state
    const [workshopCounts, setWorkshopCounts] = useState<Record<string, number>>({}); // workshopId -> count (GLOBAL COUNT)
    const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]); // workshop IDs
    const [isSavingReg, setIsSavingReg] = useState(false);

    useEffect(() => {
        loadStudentData();
    }, [student]);

    useEffect(() => {
        if (activeTab === 'events') {
            loadEventsData();
        }
    }, [activeTab]);

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
                    .in('student_deal_id, dealIds');
                
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
            // We must subtract "Me" from the global count to know if there is space for me
            // (In case I am editing and already holding a spot in DB but UI state is unchecked momentarily)
            const amIInDbForThis = myRegistrations.some(r => r.workshopId === wId);
            const globalCount = workshopCounts[wId] || 0;
            const countOthers = globalCount - (amIInDbForThis ? 1 : 0);
            
            if (countOthers >= workshop.spots) {
                alert("Desculpe, este workshop já está lotado.");
                return;
            }

            // 2. Check Block Limit
            if (block) {
                // Count how many workshops from this block are already selected in UI
                const selectedInBlock = selectedWorkshops.filter(id => {
                    const w = eventWorkshops.find(ew => ew.id === id);
                    return w?.blockId === block.id;
                });

                if (selectedInBlock.length >= block.maxSelections) {
                    // Option B: Auto-deselect the first one (Better UX for "Choose 1")
                    // Allows swapping without manual deselect
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

    const hasExistingRegistration = selectedEvent && myRegistrations.some(r => r.eventId === selectedEvent.id);

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
                
                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('classes')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'classes' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}
                    >
                        <GraduationCap size={18} /> Minhas Turmas
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'products' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}
                    >
                        <BookOpen size={18} /> Produtos Digitais
                    </button>
                    <button 
                        onClick={() => setActiveTab('events')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'events' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}
                    >
                        <Mic size={18} /> Eventos
                    </button>
                    <button 
                        onClick={() => setActiveTab('certificates')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'certificates' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:text-slate-700")}
                    >
                        <Award size={18} /> Certificados
                    </button>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {isLoading && !selectedEvent ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
                    ) : (
                        <>
                            {/* CLASSES TAB */}
                            {activeTab === 'classes' && (
                                <div className="space-y-4">
                                    {classes.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">Nenhuma turma presencial encontrada.</div>
                                    ) : (
                                        classes.map(cls => (
                                            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                {/* STATUS BADGE */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-mono text-slate-400">#{cls.class_code}</span>
                                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", getStatusStyle(cls.status))}>
                                                        {cls.status}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-slate-800 mb-1">{cls.course}</h3>
                                                
                                                <div className="flex items-center gap-1 text-sm text-slate-600 mb-4">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    {cls.city}/{cls.state}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 1</span>
                                                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                                                            <Calendar size={14} className="text-purple-600" />
                                                            {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </div>
                                                        {cls.instructor_mod_1 && (
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <User size={14} className="text-slate-400" />
                                                                <span className="text-xs">{cls.instructor_mod_1}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 2</span>
                                                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                                                            <Calendar size={14} className="text-orange-600" />
                                                            {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </div>
                                                        {cls.instructor_mod_2 && (
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <User size={14} className="text-slate-400" />
                                                                <span className="text-xs">{cls.instructor_mod_2}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {cls.status === 'Confirmado' && (
                                                    <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-100">
                                                        <CheckCircle size={14} />
                                                        <span>Turma confirmada! Prepare-se para o curso.</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PRODUCTS TAB */}
                            {activeTab === 'products' && (
                                <div className="space-y-4">
                                    {myProducts.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">Nenhum produto digital liberado.</div>
                                    ) : (
                                        myProducts.map(prod => (
                                            <div key={prod.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{prod.product_name || 'Produto Digital'}</h3>
                                                    <p className="text-sm text-slate-500">Curso Online</p>
                                                </div>
                                                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                                                    <Video size={16} /> Acessar Conteúdo
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* EVENTS TAB */}
                            {activeTab === 'events' && (
                                <div className="space-y-6">
                                    {events.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                                            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>Nenhum evento disponível no momento.</p>
                                        </div>
                                    ) : (
                                        events.map(event => {
                                            const myRegs = myRegistrations.filter(r => r.eventId === event.id).length;
                                            
                                            // 1. Find the Deal associated with this Event for the student
                                            const eventDeal = student.deals.find(d => 
                                                d.product_type === 'Evento' && d.product_name === event.name
                                            );

                                            // 2. Check Deal Stage
                                            const isDealClosed = eventDeal?.stage === 'closed';
                                            const isOpen = event.registrationOpen;
                                            
                                            // 3. Determine Access and Labels
                                            let canAccess = false;
                                            let statusLabel = '';
                                            let StatusIcon = Lock;

                                            if (!eventDeal) {
                                                statusLabel = 'Inscrição não encontrada';
                                                StatusIcon = AlertCircle;
                                            } else if (!isDealClosed) {
                                                statusLabel = 'Aguardando Confirmação de Pagamento';
                                                StatusIcon = DollarSign;
                                            } else if (!isOpen && myRegs === 0) {
                                                statusLabel = 'Aguardando Liberação de Agenda';
                                                StatusIcon = Lock;
                                            } else {
                                                canAccess = true;
                                                statusLabel = myRegs > 0 ? 'Editar Minha Agenda' : 'Escolher Workshops';
                                                StatusIcon = myRegs > 0 ? Edit2 : CheckSquare;
                                            }

                                            return (
                                                <div key={event.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-slate-800">{event.name}</h3>
                                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                                <MapPin size={16} /> {event.location}
                                                            </div>
                                                        </div>
                                                        {myRegs > 0 && (
                                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                                                Inscrito em {myRegs} workshops
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <Calendar size={16} className="text-slate-400" />
                                                        <span className="text-sm text-slate-600">
                                                            {event.dates.map(formatDate).join(', ')}
                                                        </span>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleOpenEvent(event)}
                                                        disabled={!canAccess}
                                                        className={clsx(
                                                            "w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors",
                                                            canAccess 
                                                                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                                                                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                                        )}
                                                    >
                                                        <StatusIcon size={18} />
                                                        {statusLabel}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* CERTIFICATES TAB */}
                            {activeTab === 'certificates' && (
                                <div className="space-y-4">
                                    {certificates.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                <Award size={32} />
                                            </div>
                                            <p className="text-slate-500 font-medium">Nenhum certificado emitido ainda.</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                                Os certificados aparecem aqui após a conclusão do curso e liberação pela secretaria.
                                            </p>
                                        </div>
                                    ) : (
                                        certificates.map(cert => (
                                            <div key={cert.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                                                            <Award size={24} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">{cert.crm_certificates?.title || 'Certificado de Conclusão'}</h3>
                                                            <p className="text-xs text-slate-500">Emitido em: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a 
                                                            href={`/?certificateHash=${cert.hash}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                                        >
                                                            <ExternalLink size={16} /> Visualizar
                                                        </a>
                                                        <a 
                                                            href={`/?certificateHash=${cert.hash}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                                        >
                                                            <Download size={16} /> Baixar PDF
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* EVENT REGISTRATION MODAL */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedEvent.name}</h3>
                                <p className="text-xs text-slate-500">Selecione os workshops que deseja participar.</p>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                            {/* Group by Date, then by Block */}
                            {selectedEvent.dates.sort().map(dateStr => {
                                const dayBlocks = eventBlocks.filter(b => b.date === dateStr).sort((a,b) => a.title.localeCompare(b.title));
                                const dayWorkshops = eventWorkshops.filter(w => w.date === dateStr);
                                
                                if (dayWorkshops.length === 0) return null;

                                return (
                                    <div key={dateStr} className="mb-8">
                                        <h4 className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 inline-block mb-4">
                                            {formatDate(dateStr)}
                                        </h4>
                                        
                                        {/* IF THERE ARE BLOCKS, GROUP BY BLOCK */}
                                        {dayBlocks.length > 0 ? (
                                            <div className="space-y-6">
                                                {dayBlocks.map(block => {
                                                    const blockWorkshops = dayWorkshops.filter(w => w.blockId === block.id);
                                                    if (blockWorkshops.length === 0) return null;

                                                    return (
                                                        <div key={block.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                                                                <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                                                    <Layers size={16} className="text-indigo-500"/> {block.title}
                                                                </h5>
                                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                    Escolha até <strong className="text-slate-700">{block.maxSelections}</strong>
                                                                </span>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {blockWorkshops.map(w => renderWorkshopItem(w, block.maxSelections, blockWorkshops))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* Show workshops without block at the end */}
                                                {dayWorkshops.filter(w => !w.blockId).length > 0 && (
                                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                        <div className="mb-3 pb-2 border-b border-slate-50">
                                                            <h5 className="font-bold text-slate-800">Horários Extras</h5>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {dayWorkshops.filter(w => !w.blockId).map(w => renderWorkshopItem(w, 999, []))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* NO BLOCKS DEFINED - LIST ALL */
                                            <div className="space-y-3">
                                                {dayWorkshops.map(w => renderWorkshopItem(w, 999, []))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center rounded-b-xl">
                            <span className="text-xs text-slate-500">
                                {selectedWorkshops.length} workshops selecionados
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancelar</button>
                                <button 
                                    onClick={handleSaveRegistration} 
                                    disabled={isSavingReg}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-70"
                                >
                                    {isSavingReg ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                                    {hasExistingRegistration ? 'Atualizar Inscrição' : 'Confirmar Inscrição'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Helper to render workshop item to avoid duplication
    function renderWorkshopItem(w: Workshop, maxLimit: number, siblings: Workshop[]) {
        // Calculate dynamic availability
        const amIInDb = myRegistrations.some(r => r.workshopId === w.id);
        const globalCount = workshopCounts[w.id] || 0;
        
        // Count excluding ME (if I am in DB)
        // This represents spots taken by others
        const countOthers = globalCount - (amIInDb ? 1 : 0);
        
        // Total Spots - Spots taken by others = Spots available for me to take
        const availableForMe = w.spots - countOthers;
        
        const isFull = availableForMe <= 0;
        const isSelected = selectedWorkshops.includes(w.id);
        
        // Count selections in this block (UI State)
        const selectedInBlock = selectedWorkshops.filter(id => siblings.some(s => s.id === id)).length;
        // Block is full if limit reached AND this specific item is NOT selected
        const isBlockFull = selectedInBlock >= maxLimit && !isSelected;

        return (
            <div 
                key={w.id} 
                className={clsx(
                    "border rounded-xl p-4 transition-all flex items-start md:items-center gap-4 cursor-pointer",
                    isSelected ? "bg-purple-50 border-purple-500 ring-1 ring-purple-500 shadow-md" : "bg-white border-slate-200 hover:border-purple-300 shadow-sm",
                    (isFull && !isSelected) ? "opacity-60 grayscale cursor-not-allowed" : "" // Only disable if full and NOT selected
                )}
                onClick={() => {
                    if ((!isFull && !isBlockFull) || isSelected || (isBlockFull && maxLimit === 1)) {
                        // Allow click if:
                        // 1. Not full and block not full
                        // 2. Already selected (to deselect)
                        // 3. Block is full BUT it's a single choice block (we will auto-swap)
                        handleToggleWorkshop(w.id);
                    }
                }}
            >
                <div className={clsx(
                    "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors mt-1 md:mt-0",
                    isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"
                )}>
                    {isSelected && <CheckCircle size={14} />}
                </div>
                
                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1">
                        <h5 className="font-bold text-slate-800 text-sm">{w.title}</h5>
                        <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 w-fit">
                            <Clock size={12} /> {w.time}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Mic size={12} /> {w.speaker}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    <div className={clsx(
                        "text-xs font-bold px-2 py-1 rounded",
                        isFull && !isSelected ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                    )}>
                        {isFull && !isSelected ? 'Esgotado' : `${availableForMe} vagas`}
                    </div>
                </div>
            </div>
        );
    }
};
