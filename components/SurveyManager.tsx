import React, { useState, useEffect, useMemo } from 'react';
import { SurveyModel, FormQuestion, QuestionType, FormStyle, FormAnswer, Product, FormFolder } from '../types';
import { FormViewer } from './FormViewer';
import { 
  Plus, Trash2, Eye, Edit2, ArrowLeft, Save, Copy, Target, Share2, 
  Loader2, Check, List, CheckSquare as CheckboxIcon, Inbox, Download, Table, 
  Layout, Folder, FolderPlus, MoveRight, LayoutGrid, X, PieChart, Type,
  AlignLeft, Hash, Palette, RefreshCw, Sparkles, Info, Lock, Zap, Minus,
  GraduationCap, School, Building2, Users
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

declare const XLSX: any;

interface SurveyManagerProps {
  onBack: () => void;
}

const INITIAL_SURVEY: SurveyModel = {
  id: '',
  title: 'Pesquisa de Satisfação',
  description: 'Gostaríamos de ouvir sua opinião.',
  campaign: '',
  isLeadCapture: false,
  questions: [],
  createdAt: '',
  submissionsCount: 0,
  targetAudience: 'student',
  targetType: 'all',
  onlyIfFinished: true,
  isActive: true,
  folderId: null,
  distributionMode: 'fixed',
  style: {
      backgroundType: 'color', backgroundColor: '#fff7ed', cardTransparent: false, primaryColor: '#f59e0b', textColor: '#451a03', fontFamily: 'sans', titleAlignment: 'left', borderRadius: 'medium', buttonText: 'Enviar Pesquisa', shadowIntensity: 'soft', successTitle: 'Obrigado!', successMessage: 'Sua opinião é fundamental.', successButtonText: 'Fechar'
  }
};

const SYSTEM_FIELDS = [
    { value: '', label: 'Campo Manual (Aluno preenche)' },
    { value: 'student_name', label: 'Nome do Aluno (Automático)' },
    { value: 'student_email', label: 'E-mail do Aluno (Automático)' },
    { value: 'course_name', label: 'Nome do Curso (Automático)' },
    { value: 'class_code', label: 'Cód. Turma (Automático)' },
    { value: 'city', label: 'Cidade do Curso (Automático)' },
    { value: 'state', label: 'UF do Curso (Automático)' },
    { value: 'instructor_name', label: 'Nome do Instrutor (Automático)' },
    { value: 'studio_name', label: 'Local / Studio (Automático)' },
    { value: 'material', label: 'Material Didático (Automático)' },
    { value: 'infrastructure', label: 'Infraestrutura (Automático)' },
    { value: 'coffee', label: 'Coffee Break (Automático)' },
];

const QUESTION_TYPES: { id: QuestionType; label: string; icon: any }[] = [
    { id: 'text', label: 'Pergunta Curta', icon: Type },
    { id: 'paragraph', label: 'Feedback Longo', icon: AlignLeft },
    { id: 'select', label: 'Múltipla Escolha', icon: List },
    { id: 'checkbox', label: 'Caixas de Seleção', icon: CheckboxIcon },
    { id: 'number', label: 'Nota / Número', icon: Hash },
];

export const SurveyManager: React.FC<SurveyManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'responses' | 'preview'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'targeting'>('editor');
  const [surveys, setSurveys] = useState<SurveyModel[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentSurvey, setCurrentSurvey] = useState<SurveyModel>(INITIAL_SURVEY);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<SurveyModel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => { loadSurveys(); loadFolders(); loadMetadata(); }, []);

  const loadSurveys = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getSurveys(); setSurveys(data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadFolders = async () => {
    try { const data = await appBackend.getFormFolders('survey'); setFolders(data); } catch (e) {}
  };

  const loadMetadata = async () => {
      try {
          const { data } = await appBackend.client.from('crm_products').select('id, name, category').eq('status', 'active');
          if (data) setProducts(data);
      } catch (e) {}
  };

  const handleSaveSurvey = async () => { 
      if (!currentSurvey.title.trim()) { alert("O título é obrigatório."); return; }
      setIsSaving(true);
      try {
          await appBackend.saveSurvey(currentSurvey); 
          await loadSurveys(); 
          setView('list'); 
      } catch (e: any) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => { 
      const target = surveys.find(s => s.id === id); 
      if(window.confirm(`Excluir a pesquisa "${target?.title}"?`)) { 
          try {
              await appBackend.deleteForm(id); 
              setSurveys(prev => prev.filter(s => s.id !== id));
          } catch (e: any) { alert("Erro ao excluir."); }
      } 
  };

  const addQuestion = (type: QuestionType) => {
      const newQ: FormQuestion = { 
        id: crypto.randomUUID(), 
        title: 'Nova Pergunta', 
        type, 
        required: true, 
        options: (type === 'select' || type === 'checkbox') ? ['Opção 1'] : undefined 
      };
      setCurrentSurvey(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const updateQuestionOption = (qId: string, optIdx: number, newValue: string) => {
    setCurrentSurvey(prev => ({
        ...prev,
        questions: prev.questions.map(q => {
            if (q.id === qId && q.options) {
                const newOpts = [...q.options];
                newOpts[optIdx] = newValue;
                return { ...q, options: newOpts };
            }
            return q;
        })
    }));
  };

  const addOptionToQuestion = (qId: string) => {
    setCurrentSurvey(prev => ({
        ...prev,
        questions: prev.questions.map(q => {
            if (q.id === qId) {
                return { ...q, options: [...(q.options || []), `Opção ${(q.options?.length || 0) + 1}`] };
            }
            return q;
        })
    }));
  };

  const removeOptionFromQuestion = (qId: string, optIdx: number) => {
    setCurrentSurvey(prev => ({
        ...prev,
        questions: prev.questions.map(q => {
            if (q.id === qId && q.options) {
                return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
            }
            return q;
        })
    }));
  };

  const filteredSurveys = useMemo(() => {
    if (currentFolderId === null) return surveys;
    return surveys.filter(s => s.folderId === currentFolderId);
  }, [surveys, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder: FormFolder = { id: crypto.randomUUID(), name: newFolderName, createdAt: new Date().toISOString() };
    await appBackend.saveFormFolder(newFolder, 'survey');
    await loadFolders();
    setShowFolderModal(false);
    setNewFolderName('');
  };

  if (view === 'preview') return <FormViewer form={currentSurvey} onBack={() => setView('editor')} />;

  if (view === 'editor') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-amber-50 rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1"><ArrowLeft size={16} /> Sair</button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'editor' ? "bg-white shadow text-amber-700" : "text-slate-500")}>Perguntas</button>
                      <button onClick={() => setEditorStep('design')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'design' ? "bg-white shadow text-amber-700" : "text-slate-500")}>Design</button>
                      <button onClick={() => setEditorStep('targeting')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'targeting' ? "bg-white shadow text-amber-700" : "text-slate-500")}>Público & Alvo</button>
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setView('preview')} className="text-slate-600 hover:text-amber-600 font-bold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"><Eye size={18} /> Prévia</button>
                  <button onClick={handleSaveSurvey} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-all">
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
                                <button key={qt.id} onClick={() => addQuestion(qt.id)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 text-sm font-medium text-slate-700 transition-all text-left">
                                    <qt.icon size={18} className="text-amber-500" /> {qt.label}
                                </button>
                            ))}
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl border-t-[10px] border-amber-500 p-8 shadow-sm">
                                <input type="text" className="w-full text-3xl font-bold text-slate-800 border-b-2 border-transparent focus:border-amber-100 focus:ring-0 p-0 mb-4 outline-none" value={currentSurvey.title} onChange={e => setCurrentSurvey({...currentSurvey, title: e.target.value})} placeholder="Título da Pesquisa" />
                                <textarea className="w-full text-slate-500 border-none focus:ring-0 p-0 resize-none h-12 outline-none" value={currentSurvey.description} onChange={e => setCurrentSurvey({...currentSurvey, description: e.target.value})} placeholder="Instruções para o aluno..." />
                            </div>
                            <div className="space-y-4 pb-20">
                                {currentSurvey.questions.map((q, idx) => {
                                    const typeInfo = QUESTION_TYPES.find(t => t.id === q.type);
                                    const Icon = typeInfo?.icon || Type;
                                    
                                    return (
                                        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm group hover:border-amber-300 transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Pergunta {idx + 1}</span>
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                                                        <Icon size={12}/> {typeInfo?.label}
                                                    </div>
                                                </div>
                                                <button onClick={() => setCurrentSurvey({...currentSurvey, questions: currentSurvey.questions.filter(x => x.id !== q.id)})} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assunto / Pergunta</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all" 
                                                        value={q.title} 
                                                        onChange={e => setCurrentSurvey({...currentSurvey, questions: currentSurvey.questions.map(x => x.id === q.id ? {...x, title: e.target.value} : x)})} 
                                                    />
                                                </div>

                                                {(q.type === 'select' || q.type === 'checkbox') && (
                                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Opções de Resposta</label>
                                                            <button 
                                                                type="button"
                                                                onClick={() => addOptionToQuestion(q.id)}
                                                                className="text-[10px] font-black text-amber-600 uppercase hover:underline flex items-center gap-1"
                                                            >
                                                                <Plus size={12}/> Adicionar Opção
                                                            </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(q.options || []).map((opt, optIdx) => (
                                                                <div key={optIdx} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                                        {optIdx + 1}
                                                                    </div>
                                                                    <input 
                                                                        type="text" 
                                                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-100 outline-none"
                                                                        value={opt}
                                                                        onChange={e => updateQuestionOption(q.id, optIdx, e.target.value)}
                                                                    />
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => removeOptionFromQuestion(q.id, optIdx)}
                                                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Minus size={14}/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                                    <label className="block text-[10px] font-black text-amber-700 uppercase mb-2 flex items-center gap-1.5"><Lock size={12}/> Vincular Informação Automática</label>
                                                    <select 
                                                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-amber-200"
                                                        value={q.systemMapping || ''}
                                                        onChange={e => {
                                                            const mapping = e.target.value;
                                                            const field = SYSTEM_FIELDS.find(f => f.value === mapping);
                                                            setCurrentSurvey({
                                                                ...currentSurvey, 
                                                                questions: currentSurvey.questions.map(x => x.id === q.id ? {
                                                                    ...x, 
                                                                    systemMapping: mapping,
                                                                    title: mapping ? field?.label || x.title : x.title,
                                                                    required: !!mapping 
                                                                } : x)
                                                            });
                                                        }}
                                                    >
                                                        {SYSTEM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {currentSurvey.questions.length === 0 && (
                                    <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                                        <Sparkles size={48} className="mx-auto mb-4 opacity-10"/>
                                        <p className="font-bold">Comece a construir sua pesquisa</p>
                                        <p className="text-sm">Selecione um tipo de campo à esquerda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                  </>
              ) : editorStep === 'design' ? (
                  <main className="flex-1 overflow-y-auto p-12 bg-white">
                      <div className="max-w-xl mx-auto space-y-8">
                          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><Palette className="text-amber-600" /> Estilo Visual</h3>
                          <div className="grid grid-cols-1 gap-6">
                              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cor Principal</label><input type="color" className="w-full h-12 border rounded-lg cursor-pointer" value={currentSurvey.style?.primaryColor} onChange={e => setCurrentSurvey({...currentSurvey, style: {...currentSurvey.style!, primaryColor: e.target.value}})} /></div>
                              <div><label className="block text-sm font-bold text-slate-700 mb-2">Texto do Botão</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={currentSurvey.style?.buttonText} onChange={e => setCurrentSurvey({...currentSurvey, style: {...currentSurvey.style!, buttonText: e.target.value}})} /></div>
                          </div>
                      </div>
                  </main>
              ) : (
                  <main className="flex-1 overflow-y-auto p-12 bg-white">
                      <div className="max-w-2xl mx-auto space-y-12">
                          {/* ÁREA DE DESTINO */}
                          <section>
                              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Layout className="text-indigo-600" /> Portal de Destino (Área)</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {[
                                      { id: 'all', label: 'Todos', icon: Users },
                                      { id: 'student', label: 'Alunos', icon: GraduationCap },
                                      { id: 'instructor', label: 'Instrutores', icon: School },
                                      { id: 'studio', label: 'Studios', icon: Building2 }
                                  ].map(item => (
                                      <button 
                                          key={item.id}
                                          onClick={() => setCurrentSurvey({...currentSurvey, targetAudience: item.id as any})}
                                          className={clsx(
                                              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                              currentSurvey.targetAudience === item.id ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md" : "bg-white border-slate-100 hover:bg-slate-50"
                                          )}
                                      >
                                          <item.icon size={24} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </section>

                          {/* DIRECIONAMENTO POR PRODUTO */}
                          <section>
                              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Target className="text-indigo-600" /> Direcionamento por Produto</h3>
                              <div className="space-y-6">
                                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 space-y-6">
                                      <div>
                                          <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 ml-1">Vincular a:</label>
                                          <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold" value={currentSurvey.targetType} onChange={e => setCurrentSurvey({...currentSurvey, targetType: e.target.value as any})}>
                                              <option value="all">Exibir para qualquer usuário da Área</option>
                                              <option value="product_type">Filtrar por Tipo de Produto</option>
                                              <option value="specific_product">Filtrar por Curso Específico</option>
                                          </select>
                                      </div>

                                      {currentSurvey.targetType === 'product_type' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 ml-1">Tipo de Produto</label>
                                              <select className="w-full px-4 py-2.5 border rounded-xl bg-white" value={currentSurvey.targetProductType} onChange={e => setCurrentSurvey({...currentSurvey, targetProductType: e.target.value})}>
                                                  <option value="">Selecione...</option>
                                                  <option value="Presencial">Presencial</option>
                                                  <option value="Digital">Digital</option>
                                                  <option value="Evento">Evento</option>
                                              </select>
                                          </div>
                                      )}

                                      {currentSurvey.targetType === 'specific_product' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 ml-1">Selecione o Produto/Curso</label>
                                              <select className="w-full px-4 py-2.5 border rounded-xl bg-white" value={currentSurvey.targetProductName} onChange={e => setCurrentSurvey({...currentSurvey, targetProductName: e.target.value})}>
                                                  <option value="">Escolha um curso da lista comercial...</option>
                                                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                              </select>
                                          </div>
                                      )}

                                      {/* GATILHO DE CONCLUSÃO */}
                                      {(currentSurvey.targetType === 'specific_product' || (currentSurvey.targetType === 'product_type' && currentSurvey.targetProductType === 'Presencial')) && (
                                          <div className="p-4 bg-white/60 border border-indigo-100 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2">
                                              <label className="flex items-center gap-3 cursor-pointer">
                                                  <input type="checkbox" checked={currentSurvey.onlyIfFinished} onChange={e => setCurrentSurvey({...currentSurvey, onlyIfFinished: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
                                                  <div className="flex-1">
                                                      <span className="font-bold text-indigo-900 block text-sm">Gatilho de Conclusão</span>
                                                      <p className="text-[10px] text-indigo-500 font-medium leading-tight">Exibir automaticamente ao encerrar o curso presencial (após o último dia do último módulo).</p>
                                                  </div>
                                              </label>
                                          </div>
                                      )}
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
    <div className="animate-in fade-in h-full flex flex-col md:flex-row gap-6 pb-20">
      <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-4"><ArrowLeft size={16} /> Voltar</button>
        <button onClick={() => { setCurrentSurvey(INITIAL_SURVEY); setView('editor'); setEditorStep('editor'); }} className="w-full bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mb-4 active:scale-95"><Plus size={18} /> Nova Pesquisa</button>
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <button onClick={() => setCurrentFolderId(null)} className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors", currentFolderId === null ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}><LayoutGrid size={16} /> Todas</button>
            <div className="mt-4 flex items-center justify-between px-3 mb-2"><p className="text-xs font-bold text-slate-400 uppercase">Pastas</p><button onClick={() => setShowFolderModal(true)}><FolderPlus size={16}/></button></div>
            {folders.map(f => <button key={f.id} onClick={() => setCurrentFolderId(f.id)} className={clsx("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm", currentFolderId === f.id ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}><Folder size={16}/> {f.name}</button>)}
        </div>
      </aside>
      <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSurveys.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700 uppercase">Pesquisa Interna</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowMoveModal(s)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><MoveRight size={16}/></button>
                            <button onClick={() => { setCurrentSurvey(s); setView('editor'); setEditorStep('editor'); }} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{s.title}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors">
                            <PieChart size={20} className="mb-1 text-amber-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                            <p className="text-xl font-black text-slate-800">{s.submissionsCount || 0}</p>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?publicFormId=${s.id}`); alert("Link copiado!"); }} className="bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl flex flex-col items-center justify-center">
                            <Share2 size={20} />
                            <span className="text-[10px] font-black uppercase mt-1">Link Externo</span>
                        </button>
                    </div>
                </div>
            ))}
          </div>
      </div>

      {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Nova Pasta de Pesquisas</h3>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg mb-4" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm font-bold">Criar</button>
                  </div>
              </div>
          </div>
      )}

      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Mover Pesquisa</h3>
                      <button onClick={() => setShowMoveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <p className="text-sm text-slate-500 mb-4">Selecione o destino para: <br/><strong className="text-slate-800">{showMoveModal.title}</strong></p>
                      <div className="space-y-1">
                          <button 
                              onClick={async () => {
                                const updated = { ...showMoveModal, folderId: null };
                                await appBackend.saveSurvey(updated);
                                await loadSurveys();
                                setShowMoveModal(null);
                              }}
                              className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", !showMoveModal.folderId ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <LayoutGrid size={16} /> Sem Pasta (Raiz)
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={async () => {
                                    const updated = { ...showMoveModal, folderId: f.id };
                                    await appBackend.saveSurvey(updated);
                                    await loadSurveys();
                                    setShowMoveModal(null);
                                  }}
                                  className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", showMoveModal.folderId === f.id ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                              >
                                  <Folder size={16} /> {f.name}
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
