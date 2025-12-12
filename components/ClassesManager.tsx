import React, { useState } from 'react';
import { 
  GraduationCap, Plus, Search, Calendar, Clock, MapPin, 
  ArrowLeft, Save, X, MoreHorizontal, BookOpen
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  period: string;
  location: string;
  studentsCount: number;
  status: 'planning' | 'active' | 'finished';
  startDate: string;
}

const INITIAL_CLASSES: ClassItem[] = [
  { id: '1', name: 'Desenvolvimento Web - Turma A', period: 'Noturno', location: 'Sala 302', studentsCount: 24, status: 'active', startDate: '2024-02-15' },
  { id: '2', name: 'Data Science - Intensivo', period: 'Sábado', location: 'Lab 01', studentsCount: 18, status: 'active', startDate: '2024-03-01' },
  { id: '3', name: 'UX/UI Design', period: 'Vespertino', location: 'Online', studentsCount: 30, status: 'planning', startDate: '2024-05-10' },
];

interface ClassesManagerProps {
  onBack: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onBack }) => {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', period: '', location: '', startDate: '' });

  const handleSave = () => {
    if (!formData.name) return;
    const newItem: ClassItem = {
      id: Math.random().toString(),
      name: formData.name,
      period: formData.period || 'Noturno',
      location: formData.location || 'TBA',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      status: 'planning',
      studentsCount: 0
    };
    setClasses([...classes, newItem]);
    setShowModal(false);
    setFormData({ name: '', period: '', location: '', startDate: '' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="text-purple-600" /> Turmas
                </h2>
                <p className="text-slate-500 text-sm">Planejamento e gestão de períodos letivos.</p>
            </div>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Nova Turma
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 group relative">
                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 leading-tight">{cls.name}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 mt-1 inline-block">
                            {cls.status === 'active' ? 'Em Andamento' : cls.status === 'planning' ? 'Planejamento' : 'Concluída'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" /> {cls.period}
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" /> {cls.location}
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" /> Início: {new Date(cls.startDate).toLocaleDateString('pt-BR')}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{cls.studentsCount} Alunos matriculados</span>
                    <button className="text-sm font-medium text-purple-600 hover:underline">Detalhes</button>
                </div>
            </div>
        ))}
        
        {/* Empty State / Add New Card */}
        <button 
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all min-h-[200px]"
        >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Plus size={24} />
            </div>
            <span className="font-medium">Criar nova turma</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Nova Turma</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Turma</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Ex: Engenharia de Software 2025"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Período</label>
                            <select 
                                value={formData.period}
                                onChange={e => setFormData({...formData, period: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                            >
                                <option value="">Selecione...</option>
                                <option value="Matutino">Matutino</option>
                                <option value="Vespertino">Vespertino</option>
                                <option value="Noturno">Noturno</option>
                                <option value="Integral">Integral</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input 
                                type="date" 
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Local / Sala</label>
                        <input 
                            type="text" 
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Ex: Sala 101 ou Online"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Criar Turma
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
