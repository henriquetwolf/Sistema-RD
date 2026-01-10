
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2, Calendar, BookOpen, X,
  Zap, Save, CheckCircle2, ShieldCheck, ShoppingBag
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
/* Removed StudentDeal from import since it is not exported by ../types and not used in this file */
import { Product } from '../types';
import clsx from 'clsx';

interface StudentsManagerProps {
  onBack: () => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Access Modal States
  const [showAccessModal, setShowAccessModal] = useState<any | null>(null);
  const [activeAccessIds, setActiveAccessIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  useEffect(() => {
    fetchData();
    fetchDigitalProducts();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const { data, error } = await appBackend.client
            .from('crm_deals')
            .select('*')
            .order('contact_name', { ascending: true });
        if (error) throw error;
        setStudents(data || []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchDigitalProducts = async () => {
      try {
          const { data } = await appBackend.client.from('crm_products').select('*').eq('category', 'Curso Online').eq('status', 'active');
          if (data) setDigitalProducts(data);
      } catch (e) {}
  };

  const openAccessManager = async (student: any) => {
      setShowAccessModal(student);
      const access = await appBackend.getStudentCourseAccess(student.id);
      setActiveAccessIds(access);
  };

  const handleToggleAccess = (courseId: string) => {
      setActiveAccessIds(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const saveAccessChanges = async () => {
      if (!showAccessModal) return;
      setIsSavingAccess(true);
      try {
          const studentId = showAccessModal.id;
          const currentInDB = await appBackend.getStudentCourseAccess(studentId);
          
          // Determine added and removed
          const toAdd = activeAccessIds.filter(id => !currentInDB.includes(id));
          const toRemove = currentInDB.filter(id => !activeAccessIds.includes(id));

          for (const id of toAdd) await appBackend.grantCourseAccess(studentId, id);
          for (const id of toRemove) await appBackend.revokeCourseAccess(studentId, id);

          alert("Acessos digitais atualizados!");
          setShowAccessModal(null);
      } catch (e) {
          alert("Erro ao salvar permissões.");
      } finally {
          setIsSavingAccess(false);
      }
  };

  const filtered = students.filter(s => 
    (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestão de Alunos</h2>
                    <p className="text-slate-500 text-sm">Controle de acessos e cursos autorizados.</p>
                </div>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-teal-600"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar por nome ou email..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black">
                    <tr>
                        <th className="px-6 py-4">Aluno</th>
                        <th className="px-6 py-4">CPF / Email</th>
                        <th className="px-6 py-4 text-center">Acessos Digitais</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">{s.company_name || s.contact_name}</td>
                            <td className="px-6 py-4 text-slate-500">{s.cpf} <br/> <span className="text-[10px]">{s.email}</span></td>
                            <td className="px-6 py-4 text-center">
                                <button onClick={() => openAccessManager(s)} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 mx-auto border border-indigo-100 hover:bg-indigo-100 transition-all">
                                    <Zap size={14}/> Liberar Cursos
                                </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {showAccessModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 flex flex-col">
                    <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><ShieldCheck size={24}/></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Liberar Acessos Online</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{showAccessModal.company_name || showAccessModal.contact_name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAccessModal(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Selecione os cursos disponíveis:</h4>
                        {digitalProducts.map(course => (
                            <label key={course.id} className={clsx("flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all", activeAccessIds.includes(course.id) ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100 hover:border-slate-200")}>
                                <div className="flex items-center gap-4">
                                    <div className={clsx("p-2 rounded-lg transition-colors", activeAccessIds.includes(course.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                                        <ShoppingBag size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm">{course.name}</span>
                                </div>
                                <input type="checkbox" className="w-6 h-6 rounded text-indigo-600" checked={activeAccessIds.includes(course.id)} onChange={() => handleToggleAccess(course.id)} />
                            </label>
                        ))}
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
                        <button onClick={() => setShowAccessModal(null)} className="px-6 py-2 text-slate-500 font-bold text-xs uppercase">Cancelar</button>
                        <button onClick={saveAccessChanges} disabled={isSavingAccess} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                            {isSavingAccess ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar Permissões
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
