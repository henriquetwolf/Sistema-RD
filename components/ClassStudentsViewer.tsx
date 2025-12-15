
import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Phone, DollarSign, BookOpen, Download, Printer, Loader2, AlertCircle, Calendar, CheckSquare, Save, Eye, Award, ExternalLink, CheckCircle } from 'lucide-react';
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
  product_name?: string; // Need this to find template
}

interface StudentCertificateStatus {
    hash: string;
    issuedAt: string;
}

interface ClassStudentsViewerProps {
  classItem: ClassItem;
  onClose: () => void;
  variant?: 'modal' | 'embedded'; // New prop to control layout mode
  hideFinancials?: boolean;
  canTakeAttendance?: boolean;
}

// Helper to add days to a date string "YYYY-MM-DD"
const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    // Create date treating input as UTC/Local specific to avoid timezone jumps
    const parts = dateStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    date.setDate(date.getDate() + days);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

export const ClassStudentsViewer: React.FC<ClassStudentsViewerProps> = ({ 
    classItem, 
    onClose, 
    variant = 'modal',
    hideFinancials = false,
    canTakeAttendance = false
}) => {
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [certificates, setCertificates] = useState<Record<string, StudentCertificateStatus>>({}); // Map dealId -> Cert Info
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({}); // Map productName -> templateId
  const [isLoading, setIsLoading] = useState(true);
  
  // Attendance State
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  // Map stores presence: key is `${studentId}_${dateString}`
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({}); 
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [issuingFor, setIssuingFor] = useState<string | null>(null); // dealId being processed
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Derived Dates for 4 days
  const courseDates = useMemo(() => {
      const dates = {
          mod1Day1: classItem.dateMod1 || '',
          mod1Day2: classItem.dateMod1 ? addDays(classItem.dateMod1, 1) : '',
          mod2Day1: classItem.dateMod2 || '',
          mod2Day2: classItem.dateMod2 ? addDays(classItem.dateMod2, 1) : '',
      };
      
      const allActiveDates = [
          dates.mod1Day1, dates.mod1Day2, 
          dates.mod2Day1, dates.mod2Day2
      ].filter(Boolean);

      return { ...dates, allActiveDates };
  }, [classItem.dateMod1, classItem.dateMod2]);

  useEffect(() => {
    fetchStudents();
  }, [classItem]);

  // Fetch existing attendance when entering mode
  useEffect(() => {
      if (attendanceMode) {
          fetchAttendance();
      }
  }, [attendanceMode, classItem]);

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
      
      const { data: dealsData, error } = await appBackend.client
        .from('crm_deals')
        .select('*')
        .or(orQuery)
        .order('contact_name', { ascending: true });

      if (error) throw error;
      const deals = dealsData || [];
      setStudents(deals);

      // --- NEW: Fetch Certificate Info ---
      if (deals.length > 0) {
          // 1. Get unique product names to find templates
          const productNames = Array.from(new Set(deals.map((d: any) => d.product_name).filter(Boolean)));
          
          if (productNames.length > 0) {
              // Strategy 1: Check if product in crm_products has a template linked
              const { data: products } = await appBackend.client
                  .from('crm_products')
                  .select('name, certificate_template_id')
                  .in('name', productNames);
              
              const templatesMap: Record<string, string> = {};
              products?.forEach((p: any) => {
                  if (p.certificate_template_id) templatesMap[p.name] = p.certificate_template_id;
              });

              // Strategy 2: Check if there is a certificate template directly linked to this Course Name (Text Link)
              const { data: directCerts } = await appBackend.client
                  .from('crm_certificates')
                  .select('id, linked_product_id')
                  .in('linked_product_id', productNames);
              
              directCerts?.forEach((c: any) => {
                  if (c.linked_product_id) templatesMap[c.linked_product_id] = c.id;
              });

              setProductTemplates(templatesMap);
          }

          // 2. Get issued certificates for these students
          const studentIds = deals.map((d: any) => d.id);
          const { data: issuedCerts } = await appBackend.client
              .from('crm_student_certificates')
              .select('student_deal_id, hash, issued_at')
              .in('student_deal_id', studentIds);
          
          const certMap: Record<string, StudentCertificateStatus> = {};
          issuedCerts?.forEach((c: any) => {
              certMap[c.student_deal_id] = { hash: c.hash, issuedAt: c.issued_at };
          });
          setCertificates(certMap);
      }

    } catch (e) {
      console.error("Erro ao buscar alunos:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
      try {
          if (courseDates.allActiveDates.length === 0) return;

          // Query using the 4 calculated dates
          const { data, error } = await appBackend.client
              .from('crm_attendance')
              .select('student_id, date, present')
              .eq('class_id', classItem.id)
              .in('date', courseDates.allActiveDates);
          
          if (error) throw error;

          const map: Record<string, boolean> = {};
          data.forEach((row: any) => {
              const key = `${row.student_id}_${row.date}`;
              map[key] = row.present;
          });
          
          setPresenceMap(map);

      } catch(e) {
          console.error("Erro ao buscar chamada:", e);
      }
  };

  const saveAttendance = async () => {
      if (isReadOnly) return;
      setIsSavingAttendance(true);
      try {
          const updates: any[] = [];
          
          if (courseDates.allActiveDates.length === 0) {
              alert("Esta turma não possui datas configuradas para Módulo 1 ou 2.");
              setIsSavingAttendance(false);
              return;
          }

          students.forEach(student => {
              courseDates.allActiveDates.forEach(dateStr => {
                  const key = `${student.id}_${dateStr}`;
                  // If key exists in map, save it. Default to false if not checked but tracking
                  const isPresent = !!presenceMap[key];
                  
                  updates.push({
                      class_id: classItem.id,
                      student_id: student.id,
                      date: dateStr,
                      present: isPresent
                  });
              });
          });

          const { error } = await appBackend.client
              .from('crm_attendance')
              .upsert(updates, { onConflict: 'class_id,student_id,date' });

          if (error) throw error;
          
          alert("Chamada salva com sucesso!");
          setAttendanceMode(false);
      } catch(e: any) {
          console.error(e);
          if (e.message?.includes('does not exist')) {
              alert("Erro: Tabela de chamada não criada. Vá em Configurações > Diagnóstico e atualize o banco.");
          } else {
              alert("Erro ao salvar chamada.");
          }
      } finally {
          setIsSavingAttendance(false);
      }
  };

  const togglePresence = (studentId: string, dateStr: string) => {
      if (!dateStr || isReadOnly) return;
      const key = `${studentId}_${dateStr}`;
      setPresenceMap(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const handleIssueCertificate = async (student: StudentDeal) => {
      const templateId = productTemplates[student.product_name || ''];
      if (!templateId) {
          alert("Este produto não possui um modelo de certificado associado. Edite o Modelo em 'Certificados' e associe ao curso/produto.");
          return;
      }

      if (!window.confirm(`Confirma a emissão do certificado para ${student.contact_name}?`)) return;

      setIssuingFor(student.id);
      try {
          const hash = await appBackend.issueCertificate(student.id, templateId);
          setCertificates(prev => ({
              ...prev,
              [student.id]: { hash, issuedAt: new Date().toISOString() }
          }));
      } catch (e: any) {
          alert(`Erro: ${e.message}`);
      } finally {
          setIssuingFor(null);
      }
  };

  const copyCertLink = (hash: string) => {
      const link = `${window.location.origin}/?certificateHash=${hash}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatDateSimple = (dateStr: string) => {
      if (!dateStr) return 'S/ Data';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}`;
  };

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
    : "h-full flex flex-col bg-white rounded-r-xl overflow-hidden border-l border-slate-200"; 

  const contentWrapperClasses = variant === 'modal'
    ? "bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:max-w-none print:h-auto print:max-h-none"
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
                {/* Visualizar Presença Button */}
                <button 
                    onClick={() => {
                        if (attendanceMode && isReadOnly) {
                            setAttendanceMode(false);
                        } else {
                            setAttendanceMode(true);
                            setIsReadOnly(true);
                        }
                    }} 
                    className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border",
                        attendanceMode && isReadOnly
                            ? "bg-blue-100 text-blue-700 border-blue-200" 
                            : "bg-white hover:bg-blue-50 text-slate-600 border-slate-200"
                    )}
                    title="Visualizar Chamada"
                >
                    <Eye size={18} /> {attendanceMode && isReadOnly ? 'Fechar Visualização' : 'Visualizar Chamada'}
                </button>

                {canTakeAttendance && (
                    <button 
                        onClick={() => {
                            if (attendanceMode && !isReadOnly) {
                                setAttendanceMode(false);
                            } else {
                                setAttendanceMode(true);
                                setIsReadOnly(false);
                            }
                        }} 
                        className={clsx(
                            "px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border",
                            attendanceMode && !isReadOnly
                                ? "bg-orange-100 text-orange-700 border-orange-200" 
                                : "bg-white hover:bg-orange-50 text-slate-600 border-slate-200"
                        )}
                        title="Editar Chamada"
                    >
                        <CheckSquare size={18} /> {attendanceMode && !isReadOnly ? 'Cancelar Edição' : 'Editar Chamada'}
                    </button>
                )}
                
                {!attendanceMode && (
                    <button onClick={handlePrint} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Imprimir">
                        <Printer size={20} />
                    </button>
                )}
                
                <button onClick={onClose} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg text-slate-400 transition-colors" title="Fechar Visualização">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* ATTENDANCE HEADER */}
        {attendanceMode && (
            <div className={clsx(
                "border-b px-6 py-3 flex items-center gap-4 animate-in slide-in-from-top-2",
                isReadOnly ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-orange-50 border-orange-100 text-orange-800"
            )}>
                <div className="flex items-center gap-2">
                    <Calendar size={18} className={isReadOnly ? "text-blue-600" : "text-orange-600"} />
                    <span className="text-sm font-bold">{isReadOnly ? "Modo Visualização:" : "Modo Chamada:"}</span>
                </div>
                <div className={clsx("flex-1 text-xs", isReadOnly ? "text-blue-700" : "text-orange-700")}>
                    {isReadOnly ? "Visualizando lista de presença." : "Marque a presença nos 4 dias de curso (Módulo 1 e Módulo 2)."}
                </div>
            </div>
        )}

        {/* Content */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
            {/* Info Cards Row (Hidden if hideFinancials is true) */}
            {!attendanceMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/50 border-b border-slate-100 print:hidden">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs text-slate-400 uppercase font-bold">Total Alunos</span>
                        <p className="text-2xl font-bold text-slate-800">{students.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs text-slate-400 uppercase font-bold">Matriculados</span>
                        <p className="text-2xl font-bold text-green-600">
                            {students.filter(s => s.stage === 'closed').length}
                        </p>
                    </div>
                    {!hideFinancials && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-400 uppercase font-bold">Valor em Potencial</span>
                            <p className="text-2xl font-bold text-slate-800">
                                {formatCurrency(students.reduce((acc, curr) => acc + (curr.value || 0), 0))}
                            </p>
                        </div>
                    )}
                </div>
            )}

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
                            <th className="px-6 py-3 border-b border-slate-200 w-12 text-center">#</th>
                            <th className="px-6 py-3 border-b border-slate-200 min-w-[200px]">Nome do Aluno</th>
                            
                            {/* DYNAMIC DATE HEADERS (4 DAYS) */}
                            {attendanceMode && (
                                <>
                                    {courseDates.mod1Day1 ? (
                                        <th className="px-2 py-3 border-b border-slate-200 text-center bg-purple-50 text-purple-800 border-l border-r border-purple-100 min-w-[80px]">
                                            M1 D1 <br/> <span className="text-[9px] font-normal opacity-75">{formatDateSimple(courseDates.mod1Day1)}</span>
                                        </th>
                                    ) : <th className="px-2 py-3 border-b border-slate-200 bg-slate-50"></th>}
                                    
                                    {courseDates.mod1Day2 ? (
                                        <th className="px-2 py-3 border-b border-slate-200 text-center bg-purple-50 text-purple-800 border-r border-purple-100 min-w-[80px]">
                                            M1 D2 <br/> <span className="text-[9px] font-normal opacity-75">{formatDateSimple(courseDates.mod1Day2)}</span>
                                        </th>
                                    ) : <th className="px-2 py-3 border-b border-slate-200 bg-slate-50"></th>}

                                    {courseDates.mod2Day1 ? (
                                        <th className="px-2 py-3 border-b border-slate-200 text-center bg-orange-50 text-orange-800 border-r border-orange-100 min-w-[80px]">
                                            M2 D1 <br/> <span className="text-[9px] font-normal opacity-75">{formatDateSimple(courseDates.mod2Day1)}</span>
                                        </th>
                                    ) : <th className="px-2 py-3 border-b border-slate-200 bg-slate-50"></th>}
                                    
                                    {courseDates.mod2Day2 ? (
                                        <th className="px-2 py-3 border-b border-slate-200 text-center bg-orange-50 text-orange-800 border-r border-orange-100 min-w-[80px]">
                                            M2 D2 <br/> <span className="text-[9px] font-normal opacity-75">{formatDateSimple(courseDates.mod2Day2)}</span>
                                        </th>
                                    ) : <th className="px-2 py-3 border-b border-slate-200 bg-slate-50"></th>}
                                </>
                            )}

                            <th className="px-6 py-3 border-b border-slate-200">Status</th>
                            <th className="px-6 py-3 border-b border-slate-200">Módulo</th>
                            {!attendanceMode && <th className="px-6 py-3 border-b border-slate-200 print:hidden text-center">Certificado</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student, idx) => {
                            // Helper to render a checkbox cell
                            const renderCheckCell = (dateStr: string, colorClass: string) => {
                                if (!dateStr) return <td className="bg-slate-50 border-r border-slate-100"></td>;
                                const key = `${student.id}_${dateStr}`;
                                const isPresent = !!presenceMap[key];
                                return (
                                    <td className={clsx("px-2 py-3 text-center border-r border-slate-100", isPresent ? colorClass : "")}>
                                        <input 
                                            type="checkbox" 
                                            className={clsx(
                                                "w-5 h-5 rounded border-slate-300 focus:ring-opacity-50 transition-all",
                                                isReadOnly ? "text-slate-400 cursor-not-allowed bg-slate-100" : "cursor-pointer text-purple-600 focus:ring-purple-500"
                                            )}
                                            checked={isPresent}
                                            onChange={() => !isReadOnly && togglePresence(student.id, dateStr)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                );
                            };

                            const certInfo = certificates[student.id];
                            const hasTemplate = !!productTemplates[student.product_name || ''];

                            return (
                                <tr key={student.id} className={clsx("transition-colors hover:bg-slate-50")}>
                                    <td className="px-6 py-3 text-slate-400 text-center">{idx + 1}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{student.contact_name || student.title}</span>
                                            <span className="text-xs text-slate-500">{student.company_name}</span>
                                        </div>
                                    </td>

                                    {/* 4 CHECKBOX COLUMNS */}
                                    {attendanceMode && (
                                        <>
                                            {renderCheckCell(courseDates.mod1Day1, "bg-purple-50")}
                                            {renderCheckCell(courseDates.mod1Day2, "bg-purple-50")}
                                            {renderCheckCell(courseDates.mod2Day1, "bg-orange-50")}
                                            {renderCheckCell(courseDates.mod2Day2, "bg-orange-50")}
                                        </>
                                    )}

                                    <td className="px-6 py-3">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", getStatusColor(student.stage))}>
                                                {getStatusLabel(student.stage)}
                                            </span>
                                            {!hideFinancials && (
                                                <span className="text-xs font-medium text-slate-600">
                                                    {formatCurrency(student.value)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {getModuleBadge(student)}
                                    </td>
                                    {!attendanceMode && (
                                        <td className="px-6 py-3 print:hidden text-center">
                                            {certInfo ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <a 
                                                        href={`/?certificateHash=${certInfo.hash}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                        title="Visualizar"
                                                    >
                                                        <Eye size={14} />
                                                    </a>
                                                    <a 
                                                        href={`/?certificateHash=${certInfo.hash}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 border border-green-200 transition-colors"
                                                        title="Baixar PDF"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    <button 
                                                        onClick={() => copyCertLink(certInfo.hash)}
                                                        className={clsx("p-1.5 rounded transition-colors text-xs font-bold", copiedLink === certInfo.hash ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                                        title="Copiar Link Público"
                                                    >
                                                        {copiedLink === certInfo.hash ? <CheckCircle size={14} /> : <ExternalLink size={14} />}
                                                    </button>
                                                </div>
                                            ) : hasTemplate ? (
                                                <button 
                                                    onClick={() => handleIssueCertificate(student)}
                                                    disabled={issuingFor === student.id}
                                                    className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded hover:bg-amber-200 border border-amber-200 disabled:opacity-50 flex items-center gap-1 mx-auto"
                                                >
                                                    {issuingFor === student.id ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />}
                                                    Liberar
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 block w-full text-center">N/A</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {/* Footer (Only show in Modal Mode) */}
        {variant === 'modal' && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
                {attendanceMode && !isReadOnly ? (
                    <button 
                        onClick={saveAttendance} 
                        disabled={isSavingAttendance}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                        {isSavingAttendance ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Chamada
                    </button>
                ) : (
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors">
                        Fechar
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
