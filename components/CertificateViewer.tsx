import React, { useEffect, useState } from 'react';
import { appBackend } from '../services/appBackend';
import { CertificateModel } from '../types';
import { Loader2, Printer, X, Download } from 'lucide-react';

interface CertificateViewerProps {
    hash: string;
}

export const CertificateViewer: React.FC<CertificateViewerProps> = ({ hash }) => {
    const [data, setData] = useState<{
        studentName: string;
        studentCity: string;
        template: CertificateModel;
        issuedAt: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await appBackend.getStudentCertificate(hash);
                if (!result) throw new Error("Certificado não encontrado ou inválido.");
                setData(result);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [hash]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;
    
    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Certificado Indisponível</h2>
                <p className="text-slate-500">{error || "Não foi possível localizar o certificado."}</p>
            </div>
        </div>
    );

    const { template, studentName, studentCity, issuedAt } = data;
    const formattedDate = new Date(issuedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Text Replacement
    const finalBodyText = template.bodyText
        .replace('[NOME ALUNO]', studentName)
        .replace('[NOME DO ALUNO]', studentName)
        .replace('[CIDADE]', studentCity)
        .replace('[DATA]', formattedDate);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 print:p-0 print:bg-white print:block">
            
            {/* Styles for Printing */}
            <style>
                {`
                    @media print {
                        @page { size: landscape; margin: 0; }
                        body { background: white; }
                        .no-print { display: none !important; }
                        .print-page { 
                            width: 297mm; 
                            height: 210mm; 
                            page-break-after: always; 
                            position: relative; 
                            overflow: hidden;
                        }
                        .print-page:last-child { page-break-after: auto; }
                    }
                `}
            </style>

            {/* Toolbar (Hidden on Print) */}
            <div className="w-full max-w-5xl flex justify-between items-center px-4 mb-6 no-print">
                <div className="text-white">
                    <h1 className="font-bold text-lg">Visualizador de Certificado</h1>
                    <p className="text-xs text-slate-400">Autenticidade Verificada</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors">
                        <Printer size={16} /> Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* Content Container with Responsive Scale for Screen */}
            <div className="flex flex-col gap-8 items-center w-full overflow-auto">
                <div className="origin-top scale-[0.45] md:scale-[0.6] lg:scale-[0.8] xl:scale-100 print:scale-100 print:origin-top-left transition-transform flex flex-col gap-8 print:block">
                    
                    {/* PAGE 1: FRONT */}
                    <div 
                        className="bg-white shadow-2xl relative overflow-hidden print-page print:shadow-none"
                        style={{ 
                            width: '297mm', 
                            height: '210mm',
                        }}
                    >
                        {/* Background */}
                        {template.backgroundData && (
                            <img 
                                src={template.backgroundData} 
                                alt="bg" 
                                className="absolute inset-0 w-full h-full object-cover z-0" 
                                style={{ printColorAdjust: 'exact' }} 
                            />
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-20">
                            {/* Body Text */}
                            <div className="text-2xl text-slate-800 max-w-5xl mx-auto leading-relaxed mt-20 font-serif whitespace-pre-wrap">
                                {finalBodyText}
                            </div>

                            {/* Name Overlay */}
                            <div className="my-10">
                                <h1 className="text-7xl text-slate-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                    {studentName}
                                </h1>
                            </div>
                            
                            {/* Footer */}
                            <div className="mt-auto pt-10 text-xl text-slate-600 font-serif">
                                {studentCity}, {formattedDate}
                            </div>
                        </div>
                    </div>

                    {/* PAGE 2: BACK */}
                    {template.backBackgroundData && (
                        <div 
                            className="bg-white shadow-2xl relative overflow-hidden print-page print:shadow-none"
                            style={{ 
                                width: '297mm', 
                                height: '210mm',
                            }}
                        >
                            <img 
                                src={template.backBackgroundData} 
                                alt="bg-back" 
                                className="absolute inset-0 w-full h-full object-cover z-0" 
                                style={{ printColorAdjust: 'exact' }} 
                            />
                            
                            {/* Unique ID / Hash - Bottom Right */}
                            <div className="absolute bottom-12 right-16 z-10 text-slate-600 font-mono text-sm bg-white/80 px-3 py-1 rounded border border-slate-300">
                                ID: {hash}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
