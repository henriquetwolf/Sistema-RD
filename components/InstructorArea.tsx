
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap,
  Newspaper, Bell, Sparkles, X, Clock, Image as ImageIcon,
  ArrowRight
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { Teacher } from './TeachersManager';
import { Banner, TeacherNews } from '../types';
import clsx from 'clsx';

interface InstructorAreaProps {
  instructor: Teacher;
  onLogout: () => void;
}

export const InstructorArea: React.FC<InstructorAreaProps> = ({ instructor, onLogout }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [news, setNews] = useState<TeacherNews[]>([]);
  const [seenNewsIds, setSeenNewsIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedNews, setSelectedNews] = useState<TeacherNews | null>(null);

  useEffect(() => {
    fetchMyClasses();
    fetchBanners();
    fetchNews();
    
    // Carregar IDs visualizados do localStorage
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
      {/* Enhanced Header */}
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
        
        {/* NOVIDADES SECTION */}
        {news.length > 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Newspaper size={14} className="text-orange-600" /> Mural de Novidades
                    </h3>
                </div>
                <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                    {news.map(item => {
                        const isUnseen = !seenNewsIds.includes(item.id);
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => markNewsAsSeen(item)}
                                className={clsx(
                                    "min-w-[280px] md:min-w-[320px] bg-white rounded-[2rem] p-5 border-2 transition-all cursor-pointer group relative overflow-hidden",
                                    isUnseen ? "border-orange-500 shadow-lg shadow-orange-500/5 ring-4 ring-orange-50" : "border-slate-100 hover:border-orange-200"
                                )}
                            >
                                {isUnseen && (
                                    <div className="absolute top-4 right-4 w-3 h-3 bg-orange-600 rounded-full border-2 border-white shadow-sm z-10"></div>
                                )}
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={clsx("text-sm font-black truncate mb-1", isUnseen ? "text-orange-900" : "text-slate-700")}>{item.title}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{item.content}</p>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            <Clock size={10}/> {new Date(item.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        {/* BANNERS SECTION */}
        {banners.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-700">
                {banners.map(banner => (
                    <a 
                        key={banner.id}
                        href={banner.linkUrl || '#'}
                        target={banner.linkUrl ? "_blank" : "_self"}
                        rel="noreferrer"
                        className={clsx(
                            "block rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border-4 border-white",
                            !banner.linkUrl && "cursor-default"
                        )}
                    >
                        <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover max-h-48" />
                    </a>
                ))}
            </section>
        )}

        <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                <GraduationCap size={24} className="text-purple-600" /> Minhas Turmas Programadas
            </h2>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-purple-600 mb-2" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronizando agenda...</p>
                </div>
            ) : classes.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center shadow-inner">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Calendar size={40} />
                    </div>
                    <h3 className="text-lg font-black text-slate-700">Nenhuma turma para exibir</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
                        Você será notificado assim que for escalado para um novo curso.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => {
                        const isMod1 = cls.instructor_mod_1 === instructor.fullName;
                        const isMod2 = cls.instructor_mod_2 === instructor.fullName;
                        
                        return (
                            <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col group border-b-8 border-b-purple-500">
                                <div className="p-8 flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-purple-50 rounded-3xl text-purple-600 group-hover:rotate-12 transition-transform">
                                            <Calendar size={32} />
                                        </div>
                                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-500">#{cls.class_code}</span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight min-h-[56px] line-clamp-2" title={cls.course}>
                                        {cls.course}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
                                        <MapPin size={16} className="text-purple-500" />
                                        {cls.city}, {cls.state}
                                    </div>

                                    <div className="space-y-3 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                                        {isMod1 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Módulo 1</span>
                                                <span className="text-xs font-black text-slate-700">
                                                    {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                                </span>
                                            </div>
                                        )}
                                        {isMod2 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Módulo 2</span>
                                                <span className="text-xs font-black text-slate-700">
                                                    {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setSelectedClass({
                                        id: cls.id,
                                        course: cls.course,
                                        city: cls.city,
                                        state: cls.state,
                                        mod1Code: cls.mod_1_code,
                                        mod2Code: cls.mod_2_code,
                                        dateMod1: cls.date_mod_1,
                                        dateMod2: cls.date_mod_2
                                    })}
                                    className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-all group/btn"
                                >
                                    Ver Lista de Alunos
                                    <ArrowRight size={18} className="text-slate-300 group-hover/btn:translate-x-1 group-hover/btn:text-purple-600 transition-all" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </main>

      {/* Class Detail Modal */}
      {selectedClass && (
          <ClassStudentsViewer 
              classItem={selectedClass} 
              onClose={() => setSelectedClass(null)} 
              variant="modal"
              hideFinancials={true} 
              canTakeAttendance={true} 
          />
      )}

      {/* News Detail Modal */}
      {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Newspaper size={24}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedNews.title}</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Publicado em {new Date(selectedNews.createdAt).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedNews(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      {selectedNews.imageUrl && (
                          <div className="w-full h-64 rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                              <img src={selectedNews.imageUrl} className="w-full h-full object-cover" />
                          </div>
                      )}
                      <div className="prose prose-slate max-w-none">
                          <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                              {selectedNews.content}
                          </p>
                      </div>
                  </div>
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] flex justify-end">
                      <button onClick={() => setSelectedNews(null)} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg">
                          Entendi
                      </button>
                  </div>
              </div>
          </div>
      )}

      <footer className="py-12 text-center text-slate-400 bg-white/40 border-t border-slate-200 mt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
          <div className="flex justify-center gap-6">
              <img src="https://vollpilates.com.br/wp-content/uploads/2022/10/logo-voll-pilates-group.png" alt="VOLL" className="h-6 grayscale opacity-30" />
          </div>
      </footer>
    </div>
  );
};
