
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap, Bell, Sparkles, X, ChevronDown, History, Newspaper
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
  const [activeView, setActiveView] = useState<'home' | 'news'>('home');
  const [classes, setClasses] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [news, setNews] = useState<TeacherNews[]>([]);
  const [lastReadNewsId, setLastReadNewsId] = useState<string | null>(localStorage.getItem(`read_news_${instructor.id}`));
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [showNewsDetail, setShowNewsDetail] = useState<TeacherNews | null>(null);

  useEffect(() => {
    fetchMyClasses();
    fetchBanners();
    fetchNews();
  }, [instructor]);

  const fetchBanners = async () => {
      try {
          const data = await appBackend.getBanners('instructor');
          setBanners(data);
      } catch (e) { console.error(e); }
  };

  const fetchNews = async () => {
      try {
          const data = await appBackend.getTeacherNews();
          setNews(data);
      } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const hasUnreadNews = useMemo(() => {
      if (news.length === 0) return false;
      return news[0].id !== lastReadNewsId;
  }, [news, lastReadNewsId]);

  const markAllNewsAsRead = () => {
      if (news.length > 0) {
          const latestId = news[0].id;
          localStorage.setItem(`read_news_${instructor.id}`, latestId);
          setLastReadNewsId(latestId);
      }
  };

  const handleOpenNews = () => {
      setActiveView('news');
      markAllNewsAsRead();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-white shadow-sm overflow-hidden" onClick={() => setActiveView('home')}>
                {instructor.photoUrl ? <img src={instructor.photoUrl} alt="" className="w-full h-full object-cover" /> : instructor.fullName.substring(0, 1)}
             </div>
             <div className="cursor-pointer" onClick={() => setActiveView('home')}>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">{instructor.fullName}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Área do Instrutor</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleOpenNews}
                className={clsx("p-2.5 rounded-xl transition-all relative border", activeView === 'news' ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                title="Novidades"
            >
                <Bell size={20} />
                {hasUnreadNews && (
                    <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>
                )}
            </button>
            <button onClick={onLogout} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        
        {activeView === 'home' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* LATEST NEWS HIGHLIGHT */}
                {news.length > 0 && (
                    <section onClick={handleOpenNews} className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-orange-900/10 flex flex-col md:flex-row items-center gap-6 cursor-pointer group hover:scale-[1.01] transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        {news[0].imageUrl && (
                            <div className="w-full md:w-40 h-32 bg-white/10 rounded-3xl overflow-hidden shrink-0 border border-white/20">
                                <img src={news[0].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/30 backdrop-blur-md">Última Novidade</div>
                                {hasUnreadNews && <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse">Novo</div>}
                            </div>
                            <h3 className="text-xl font-black mb-1">{news[0].title}</h3>
                            <p className="text-orange-50/80 text-sm line-clamp-1">{news[0].content}</p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-full group-hover:translate-x-1 transition-transform border border-white/30"><ChevronRight size={24}/></div>
                    </section>
                )}

                {/* BANNERS SECTION */}
                {banners.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map(banner => (
                            <a key={banner.id} href={banner.linkUrl || '#'} target={banner.linkUrl ? "_blank" : "_self"} rel="noreferrer" className={clsx("block rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border-4 border-white", !banner.linkUrl && "cursor-default")}><img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover max-h-48" /></a>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-[11px] text-slate-400"><GraduationCap size={16} className="text-purple-600" /> Agenda de Turmas</h2>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20"><Loader2 size={40} className="animate-spin text-purple-600 mb-2" /><p className="text-slate-500 text-sm">Carregando...</p></div>
                    ) : classes.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400"><GraduationCap size={48} className="mx-auto mb-4 opacity-20" /><h3 className="font-bold">Sem turmas vinculadas</h3></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classes.map(cls => (
                                <div key={cls.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group border-b-8 border-b-purple-500">
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest border", cls.status === 'Confirmado' ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500")}>{cls.status}</span>
                                            <span className="text-[10px] font-mono font-bold text-slate-300">#{cls.class_code}</span>
                                        </div>
                                        <h3 className="font-black text-slate-800 text-lg mb-2 line-clamp-2 leading-tight">{cls.course}</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-6 font-bold"><MapPin size={16} className="text-purple-500" /> {cls.city}/{cls.state}</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mod 1</p><p className="text-xs font-black text-teal-700">{cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString() : '--'}</p></div>
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mod 2</p><p className="text-xs font-black text-orange-700">{cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString() : '--'}</p></div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedClass({ id: cls.id, course: cls.course, city: cls.city, state: cls.state, mod1Code: cls.mod_1_code, mod2Code: cls.mod_2_code, dateMod1: cls.date_mod_1, dateMod2: cls.date_mod_2 })} className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-all group-hover:bg-purple-50/50">Lista de Alunos <ChevronRight size={18} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            /* NEWS VIEW */
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Newspaper className="text-orange-600" size={28}/> Novidades & Avisos</h2>
                        <p className="text-slate-500 text-sm">Fique por dentro das atualizações da rede VOLL.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main List */}
                    <div className="lg:col-span-8 space-y-4">
                        {news.length === 0 ? (
                            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-200 text-slate-300 italic">Sem comunicados no momento.</div>
                        ) : news.map((item, idx) => (
                            <div 
                                key={item.id} 
                                onClick={() => setShowNewsDetail(item)}
                                className={clsx(
                                    "bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row gap-6 group relative overflow-hidden",
                                    idx === 0 && "ring-4 ring-orange-500/10 border-orange-200"
                                )}
                            >
                                {idx === 0 && <div className="absolute -top-4 -right-4 w-12 h-12 bg-orange-600 rotate-45 flex items-center justify-center pt-4 pr-1 text-white shadow-lg"><Bell size={12} className="-rotate-45"/></div>}
                                {item.imageUrl && (
                                    <div className="w-full md:w-48 h-32 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                        {idx === 0 && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-orange-100">Destaque</span>}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight group-hover:text-orange-600 transition-colors">{item.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{item.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar: Stats/Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 p-8 opacity-10"><Sparkles size={120}/></div>
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-indigo-300">Resumo Docente</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
                                    <span className="text-xs font-bold text-indigo-200">Turmas Ativas</span>
                                    <span className="text-lg font-black">{classes.length}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
                                    <span className="text-xs font-bold text-indigo-200">Comunicados</span>
                                    <span className="text-lg font-black">{news.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* MODAL DETALHE NOVIDADE */}
      {showNewsDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="relative h-64 shrink-0 bg-slate-900">
                      {showNewsDetail.imageUrl ? (
                          <img src={showNewsDetail.imageUrl} className="w-full h-full object-cover opacity-80" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700 opacity-20"><Newspaper size={80}/></div>
                      )}
                      <button onClick={() => setShowNewsDetail(null)} className="absolute top-6 right-6 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all"><X size={24}/></button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white">
                      <div className="flex items-center gap-3 mb-4">
                          <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-100">Comunicado Oficial</span>
                          <span className="text-xs font-bold text-slate-400">{new Date(showNewsDetail.createdAt).toLocaleString()}</span>
                      </div>
                      <h2 className="text-4xl font-black text-slate-800 mb-6 leading-tight tracking-tight">{showNewsDetail.title}</h2>
                      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
                          {showNewsDetail.content}
                      </div>
                  </div>
                  <div className="px-10 py-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => setShowNewsDetail(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg">Entendi</button>
                  </div>
              </div>
          </div>
      )}

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
    </div>
  );
};
