
import React, { useEffect, useState } from 'react';
import { StudentSession, EventModel, Workshop, EventRegistration, EventBlock, Banner, SurveyModel, CourseInfo, PartnerStudio } from '../types';
import { appBackend } from '../services/appBackend';
import { FormViewer } from './FormViewer';
import { SupportChannel } from './SupportChannel';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, LifeBuoy,
    Video, Download, Loader2, UserCircle, User, CheckCircle, Mic, CheckSquare, Clock, Users, X, Save, Lock, AlertCircle, DollarSign, Layers, Edit2, List,
    PieChart, Send, ArrowRight, Sparkles, Bell, Bookmark, Search, Zap, Trophy, ChevronRight, Book, ListTodo
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates' | 'events' | 'support'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mySurveys, setMySurveys] = useState<SurveyModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStudentData();
        loadBanners();
        loadSurveys();
    }, [student]);

    const loadBanners = async () => { try { const data = await appBackend.getBanners('student'); setBanners(data); } catch (e) {} };
    const loadSurveys = async () => { try { const mainDeal = student.deals[0]; if (mainDeal) { const surveys = await appBackend.getEligibleSurveysForStudent(mainDeal.id); setMySurveys(surveys); } } catch (e) {} };

    const loadStudentData = async () => {
        setIsLoading(true);
        try {
            const dealIds = student.deals.map(d => d.id);
            if (dealIds.length > 0) {
                const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('*').in('student_deal_id', dealIds);
                setCertificates(issuedCerts || []);
            }
        } catch (e) {} finally { setIsLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                    <div className="flex items-center gap-4">
                        <div className="text-right"><span className="text-sm font-black text-slate-800 block">{student.name}</span><span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">Portal do Aluno</span></div>
                        <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 hover:text-red-600 rounded-xl shadow-inner"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Cursos', icon: GraduationCap },
                        { id: 'products', label: 'Digital', icon: Zap },
                        { id: 'events', label: 'Eventos', icon: Mic },
                        { id: 'certificates', label: 'Diplomas', icon: Award },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all", activeTab === tab.id ? "bg-white text-slate-800 shadow-md ring-1 ring-slate-100" : "text-slate-500 hover:text-slate-800")}>
                            <tab.icon size={20} className={activeTab === tab.id ? "text-purple-600" : "text-slate-400"} /> {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'support' ? (
                        <SupportChannel 
                            isAdmin={false} 
                            userId={student.deals[0]?.id || student.email} 
                            userName={student.name} 
                            userType="student" 
                        />
                    ) : activeTab === 'classes' ? (
                        /* Turmas e outros conteúdos existentes */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ... logic anterior ... */}
                            <p className="text-slate-400 italic">Área de cursos ativa.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed text-slate-300">Conteúdo em desenvolvimento.</div>
                    )}
                </div>
            </main>
        </div>
    );
};
