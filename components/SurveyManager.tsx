
import React, { useState, useEffect, useMemo } from 'react';
import { SurveyModel, FormQuestion, QuestionType, FormStyle, FormAnswer, Product } from '../types';
import { FormViewer } from './FormViewer';
import { 
  Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, Target, Share2, 
  Monitor, Palette, X, Image as ImageIcon, Users, User, ArrowRightLeft, Tag, Loader2,
  Layers, Check, List, CheckSquare as CheckboxIcon, ChevronDown, ListPlus, Inbox, Download, Table, Link2, Layout, Sparkles,
  Filter, CheckCircle2, AlertTriangle, Briefcase, ShoppingBag, PieChart
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

const QUESTION_TYPES: { id: QuestionType; label: string; icon: any }[] = [
    { id: 'text', label: 'Pergunta Curta', icon: Type },
    { id: 'paragraph', label: 'Feedback Longo', icon: AlignLeft },
    { id: 'select', label: 'Múltipla Escolha', icon: List },
    { id: 'checkbox', label: 'Múltipla Escolha', icon: CheckboxIcon },
    { id: 'number', label: 'Nota / Número', icon: Hash },
];

export const SurveyManager: React.FC<SurveyManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'preview' | 'responses'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'targeting'>('editor');
  const [surveys, setSurveys] = useState<SurveyModel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSurvey, setCurrentSurvey] = useState<SurveyModel>(INITIAL_SURVEY);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingSurvey, setSharingSurvey] = useState<SurveyModel | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => { loadSurveys(); loadProducts(); }, []);

  const loadSurveys = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getSurveys(); setSurveys(data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadProducts = async () => {
      try { 
          const { data } = await appBackend.client.from('crm_products').select('*').order('name');
          if (data) setProducts(data);
      } catch (e) {}
  };

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
          setSubmissions(data);
      } catch (e) {
          alert("Erro ao carregar respostas.");
      } finally {
          setLoadingSubmissions(false);
      }
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

  const handleDelete = async (id: string) => { 
      const target = surveys.find(f => f.id === id); 
      if(window.confirm(`Excluir a pesquisa "${target?.title}"?`)) { 
          try {
              await appBackend.client.from('crm_surveys').delete().eq('id', id);
              await appBackend.logActivity({ action: 'delete', module: 'surveys', details: `Excluiu pesquisa: ${target?.title}`, recordId: id }); 
              loadSurveys(); 
          } catch (e: any) { alert("Erro ao excluir pesquisa."); }
      } 
  };

  const handleSaveSurvey = async () => { 
      if (!currentSurvey.title.trim()) { alert("O título é obrigatório."); return; }
      setIsSaving(true);
      try {
          const isUpdate = !!currentSurvey.id && surveys.some(f => f.id === currentSurvey.id); 
          await appBackend.saveSurvey(currentSurvey); 
          await appBackend.logActivity({ 
              action: isUpdate ? 'update' : 'create', 
              module: 'surveys', 
              details: `${isUpdate ? 'Editou' : 'Criou'} pesquisa: ${currentSurvey.title}`, 
              recordId: currentSurvey.id || undefined 
          }); 
          await loadSurveys(); 
          setView('list'); 
      } catch (e: any) { alert("Erro ao salvar pesquisa."); } finally { setIsSaving(false); }
  };

  const updateStyle = (field: keyof FormStyle, value: any) => {
      setCurrentSurvey(prev => ({ ...prev, style: { ...(prev.style || INITIAL_SURVEY.style!), [field]: value } }));
  };

  const addQuestion = (type: QuestionType) => { 
      const titles: Record<string, string> = { text: 'Pergunta Curta', paragraph: 'Feedback Longo', number: 'Nota (0-10)', select: 'Escolha uma opção', checkbox: 'Múltipla Escolha' }; 
      const newQ: FormQuestion = { 
          id: crypto.randomUUID(), title: titles[type] || 'Nova Pergunta', type: type, required: true, placeholder: 'Sua resposta...',
          options: (type === 'select' || type === 'checkbox') ? ['Excelente', 'Bom', 'Regular', 'Ruim'] : undefined
      }; 
      setCurrentSurvey(prev => ({ ...prev, questions: [...prev.questions, newQ] })); 
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentSurvey(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q) }));
  };

  const removeQuestion = (id: string) => {
      setCurrentSurvey(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const copyToClipboard = (id: string) => {
      const link = `${window.location.origin}${window.location.pathname}?publicFormId=${id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
  };

  if (view === 'preview') return <FormViewer form={currentSurvey} onBack={() => setView('editor')} />;

  if (view === 'responses') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                  <div><h2 className="text-lg font-bold text-slate-800">{currentSurvey.title}</h2><p className="text-xs text-slate-400">Visualizando {submissions.length} respostas</p></div>
              </div>
              <button onClick={exportToExcel} disabled={submissions.length === 0} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"><Download size={18} /> Exportar Excel</button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50">
              {loadingSubmissions ? (
                  <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div>
              ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12"><Inbox size={64} className="opacity-10 mb-4" /><p className="font-bold">Ainda não há respostas</p></div>
              ) : (
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
                                  {(sub.answers as FormAnswer[]).map(ans => <td key={ans.questionId} className="px-6 py-4 border-r max-w-xs truncate">{ans.value}</td>)}
                              </tr>
                          ))}
                      </tbody>
                  </table>
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
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest">Pergunta {idx + 1}</span></div>
                                            <input type="text" className="w-full text-lg font-bold text-slate-800 bg-slate-50 border border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-amber-500 transition-all outline-none" value={q.title} onChange={e => updateQuestion(q.id, 'title', e.target.value)} />
                                            <div className="flex justify-end pt-2"><button onClick={() => removeQuestion(q.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></div>
                                        </div>
                                    </div>
                                ))}
                                {currentSurvey.questions.length === 0 && <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">Adicione perguntas à sua pesquisa usando the menu lateral.</div>}
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
                              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Target size={20} className="text-indigo-600"/> Direcionamento Automático (Portal do Aluno)</h3>
                              <div className="space-y-6">
                                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-6">
                                      <div>
                                          <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Quem deve responder esta pesquisa?</label>
                                          <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={currentSurvey.targetType} onChange={e => setCurrentSurvey({...currentSurvey, targetType: e.target.value as any, targetProductName: '', targetProductType: ''})}>
                                              <option value="all">Qualquer Aluno (Todos os produtos)</option>
                                              <option value="product_type">Por Categoria de Produto (Digital/Presencial...)</option>
                                              <option value="specific_product">Alunos de um Produto Específico</option>
                                          </select>
                                      </div>

                                      {currentSurvey.targetType === 'product_type' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Escolha a Categoria</label>
                                              <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-medium text-slate-700" value={currentSurvey.targetProductType || ''} onChange={e => setCurrentSurvey({...currentSurvey, targetProductType: e.target.value})}>
                                                  <option value="">Selecione...</option>
                                                  <option value="Digital">Digital (Cursos Online)</option>
                                                  <option value="Presencial">Presencial (Formação Completa/Clássico)</option>
                                                  <option value="Evento">Evento (Congressos/Workshops)</option>
                                              </select>
                                          </div>
                                      )}

                                      {currentSurvey.targetType === 'specific_product' && (
                                          <div className="animate-in fade-in slide-in-from-top-1">
                                              <label className="block text-xs font-black text-indigo-700 uppercase mb-2">Escolha o Produto / Curso</label>
                                              <select className="w-full px-4 py-2.5 border rounded-xl bg-white font-medium text-slate-700" value={currentSurvey.targetProductName || ''} onChange={e => setCurrentSurvey({...currentSurvey, targetProductName: e.target.value})}>
                                                  <option value="">Selecione o produto...</option>
                                                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                              </select>
                                          </div>
                                      )}

                                      <div className="pt-4 border-t border-indigo-200">
                                          <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-indigo-100 cursor-pointer group hover:bg-indigo-50 transition-all shadow-sm">
                                              <input type="checkbox" className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" checked={currentSurvey.onlyIfFinished} onChange={e => setCurrentSurvey({...currentSurvey, onlyIfFinished: e.target.checked})} />
                                              <div>
                                                  <span className="font-bold text-indigo-900 block">Exibir apenas após encerrar o curso?</span>
                                                  <p className="text-[10px] text-indigo-500 uppercase tracking-tighter">Presencial: Após data do Mod 2 • Digital: Matrícula Concluída</p>
                                              </div>
                                          </label>
                                      </div>

                                      <div className="pt-2">
                                          <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-teal-100 cursor-pointer group hover:bg-teal-50 transition-all shadow-sm">
                                              <input type="checkbox" className="w-6 h-6 rounded text-teal-600 focus:ring-teal-500" checked={currentSurvey.isActive} onChange={e => setCurrentSurvey({...currentSurvey, isActive: e.target.checked})} />
                                              <div>
                                                  <span className="font-bold text-teal-900 block">Pesquisa Ativa?</span>
                                                  <p className="text-[10px] text-teal-500 uppercase tracking-tighter">Se desmarcado, a pesquisa deixará de aparecer para novos alunos.</p>
                                              </div>
                                          </label>
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><PieChart className="text-amber-500" /> Pesquisas de Satisfação</h2><p className="text-slate-500 text-sm">Crie NPS e feedbacks para o Portal do Aluno.</p></div>
        </div>
        <button onClick={() => { setCurrentSurvey(INITIAL_SURVEY); setView('editor'); setEditorStep('editor'); }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95"><Plus size={18} /> Nova Pesquisa</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" size={32}/></div> : surveys.map(f => (
          <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all flex flex-col group overflow-hidden">
            <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border", f.isActive ? "bg-green-50 text-green-700 border-green-100" : "bg-slate-50 text-slate-400 border-slate-100")}>
                        {f.isActive ? 'PESQUISA ATIVA' : 'PESQUISA PAUSADA'}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                </div>
                <h3 className="font-black text-slate-800 text-lg mb-1 line-clamp-1">{f.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 flex items-center gap-1">
                    <Target size={10}/> {f.targetType === 'all' ? 'Todos Alunos' : f.targetType === 'product_type' ? `Alunos ${f.targetProductType}` : `Produto: ${f.targetProductName}`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleViewResponses(f)} className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors">
                        <Table size={20} className="mb-1 text-amber-500" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                        <p className="text-xl font-black text-slate-800">{f.submissionsCount || 0}</p>
                    </button>
                    <button onClick={() => copyToClipboard(f.id)} className={clsx("rounded-xl flex flex-col items-center justify-center transition-all shadow-sm border", copiedLink ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                        {copiedLink ? <CheckCircle2 size={20}/> : <Share2 size={20} />}
                        <span className="text-[10px] font-black uppercase mt-1">{copiedLink ? 'Copiado' : 'Link Externo'}</span>
                    </button>
                </div>
            </div>
          </div>
        ))}
        {!loading && surveys.length === 0 && <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl text-slate-400">Nenhuma pesquisa criada.</div>}
      </div>
    </div>
  );
};
