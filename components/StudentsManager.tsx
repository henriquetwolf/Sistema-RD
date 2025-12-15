
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Lock, Unlock, Mail, Phone, ArrowLeft, Loader2, RefreshCw, 
  Award, Eye, Download, ExternalLink, CheckCircle, Trash2, Wand2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

interface StudentsManagerProps {
  onBack: () => void;
}

interface StudentDeal {
    id: string;
    contact_name: string;
    company_name: string; // This is the "Full Name" in CRM
    cpf: string;
    email: string;
    phone: string;
    product_name: string;
    status: string;
    student_access_enabled: boolean;
    class_mod_1?: string;
    class_mod_2?: string;
}

interface CertStatus {
    id: string; // Cert ID
    hash: string;
    issuedAt: string;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ onBack }) => {
  const [students, setStudents] = useState<StudentDeal[]>([]);
  const [certificates, setCertificates] = useState<Record<string, CertStatus>>({});
  const [productTemplates, setProductTemplates] = useState<Record<string, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoIssuing, setIsAutoIssuing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
        const { data, error } = await appBackend.client
            .from('crm_deals')
            .select('id, contact_name, company_name, cpf, email, phone, product_name, status, student_access_enabled, class_mod_1, class_mod_2')
            .order('contact_name', { ascending: true });
        
        if (error) throw error;
        
        // Use default true for access if null
        const deals = (data || []).map((s: any) => ({
            ...s,
            student_access_enabled: s.student_access_enabled !== false // Default true if null/undefined
        }));
        
        setStudents(deals);

        // --- Fetch Certificate Info ---
        if (deals.length > 0) {
            const productNames = Array.from(new Set(deals.map((d: any) => d.product_name).filter(Boolean)));
            
            // 1. Map Products to Templates
            if (productNames.length > 0) {
                const templatesMap: Record<string, string> = {};

                // Strategy A: Check crm_products links
                const { data: products } = await appBackend.client
                    .from('crm_products')
                    .select('name, certificate_template_id')
                    .in('name', productNames);
                
                products?.forEach((p: any) => {
                    if (p.certificate_template_id) templatesMap[p.name] = p.certificate_template_id;
                });

                // Strategy B: Check crm_certificates direct links (legacy or manual link)
                const { data: directCerts } = await appBackend.client
                    .from('crm_certificates')
                    .select('id, linked_product_id')
                    .in('linked_product_id', productNames);
                
                directCerts?.forEach((c: any) => {
                    if (c.linked_product_id) templatesMap[c.linked_product_id] = c.id;
                });

                setProductTemplates(templatesMap);
            }

            // 2. Get issued certificates
            const dealIds = deals.map((d: any) => d.id);
            const { data: issuedCerts } = await appBackend.client
                .from('crm_student_certificates')
                .select('id, student_deal_id, hash, issued_at')
                .in('student_deal_id', dealIds);
            
            const certMap: Record<string, CertStatus> = {};
            issuedCerts?.forEach((c: any) => {
                certMap[c.student_deal_id] = { id: c.id, hash: c.hash, issuedAt: c.issued_at };
            });
            setCertificates(certMap);
        }

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

  const handleIssueCertificate = async (student: StudentDeal) => {
      const templateId = productTemplates[student.product_name || ''];
      if (!templateId) return;

      if (!window.confirm(`Emitir certificado para ${student.company_name || student.contact_name}?`)) return;

      setIssuingId(student.id);
      try {
          const hash = await appBackend.issueCertificate(student.id, templateId);
          // Re-fetch to get the ID properly
          const { data: issuedCert } = await appBackend.client
              .from('crm_student_certificates')
              .select('id, hash, issued_at')
              .eq('hash', hash)
              .single();
          
          if(issuedCert) {
              setCertificates(prev => ({
                  ...prev,
                  [student.id]: { id: issuedCert.id, hash: issuedCert.hash, issuedAt: issuedCert.issued_at }
              }));
          }
      } catch (e: any) {
          alert(`Erro ao emitir: ${e.message}`);
      } finally {
          setIssuingId(null);
      }
  };

  const handleAutoIssueBatch = async () => {
      if (!window.confirm("Deseja iniciar a emissão automática para TODOS os alunos listados?\n\nO sistema verificará:\n1. Se a turma do aluno já terminou (Data passada)\n2. Se o aluno tem >= 70% de presença\n3. Se ainda não possui certificado\n\nIsso pode levar alguns instantes.")) return;

      setIsAutoIssuing(true);
      let issuedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      try {
          // 1. Fetch ALL Classes to have date reference
          const { data: classesData } = await appBackend.client
              .from('crm_classes')
              .select('id, mod_1_code, mod_2_code, date_mod_2');
          
          if (!classesData) throw new Error("Não foi possível carregar os dados das turmas.");

          // 2. Iterate filtered students
          // Use 'filtered' list so user can search/filter first if they want, or use full list
          const targetStudents = filtered.length > 0 ? filtered : students;

          for (const student of targetStudents) {
              // Check eligibility basics
              if (certificates[student.id]) {
                  skippedCount++; // Already issued
                  continue;
              }
              const templateId = productTemplates[student.product_name || ''];
              if (!templateId) {
                  skippedCount++; // No template
                  continue;
              }

              // Find Class
              // Use Class Mod 2 code preferably as it determines end date
              const classCode = student.class_mod_2 || student.class_mod_1;
              if (!classCode) {
                  skippedCount++;
                  continue;
              }

              const classInfo = classesData.find((c: any) => c.mod_2_code === classCode || c.mod_1_code === classCode);
              
              if (!classInfo || !classInfo.date_mod_2) {
                  skippedCount++;
                  continue;
              }

              // Check Date
              const now = new Date();
              const endDate = new Date(classInfo.date_mod_2);
              endDate.setHours(23, 59, 59); // End of day
              
              if (now <= endDate) {
                  skippedCount++; // Course not finished
                  continue;
              }

              // Check Attendance (Database Query per student - batched would be better but complex for this scope)
              // We assume 70% presence is required.
              const { data: attendance } = await appBackend.client
                  .from('crm_attendance')
                  .select('present')
                  .eq('class_id', classInfo.id)
                  .eq('student_id', student.id);
              
              const totalDaysRecorded = attendance?.length || 0;
              
              // Only process if there is attendance data. 
              // If attendance is empty, we assume they didn't go or teacher didn't record -> No certificate
              if (totalDaysRecorded === 0) {
                  skippedCount++;
                  continue;
              }

              const presentCount = attendance?.filter((a: any) => a.present).length || 0;
              const percent = (presentCount / totalDaysRecorded) * 100;

              if (percent < 70) {
                  skippedCount++; // Not enough attendance
                  continue;
              }

              // Issue Certificate
              try {
                  const hash = await appBackend.issueCertificate(student.id, templateId);
                  
                  // Update local state optimistic
                  setCertificates(prev => ({
                      ...prev,
                      [student.id]: { id: 'temp-id', hash: hash, issuedAt: new Date().toISOString() }
                  }));
                  issuedCount++;
              } catch (err) {
                  console.error(err);
                  errorCount++;
              }
          }

          alert(`Processo Finalizado!\n\nCertificados Emitidos: ${issuedCount}\nIgnorados (Já possui/Não elegível): ${skippedCount}\nErros: ${errorCount}`);

      } catch (e: any) {
          alert(`Erro no processo: ${e.message}`);
      } finally {
          setIsAutoIssuing(false);
          // Optionally reload to get real IDs
          fetchStudents();
      }
  };

  const handleDeleteCertificate = async (studentId: string, certId: string) => {
      if(!window.confirm("ATENÇÃO: Deseja realmente excluir este certificado emitido? O link deixará de funcionar.")) return;
      
      setDeletingCertId(studentId);
      try {
          await appBackend.deleteStudentCertificate(certId);
          // Remove from local state
          const newCerts = { ...certificates };
          delete newCerts[studentId];
          setCertificates(newCerts);
      } catch(e: any) {
          alert(`Erro ao excluir: ${e.message}`);
      } finally {
          setDeletingCertId(null);
      }
  };

  const copyCertLink = (hash: string) => {
      const link = `${window.location.origin}/?certificateHash=${hash}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
  };

  const filtered = students.filter(s => 
      (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                        <Users className="text-teal-600" /> Gestão de Alunos
                    </h2>
                    <p className="text-slate-500 text-sm">Controle de acesso e certificados dos alunos.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleAutoIssueBatch}
                    disabled={isAutoIssuing || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all disabled:opacity-50"
                    title="Emitir certificados para alunos concluintes com >70% de presença"
                >
                    {isAutoIssuing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    Emissão Automática
                </button>
                
                <button onClick={fetchStudents} className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <RefreshCw size={20} className={clsx(isLoading && "animate-spin")} />
                </button>
            </div>
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
                            <th className="px-6 py-4 text-center">Certificado</th>
                            <th className="px-6 py-4 text-center">Status Acesso</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(s => {
                            const cert = certificates[s.id];
                            const hasTemplate = !!productTemplates[s.product_name || ''];

                            return (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {/* Use Company Name (Full Client Name) if available, otherwise Contact Name */}
                                        {s.company_name || s.contact_name || 'Sem nome'}
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
                                    
                                    {/* CERTIFICADO COLUMN */}
                                    <td className="px-6 py-4 text-center">
                                        {cert ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <a 
                                                    href={`/?certificateHash=${cert.hash}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                    title="Visualizar Certificado"
                                                >
                                                    <Eye size={14} />
                                                </a>
                                                <a 
                                                    href={`/?certificateHash=${cert.hash}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 border border-green-200 transition-colors"
                                                    title="Baixar PDF"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                <button 
                                                    onClick={() => copyCertLink(cert.hash)}
                                                    className={clsx("p-1.5 rounded transition-colors", copiedLink === cert.hash ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                                    title="Copiar Link"
                                                >
                                                    {copiedLink === cert.hash ? <CheckCircle size={14} /> : <ExternalLink size={14} />}
                                                </button>
                                                
                                                {/* DELETE BUTTON */}
                                                <button 
                                                    onClick={() => handleDeleteCertificate(s.id, cert.id)}
                                                    disabled={deletingCertId === s.id}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Excluir Certificado"
                                                >
                                                    {deletingCertId === s.id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        ) : hasTemplate ? (
                                            <button 
                                                onClick={() => handleIssueCertificate(s)}
                                                disabled={issuingId === s.id}
                                                className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded hover:bg-amber-200 border border-amber-200 disabled:opacity-50 flex items-center gap-1 mx-auto"
                                            >
                                                {issuingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />}
                                                Emitir
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic">S/ Modelo</span>
                                        )}
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
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
};
