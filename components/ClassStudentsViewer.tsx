import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, DollarSign, BookOpen, Download, Printer, Loader2, AlertCircle } from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface ClassItem {
  id: string;
  course: string;
  city: string;
  state: string;
  mod1Code?: string;
  mod2Code?: string;
  dateMod1: string;
  dateMod2: string;
}

interface StudentDeal {
  id: string;
  title: string; 
  contact_name: string;
  email?: string; 
  company_name: string;
  value: number;
  stage: string;
  status: string;
  class_mod_1: string;
  class_mod_2: string;
  phone?: string; 
}

interface ClassStudentsViewerProps {
  classItem: ClassItem;
  onClose: () => void;
  variant?: 'modal' | 'embedded'; // New prop to control layout mode
}

export const ClassStudentsViewer: React.FC<ClassStudentsViewerProps> = ({ classItem, onClose, variant = 'modal' }) => {
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [classItem]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const filters = [];
      if (classItem.mod1Code) filters.push(`class_mod_1.eq."${classItem.mod1Code}"`);
      if (classItem.mod2Code) filters.push(`class_mod_2.eq."${classItem.mod2Code}"`);

      if (filters.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const orQuery = filters.join(',');
      
      const { data, error } = await appBackend.client
        .from('crm_deals')
        .select('*')
        .or(orQuery)
        .order('contact_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);

    } catch (e) {
      console.error("Erro ao buscar alunos:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getModuleBadge = (student: StudentDeal) => {
    const isMod1 = student.class_mod_1 === classItem.mod1Code;
    const isMod2 = student.class_mod_2 === classItem.mod2Code;

    if (isMod1 && isMod2) return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold border border-purple-200">Completo (M1 + M2)</span>;
    if (isMod1) return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">Módulo 1</span>;
    if (isMod2) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold border border-orange-200">Módulo 2</span>;
    return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px]">Indefinido</span>;
  };

  const getStatusColor = (stage: string) => {
      switch(stage) {
          case 'closed': return 'bg-green-100 text-green-700 border-green-200';
          case 'negotiation': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'proposal': return 'bg-blue-100 text-blue-700 border-blue-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  const getStatusLabel = (stage: string) => {
      const map: Record<string, string> = {
          'new': 'Novo',
          'contacted': 'Contatado',
          'proposal': 'Proposta',
          'negotiation': 'Negociação',
          'closed': 'Matriculado (Ganho)'
      };
      return map[stage] || stage;
  };

  const handlePrint = () => {
    window.print();
  };

  // Layout Conditionals
  const containerClasses = variant === 'modal' 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white"
    : "h-full flex flex-col bg-white rounded-r-xl overflow-hidden border-l border-slate-200"; // Embedded style

  const contentWrapperClasses = variant === 'modal'
    ? "bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:max-w-none print:h-auto print:max-h-none"
    : "flex flex-col h-full w-full";

  return (
    <div className={containerClasses}>
      <div className={contentWrapperClasses}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:bg-white print:border-b-2 print:border-black shrink-0">
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="text-purple-600" /> Lista de Alunos
                </h3>
                <p className="text-sm text-slate-500 print:text-black">
                    {classItem.course} • {classItem.city}/{classItem.state}
                </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
                <button onClick={handlePrint} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Imprimir">
                    <Printer size={20} />
                </button>
                {/* Only show Close button if in modal mode OR if user wants to deselect in embedded mode */}
                <button onClick={onClose} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg text-slate-400 transition-colors" title="Fechar Visualização">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
            {/* Info Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/50 border-b border-slate-100 print:hidden">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 uppercase font-bold">Total Alunos</span>
                    <p className="text-2xl font-bold text-slate-800">{students.length}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 uppercase font-bold">Matriculados (Pagos)</span>
                    <p className="text-2xl font-bold text-green-600">
                        {students.filter(s => s.stage === 'closed').length}
                    </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 uppercase font-bold">Valor em Potencial</span>
                    <p className="text-2xl font-bold text-slate-800">
                        {formatCurrency(students.reduce((acc, curr) => acc + (curr.value || 0), 0))}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-purple-600 mb-2" />
                    <p className="text-slate-500">Buscando matrículas...</p>
                </div>
            ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <AlertCircle size={48} className="mb-2 opacity-50" />
                    <p>Nenhum aluno encontrado vinculado a esta turma.</p>
                    <p className="text-xs mt-1">Verifique se as negociações no CRM estão com a turma selecionada.</p>
                </div>
            ) : (
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold sticky top-0 z-10 print:bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200">#</th>
                            <th className="px-6 py-3 border-b border-slate-200">Nome do Aluno</th>
                            <th className="px-6 py-3 border-b border-slate-200">Status / Pagamento</th>
                            <th className="px-6 py-3 border-b border-slate-200">Módulo</th>
                            <th className="px-6 py-3 border-b border-slate-200 print:hidden">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-slate-400 w-12">{idx + 1}</td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{student.contact_name || student.title}</span>
                                        <span className="text-xs text-slate-500">{student.company_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", getStatusColor(student.stage))}>
                                            {getStatusLabel(student.stage)}
                                        </span>
                                        <span className="text-xs font-medium text-slate-600">
                                            {formatCurrency(student.value)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    {getModuleBadge(student)}
                                </td>
                                <td className="px-6 py-3 print:hidden">
                                    {/* Additional info placeholder or View Deal link if possible */}
                                    <div className="text-xs text-slate-400">
                                        Ref: {student.id.substring(0,6)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {/* Footer (Only show in Modal Mode) */}
        {variant === 'modal' && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right print:hidden">
                <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors">
                    Fechar
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
