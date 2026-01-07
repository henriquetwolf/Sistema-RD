
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap,
  Newspaper, Bell, Sparkles, X, Clock, Image as ImageIcon,
  ArrowRight, Info, Plane, Coffee, Bed, Map, DollarSign, Package, Monitor,
  FileCheck, LayoutDashboard, FileText, CheckCircle, LifeBuoy
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { Teacher } from './TeachersManager';
import { Banner, TeacherNews, Contract } from '../types';
import { SupportChannel } from './SupportChannel';
import clsx from 'clsx';

interface InstructorAreaProps {
  instructor: Teacher;
  onLogout: () => void;
}

export const InstructorArea: React.FC<InstructorAreaProps> = ({ instructor, onLogout }) => {
  const [activeViewTab, setActiveViewTab] = useState<'dashboard' | 'contracts' | 'support'>('dashboard');
  const [classes, setClasses] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [news, setNews] = useState<TeacherNews[]>([]);
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [seenNewsIds, setSeenNewsIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [viewingDetails, setViewingDetails] = useState<any | null>(null);
  const [selectedNews, setSelectedNews] = useState<TeacherNews | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  useEffect(() => {
    fetchMyClasses();
    fetchBanners();
    fetchNews();
    fetchMyContracts();
    
    const saved = localStorage.getItem(`seen_news_${instructor.id}`);
    if (saved) {
        try { setSeenNewsIds(JSON.parse(saved)); } catch (e) { setSeenNewsIds([]); }
    }
  }, [instructor]);

  const fetchNews = async () => {
      try {
          const data = await appBackend.getTeacherNews();
          setNews(data);
      } catch (e) {
          console.error("Erro ao buscar novidades:", e);
      }
  };

  const fetchBanners = async () => {
      try {
          const data = await appBackend.getBanners('instructor');
          setBanners(data);
      } catch (e) {
          console.error("Failed to load banners", e);
      }
  };

  const fetchMyContracts = async () => {
      try {
          const allContracts = await appBackend.getContracts();
          const filtered = allContracts.filter(c => 
            c.signers.some(s => s.email.toLowerCase() === instructor.email.toLowerCase() && s.status === 'signed')
          );
          setMyContracts(filtered);
      } catch (e) {
          console.error("Erro ao buscar contratos do instrutor:", e);
      }
  };

  const fetchMyClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .or(`instructor_mod_1.eq."${instructor.fullName}",instructor_mod_2.eq."${instructor.fullName}"`)
        .order('date_mod_1', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (e) {
      console.error("Erro ao buscar turmas do instrutor:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const markNewsAsSeen = (item: TeacherNews) => {
      if (!seenNewsIds.includes(item.id)) {
          const updated = [...seenNewsIds, item.id];
          setSeenNewsIds(updated);
          localStorage.setItem(`seen_news_${instructor.id}`, JSON.stringify(updated));
      }
      setSelectedNews(item);
  };

  const unreadCount = useMemo(() => {
      return news.filter(n => !seenNewsIds.includes(n.id)).length;
  }, [news, seenNewsIds]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black border-2 border-orange-100 shadow-sm overflow-hidden">
                {instructor.photoUrl ? (
                    <img src={instructor.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    instructor.fullName.substring(0, 1)
                )}
             </div>
             <div>
                <h1 className="text-sm font-black text-slate-800 leading-tight">{instructor.fullName}</h1>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal do Instrutor</span>
                    {unreadCount > 0 && (
                        <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
                            <Bell size={10} fill="currentColor" /> {unreadCount} NOVAS
                        </div>
                    )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
        
        <div className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveViewTab('dashboard')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0", activeViewTab === 'dashboard' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                <LayoutDashboard size={18} /> Dashboard
            </button>
            <button onClick={() => setActiveViewTab('contracts')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0", activeViewTab === 'contracts' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                <FileCheck size={18} /> Contratos
            </button>
            <button onClick={() => setActiveViewTab('support')} className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0", activeViewTab === 'support' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}>
                <LifeBuoy size={18} /> Suporte
            </button>
        </div>

        {activeViewTab === 'dashboard' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* ... (Conteúdo original do dashboard) */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                        <GraduationCap size={24} className="text-purple-600" /> Minhas Turmas Programadas
                    </h2>
                    {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : 
                    classes.length === 0 ? <div className="p-20 text-center bg-white rounded-3xl text-slate-300">Sem turmas programadas.</div> : 
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map(cls => (
                             <div key={cls.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all">
                                <h3 className="font-bold text-slate-800 mb-2">{cls.course}</h3>
                                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin size={12}/> {cls.city}/{cls.state}</p>
                                <button onClick={() => setSelectedClass(cls)} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs rounded-xl transition-all">Lista de Alunos</button>
                             </div>
                        ))}
                    </div>}
                </div>
            </div>
        ) : activeViewTab === 'support' ? (
            <SupportChannel 
                userId={instructor.id} 
                userName={instructor.fullName} 
                userType="instructor" 
            />
        ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Meus Contratos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myContracts.map(contract => (
                        <div key={contract.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-2 truncate">{contract.title}</h3>
                            <button onClick={() => setViewingContract(contract)} className="w-full py-3 bg-slate-50 hover:bg-teal-600 hover:text-white text-slate-500 font-bold text-xs rounded-xl transition-all">Ver Documento</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
      
      {/* ... (Modais originais) */}
    </div>
  );
};
