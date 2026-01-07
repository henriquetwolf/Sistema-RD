
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
        try {
            setSeenNewsIds(JSON.parse(saved));
        } catch (e) {
            setSeenNewsIds([]);
        }
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
            <button 
                onClick={onLogout}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                title="Sair"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
        <div className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveViewTab('dashboard')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'dashboard' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
                onClick={() => setActiveViewTab('contracts')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'contracts' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <FileCheck size={18} /> Contratos
            </button>
            <button 
                onClick={() => setActiveViewTab('support')}
                className={clsx(
                    "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap",
                    activeViewTab === 'support' ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
            >
                <LifeBuoy size={18} /> Falar com VOLL
            </button>
        </div>

        {activeViewTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                {banners.length > 0 && (
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map(banner => (
                            <a key={banner.id} href={banner.linkUrl || '#'} target="_blank" rel="noreferrer" className="block rounded-[2.5rem] overflow-hidden shadow-sm border-4 border-white"><img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover max-h-48" /></a>
                        ))}
                    </section>
                )}
                {news.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                            {news.map(item => (
                                <div key={item.id} onClick={() => markNewsAsSeen(item)} className="min-w-[280px] bg-white rounded-[2rem] p-5 border-2 border-slate-100 hover:border-orange-200 transition-all cursor-pointer group flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 m-auto"/>}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black truncate">{item.title}</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">{new Date(item.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2"><GraduationCap size={24} className="text-purple-600" /> Minhas Turmas Programadas</h2>
                    {isLoading ? <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-purple-600" /></div> : classes.map(cls => (
                        <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-xl transition-all">
                             <div className="flex-1">
                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase mb-4 inline-block">#{cls.class_code}</span>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{cls.course}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1 font-medium"><MapPin size={16} className="text-purple-500" /> {cls.city}, {cls.state}</p>
                             </div>
                             <button onClick={() => setSelectedClass({ id: cls.id, course: cls.course, city: cls.city, state: cls.state, mod1Code: cls.mod_1_code, mod2Code: cls.mod_2_code, dateMod1: cls.date_mod_1, dateMod2: cls.date_mod_2 })} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">Ver Alunos</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeViewTab === 'contracts' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                {myContracts.map(c => (
                    <div key={c.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex flex-col">
                        <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 w-fit mb-4"><FileText size={24} /></div>
                        <h3 className="font-black text-slate-800 mb-6 truncate">{c.title}</h3>
                        <button onClick={() => setViewingContract(c)} className="w-full py-4 bg-slate-50 hover:bg-teal-600 hover:text-white text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-slate-100">Abrir Documento</button>
                    </div>
                ))}
            </div>
        )}

        {activeViewTab === 'support' && (
            <div className="max-w-4xl mx-auto">
                <SupportChannel userId={instructor.id} userName={instructor.fullName} userEmail={instructor.email} userType="instructor" />
            </div>
        )}
      </main>

      {selectedClass && <ClassStudentsViewer classItem={selectedClass} onClose={() => setSelectedClass(null)} variant="modal" hideFinancials={true} canTakeAttendance={true} />}
      {viewingContract && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"><div className="p-8 border-b flex justify-between items-center"><h3 className="text-xl font-bold">{viewingContract.title}</h3><button onClick={() => setViewingContract(null)}><X size={24}/></button></div><div className="p-8 overflow-y-auto flex-1 prose prose-slate max-w-none font-serif">{viewingContract.content}</div></div></div>
      )}
    </div>
  );
};
