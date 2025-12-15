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
        <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 print:p-0 print:bg-white">
            {/* Toolbar (Hidden on Print) */}
            <div className="w-full max-w-5xl flex justify-between items-center px-4 mb-6 print:hidden">
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

            {/* Certificate Area */}
            <div 
                className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:inset-0 print:m-0"
                style={{ 
                    width: '297mm', 
                    height: '210mm',
                    // Responsive scaling for screen
                    transform: 'scale(0.9)', 
                    transformOrigin: 'top center'
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

                    {/* Name Overlay (If template expects simple centering, usually bodyText handles it, but we can enhance) 
                        Note: The replacement logic above puts the name INTO the text. 
                        If the user designed the template with just the name in big letters, we might need a different approach.
                        For now, assuming the text replacement handles the name. 
                    */}
                    
                    {/* Footer Hash for Verification */}
                    <div className="absolute bottom-4 right-6 text-[10px] text-slate-400 font-mono">
                        Hash: {hash}
                    </div>
                </div>
            </div>
        </div>
    );
};
