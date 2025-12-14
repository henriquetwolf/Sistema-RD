import React, { useState, useEffect } from 'react';
import { 
  LogOut, Calendar, MapPin, Loader2, BookOpen, User, 
  ChevronRight, Users, ExternalLink, GraduationCap
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { ClassStudentsViewer } from './ClassStudentsViewer';
import { Teacher } from './TeachersManager';
import clsx from 'clsx';

interface InstructorAreaProps {
  instructor: Teacher;
  onLogout: () => void;
}

export const InstructorArea: React.FC<InstructorAreaProps> = ({ instructor, onLogout }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  useEffect(() => {
    fetchMyClasses();
  }, [instructor]);

  const fetchMyClasses = async () => {
    setIsLoading(true);
    try {
      // Find classes where instructor name matches Mod 1 OR Mod 2
      // Using filter logic locally or OR query if possible. 
      // Note: Instructor names in crm_classes are stored as strings (instructor_mod_1, instructor_mod_2)
      
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile-First Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-white shadow-sm overflow-hidden">
                {instructor.photoUrl ? (
                    <img src={instructor.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    instructor.fullName.substring(0, 1)
                )}
             </div>
             <div>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">{instructor.fullName}</h1>
                <p className="text-xs text-slate-500">Área do Instrutor</p>
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

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        
        <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-purple-600" /> Minhas Turmas
            </h2>
            <p className="text-sm text-slate-500">Acompanhe sua agenda e lista de alunos.</p>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-purple-600 mb-2" />
                <p className="text-slate-500 text-sm">Carregando agenda...</p>
            </div>
        ) : classes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Calendar size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-700">Nenhuma turma encontrada</h3>
                <p className="text-slate-500 text-sm mt-1">
                    Você não possui turmas vinculadas ao seu nome no momento.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(cls => {
                    const isMod1 = cls.instructor_mod_1 === instructor.fullName;
                    const isMod2 = cls.instructor_mod_2 === instructor.fullName;
                    
                    return (
                        <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={clsx(
                                        "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide",
                                        cls.status === 'Confirmado' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {cls.status}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">#{cls.class_code}</span>
                                </div>

                                <h3 className="font-bold text-slate-800 mb-1 line-clamp-2" title={cls.course}>
                                    {cls.course}
                                </h3>
                                
                                <div className="flex items-center gap-1 text-sm text-slate-600 mb-4">
                                    <MapPin size={14} className="text-slate-400" />
                                    {cls.city}/{cls.state}
                                </div>

                                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                    {isMod1 && (
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-purple-700">Módulo 1</span>
                                            <span className="text-slate-600 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                            </span>
                                        </div>
                                    )}
                                    {isMod2 && (
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-orange-700">Módulo 2</span>
                                            <span className="text-slate-600 flex items-center gap-1">
                                                <Calendar size={10} />
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
                                className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors group"
                            >
                                Ver Lista de Alunos
                                <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600" />
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
      </main>

      {/* Class Detail Modal */}
      {selectedClass && (
          <ClassStudentsViewer 
              classItem={selectedClass} 
              onClose={() => setSelectedClass(null)} 
              variant="modal"
          />
      )}
    </div>
  );
};