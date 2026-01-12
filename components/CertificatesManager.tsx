import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Award, Plus, Search, Edit2, Trash2, 
  ArrowLeft, Save, X, Printer, Image as ImageIcon, Loader2,
  Calendar, MapPin, User, FlipHorizontal, Book, Type, MousePointer2, Move, AlignCenter, AlignLeft, CheckCircle2,
  List, History, ExternalLink, RefreshCw, FileText
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { CertificateModel, CertificateLayout, TextStyle } from '../types';
import clsx from 'clsx';

interface CertificatesManagerProps {
  onBack: () => void;
}

const DEFAULT_LAYOUT: CertificateLayout = {
    body: { x: 50, y: 40, fontSize: 18, fontFamily: 'serif', color: '#1e293b', fontWeight: 'normal', textAlign: 'center', width: 80 },
    name: { x: 50, y: 55, fontSize: 60, fontFamily: "'Great Vibes', cursive", color: '#0f172a', fontWeight: 'normal', textAlign: 'center', width: 90 },
    footer: { x: 50, y: 80, fontSize: 16, fontFamily: 'serif', color: '#475569', fontWeight: 'normal', textAlign: 'center', width: 80 }
};

const STANDARD_COURSES = ['Formação Completa em Pilates', 'Pilates Clínico', 'Pilates Suspenso', 'Gestão de Studios', 'MIT Movimento Inteligente'];

const INITIAL_CERT: CertificateModel = {
    id: '',
    title: 'Novo Modelo',
    backgroundData: '',
    backBackgroundData: '',
    linkedProductId: '',
    bodyText: 'Certificamos que [NOME ALUNO] concluiu com êxito o curso, realizado em [CIDADE], na data de [DATA].',
    layoutConfig: DEFAULT_LAYOUT,
    createdAt: ''
};

interface InteractableTextProps {
    text: string | React.ReactNode;
    style: TextStyle;
    isSelected: boolean;
    onSelect: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    scale: number;
}

const InteractableText: React.FC<InteractableTextProps> = ({ text, style, isSelected, onSelect, onMouseDown, scale }) => {
    return (
        <div 
            onMouseDown={(e) => {
                e.stopPropagation();
                onSelect();
                onMouseDown(e);
            }}
            onClick={(e) => e.stopPropagation()}
            className={clsx(
                "absolute cursor-move select-none p-2 border-2 transition-all group",
                isSelected ? "border-amber-500 bg-amber-50/30 z-20 shadow-sm" : "border-transparent hover:border-slate-300/50 z-10"
            )}
            style={{
                left: `${style.x}%`,
                top: `${style.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${style.width}%`,
                fontSize: `${style.fontSize}px`,
                fontFamily: style.fontFamily,
                color: style.color,
                fontWeight: style.fontWeight,
                textAlign: style.textAlign,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4
            }}
        >
            {text}
            {isSelected && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="bg-amber-500 w-2 h-2 rounded-full"></div>
                </div>
            )}
        </div>
    );
};

