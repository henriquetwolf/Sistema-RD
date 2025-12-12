import React, { useState } from 'react';
import { 
  School, Plus, Search, MoreVertical, Phone, Mail, 
  ArrowLeft, Save, X, Book
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  status: 'active' | 'leave';
}

const INITIAL_TEACHERS: Teacher[] = [
  { id: '1', name: 'Dr. Alberto Einstein', subject: 'Física Avançada', email: 'alberto@univ.edu', phone: '(11) 99999-0001', status: 'active' },
  { id: '2', name: 'Mestra Marie Curie', subject: 'Química', email: 'marie@univ.edu', phone: '(11) 99999-0002', status: 'active' },
  { id: '3', name: 'Prof. Isaac Newton', subject: 'Cálculo I', email: 'isaac@univ.edu', phone: '(11) 99999-0003', status: 'leave' },
];

interface TeachersManagerProps {
  onBack: () => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({ onBack }) => {
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', email: '', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = () => {
    if (!formData.name) return;
    const newTeacher: Teacher = {
      id: Math.random().toString(),
      name: formData.name,
      subject: formData.subject,
      email: formData.email,
      phone: formData.phone,
      status: 'active'
    };
    setTeachers([...teachers, newTeacher]);
    setShowModal(false);
    setFormData({ name: '', subject: '', email: '', phone: '' });
  };

  const filtered = teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <School className="text-orange-600" /> Corpo Docente
                </h2>
                <p className="text-slate-500 text-sm">Administração de professores e disciplinas.</p>
            </div>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
        >
            <Plus size={18} /> Novo Professor
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar professor por nome..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
         </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                        {t.name.substring(0,1)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{t.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Book size={14} /> {t.subject}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Mail size={16} className="text-slate-400" /> {t.email}
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone size={16} className="text-slate-400" /> {t.phone}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.status === 'active' ? 'Ativo' : 'Licença'}
                    </span>
                    <button className="p-2 hover:bg-slate-100 rounded text-slate-400">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Novo Professor</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Disciplina Principal</label>
                        <input 
                            type="text" 
                            value={formData.subject}
                            onChange={e => setFormData({...formData, subject: e.target.value})}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input 
                                type="email" 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                            <input 
                                type="text" 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Salvar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
