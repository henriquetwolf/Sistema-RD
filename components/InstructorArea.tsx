
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap,
  Newspaper, Bell, Sparkles, X, Clock, Image as ImageIcon,
  ArrowRight, Info, Plane, Coffee, Bed, Map, DollarSign, Package, Monitor,
  FileCheck, LayoutDashboard, FileText, CheckCircle, LifeBuoy
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMyClasses();
    fetchBanners();
    fetchNews();
    fetchMyContracts();
  }, [instructor]);

  const fetchNews = async () => { try { const data = await appBackend.getTeacherNews(); setNews(data); } catch (e) {} };
  const fetchBanners = async () => { try { const data = await appBackend.getBanners('instructor'); setBanners(data); } catch (e) {} };
  const fetchMyContracts = async () => { try { const all = await appBackend.getContracts(); setMyContracts(all.filter(c => c.signers.some(s => s.email.toLowerCase() === instructor.email.toLowerCase() && s.status === 'signed'))); } catch (e) {} };

  const fetchMyClasses = async () => {
    setIsLoading(true);
    try {
      const { data } = await appBackend.client
        .from('crm_classes')
        .select('*')
        .or(`instructor_mod_1.eq."${instructor.fullName}",instructor_mod_2.eq."${instructor.fullName}"`)
        .order('date_mod_1', { ascending: false });
      if (data) setClasses(data);
    } catch (e) {} finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black border-2 border-orange-100 overflow-hidden shadow-sm">
                {instructor.photoUrl ? <img src={instructor.photoUrl} className="w-full h-full object-cover" /> : instructor.fullName.substring(0, 1)}
             </div>
             <div>
                <h1 className="text-sm font-black text-slate-800 leading-tight">{instructor.fullName}</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal do Instrutor</span>
             </div>
          </div>
          <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
        <div className="flex bg-white/60 p-1.5 rounded-3xl shadow-sm border border-slate-200 w-fit">
            {[
                { id: 'dashboard', label: 'Agenda', icon: LayoutDashboard },
                { id: 'contracts', label: 'Contratos', icon: FileCheck },
                { id: 'support', label: 'Suporte', icon: LifeBuoy }
            ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveViewTab(tab.id as any)} 
                    className={clsx("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all", activeViewTab === tab.id ? "bg-white text-orange-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600")}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
        </div>

        <div className="animate-in fade-in duration-500">
            {activeViewTab === 'support' ? (
                <SupportChannel userId={instructor.email} userName={instructor.fullName} userType="instructor" />
            ) : activeViewTab === 'dashboard' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                        <div key={cls.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all border-b-8 border-b-orange-500">
                            <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight">{cls.course}</h3>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4"><MapPin size={16} className="text-orange-500" /> {cls.city}, {cls.state}</div>
                            <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase">Status Turma</span><span className="text-xs font-bold text-slate-700">{cls.status}</span></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-20 text-center text-slate-300 italic bg-white rounded-3xl border border-slate-100">Documentação carregada.</div>
            )}
        </div>
      </main>
    </div>
  );
};
