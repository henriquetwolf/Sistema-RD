
import React, { useEffect, useState } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportChannel } from './SupportChannel';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2, List,
    PieChart, Send, ArrowRight, Sparkles, Bell, Bookmark, Search, Zap, Trophy, ChevronRight, Book, ListTodo, LifeBuoy
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

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
    const [selectedClass, setSelectedClass] = useState<any | null>(null);

    useEffect(() => {
        loadStudentData();
        loadBanners();
        loadSurveys();
    }, [student]);

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
                setCertificates(issuedCerts || []);
            }
        } catch (e) {
            console.error("Erro ao carregar dados do aluno", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBanners = async () => {
        try {
            const data = await appBackend.getBanners('student');
            setBanners(data);
        } catch (e) {
            console.error("Failed to load banners", e);
        }
    };

    if (activeSurvey) return <FormViewer form={activeSurvey} onBack={() => setActiveSurvey(null)} studentId={student.deals[0]?.id} onSuccess={() => {setActiveSurvey(null); loadSurveys();}} />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end text-right">
                            <span className="text-sm font-black text-slate-800">{student.name}</span>
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Portal do Aluno</span>
                        </div>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 rounded-xl transition-all shadow-inner">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                
                {/* Dashboard Tabs */}
                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Cursos', icon: GraduationCap },
                        { id: 'products', label: 'Digital', icon: Zap },
                        { id: 'certificates', label: 'Diplomas', icon: Award },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all", activeTab === tab.id ? "bg-white text-slate-800 shadow-md" : "text-slate-500 hover:text-slate-800")}>
                            <tab.icon size={20} className={activeTab === tab.id ? "text-purple-600" : "text-slate-400"} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden border-b-8 border-b-purple-500">
                                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight h-14 line-clamp-2">{cls.course}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-6"><MapPin size={16} className="text-purple-500" /> {cls.city}, {cls.state}</div>
                                    <button onClick={() => setSelectedClass(cls)} className="w-full py-4 bg-slate-50 hover:bg-purple-600 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Detalhes da Turma</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="max-w-4xl mx-auto">
                            <SupportChannel userId={student.deals[0]?.id || 'guest'} userName={student.name} userEmail={student.email} userType="student" />
                        </div>
                    )}
                    
                    {activeTab === 'certificates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {certificates.map(cert => (
                                <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-6 shadow-sm">
                                    <div className="bg-emerald-50 p-5 rounded-[2rem] text-emerald-600 shadow-inner"><Award size={32}/></div>
                                    <div className="flex-1"><h4 className="font-black text-slate-800 text-lg mb-1">{cert.crm_certificates?.title || 'Certificado'}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Emitido em {new Date(cert.issued_at).toLocaleDateString()}</p></div>
                                    <a href={`/?certificateHash=${cert.hash}`} target="_blank" rel="noreferrer" className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all"><Download size={24}/></a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            {selectedClass && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl p-10 flex flex-col"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black">{selectedClass.course}</h3><button onClick={() => setSelectedClass(null)}><X size={24}/></button></div><div className="bg-slate-50 p-6 rounded-3xl"><p className="font-bold text-slate-800 flex items-center gap-2"><MapPin size={18} className="text-purple-600"/> {selectedClass.studio_mod_1}</p></div></div></div>
            )}
        </div>
    );
};
