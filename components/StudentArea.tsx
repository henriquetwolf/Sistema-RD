
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
    const [selectedCourseInfo, setSelectedCourseInfo] = useState<CourseInfo | null>(null);
    const [selectedStudioDetails, setSelectedStudioDetails] = useState<PartnerStudio | null>(null);

    useEffect(() => { loadStudentData(); loadBanners(); loadSurveys(); }, [student]);

    const loadSurveys = async () => {
        try { const mainDeal = student.deals[0]; if (mainDeal) { const surveys = await appBackend.getEligibleSurveysForStudent(mainDeal.id); setMySurveys(surveys); } } catch (e) {}
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
                setCertificates(issuedCerts || []);
            }
        } catch (e) {} finally { setIsLoading(false); }
    };

    const loadBanners = async () => { try { const data = await appBackend.getBanners('student'); setBanners(data); } catch (e) {} };

    if (activeSurvey) return <FormViewer form={activeSurvey} onBack={() => setActiveSurvey(null)} studentId={student.deals[0]?.id} onSuccess={() => {setActiveSurvey(null); loadSurveys();}} />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm px-6 py-4 flex items-center justify-between">
                <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-8" />
                <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col"><span className="text-sm font-black text-slate-800">{student.name}</span><span className="text-[10px] font-bold text-purple-600 uppercase">Aluno VOLL</span></div>
                    <button onClick={onLogout} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:text-red-600 transition-all"><LogOut size={18} /></button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">
                {mySurveys.length > 0 && (
                    <section className="animate-in slide-in-from-top-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mySurveys.map(s => (
                            <div key={s.id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 flex items-center gap-6 shadow-sm group">
                                <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform"><PieChart size={32} /></div>
                                <div className="flex-1"><h4 className="font-black text-slate-800 mb-1">{s.title}</h4><p className="text-sm text-slate-500">Sua opinião é vital.</p></div>
                                <button onClick={() => setActiveSurvey(s)} className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all"><ArrowRight size={20} /></button>
                            </div>
                        ))}
                    </section>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden h-64 flex flex-col justify-center">
                        <div className="relative z-10"><h2 className="text-3xl font-black mb-2">Olá, {student.name.split(' ')[0]}!</h2><p className="text-purple-100/80 font-medium">Sua jornada acadêmica VOLL está aqui.</p></div>
                    </section>
                    <div className="bg-slate-100 rounded-[2.5rem] border-2 border-dashed border-slate-200 h-64 overflow-hidden">
                        {banners.length > 0 && <img src={banners[0].imageUrl} className="w-full h-full object-cover" />}
                    </div>
                </div>

                <nav className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar gap-1">
                    {[
                        { id: 'classes', label: 'Cursos', icon: GraduationCap },
                        { id: 'products', label: 'Digital', icon: Zap },
                        { id: 'certificates', label: 'Diplomas', icon: Award },
                        { id: 'support', label: 'Ajuda', icon: LifeBuoy }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx("flex-1 min-w-[100px] py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all", activeTab === tab.id ? "bg-white text-slate-800 shadow-md" : "text-slate-500 hover:text-slate-800")}>
                            <tab.icon size={20} className={activeTab === tab.id ? "text-purple-600" : "text-slate-400"} /> {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-2">
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
                    {/* Outras abas... */}
                </div>
            </main>
            {selectedClass && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl p-10"><div className="flex justify-between mb-8"><h3 className="text-2xl font-black">{selectedClass.course}</h3><button onClick={() => setSelectedClass(null)}><X size={24}/></button></div><div className="bg-slate-50 p-6 rounded-3xl"><p className="font-bold text-slate-800"><MapPin className="inline mr-2 text-purple-600"/> {selectedClass.studio_mod_1}</p></div></div></div>
            )}
        </div>
    );
};
