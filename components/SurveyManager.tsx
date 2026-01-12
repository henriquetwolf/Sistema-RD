import React, { useState, useEffect, useMemo } from 'react';
import { SurveyModel, FormQuestion, QuestionType, FormStyle, FormAnswer, Product, FormFolder } from '../types';
import { FormViewer } from './FormViewer';
import { 
  Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, Target, Share2, 
  Monitor, Palette, X, Image as ImageIcon, Users, User, ArrowRightLeft, Tag, Loader2,
  Layers, Check, List, CheckSquare as CheckboxIcon, ChevronDown, ListPlus, Inbox, Download, Table, Link2, Layout, Sparkles,
  Filter, CheckCircle2, AlertTriangle, Briefcase, ShoppingBag, PieChart, Sparkle, Info, RefreshCw, Folder, FolderPlus, MoveRight, LayoutGrid
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

// XLSX is global from CDN
declare const XLSX: any;

interface SurveyManagerProps {
  onBack: () => void;
}

const INITIAL_SURVEY: SurveyModel = {
  id: '',
  title: 'Pesquisa de Satisfação',
  description: 'Gostaríamos de ouvir sua opinião sobre o nosso curso.',
  isLeadCapture: false,
  questions: [],
  createdAt: '',
  submissionsCount: 0,
  targetType: 'all',
  onlyIfFinished: true,
  isActive: true,
  folderId: null,
  style: {
      backgroundType: 'color',
      backgroundColor: '#f1f5f9',
      cardTransparent: false,
      primaryColor: '#0d9488',
      textColor: '#1e293b',
      fontFamily: 'sans',
      titleAlignment: 'left',
      borderRadius: 'medium',
      buttonText: 'Enviar Pesquisa',
      shadowIntensity: 'soft',
      successTitle: 'Obrigado!',
      successMessage: 'Sua opinião é fundamental para melhorarmos nossos cursos.',
      successButtonText: 'Fechar'
  }
};

const SYSTEM_MAPPINGS = [
    { value: '', label: 'Nenhum (Campo Manual)' },
    { value: 'student_name', label: 'Nome do Aluno (Auto)' },
    { value: 'product_name', label: 'Nome do Curso (Auto)' },
    { value: 'state', label: 'Estado (Auto)' },
    { value: 'city', label: 'Cidade (Auto)' },
    { value: 'class_mod1', label: 'Cód. Turma Módulo 1 (Auto)' },
    { value: 'class_mod2', label: 'Cód. Turma Módulo 2 (Auto)' },
    { value: 'instructor_mod1', label: 'Instrutor Módulo 1 (Auto)' },
    { value: 'instructor_mod2', label: 'Instrutor Módulo 2 (Auto)' },
    { value: 'studio', label: 'Studio Parceiro (Auto)' },
];

const QUESTION_TYPES: { id: QuestionType; label: string; icon: any }[] = [
    { id: 'text', label: 'Pergunta Curta', icon: Type },
    { id: 'paragraph', label: 'Feedback Longo', icon: AlignLeft },
    { id: 'select', label: 'Múltipla Escolha', icon: List },
    { id: 'checkbox', label: 'Caixas de Seleção', icon: CheckboxIcon },
    { id: 'number', label: 'Nota / Número', icon: Hash },
];

export const SurveyManager: React.FC<SurveyManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'preview' | 'responses'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'targeting'>('editor');
  const [surveys, setSurveys] = useState<SurveyModel[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSurvey, setCurrentSurvey] = useState<SurveyModel>(INITIAL_SURVEY);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Folder UI States
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState<SurveyModel | null>(null);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => { loadSurveys(); loadProducts(); loadFolders(); }, []);

  const loadSurveys = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getSurveys(); setSurveys(data || []); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadFolders = async () => {
      try {
          const data = await appBackend.getFormFolders();
          setFolders(data || []);
      } catch (e) {}
  };

  const loadProducts = async () => {
      try { 
          const { data } = await appBackend.client.from('crm_products').select('*').order('name');
          if (data) setProducts(data);
      } catch (e) {}
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder: FormFolder = {
        id: crypto.randomUUID(),
        name: newFolderName,
        createdAt: new Date().toISOString()
    };
    await appBackend.saveFormFolder(newFolder);
    await loadFolders();
    setShowFolderModal(false);
    setNewFolderName('');
  };

  const handleDeleteFolder = async (id: string) => {
    if (window.confirm('Excluir esta pasta? As pesquisas não serão apagadas, apenas voltarão para a raiz.')) {
        await appBackend.deleteFormFolder(id);
        if (currentFolderId === id) setCurrentFolderId(null);
        loadFolders();
    }
  };

  const handleMoveSurvey = async (survey: SurveyModel, folderId: string | null) => {
    const updated = { ...survey, folderId: folderId || null };
    await appBackend.saveSurvey(updated);
    await loadSurveys();
    setShowMoveModal(null);
  };

  const filteredSurveys = useMemo(() => {
    if (currentFolderId === null) return surveys;
    return surveys.filter(s => s.folderId === currentFolderId);
  }, [surveys, currentFolderId]);

  const handleEdit = (survey: SurveyModel) => { 
      setCurrentSurvey({ ...INITIAL_SURVEY, ...survey }); 
      setView('editor'); 
      setEditorStep('editor'); 
  };

  const handleViewResponses = async (survey: SurveyModel) => {
      setCurrentSurvey(survey);
      setView('responses');
      setLoadingSubmissions(true);
      try {
          const data = await appBackend.getFormSubmissions(survey.id);
          setSubmissions(data || []);
      } catch (e) {
          alert("Erro ao carregar respostas.");
      } finally {
          setLoadingSubmissions(false);
      }
  };

  const handleDelete = async (id: string) => { 
      const target = surveys.find(s => s.id === id); 
      if(window.confirm(`Excluir a pesquisa "${target?.title}"?`)) { 
          try {
              await appBackend.deleteForm(id); 
              await appBackend.logActivity({ action: 'delete', module: 'surveys', details: `Excluiu pesquisa: ${target?.title}`, recordId: id }); 
              loadSurveys(); 
          } catch (e: any) {
              alert("Erro ao excluir pesquisa.");
          }
      } 
  };

  const handleSaveSurvey = async () => { 
      if (!currentSurvey.title.trim()) { alert("O título é obrigatório."); return; }
      setIsSaving(true);
      try {
          await appBackend.saveSurvey(currentSurvey); 
          await loadSurveys(); 
          setView('list'); 
      } catch (e: any) { 
          console.error("Erro ao salvar pesquisa:", e);
          alert("Erro ao salvar pesquisa: " + (e.message || "Verifique os logs do console.")); 
      } finally { setIsSaving(false); }
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentSurvey(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q) }));
  };

  const addQuestion = (type: QuestionType) => { 
      const titles: Record<string, string> = { text: 'Pergunta Curta', paragraph: 'Feedback Longo', number: 'Nota (0-10)', select: 'Escolha uma opção', checkbox: 'Múltipla Escolha' }; 
      const newQ: FormQuestion = { 
          id: crypto.randomUUID(), title: titles[type] || 'Nova Pergunta', type: type, required: true, placeholder: 'Sua resposta...',
          options: (type === 'select' || type === 'checkbox') ? ['Excelente', 'Bom', 'Regular', 'Ruim'] : undefined
      }; 
      setCurrentSurvey(prev => ({ ...prev, questions: [...prev.questions, newQ] })); 
  };

  const removeQuestion = (id: string) => {
      setCurrentSurvey(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const addOption = (qId: string) => {
      setCurrentSurvey(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: [...(q.options || []), `Nova Opção`] } : q)
      }));
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
      setCurrentSurvey(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: q.options?.map((o, idx) => idx === optIdx ? value : o) } : q)
      }));
  };

  const removeOption = (qId: string, optIdx: number) => {
      setCurrentSurvey(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: q.options?.filter((_, idx) => idx !== optIdx) } : q)
      }));
  };

  const updateStyle = (field: keyof FormStyle, value: any) => {
      setCurrentSurvey(prev => ({ ...prev, style: { ...(prev.style || INITIAL_SURVEY.style!), [field]: value } }));
  };

  const copyToClipboard = (id: string) => {
      const link = `${window.location.origin}${window.location.pathname}?publicFormId=${id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
  };

  const exportToExcel = () => {
      if (!currentSurvey || submissions.length === 0) return;
      const dataRows = submissions.map(sub => {
          const row: any = { "Data Envio": new Date(sub.created_at).toLocaleString('pt-BR') };
          currentSurvey.questions.forEach(q => {
              const answer = (sub.answers as FormAnswer[]).find(a => a.questionId === q.id);
              row[q.title] = answer?.value || "";
          });
          return row;
      });
      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Respostas");
      XLSX.writeFile(workbook, `pesquisa_${currentSurvey.title.replace(/\s/g, '_').toLowerCase()}.xlsx`);
  };

  if (view === 'preview') return <FormViewer form={currentSurvey} onBack={() => setView('editor')} />;

  if (view === 'responses') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                  <div><h2 className="text-lg font-bold text-slate-800">{currentSurvey.title}</h2><p className="text-xs text-slate-400">Visualizando {submissions.length} respostas</p></div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => handleViewResponses(currentSurvey)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors" title="Atualizar"><RefreshCw size={18} className={clsx(loadingSubmissions && "animate-spin")} /></button>
                  <button onClick={exportToExcel} disabled={submissions.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"><Download size={18} /> Exportar Excel</button>
              </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50">
              {loadingSubmissions ? (
                  <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div>
              ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12"><Inbox size={64} className="opacity-10 mb-4" /><p className="font-bold">Ainda não há respostas</p></div>
              ) : (
                  <div className="w-full min-w-max">
                      <table className="w-full text-left text-sm border-collapse bg-white">
                          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3 border-b border-r w-12 text-center">#</th>
                                  <th className="px-6 py-3 border-b border-r min-w-[180px]">Data Envio</th>
                                  {currentSurvey.questions.map(q => <th key={q.id} className="px-6 py-3 border-b border-r min-w-[200px]">{q.title}</th>)}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {submissions.map((sub, idx) => (
                                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 text-center text-slate-400 border-r">{submissions.length - idx}</td>
                                      <td className="px-6 py-4 text-slate-500 border-r">{new Date(sub.created_at).toLocaleString('pt-BR')}</td>
                                      {currentSurvey.questions.map(q => {
                                          const ans = (sub.answers as FormAnswer[] || []).find(a => a.questionId === q.id);
                                          return (
                                              <td key={q.id} className="px-6 py-4 border-r max-w-xs truncate" title={ans?.value || ''}>
                                                  {ans?.value || <span className="text-slate-200 italic">--</span>}
                                              </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </div>
  );

  if (view === 'editor') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1"><ArrowLeft size={16} /> Sair</button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Perguntas</button>
                      <button onClick={() => setEditorStep('design')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'design' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Design</button>
                      <button onClick={() => setEditorStep('targeting')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'targeting' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Público & Alvo</button>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('preview')} className="text-slate-600 hover:text-teal-600 font-bold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"><Eye size={18} /> Prévia</button>
                  <button onClick={handleSaveSurvey} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Pesquisa
                  </button>
              </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
              {editorStep === 'editor' ? (
                  <>
                    <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 shrink-0 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Campos de Pesquisa</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {QUESTION_TYPES.map(qt => (
                                <button key={qt.id} onClick={() => addQuestion(qt.id)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left group">
                                    <qt.icon size={18} className="text-teal-500" /> {qt.label}
                                </button>
                            ))}
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl border-t-[10px] border-amber-500 p-8 shadow-sm">
                                <input type="text" className="w-full text-3xl font-bold text-slate-800 border-b-2 border-transparent focus:border-amber-100 focus:ring-0 placeholder:text-slate-200 p-0 mb-4 transition-all" value={currentSurvey.title} onChange={e => setCurrentSurvey({...currentSurvey, title: e.target.value})} placeholder="Título da Pesquisa" />
                                <textarea className="w-full text-slate-500 border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none h-12" value={currentSurvey.description} onChange={e => setCurrentSurvey({...currentSurvey, description: e.target.value})} placeholder="Instruções para o aluno..." />
                            </div>
                            <div className="space-y-4 pb-20">
                                {currentSurvey.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm group hover:border-amber-300 transition-all relative">
                                        <div className="flex flex-col gap-6">
                                            <div className="flex items-center justify-between"><span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest">Pergunta {idx + 1}</span><button onClick={() => removeQuestion(q.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></div>
                                            <input type="text" className="w-full text-lg font-bold text-slate-800 bg-slate-50 border border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-amber-500 transition-all outline-none" value={q.title} onChange={e => updateQuestion(q.id, 'title', e.target.value)} />
                                            
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex items-center gap-2 text-blue-700 shrink-0">
                                                    <Sparkle size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Campo Inteligente:</span>
                                                </div>
                                                <select 
                                                    className="flex-1 bg-white border border-blue-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={q.systemMapping || ''}
                                                    onChange={e => updateQuestion(q.id, 'systemMapping', e.target.value)}
                                                >
                                                    {SYSTEM_MAPPINGS.map(sm => <option key={sm.value} value={sm.value}>{sm.label}</option>)}
                                                </select>
                                                <span title="O sistema preencherá este campo automaticamente para o aluno." className="hidden md:block">
                                                    <Info size={14} className="text-blue-300" />
                                                </span>
                                            </div>

                                            {(q.type === 'select' || q.type === 'checkbox') && (
                                                <div className="space-y-3 pl-2 border-l-2 border-slate-100 ml-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Escolhas Disponíveis</label>
                                                    {q.options?.map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2 group/opt animate-in fade-in">
                                                            <input type="text" className="flex-1 bg-transparent border-b border-slate-100 py-1 text-sm font-medium focus:border-amber-400 outline-none" value={opt} onChange={e => updateOption(q.id, optIdx, e.target.value)} />
                                                            <button onClick={() => removeOption(q.id, optIdx)} className="p-1 opacity-0 group-hover/opt:opacity-100 text-slate-300 hover:text-red-500"><X size={14}/></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addOption(q.id)} className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1 hover:underline mt-2"><Plus size={12}/> Adicionar Escolha</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                  </>
              ) : editorStep === 'design' ? (
                  <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                      <div className="max-w-xl mx-auto space-y-8">
                          <h3 className="text-xl font-bold flex items-center gap-2"><Palette className="text-teal-600"/> Personalização do Aluno</h3>
                          <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border">
                              <div><label className="block text-sm font-bold mb-1">Cor Principal</label><input type="color" className="w-full h-10 border-none bg-transparent" value={currentSurvey.style?.primaryColor} onChange={e => updateStyle('primaryColor', e.target.value)} /></div>
                              <div><label className="block text-sm font-bold mb-1">Texto do Botão</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={currentSurvey.style?.buttonText} onChange={e => updateStyle('buttonText', e.target.value)} /></div>
                          </div>
                      </div>
                  </main>
              ) : (
                  <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                      <div className="max-w-2xl mx-auto space-y-10">
                          <section>
                              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Target size={20} className="text-indigo-600"/> Direcionamento Automático</h3>
                              <div className="space-y-6">
                                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-6">
                                      <div>
                                          <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Público Alvo</label>
                                          <select 
                                              className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                                              value={currentSurvey.targetType} 
                                              onChange={e => setCurrentSurvey({
                                                  ...currentSurvey, 
                                                  targetType: e.target.value as any,
                                                  targetProductType: '',
                                                  targetProductName: ''
                                              })}
                                          >
                                              <option value="all">Qualquer Aluno</option>
                                              <option value="product_type">Por Categoria (Tipo de Produto)</option>
                                              <option value="specific_product">Produto Específico (Curso)</option>
                                          </select>
                                      </div>

                                      {currentSurvey.targetType === 'product_type' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Escolha a Categoria</label>
                                              <select 
                                                  className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  value={currentSurvey.targetProductType || ''}
                                                  onChange={e => setCurrentSurvey({...currentSurvey, targetProductType: e.target.value})}
                                              >
                                                  <option value="">Selecione o Tipo...</option>
                                                  <option value="Digital">Digital</option>
                                                  <option value="Presencial">Presencial</option>
                                                  <option value="Evento">Evento</option>
                                              </select>
                                          </div>
                                      )}

                                      {currentSurvey.targetType === 'specific_product' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Escolha o Produto / Curso</label>
                                              <select 
                                                  className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  value={currentSurvey.targetProductName || ''}
                                                  onChange={e => setCurrentSurvey({...currentSurvey, targetProductName: e.target.value})}
                                              >
                                                  <option value="">Selecione o Produto...</option>
                                                  {products.map(p => (
                                                      <option key={p.id} value={p.name}>{p.name}</option>
                                                  ))}
                                              </select>
                                          </div>
                                      )}

                                      <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                          <input type="checkbox" className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" checked={currentSurvey.onlyIfFinished} onChange={e => setCurrentSurvey({...currentSurvey, onlyIfFinished: e.target.checked})} />
                                          <div className="flex-1">
                                              <span className="font-bold text-indigo-900 block">Exibir apenas após encerrar o curso?</span>
                                              <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold">Verifica Mod 2 (Presencial) ou Conclusão (Digital)</p>
                                          </div>
                                      </label>
                                  </div>

                                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Folder size={14}/> Organização</h4>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">Mover para Pasta</label>
                                          <select 
                                              className="w-full px-4 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                              value={currentSurvey.folderId || ''}
                                              onChange={e => setCurrentSurvey({...currentSurvey, folderId: e.target.value || null})}
                                          >
                                              <option value="">Sem pasta (Raiz)</option>
                                              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </div>
                  </main>
              )}
          </div>
      </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col md:flex-row gap-6 pb-20">
      
      {/* SIDEBAR: Pastas */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
        <div>
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4">
                <ArrowLeft size={16} /> Voltar ao Painel
            </button>
            <button 
                onClick={() => { setCurrentSurvey(INITIAL_SURVEY); setView('editor'); setEditorStep('editor'); }} 
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 mb-4 active:scale-95"
            >
                <Plus size={18} /> Nova Pesquisa
            </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Navegação</p>
            
            <button 
                onClick={() => setCurrentFolderId(null)}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                    currentFolderId === null ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <span className="flex items-center gap-2"><LayoutGrid size={16} /> Todas as Pesquisas</span>
                <span className="text-xs opacity-60 bg-white px-1.5 rounded-full border border-slate-100">{surveys.length}</span>
            </button>

            <div className="mt-4 flex items-center justify-between px-3 mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pastas</p>
                <button onClick={() => setShowFolderModal(true)} className="text-slate-400 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 transition-colors" title="Nova Pasta">
                    <FolderPlus size={16} />
                </button>
            </div>

            <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {folders.map(f => {
                    const count = surveys.filter(s => s.folderId === f.id).length;
                    return (
                        <div key={f.id} className="group relative">
                            <button 
                                onClick={() => setCurrentFolderId(f.id)}
                                className={clsx(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    currentFolderId === f.id ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Folder size={16} className={currentFolderId === f.id ? "fill-amber-200 text-amber-600" : "text-slate-400 group-hover:text-amber-600"} />
                                <span className="truncate flex-1 text-left">{f.name}</span>
                                <span className="text-[10px] opacity-40">{count}</span>
                            </button>
                            <button 
                                onClick={() => handleDeleteFolder(f.id)}
                                className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir Pasta"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
                {folders.length === 0 && (
                    <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-100 mx-1">
                        <Folder className="mx-auto text-slate-300 mb-2" size={24} />
                        <p className="text-[10px] text-slate-400 italic">Sem pastas personalizadas.</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {currentFolderId ? (
                      <>
                        <Folder className="text-amber-500" /> {folders.find(f => f.id === currentFolderId)?.name}
                      </>
                  ) : (
                      <>
                        <PieChart className="text-amber-500" /> Todas as Pesquisas
                      </>
                  )}
              </h2>
              <div className="flex gap-2">
                  <button onClick={loadSurveys} className="p-2 text-slate-400 hover:text-amber-600 transition-all" title="Atualizar"><RefreshCw size={20} className={clsx(loading && "animate-spin")} /></button>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                      {filteredSurveys.length} pesquisas
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="animate-spin text-amber-500" size={40}/>
                    <p className="font-bold text-sm uppercase tracking-widest">Carregando pesquisas...</p>
                </div>
            ) : filteredSurveys.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">
                    <PieChart className="mx-auto mb-4 opacity-10" size={64} />
                    <p className="font-bold text-lg">Nenhuma pesquisa encontrada</p>
                    <p className="text-sm">Clique em "+ Nova Pesquisa" para começar a ouvir seus alunos.</p>
                </div>
            ) : (
                filteredSurveys.map(f => (
                    <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all flex flex-col group overflow-hidden">
                      <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                              <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border", f.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                  {f.isActive ? 'ATIVA' : 'PAUSADA'}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setShowMoveModal(f)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg" title="Mover p/ Pasta"><MoveRight size={16}/></button>
                                  <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                          </div>
                          <h3 className="font-black text-slate-800 text-lg mb-1 line-clamp-1">{f.title}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 flex items-center gap-1">
                              <Target size={10}/> {f.targetType === 'all' ? 'Todos Alunos' : f.targetType === 'product_type' ? `Categoria: ${f.targetProductType}` : `Produto: ${f.targetProductName}`}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => handleViewResponses(f)} className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors">
                                  <Table size={20} className="mb-1 text-amber-500" />
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                                  <p className="text-xl font-black text-slate-800">{f.submissionsCount || 0}</p>
                              </button>
                              <button onClick={() => copyToClipboard(f.id)} className={clsx("rounded-xl flex flex-col items-center justify-center transition-all shadow-sm border", copiedLink ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-slate-500 border-slate-200 hover:bg-teal-50")}>
                                  {copiedLink ? <CheckCircle2 size={20}/> : <Share2 size={20} />}
                                  <span className="text-[10px] font-black uppercase mt-1">{copiedLink ? 'Copiado' : 'Link Externo'}</span>
                              </button>
                          </div>
                      </div>
                    </div>
                ))
            )}
          </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create Folder Modal */}
      {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Nova Pasta de Pesquisas</h3>
                      <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Pasta</label>
                      <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="Ex: Pós-Curso 2025"
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          autoFocus
                      />
                  </div>
                  <div className="px-5 py-3 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm font-bold hover:bg-amber-700 shadow-sm">Criar Pasta</button>
                  </div>
              </div>
          </div>
      )}

      {/* Move Survey Modal */}
      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Mover Pesquisa</h3>
                      <button onClick={() => setShowMoveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <p className="text-sm text-slate-500 mb-4">Selecione a pasta de destino para: <br/><strong className="text-slate-800">{showMoveModal.title}</strong></p>
                      <div className="space-y-1">
                          <button 
                              onClick={() => handleMoveSurvey(showMoveModal, null)}
                              className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors", !showMoveModal.folderId ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <span className="flex items-center gap-2"><LayoutGrid size={16} /> Sem Pasta (Raiz)</span>
                              {!showMoveModal.folderId && <Check size={14}/>}
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={() => handleMoveSurvey(showMoveModal, f.id)}
                                  className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors", showMoveModal.folderId === f.id ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                              >
                                  <span className="flex items-center gap-2"><Folder size={16} /> {f.name}</span>
                                  {showMoveModal.folderId === f.id && <Check size={14}/>}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
