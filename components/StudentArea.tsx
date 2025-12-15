
import React, { useEffect, useState } from 'react';
import { StudentSession, StudentCertificate } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle, User, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

interface StudentAreaProps {
    student: StudentSession;
    onLogout: () => void;
}

export const StudentArea: React.FC<StudentAreaProps> = ({ student, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'classes' | 'products' | 'certificates'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStudentData();
    }, [student]);

    const loadStudentData = async () => {
        setIsLoading(true);
        try {
            // 1. Load Classes based on student deals info (class_mod_1, class_mod_2)
            // Collect all unique class codes
            const mod1Codes = student.deals.map(d => d.class_mod_1).filter(Boolean);
            const mod2Codes = student.deals.map(d => d.class_mod_2).filter(Boolean);
            const allCodes = Array.from(new Set([...mod1Codes, ...mod2Codes]));

            if (allCodes.length > 0) {
                // Fetch classes that match either mod1 or mod2 codes
                // Note: The previous logic relied on exact string match of the code which is stored in mod_1_code column
                const { data: classesData } = await appBackend.client
                    .from('crm_classes')
                    .select('*')
                    .or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                
                if (classesData) setClasses(classesData);
            }

            // 2. Load Certificates (Robust Method: Fetch issued -> Fetch Titles manually)
            const dealIds = student.deals.map(d => d.id);
            if (dealIds.length > 0) {
                // Step A: Get issued certificates for these deals
                const { data: issuedCerts, error: certError } = await appBackend.client
                    .from('crm_student_certificates')
                    .select('*')
                    .in('student_deal_id', dealIds);
                
                if (issuedCerts && issuedCerts.length > 0) {
                    // Step B: Get the template titles
                    const templateIds = issuedCerts.map((c: any) => c.certificate_template_id);
                    const { data: templates } = await appBackend.client
                        .from('crm_certificates')
                        .select('id, title')
                        .in('id', templateIds);
                    
                    // Step C: Merge
                    const mergedCerts = issuedCerts.map((cert: any) => {
                        const template = templates?.find((t: any) => t.id === cert.certificate_template_id);
                        return {
                            ...cert,
                            crm_certificates: { title: template?.title || 'Certificado' }
                        };
                    });
                    
                    setCertificates(mergedCerts);
                } else {
                    setCertificates([]);
                }
            }

        } catch (e) {
            console.error("Erro ao carregar dados do aluno", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Products based on deals (Digital Products)
    const myProducts = student.deals.filter(d => d.product_type === 'Digital');

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'Confirmado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Concluído': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelado': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Planejamento
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold border-2 border-white shadow-sm">
                            <UserCircle size={24} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-800 leading-tight">Olá, {student.name.split(' ')[0]}</h1>
                            <p className="text-xs text-slate-500">Área do Aluno VOLL</p>
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

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('classes')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'classes' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50")}
                    >
                        <GraduationCap size={18} /> Minhas Turmas
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'products' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50")}
                    >
                        <BookOpen size={18} /> Produtos Digitais
                    </button>
                    <button 
                        onClick={() => setActiveTab('certificates')}
                        className={clsx("flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap", activeTab === 'certificates' ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50")}
                    >
                        <Award size={18} /> Certificados
                    </button>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
                    ) : (
                        <>
                            {/* CLASSES TAB */}
                            {activeTab === 'classes' && (
                                <div className="space-y-4">
                                    {classes.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">Nenhuma turma presencial encontrada.</div>
                                    ) : (
                                        classes.map(cls => (
                                            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                {/* STATUS BADGE */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-mono text-slate-400">#{cls.class_code}</span>
                                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", getStatusStyle(cls.status))}>
                                                        {cls.status}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-slate-800 mb-1">{cls.course}</h3>
                                                
                                                <div className="flex items-center gap-1 text-sm text-slate-600 mb-4">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    {cls.city}/{cls.state}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 1</span>
                                                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                                                            <Calendar size={14} className="text-purple-600" />
                                                            {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </div>
                                                        {cls.instructor_mod_1 && (
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <User size={14} className="text-slate-400" />
                                                                <span className="text-xs">{cls.instructor_mod_1}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo 2</span>
                                                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                                                            <Calendar size={14} className="text-orange-600" />
                                                            {cls.date_mod_2 ? new Date(cls.date_mod_2).toLocaleDateString('pt-BR') : 'A definir'}
                                                        </div>
                                                        {cls.instructor_mod_2 && (
                                                            <div className="flex items-center gap-2 text-slate-700">
                                                                <User size={14} className="text-slate-400" />
                                                                <span className="text-xs">{cls.instructor_mod_2}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {cls.status === 'Confirmado' && (
                                                    <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-100">
                                                        <CheckCircle size={14} />
                                                        <span>Turma confirmada! Prepare-se para o curso.</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PRODUCTS TAB */}
                            {activeTab === 'products' && (
                                <div className="space-y-4">
                                    {myProducts.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">Nenhum produto digital liberado.</div>
                                    ) : (
                                        myProducts.map(prod => (
                                            <div key={prod.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{prod.product_name || 'Produto Digital'}</h3>
                                                    <p className="text-sm text-slate-500">Curso Online</p>
                                                </div>
                                                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                                                    <Video size={16} /> Acessar Conteúdo
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* CERTIFICATES TAB */}
                            {activeTab === 'certificates' && (
                                <div className="space-y-4">
                                    {certificates.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                <Award size={32} />
                                            </div>
                                            <p className="text-slate-500 font-medium">Nenhum certificado emitido ainda.</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                                Os certificados aparecem aqui após a conclusão do curso e liberação pela secretaria.
                                            </p>
                                        </div>
                                    ) : (
                                        certificates.map(cert => (
                                            <div key={cert.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                                                            <Award size={24} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">{cert.crm_certificates?.title || 'Certificado de Conclusão'}</h3>
                                                            <p className="text-xs text-slate-500">Emitido em: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a 
                                                            href={`/?certificateHash=${cert.hash}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                                        >
                                                            <ExternalLink size={16} /> Visualizar
                                                        </a>
                                                        <a 
                                                            href={`/?certificateHash=${cert.hash}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                                        >
                                                            <Download size={16} /> Baixar PDF
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};
