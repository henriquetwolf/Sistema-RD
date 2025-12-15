
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface StudentsManagerProps {
  onBack: () => void;
}

interface StudentDeal {
    id: string;
    contact_name: string;
    cpf: string;
    email: string;
    phone: string;
    product_name: string;
    status: string;
    student_access_enabled: boolean;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
        const { data, error } = await appBackend.client
            .from('crm_deals')
            .select('id, contact_name, cpf, email, phone, product_name, status, student_access_enabled')
            .order('contact_name', { ascending: true });
        
        if (error) throw error;
        
        // Use default true for access if null
        const mapped = (data || []).map((s: any) => ({
            ...s,
            student_access_enabled: s.student_access_enabled !== false // Default true if null/undefined
        }));
        
        setStudents(mapped);
    } catch (e) {
        console.error("Error fetching students:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleAccess = async (student: StudentDeal) => {
      setUpdatingId(student.id);
      const newStatus = !student.student_access_enabled;
      
      try {
          const { error } = await appBackend.client
            .from('crm_deals')
            .update({ student_access_enabled: newStatus })
            .eq('id', student.id);
          
          if (error) throw error;

          setStudents(prev => prev.map(s => s.id === student.id ? { ...s, student_access_enabled: newStatus } : s));
      } catch (e: any) {
          alert(`Erro ao atualizar: ${e.message}`);
      } finally {
          setUpdatingId(null);
      }
  };

  const filtered = students.filter(s => 
      (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cpf || '').includes(searchTerm)
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-teal-600" /> Gestão de Alunos (Acesso)
                    </h2>
                    <p className="text-slate-500 text-sm">Controle o acesso dos alunos à área exclusiva.</p>
                </div>
            </div>
            <button onClick={fetchStudents} className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                <RefreshCw size={20} className={clsx(isLoading && "animate-spin")} />
            </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome, email ou CPF..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto min-h-[400px]">
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 size={32} className="animate-spin text-teal-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Nenhum aluno encontrado.</div>
            ) : (
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Nome do Aluno</th>
                            <th className="px-6 py-4">CPF / Contato</th>
                            <th className="px-6 py-4">Produto/Turma</th>
                            <th className="px-6 py-4 text-center">Status Acesso</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {s.contact_name || 'Sem nome'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 text-xs">
                                        <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">CPF: {s.cpf || 'Não inf.'}</span>
                                        <div className="flex items-center gap-1 text-slate-500"><Mail size={10} /> {s.email}</div>
                                        <div className="flex items-center gap-1 text-slate-500"><Phone size={10} /> {s.phone}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium border border-indigo-100 inline-block max-w-[200px] truncate" title={s.product_name}>
                                        {s.product_name || 'Geral'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto",
                                        s.student_access_enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {s.student_access_enabled ? <Unlock size={12} /> : <Lock size={12} />}
                                        {s.student_access_enabled ? 'Liberado' : 'Bloqueado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => toggleAccess(s)}
                                        disabled={updatingId === s.id}
                                        className={clsx(
                                            "px-3 py-1.5 rounded text-xs font-bold transition-colors border",
                                            s.student_access_enabled 
                                                ? "border-red-200 text-red-600 hover:bg-red-50" 
                                                : "border-green-200 text-green-600 hover:bg-green-50"
                                        )}
                                    >
                                        {updatingId === s.id 
                                            ? <Loader2 size={14} className="animate-spin" /> 
                                            : s.student_access_enabled ? 'Bloquear' : 'Liberar'
                                        }
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
};
