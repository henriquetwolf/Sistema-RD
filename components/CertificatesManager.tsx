import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Plus, Search, MoreVertical, Edit2, Trash2, 
  ArrowLeft, Save, X, Printer, Image as ImageIcon, Loader2,
  Calendar, MapPin, User, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import { CertificateModel } from '../types';

interface CertificatesManagerProps {
  onBack: () => void;
}

const INITIAL_CERT: CertificateModel = {
    id: '',
    title: 'Novo Modelo',
    backgroundData: '',
    bodyText: 'Certificamos que [NOME ALUNO] concluiu com êxito o curso, realizado em [CIDADE], na data de [DATA].',
    createdAt: ''
};

export const CertificatesManager: React.FC<CertificatesManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'generator'>('list');
  const [certificates, setCertificates] = useState<CertificateModel[]>([]);
  const [currentCert, setCurrentCert] = useState<CertificateModel>(INITIAL_CERT);
  
  // Generator State
  const [genName, setGenName] = useState('');
  const [genCity, setGenCity] = useState('');
  const [genDate, setGenDate] = useState('');
  
  // Loading
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
      setLoading(true);
      try {
          const data = await appBackend.getCertificates();
          setCertificates(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleEdit = (cert: CertificateModel) => {
      setCurrentCert(cert);
      setView('editor');
  };

  const handleGenerate = (cert: CertificateModel) => {
      setCurrentCert(cert);
      setGenDate(new Date().toLocaleDateString('pt-BR'));
      setView('generator');
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Excluir este modelo?")) {
          await appBackend.deleteCertificate(id);
          fetchCertificates();
      }
  };

  const handleSave = async () => {
      if(!currentCert.title || !currentCert.backgroundData) {
          alert("Título e Imagem de Fundo são obrigatórios.");
          return;
      }
      setIsSaving(true);
      try {
          const certToSave = { 
              ...currentCert, 
              id: currentCert.id || crypto.randomUUID(),
              createdAt: currentCert.createdAt || new Date().toISOString()
          };
          await appBackend.saveCertificate(certToSave);
          await fetchCertificates();
          setView('list');
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setCurrentCert({ ...currentCert, backgroundData: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  // --- RENDERERS ---

  // 1. LIST VIEW
  if (view === 'list') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Award className="text-amber-500" /> Certificados
                        </h2>
                        <p className="text-slate-500 text-sm">Gerencie modelos e emita certificados.</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setCurrentCert(INITIAL_CERT); setView('editor'); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={18} /> Novo Modelo
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
            ) : certificates.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <Award size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhum modelo cadastrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map(cert => (
                        <div key={cert.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                            {/* Preview Thumbnail */}
                            <div className="h-40 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                                {cert.backgroundData ? (
                                    <img src={cert.backgroundData} alt="bg" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon size={32} />
                                    </div>
                                )}
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(cert)} className="bg-white text-slate-700 p-2 rounded-full hover:bg-slate-100" title="Editar"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(cert.id)} className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50" title="Excluir"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{cert.title}</h3>
                                <p className="text-xs text-slate-400 mb-4">Criado em {new Date(cert.createdAt).toLocaleDateString()}</p>
                                <button 
                                    onClick={() => handleGenerate(cert)}
                                    className="mt-auto w-full py-2 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Printer size={16} /> Emitir Certificado
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      );
  }

  // 2. EDITOR VIEW
  if (view === 'editor') {
      return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100"><ArrowLeft size={20} /></button>
                    <h2 className="text-lg font-bold text-slate-800">Editor de Modelo</h2>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Modelo
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Configuration */}
                <div className="w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título do Modelo</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            value={currentCert.title}
                            onChange={e => setCurrentCert({...currentCert, title: e.target.value})}
                            placeholder="Ex: Certificado Padrão 2024"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Imagem de Fundo (A4 Paisagem)</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-xs text-slate-500">Clique para enviar imagem</p>
                        </div>
                        {currentCert.backgroundData && (
                            <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div> Imagem carregada
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto do Certificado</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-32 resize-none"
                            value={currentCert.bodyText}
                            onChange={e => setCurrentCert({...currentCert, bodyText: e.target.value})}
                            placeholder="Digite o texto..."
                        ></textarea>
                        <p className="text-xs text-slate-400 mt-2">
                            O sistema irá posicionar automaticamente: Nome (centro), Cidade e Data (rodapé).
                        </p>
                    </div>
                </div>

                {/* Preview Canvas */}
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center">
                    <div 
                        className="bg-white shadow-2xl relative overflow-hidden" 
                        style={{ 
                            width: '297mm', 
                            height: '210mm', 
                            transform: 'scale(0.7)', // Visual scaling for editor
                            transformOrigin: 'center center'
                        }}
                    >
                        {/* Background */}
                        {currentCert.backgroundData && (
                            <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" />
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-20">
                            {/* Body Text */}
                            <div className="text-xl text-slate-800 max-w-4xl mx-auto leading-relaxed mt-20 font-serif">
                                {currentCert.bodyText || "Texto do certificado..."}
                            </div>

                            {/* Name Placeholder */}
                            <div className="my-10">
                                <h1 className="text-6xl text-slate-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                    Nome do Aluno
                                </h1>
                            </div>

                            {/* Footer Date/City */}
                            <div className="mt-auto pt-10 text-lg text-slate-600 font-serif">
                                Cidade Exemplo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // 3. GENERATOR VIEW
  if (view === 'generator') {
      return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header (Hidden on Print) */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100"><ArrowLeft size={20} /></button>
                    <h2 className="text-lg font-bold text-slate-800">Emitir: {currentCert.title}</h2>
                </div>
                <button 
                    onClick={handlePrint} 
                    className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                    <Printer size={18} /> Imprimir / PDF
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Input Sidebar (Hidden on Print) */}
                <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10 print:hidden">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><User size={14}/> Nome do Aluno</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            value={genName}
                            onChange={e => setGenName(e.target.value)}
                            placeholder="Nome completo"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><MapPin size={14}/> Cidade</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            value={genCity}
                            onChange={e => setGenCity(e.target.value)}
                            placeholder="Ex: São Paulo"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Calendar size={14}/> Data</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            value={genDate}
                            onChange={e => setGenDate(e.target.value)}
                            placeholder="DD/MM/AAAA"
                        />
                    </div>
                    
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <p><strong>Dica de Impressão:</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Selecione "Salvar como PDF"</li>
                            <li>Layout: <strong>Paisagem</strong></li>
                            <li>Margens: <strong>Nenhuma</strong></li>
                            <li>Habilitar: <strong>Gráficos de plano de fundo</strong></li>
                        </ul>
                    </div>
                </div>

                {/* Final Preview (Printable Area) */}
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center print:p-0 print:bg-white print:block print:overflow-visible">
                    <div 
                        className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:inset-0" 
                        style={{ 
                            width: '297mm', 
                            height: '210mm', 
                            // Scale down only on screen, not print
                        }}
                    >
                        {/* Background */}
                        {currentCert.backgroundData && (
                            <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" style={{printColorAdjust: 'exact'}} />
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-20">
                            {/* Body Text */}
                            <div className="text-xl text-slate-800 max-w-4xl mx-auto leading-relaxed mt-20 font-serif">
                                {currentCert.bodyText}
                            </div>

                            {/* Name */}
                            <div className="my-10">
                                <h1 className="text-6xl text-slate-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                    {genName || 'Nome do Aluno'}
                                </h1>
                            </div>

                            {/* Footer */}
                            <div className="mt-auto pt-10 text-lg text-slate-600 font-serif">
                                {genCity || 'Cidade'}, {genDate || 'Data'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return null;
};
