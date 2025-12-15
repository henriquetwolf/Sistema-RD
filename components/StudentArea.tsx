
import React, { useEffect, useState } from 'react';
import { StudentSession, StudentCertificate } from '../types';
import { appBackend } from '../services/appBackend';
import { 
    LogOut, GraduationCap, BookOpen, Award, ExternalLink, Calendar, MapPin, 
    Video, Download, Loader2, UserCircle 
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
                const { data: classesData } = await appBackend.client
                    .from('crm_classes')
                    .select('*')
                    .or(`mod_1_code.in.(${allCodes.map(c => `"${c}"`).join(',')}),mod_2_code.in.(${allCodes.map(c => `"${c}"`).join(',')})`);
                
                if (classesData) setClasses(classesData);
            }

            // 2. Load Certificates
            const dealIds = student.deals.map(d => d.id);
            if (dealIds.length > 0) {
                const { data: certsData } = await appBackend.client
                    .from('crm_student_certificates')
                    .select('*, crm_certificates(title)')
                    .in('student_deal_id', dealIds);
                
                if (certsData) setCertificates(certsData);
            }

        } catch (e) {
            console.error("Erro ao carregar dados do aluno", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Products based on deals (Digital Products)
    const myProducts = student.deals.filter(d => d.product_type === 'Digital');

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
                                            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                                <h3 className="font-bold text-lg text-slate-800 mb-2">{cls.course}</h3>
                                                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                                                    <div className="flex items-center gap-1.5"><MapPin size={16} className="text-purple-500"/> {cls.city}/{cls.state}</div>
                                                    <div className="flex items-center gap-1.5"><Calendar size={16} className="text-purple-500"/> Mod 1: {cls.date_mod_1 ? new Date(cls.date_mod_1).toLocaleDateString() : 'A definir'}</div>
                                                    {cls.date_mod_2 && <div className="flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Mod 2: {new Date(cls.date_mod_2).toLocaleDateString()}</div>}
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs">
                                                    {cls.studio_mod_1 && (
                                                        <div>
                                                            <strong className="block text-slate-700 mb-1 uppercase">Local Módulo 1</strong>
                                                            {cls.studio_mod_1}
                                                        </div>
                                                    )}
                                                    {cls.hotel_mod_1 && (
                                                        <div>
                                                            <strong className="block text-slate-700 mb-1 uppercase">Sugestão Hotel</strong>
                                                            {cls.hotel_mod_1} ({cls.hotel_loc_mod_1})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PRODUCTS TAB */}
                            {activeTab === 'products' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myProducts.length === 0 ? (
                                        <div className="col-span-full text-center py-12 text-slate-400">Nenhum produto digital encontrado.</div>
                                    ) : (
                                        myProducts.map(prod => (
                                            <div key={prod.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between h-40">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 mb-1">{prod.product_name || 'Produto Digital'}</h3>
                                                    <p className="text-xs text-slate-500">Adquirido em {new Date(prod.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <button className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                                    <Video size={16} /> Acessar Conteúdo
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* CERTIFICATES TAB */}
                            {activeTab === 'certificates' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {certificates.length === 0 ? (
                                        <div className="col-span-full text-center py-12 text-slate-400">Nenhum certificado emitido ainda.</div>
                                    ) : (
                                        certificates.map(cert => (
                                            <div key={cert.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                                                        <Award size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">{cert.crm_certificates?.title || 'Certificado'}</h3>
                                                        <p className="text-xs text-slate-500">Emitido em {new Date(cert.issued_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a 
                                                        href={`/?certificateHash=${cert.hash}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="p-2 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-lg transition-colors"
                                                        title="Visualizar"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </a>
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