export const CertificatesManager: React.FC<CertificatesManagerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'issued'>('models');
  const [view, setView] = useState<'list' | 'editor' | 'generator'>('list');
  const [certificates, setCertificates] = useState<CertificateModel[]>([]);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);
  const [currentCert, setCurrentCert] = useState<CertificateModel>(INITIAL_CERT);
  
  // Issued State
  const [issuedHistory, setIssuedHistory] = useState<any[]>([]);
  const [studentsWithAccess, setStudentsWithAccess] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editorSide, setEditorSide] = useState<'front' | 'back'>('front');
  const [selectedElement, setSelectedElement] = useState<'body' | 'name' | 'footer' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  const elementStartRef = useRef<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [genName, setGenName] = useState('');
  const [genCity, setGenCity] = useState('');
  const [genDate, setGenDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchCertificates();
    fetchProducts();
  }, []);

  useEffect(() => {
      if (activeTab === 'issued') {
          fetchIssuedData();
      }
  }, [activeTab]);

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

  const fetchIssuedData = async () => {
      setLoading(true);
      try {
          const [issuedRes, studentsRes] = await Promise.all([
              appBackend.client.from('crm_student_certificates').select('*, crm_certificates(title)').order('issued_at', { ascending: false }),
              appBackend.client.from('crm_deals').select('id, contact_name, company_name, email').eq('stage', 'closed').order('contact_name')
          ]);
          
          setIssuedHistory(issuedRes.data || []);
          setStudentsWithAccess(studentsRes.data || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleEdit = (cert: CertificateModel) => {
      const layout = cert.layoutConfig || DEFAULT_LAYOUT;
      setCurrentCert({ ...cert, layoutConfig: layout });
      setView('editor');
      setEditorSide('front');
      setSelectedElement(null);
      setSaveSuccess(false);
  };

  const handleGenerate = (cert: CertificateModel) => {
      const layout = cert.layoutConfig || DEFAULT_LAYOUT;
      setCurrentCert({ ...cert, layoutConfig: layout });
      setGenDate(new Date().toLocaleDateString('pt-BR'));
      setView('generator');
  };

  const handleDelete = async (id: string) => {
      const target = certificates.find(c => c.id === id);
      if(window.confirm("Excluir este modelo?")) {
          try {
              await appBackend.deleteCertificate(id);
              await appBackend.logActivity({ action: 'delete', module: 'certificates', details: `Excluiu modelo de certificado: ${target?.title}`, recordId: id });
              fetchCertificates();
          } catch (e: any) {
              alert(`Erro ao excluir: ${e.message}`);
          }
      }
  };

  const handleDeleteIssued = async (id: string) => {
      if (!window.confirm("Deseja revogar este certificado emitido? O aluno perderá o acesso a este diploma no portal.")) return;
      try {
          const { error } = await appBackend.client.from('crm_student_certificates').delete().eq('id', id);
          if (error) throw error;
          fetchIssuedData();
      } catch (e: any) {
          alert("Erro ao revogar: " + e.message);
      }
  };

  const handleSave = async () => {
      if(!currentCert.title || !currentCert.backgroundData) {
          alert("Título e Imagem de Frente são obrigatórios.");
          return;
      }
      setIsSaving(true);
      setSaveSuccess(false);
      try {
          const isUpdate = !!currentCert.id;
          const finalId = currentCert.id || crypto.randomUUID();
          
          const certToSave = { 
              ...currentCert, 
              id: finalId,
              createdAt: currentCert.createdAt || new Date().toISOString()
          };
          
          await appBackend.saveCertificate(certToSave);
          
          await appBackend.logActivity({ 
              action: isUpdate ? 'update' : 'create', 
              module: 'certificates', 
              details: `${isUpdate ? 'Editou' : 'Criou'} modelo de certificado: ${currentCert.title}`, 
              recordId: finalId 
          });

          setCurrentCert(certToSave);
          await fetchCertificates();
          setSaveSuccess(true);
          
          setTimeout(() => {
              setSaveSuccess(false);
              setView('list');
          }, 1500);

      } catch (e: any) {
          console.error(e);
          alert(`Erro ao salvar: ${e.message}`);
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
              setCurrentCert(prev => ({
                  ...prev,
                  [side === 'front' ? 'backgroundData' : 'backBackgroundData']: result
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: 'body' | 'name' | 'footer') => {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const layout = currentCert.layoutConfig || DEFAULT_LAYOUT;
      elementStartRef.current = { x: layout[element].x, y: layout[element].y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !selectedElement || !containerRef.current || !dragStartRef.current || !elementStartRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const percentX = (deltaX / rect.width) * 100;
      const percentY = (deltaY / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, elementStartRef.current.x + percentX));
      const newY = Math.max(0, Math.min(100, elementStartRef.current.y + percentY));

      setCurrentCert(prev => {
          const updatedLayout = { ...prev.layoutConfig! };
          updatedLayout[selectedElement] = { ...updatedLayout[selectedElement], x: newX, y: newY };
          return { ...prev, layoutConfig: updatedLayout };
      });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      elementStartRef.current = null;
  };

  const updateStyle = (field: keyof TextStyle, value: any) => {
      if (!selectedElement) return;
      setCurrentCert(prev => {
          const updatedLayout = { ...prev.layoutConfig! };
          updatedLayout[selectedElement] = { ...updatedLayout[selectedElement], [field]: value };
          return { ...prev, layoutConfig: updatedLayout };
      });
  };

  const filteredStudents = useMemo(() => {
      return studentsWithAccess.filter(s => 
          (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [studentsWithAccess, searchTerm]);

  if (view === 'list') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Award className="text-amber-500" /> Certificação
                        </h2>
                        <p className="text-slate-500 text-sm">Gestão de modelos e controle de emissões.</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => { setActiveTab('models'); setSearchTerm(''); }} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'models' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <ImageIcon size={14}/> Modelos
                    </button>
                    <button onClick={() => { setActiveTab('issued'); setSearchTerm(''); }} className={clsx("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", activeTab === 'issued' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <History size={14}/> Certificados Emitidos
                    </button>
                </div>
            </div>

            {activeTab === 'models' ? (
                <>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Buscar modelo..." className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-lg text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <button 
                            onClick={() => { setCurrentCert({...INITIAL_CERT, layoutConfig: DEFAULT_LAYOUT}); setView('editor'); setEditorSide('front'); setSaveSuccess(false); }}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
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
                            {certificates.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(cert => (
                                <div key={cert.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                                    <div className="h-40 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                                        {cert.backgroundData ? (
                                            <img src={cert.backgroundData} alt="bg" className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
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
                                                    {products.find(p => p.id === cert.linkedProductId)?.name || cert.linkedProductId}
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleGenerate(cert)}
                                            className="mt-auto w-full py-2 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Printer size={16} /> Emitir Manualmente
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Buscar aluno ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm" />
                        </div>
                        <button onClick={fetchIssuedData} className="p-2 text-slate-400 hover:text-amber-600 transition-colors"><RefreshCw size={20} className={clsx(loading && "animate-spin")} /></button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Aluno com Acesso</th>
                                    <th className="px-6 py-4">Certificados Liberados</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={3} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-amber-500" /></td></tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr><td colSpan={3} className="py-20 text-center text-slate-400 italic">Nenhum aluno localizado.</td></tr>
                                ) : filteredStudents.map(student => {
                                    const studentCerts = issuedHistory.filter(h => h.student_deal_id === student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">{student.contact_name.charAt(0)}</div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{student.contact_name}</span>
                                                        <span className="text-[10px] text-slate-400">{student.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {studentCerts.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {studentCerts.map(sc => (
                                                            <div key={sc.id} className="group relative flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded text-[10px] font-bold">
                                                                <Award size={10}/>
                                                                <span className="max-w-[150px] truncate">{sc.crm_certificates?.title || 'Modelo Excluído'}</span>
                                                                <div className="flex gap-1 ml-1">
                                                                    <a href={`/?certificateHash=${sc.hash}`} target="_blank" className="p-0.5 hover:bg-white rounded transition-colors" title="Visualizar"><ExternalLink size={10}/></a>
                                                                    <button onClick={() => handleDeleteIssued(sc.id)} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-colors" title="Revogar"><X size={10}/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">Nenhum certificado emitido</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => { setGenName(student.contact_name); setView('list'); setActiveTab('models'); }} className="text-[10px] font-black uppercase text-amber-600 hover:underline">Novo Diploma</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      );
  }

  if (view === 'editor') {
      const layout = currentCert.layoutConfig || DEFAULT_LAYOUT;
      const activeStyle = selectedElement ? layout[selectedElement] : null;

      return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100"><ArrowLeft size={20} /></button>
                    <h2 className="text-lg font-bold text-slate-800">Editor de Modelo</h2>
                </div>
                <div className="flex items-center gap-2">
                    {saveSuccess && (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1 animate-pulse">
                            <CheckCircle2 size={16}/> Salvo com sucesso!
                        </span>
                    )}
                    <div className="bg-slate-100 rounded-lg p-1 flex mr-4">
                        <button 
                            onClick={() => { setEditorSide('front'); setSelectedElement(null); }}
                            className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2", editorSide === 'front' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                        >
                            Frente {currentCert.backgroundData && <CheckCircle2 size={10} className="text-green-500" />}
                        </button>
                        <button 
                            onClick={() => { setEditorSide('back'); setSelectedElement(null); }}
                            className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2", editorSide === 'back' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                        >
                            <FlipHorizontal size={14} /> Verso {currentCert.backBackgroundData && <CheckCircle2 size={10} className="text-green-500" />}
                        </button>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className={clsx(
                            "px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all",
                            saveSuccess ? "bg-green-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
                        )}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18}/> : <Save size={18} />}
                        {saveSuccess ? 'Salvo!' : 'Salvar Modelo'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10 shrink-0">
                    {selectedElement ? (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Type size={16} className="text-amber-500" />
                                    Estilo: {selectedElement === 'name' ? 'Nome do Aluno' : selectedElement === 'body' ? 'Texto Principal' : 'Rodapé'}
                                </h3>
                                <button onClick={() => setSelectedElement(null)} className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">Voltar</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fonte</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                                        value={activeStyle?.fontFamily}
                                        onChange={(e) => updateStyle('fontFamily', e.target.value)}
                                    >
                                        <option value="serif">Serifa Padrão</option>
                                        <option value="sans-serif">Sans-Serif (Arial)</option>
                                        <option value="'Great Vibes', cursive">Elegante (Great Vibes)</option>
                                        <option value="'Dancing Script', cursive">Manuscrita (Dancing Script)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Tamanho (px)</label>
                                        <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" value={activeStyle?.fontSize} onChange={(e) => updateStyle('fontSize', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Cor</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-8 h-9 border border-slate-300 rounded cursor-pointer p-0.5" value={activeStyle?.color} onChange={(e) => updateStyle('color', e.target.value)} />
                                            <span className="text-xs text-slate-500 font-mono uppercase">{activeStyle?.color}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Alinhamento</label>
                                    <div className="flex bg-white border border-slate-300 rounded overflow-hidden">
                                        {['left', 'center', 'right'].map((align) => (
                                            <button key={align} className={clsx("flex-1 py-1.5 text-xs font-medium capitalize hover:bg-slate-50", activeStyle?.textAlign === align ? "bg-amber-50 text-amber-700" : "text-slate-600")} onClick={() => updateStyle('textAlign', align)}>
                                                {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : 'Dir'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Largura da Área (%)</label>
                                    <input type="range" min="20" max="100" value={activeStyle?.width} onChange={(e) => updateStyle('width', Number(e.target.value))} className="w-full accent-amber-500" />
                                    <div className="text-right text-[10px] text-slate-400">{activeStyle?.width}%</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Configurações Gerais</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2" value={currentCert.title} onChange={e => setCurrentCert(prev => ({...prev, title: e.target.value}))} placeholder="Nome do Modelo" />
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={currentCert.linkedProductId || ''} onChange={e => setCurrentCert(prev => ({...prev, linkedProductId: e.target.value}))}>
                                        <option value="">-- Associar ao Curso --</option>
                                        <optgroup label="Presenciais">{STANDARD_COURSES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                                        <optgroup label="Digitais">{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                                    </select>
                                </div>
                                <div className="border-t border-slate-100 pt-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Imagem de Fundo ({editorSide === 'front' ? 'Frente' : 'Verso'})</label>
                                    <div className={clsx(
                                        "border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative cursor-pointer",
                                        (editorSide === 'front' ? currentCert.backgroundData : currentCert.backBackgroundData) ? "border-green-300 bg-green-50/20" : "border-slate-300"
                                    )}>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, editorSide)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center">
                                            {(editorSide === 'front' ? currentCert.backgroundData : currentCert.backBackgroundData) ? <CheckCircle2 className="text-green-500 mb-1" size={24}/> : <ImageIcon className="text-slate-300 mb-1" size={24} />}
                                            <span className="text-xs text-slate-500">{(editorSide === 'front' ? currentCert.backgroundData : currentCert.backBackgroundData) ? 'Alterar Imagem' : 'Selecionar Imagem'}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic text-center">Para melhor qualidade, use imagens horizontais de 297mm x 210mm (A4 Landscape).</p>
                                </div>
                            </div>
                            {editorSide === 'front' && (
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Campos do Certificado</label>
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 group hover:border-amber-300 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><User size={14}/> Nome do Aluno</span>
                                                <button onClick={() => setSelectedElement('name')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-amber-50">Estilo</button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 group hover:border-amber-300 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><AlignLeft size={14}/> Texto Principal</span>
                                                <button onClick={() => setSelectedElement('body')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-amber-50">Estilo</button>
                                            </div>
                                            <textarea className="w-full px-3 py-2 border border-slate-300 rounded text-sm h-24 resize-none bg-white outline-none" value={currentCert.bodyText} onChange={e => setCurrentCert(prev => ({...prev, bodyText: e.target.value}))} placeholder="Texto..."></textarea>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 group hover:border-amber-300 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><MapPin size={14}/> Local e Data</span>
                                                <button onClick={() => setSelectedElement('footer')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-amber-50">Estilo</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    <div ref={containerRef} className="bg-white shadow-2xl relative overflow-hidden transition-all duration-300 flex-shrink-0 origin-center" style={{ width: '297mm', height: '210mm', transform: 'scale(0.5)' }} onClick={() => setSelectedElement(null)}>
                        {editorSide === 'front' ? (
                            <>
                                {currentCert.backgroundData && <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />}
                                <InteractableText text={currentCert.bodyText || "..."} style={layout.body} isSelected={selectedElement === 'body'} onSelect={() => setSelectedElement('body')} onMouseDown={(e) => handleElementMouseDown(e, 'body')} scale={0.5} />
                                <InteractableText text="Nome do Aluno" style={layout.name} isSelected={selectedElement === 'name'} onSelect={() => setSelectedElement('name')} onMouseDown={(e) => handleElementMouseDown(e, 'name')} scale={0.5} />
                                <InteractableText text={`Cidade, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`} style={layout.footer} isSelected={selectedElement === 'footer'} onSelect={() => setSelectedElement('footer')} onMouseDown={(e) => handleElementMouseDown(e, 'footer')} scale={0.5} />
                            </>
                        ) : (
                            <>
                                {currentCert.backBackgroundData ? <img src={currentCert.backBackgroundData} alt="bg-back" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" /> : <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300"><span className="text-2xl font-bold uppercase tracking-widest">Verso em Branco</span></div>}
                                <div className="absolute bottom-12 right-16 text-slate-500 font-mono text-sm z-10 bg-white/80 px-3 py-1 rounded border border-slate-200">ID: PREVIEW-HASH</div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (view === 'generator') {
      const layout = currentCert.layoutConfig || DEFAULT_LAYOUT;
      return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100"><ArrowLeft size={20} /></button>
                    <h2 className="text-lg font-bold text-slate-800">Emitir: {currentCert.title}</h2>
                </div>
                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"><Printer size={18} /> Imprimir / PDF</button>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shadow-sm z-10 print:hidden shrink-0">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><User size={14}/> Nome do Aluno</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={genName} onChange={e => setGenName(e.target.value)} placeholder="Nome completo" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><MapPin size={14}/> Cidade</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={genCity} onChange={e => setGenCity(e.target.value)} placeholder="Cidade" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Calendar size={14}/> Data</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={genDate} onChange={e => setGenDate(e.target.value)} placeholder="DD/MM/AAAA" /></div>
                </div>
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex flex-col items-center gap-8 print:p-0 print:bg-white print:block print:overflow-visible">
                    <div className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:inset-0 page-break" style={{ width: '297mm', height: '210mm', pageBreakAfter: 'always' }}>
                        {currentCert.backgroundData && <img src={currentCert.backgroundData} alt="bg" className="absolute inset-0 w-full h-full object-cover z-0" style={{printColorAdjust: 'exact'}} />}
                        <div className="absolute z-10 whitespace-pre-wrap" style={{ left: `${layout.body.x}%`, top: `${layout.body.y}%`, transform: 'translate(-50%, -50%)', width: `${layout.body.width}%`, fontSize: `${layout.body.fontSize}px`, fontFamily: layout.body.fontFamily, color: layout.body.color, fontWeight: layout.body.fontWeight, textAlign: layout.body.textAlign as any }}>{currentCert.bodyText}</div>
                        <div className="absolute z-10 whitespace-pre-wrap" style={{ left: `${layout.name.x}%`, top: `${layout.name.y}%`, transform: 'translate(-50%, -50%)', width: `${layout.name.width}%`, fontSize: `${layout.name.fontSize}px`, fontFamily: layout.name.fontFamily, color: layout.name.color, fontWeight: layout.name.fontWeight, textAlign: layout.name.textAlign as any }}>{genName || 'Nome do Aluno'}</div>
                        <div className="absolute z-10 whitespace-pre-wrap" style={{ left: `${layout.footer.x}%`, top: `${layout.footer.y}%`, transform: 'translate(-50%, -50%)', width: `${layout.footer.width}%`, fontSize: `${layout.footer.fontSize}px`, fontFamily: layout.footer.fontFamily, color: layout.footer.color, fontWeight: layout.footer.fontWeight, textAlign: layout.footer.textAlign as any }}>{genCity || 'Cidade'}, {genDate || 'Data'}</div>
                    </div>
                    {currentCert.backBackgroundData && (
                        <div className="bg-white shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:h-full print:absolute print:m-0" style={{ width: '297mm', height: '210mm' }}>
                            <img src={currentCert.backBackgroundData} alt="bg-back" className="absolute inset-0 w-full h-full object-cover z-0" style={{printColorAdjust: 'exact'}} />
                            <div className="absolute bottom-12 right-16 text-slate-500 font-mono text-sm z-10 bg-white/80 px-3 py-1 rounded border border-slate-200">ID: PREVIEW-HASH</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return null;
};