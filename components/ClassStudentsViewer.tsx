
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Download, Printer, Loader2, AlertCircle, Calendar, CheckSquare, Save, Eye, Award, ExternalLink, CheckCircle } from 'lucide-react';
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
  product_name?: string; 
}

interface StudentCertificateStatus {
    hash: string;
    issuedAt: string;
}

interface ClassStudentsViewerProps {
  classItem: ClassItem;
  onClose: () => void;
  variant?: 'modal' | 'embedded'; 
  hideFinancials?: boolean;
  canTakeAttendance?: boolean;
}

const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
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
  const [certificates, setCertificates] = useState<Record<string, StudentCertificateStatus>>({});
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({}); 
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [issuingFor, setIssuingFor] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const courseDates = useMemo(() => {
      const dates = {
          mod1Day1: classItem.dateMod1 || '',
          mod1Day2: classItem.dateMod1 ? addDays(classItem.dateMod1, 1) : '',
          mod2Day1: classItem.dateMod2 || '',
          mod2Day2: classItem.dateMod2 ? addDays(classItem.dateMod2, 1) : '',
      };
      const allActiveDates = [dates.mod1Day1, dates.mod1Day2, dates.mod2Day1, dates.mod2Day2].filter(Boolean);
      return { ...dates, allActiveDates };
  }, [classItem.dateMod1, classItem.dateMod2]);

  useEffect(() => {
    fetchStudents();
  }, [classItem]);

  useEffect(() => {
      if (attendanceMode) fetchAttendance();
  }, [attendanceMode, classItem]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const filters = [];
      if (classItem.mod1Code) filters.push(`class_mod_1.eq."${classItem.mod1Code}"`);
      if (classItem.mod2Code) filters.push(`class_mod_2.eq."${classItem.mod2Code}"`);
      if (filters.length === 0) { setStudents([]); setIsLoading(false); return; }

      const { data: dealsData, error } = await appBackend.client
        .from('crm_deals')
        .select('*')
        .or(filters.join(','))
        .order('contact_name', { ascending: true });

      if (error) throw error;
      const deals = (dealsData || []).sort((a: any, b: any) => {
          const nameA = (a.company_name || a.contact_name || '').toLowerCase();
          const nameB = (b.company_name || b.contact_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
      });
      setStudents(deals);

      if (deals.length > 0) {
          const productNames = Array.from(new Set(deals.map((d: any) => d.product_name).filter(Boolean)));
          if (productNames.length > 0) {
              const { data: products } = await appBackend.client.from('crm_products').select('name, certificate_template_id').in('name', productNames);
              const templatesMap: Record<string, string> = {};
              products?.forEach((p: any) => { if (p.certificate_template_id) templatesMap[p.name] = p.certificate_template_id; });
              const { data: directCerts } = await appBackend.client.from('crm_certificates').select('id, linked_product_id').in('linked_product_id', productNames);
              directCerts?.forEach((c: any) => { if (c.linked_product_id) templatesMap[c.linked_product_id] = c.id; });
              setProductTemplates(templatesMap);
          }
          const { data: issuedCerts } = await appBackend.client.from('crm_student_certificates').select('student_deal_id, hash, issued_at').in('student_deal_id', deals.map(d => d.id));
          const certMap: Record<string, StudentCertificateStatus> = {};
          issuedCerts?.forEach((c: any) => { certMap[c.student_deal_id] = { hash: c.hash, issuedAt: c.issued_at }; });
          setCertificates(certMap);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchAttendance = async () => {
      try {
          if (courseDates.allActiveDates.length === 0) return;
          const { data, error } = await appBackend.client.from('crm_attendance').select('student_id, date, present').eq('class_id', classItem.id).in('date', courseDates.allActiveDates);
          if (error) throw error;
          const map: Record<string, boolean> = {};
          data.forEach((row: any) => { map[`${row.student_id}_${row.date}`] = row.present; });
          setPresenceMap(map);
      } catch(e) { console.error(e); }
  };

  const saveAttendance = async () => {
      if (isReadOnly) return;
      setIsSavingAttendance(true);
      try {
          const updates: any[] = [];
          if (courseDates.allActiveDates.length === 0) { alert("Turma sem datas."); setIsSavingAttendance(false); return; }

          students.forEach(student => {
              courseDates.allActiveDates.forEach(dateStr => {
                  updates.push({
                      class_id: classItem.id,
                      student_id: student.id,
                      date: dateStr,
                      present: !!presenceMap[`${student.id}_${dateStr}`]
                  });
              });
          });

          const { error } = await appBackend.client
              .from('crm_attendance')
              .upsert(updates, { onConflict: 'class_id,student_id,date' });

          if (error) throw error;
          
          // Lógica de Emissão Automática de Certificado:
          // Se o aluno tiver presença marcada em TODOS os dias ativos da chamada, emitimos o certificado.
          let autoIssuedCount = 0;
          for (const student of students) {
              const alreadyHasCert = !!certificates[student.id];
              if (!alreadyHasCert) {
                  const isFullyPresent = courseDates.allActiveDates.every(d => !!presenceMap[`${student.id}_${d}`]);
                  const templateId = productTemplates[student.product_name || ''];
                  
                  if (isFullyPresent && templateId) {
                      await appBackend.issueCertificate(student.id, templateId);
                      autoIssuedCount++;
                  }
              }
          }

          alert(`Chamada salva com sucesso!${autoIssuedCount > 0 ? ` ${autoIssuedCount} certificados foram emitidos automaticamente para alunos com 100% de frequência.` : ""}`);
          setAttendanceMode(false);
          await fetchStudents(); // Recarrega para mostrar os novos ícones de certificado
      } catch(e: any) {
          console.error(e);
          alert(`Erro ao salvar: ${e.message}`);
      } finally { setIsSavingAttendance(false); }
  };

  const togglePresence = (studentId: string, dateStr: string) => {
      if (!dateStr || isReadOnly) return;
      setPresenceMap(prev => ({ ...prev, [`${studentId}_${dateStr}`]: !prev[`${studentId}_${dateStr}`] }));
  };

  const handleIssueCertificate = async (student: StudentDeal) => {
      const templateId = productTemplates[student.product_name || ''];
      if (!templateId) { alert("Produto sem modelo de certificado."); return; }
      if (!window.confirm(`Emitir para ${student.contact_name}?`)) return;
      setIssuingFor(student.id);
      try {
          const hash = await appBackend.issueCertificate(student.id, templateId);
          setCertificates(prev => ({ ...prev, [student.id]: { hash, issuedAt: new Date().toISOString() } }));
      } catch (e: any) { alert(e.message); } finally { setIssuingFor(null); }
  };

  const copyCertLink = (hash: string) => {
      const link = `${window.location.origin}/?certificateHash=${hash}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDateSimple = (dateStr: string) => { if (!dateStr) return ''; const [y, m, d] = dateStr.split('-'); return `${d}/${m}`; };

  const getModuleBadge = (student: StudentDeal) => {
    const isMod1 = student.class_mod_1 === classItem.mod1Code;
    const isMod2 = student.class_mod_2 === classItem.mod2Code;
    if (isMod1 && isMod2) return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold border border-purple-200">Completo (M1+M2)</span>;
    if (isMod1) return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200">Módulo 1</span>;
    if (isMod2) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold border border-orange-200">Módulo 2</span>;
    return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px]">Indefinido</span>;
  };

  const containerClasses = variant === 'modal' 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white"
    : "h-full flex flex-col bg-white rounded-r-xl overflow-hidden border-l border-slate-200"; 

  const contentWrapperClasses = variant === 'modal'
    ? "bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:max-w-none print:h-auto print:max-h-none"
    : "flex flex-col h-full w-full";

  return (
    <div className={containerClasses}>
      <div className={contentWrapperClasses}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:bg-white shrink-0">
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-purple-600" /> Lista de Alunos</h3>
                <p className="text-sm text-slate-500">{classItem.course} • {classItem.city}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
                <button onClick={() => { setAttendanceMode(true); setIsReadOnly(true); }} className={clsx("px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border", attendanceMode && isReadOnly ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white hover:bg-blue-50 text-slate-600 border-slate-200")}><Eye size={18} /> Chamada</button>
                {canTakeAttendance && (
                    <button onClick={() => { setAttendanceMode(true); setIsReadOnly(false); }} className={clsx("px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border", attendanceMode && !isReadOnly ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-white hover:bg-orange-50 text-slate-600 border-slate-200")}><CheckSquare size={18} /> Editar</button>
                )}
                {!attendanceMode && <button onClick={() => window.print()} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"><Printer size={20} /></button>}
                <button onClick={onClose} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg text-slate-400 transition-colors"><X size={24} /></button>
            </div>
        </div>

        {attendanceMode && (
            <div className={clsx("border-b px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2", isReadOnly ? "bg-blue-50 text-blue-800" : "bg-orange-50 text-orange-800")}>
                <div className="flex items-center gap-2 text-xs font-bold">
                    <Calendar size={16} /> <span>{isReadOnly ? "Visualização" : "Edição de Chamada"}</span>
                </div>
                {!isReadOnly && (
                    <button onClick={saveAttendance} disabled={isSavingAttendance} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50">
                        {isSavingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salvar Agora
                    </button>
                )}
            </div>
        )}

        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20"><Loader2 size={40} className="animate-spin text-purple-600 mb-2" /><p className="text-slate-500">Buscando...</p></div>
            ) : (
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 border-b w-12 text-center">#</th>
                            <th className="px-6 py-3 border-b min-w-[200px]">Nome do Aluno</th>
                            {attendanceMode && (
                                <>
                                    {courseDates.mod1Day1 && <th className="px-2 py-3 border-b text-center bg-purple-50 text-purple-800 border-x border-purple-100">M1 D1<br/><span className="text-[9px]">{formatDateSimple(courseDates.mod1Day1)}</span></th>}
                                    {courseDates.mod1Day2 && <th className="px-2 py-3 border-b text-center bg-purple-50 text-purple-800 border-r border-purple-100">M1 D2<br/><span className="text-[9px]">{formatDateSimple(courseDates.mod1Day2)}</span></th>}
                                    {courseDates.mod2Day1 && <th className="px-2 py-3 border-b text-center bg-orange-50 text-orange-800 border-r border-orange-100">M2 D1<br/><span className="text-[9px]">{formatDateSimple(courseDates.mod2Day1)}</span></th>}
                                    {courseDates.mod2Day2 && <th className="px-2 py-3 border-b text-center bg-orange-50 text-orange-800 border-r border-orange-100">M2 D2<br/><span className="text-[9px]">{formatDateSimple(courseDates.mod2Day2)}</span></th>}
                                </>
                            )}
                            <th className="px-6 py-3 border-b">Status</th>
                            <th className="px-6 py-3 border-b">Módulo</th>
                            {!attendanceMode && <th className="px-6 py-3 border-b print:hidden text-center">Certificado</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student, idx) => {
                            const renderCheck = (dateStr: string, color: string) => {
                                if (!dateStr) return <td className="bg-slate-50 border-r"></td>;
                                const isP = !!presenceMap[`${student.id}_${dateStr}`];
                                return (
                                    <td className={clsx("px-2 py-3 text-center border-r", isP ? color : "")}>
                                        <input type="checkbox" className="w-5 h-5 rounded cursor-pointer text-purple-600 disabled:opacity-30" checked={isP} onChange={() => togglePresence(student.id, dateStr)} disabled={isReadOnly} />
                                    </td>
                                );
                            };
                            return (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-slate-400 text-center">{idx + 1}</td>
                                    <td className="px-6 py-3 font-bold text-slate-800">{student.company_name || student.contact_name}</td>
                                    {attendanceMode && (
                                        <>
                                            {renderCheck(courseDates.mod1Day1, "bg-purple-50")}
                                            {renderCheck(courseDates.mod1Day2, "bg-purple-50")}
                                            {renderCheck(courseDates.mod2Day1, "bg-orange-50")}
                                            {renderCheck(courseDates.mod2Day2, "bg-orange-50")}
                                        </>
                                    )}
                                    <td className="px-6 py-3"><span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", student.stage === 'closed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{student.stage === 'closed' ? 'Matriculado' : 'Lead'}</span></td>
                                    <td className="px-6 py-3">{getModuleBadge(student)}</td>
                                    {!attendanceMode && (
                                        <td className="px-6 py-3 text-center print:hidden">
                                            {certificates[student.id] ? (
                                                <button onClick={() => copyCertLink(certificates[student.id].hash)} className={clsx("p-1.5 rounded transition-colors text-xs font-bold", copiedLink === certificates[student.id].hash ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400")}><CheckCircle size={14} /></button>
                                            ) : productTemplates[student.product_name || ''] ? (
                                                <button onClick={() => handleIssueCertificate(student)} disabled={issuingFor === student.id} className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded hover:bg-amber-200 border border-amber-200 disabled:opacity-50">{issuingFor === student.id ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />} Liberar</button>
                                            ) : <span className="text-[10px] text-slate-300">N/A</span>}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {variant === 'modal' && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden shrink-0">
                {attendanceMode && !isReadOnly ? (
                    <button onClick={saveAttendance} disabled={isSavingAttendance} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all flex items-center gap-2">
                        {isSavingAttendance ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Chamada
                    </button>
                ) : (
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold">Fechar</button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
