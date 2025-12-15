import React, { useState, useEffect } from 'react';
import { 
  Award, Plus, Search, Edit2, Trash2, 
  ArrowLeft, Save, X, Printer, Image as ImageIcon, Loader2,
  Calendar, MapPin, User, FlipHorizontal, Book
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CertificateModel } from '../types';
import clsx from 'clsx';

interface CertificatesManagerProps {
  onBack: () => void;
}

const INITIAL_CERT: CertificateModel = {
    id: '',
    title: 'Novo Modelo',
    backgroundData: '',
    backBackgroundData: '',
    linkedProductId: '',
    bodyText: 'Certificamos que [NOME ALUNO] concluiu com êxito o curso, realizado em [CIDADE], na data de [DATA].',
    createdAt: ''
};

export const CertificatesManager: React.FC<CertificatesManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'generator'>('list');
  const [certificates, setCertificates] = useState<CertificateModel[]>([]);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);
  const [currentCert, setCurrentCert] = useState<CertificateModel>(INITIAL_CERT);
  
  // Editor State
  const [editorSide, setEditorSide] = useState<'front' | 'back'>('front');

  // Generator State
  const [genName, setGenName] = useState('');
  const [genCity, setGenCity] = useState('');
  const [genDate, setGenDate] = useState('');
  
  // Loading
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCertificates();
    fetchProducts();
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

  const fetchProducts = async () => {
      try {
          const { data } = await appBackend.client.from('crm_products').select('id, name');
          if (data) setProducts(data);
      } catch (e) {
          console.error(e);
      }
  };

  const handleEdit = (cert: CertificateModel) => {
      setCurrentCert(cert);
      setView('editor');
      setEditorSide('front');
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
          alert("Título e Imagem de Frente são obrigatórios.");
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              if (side === 'front') {
                  setCurrentCert({ ...currentCert, backgroundData: result });
              } else {
                  setCurrentCert({ ...currentCert, backBackgroundData: result });
              }
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
                    onClick={() => { setCurrentCert(INITIAL_CERT); setView('editor'); setEditorSide('front'); }}
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
                                <div className="text-xs text-slate-500 mb-4 flex flex-col gap-1">
                                    <span>Criado em {new Date(cert.createdAt).toLocaleDateString()}</span>
                                    {cert.linkedProductId && (
                                        <span className="flex items-center gap-1 text-teal-600 font-medium">
                                            <Book size={10} /> 
                                            {products.find(p => p.id === cert.linkedProductId)?.name || 'Produto Vinculado'}
                                        </span>
                                    )}
                                </div>
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
                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="bg-slate-100 rounded-lg p-1 flex mr-4">
                        <button 
                            onClick={() => setEditorSide('front')}
                            className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2", editorSide === 'front' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                        >
                            Frente
                        </button>
                        <button 
                            onClick={() => setEditorSide('back')}
                            className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2", editorSide === 'back' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                        >
                            <FlipHorizontal size={14} /> Verso
                        </button>
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
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Configuration */}
                <div className="w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10 shrink-0">
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Associar ao Curso</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                            value={currentCert.linkedProductId || ''}
                            onChange={e => setCurrentCert({...currentCert, linkedProductId: e.target.value})}
                        >
                            <option value="">-- Selecione um curso --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Isso permite emissão direta na lista de alunos.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            {editorSide === 'front' ? 'Imagem de Fundo (Frente)' : 'Imagem de Fundo (Verso)'}
                        </label>
                        <div 
                            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors relative cursor-pointer flex flex-col justify-center"
                            style={{ aspectRatio: '297/210' }}
                        >
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, editorSide)} 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                            />
                            <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-xs text-slate-500">Clique para enviar (A4 Paisagem)</p>
                        </div>
                        {((editorSide === 'front' && currentCert.backgroundData) || (editorSide === 'back' && currentCert.backBackgroundData)) && (
                            <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div> Imagem carregada
                            </div>
                        )}
                    </div>

                    {editorSide === 'front' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto do Certificado (Frente)</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-32 resize-none"
                                value={currentCert.bodyText}
                                onChange={e => setCurrentCert({...currentCert, bodyText: e.target.value})}
                                placeholder="Digite o texto..."
                            ></textarea>
                            <p className="text-xs text-slate-400 mt-2">
                                Variáveis: [NOME ALUNO], [CIDADE], [DATA].
                            </p>
                        </div>
                    )}
                    
                    {editorSide === 'back' && (
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-xs border border-blue-100">
                            <strong>Nota:</strong> O código de autenticação (Hash) do certificado será inserido automaticamente no canto inferior direito do verso.
                        </div>
                    )}
                </div>

                {/* Preview Canvas */}
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center">
                    <div 
                        className="bg-white shadow-2xl relative overflow-hidden transition-all duration-300 flex-shrink-0 origin-center" 
                        style={{ 
                            // A4 Landscape Dimensions: 297mm x 210mm
                            width: '297mm', 
                            height: '210mm', 
                            // Scale down to 0.5 to ensure fit on standard screens
                            transform: 'scale(0.5)', 
                        }}
                    >
                        {/* Render Based on Active Side */}
                        {editorSide === 'front' ? (
                            <>
                                {/* Background Front */}
                                {currentCert.backgroundData && (
                                    <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" />
                                )}

                                {/* Content Overlay Front */}
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-20">
                                    <div className="text-2xl text-slate-800 max-w-5xl mx-auto leading-relaxed mt-20 font-serif whitespace-pre-wrap">
                                        {currentCert.bodyText || "Texto do certificado..."}
                                    </div>
                                    <div className="my-10">
                                        <h1 className="text-7xl text-slate-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                            Nome do Aluno
                                        </h1>
                                    </div>
                                    <div className="mt-auto pt-10 text-xl text-slate-600 font-serif">
                                        Cidade Exemplo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Background Back */}
                                {currentCert.backBackgroundData ? (
                                    <img src={currentCert.backBackgroundData} alt="bg-back" className="absolute inset-0 w-full h-full object-cover z-0" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300">
                                        <span className="text-2xl font-bold uppercase tracking-widest">Verso em Branco</span>
                                    </div>
                                )}
                                
                                {/* Hash Placeholder */}
                                <div className="absolute bottom-12 right-16 text-slate-500 font-mono text-sm z-10 bg-white/80 px-3 py-1 rounded border border-slate-200">
                                    ID: 8f4b2c-example-hash-code
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // 3. GENERATOR VIEW (Preview before print)
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
                <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10 print:hidden shrink-0">
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

                {/* Final Preview (Printable Area) - SCROLLABLE FOR TWO PAGES */}
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex flex-col items-center gap-8 print:p-0 print:bg-white print:block print:overflow-visible">
                    
                    {/* PAGE 1: FRONT */}
                    <div 
                        className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:inset-0 page-break" 
                        style={{ 
                            width: '297mm', 
                            height: '210mm', 
                            pageBreakAfter: 'always'
                        }}
                    >
                        {/* Background */}
                        {currentCert.backgroundData && (
                            <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" style={{printColorAdjust: 'exact'}} />
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-20">
                            {/* Body Text */}
                            <div className="text-2xl text-slate-800 max-w-5xl mx-auto leading-relaxed mt-20 font-serif whitespace-pre-wrap">
                                {currentCert.bodyText}
                            </div>

                            {/* Name */}
                            <div className="my-10">
                                <h1 className="text-7xl text-slate-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                    {genName || 'Nome do Aluno'}
                                </h1>
                            </div>

                            {/* Footer */}
                            <div className="mt-auto pt-10 text-xl text-slate-600 font-serif">
                                {genCity || 'Cidade'}, {genDate || 'Data'}
                            </div>
                        </div>
                    </div>

                    {/* PAGE 2: BACK (Only if image exists) */}
                    {currentCert.backBackgroundData && (
                        <div 
                            className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:m-0" 
                            style={{ 
                                width: '297mm', 
                                height: '210mm',
                            }}
                        >
                            <img src={currentCert.backBackgroundData} alt="bg-back" className="absolute inset-0 w-full h-full object-cover z-0" style={{printColorAdjust: 'exact'}} />
                            
                            {/* Hash Placeholder */}
                            <div className="absolute bottom-12 right-16 text-slate-500 font-mono text-sm z-10 bg-white/80 px-3 py-1 rounded border border-slate-200">
                                ID: PREVIEW-HASH-CODE
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return null;
};
