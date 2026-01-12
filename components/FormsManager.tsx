import React, { useState, useEffect, useMemo } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle, FormAnswer, FormFolder } from '../types';
import { FormViewer } from './FormViewer';
import { 
  Plus, Trash2, Eye, Edit2, ArrowLeft, Save, Copy, Target, Share2, 
  Loader2, Check, List, CheckSquare as CheckboxIcon, Inbox, Download, Table, 
  Layout, Folder, FolderPlus, MoveRight, LayoutGrid, X, Type, AlignLeft, 
  Mail, Phone, Calendar, Hash, Palette, Sparkles, Image as ImageIcon,
  AlignCenter, Filter, Tag, ArrowRightLeft, User, Users, Info
} from 'lucide-react';
import { appBackend, Pipeline } from '../services/appBackend';
import clsx from 'clsx';

declare const XLSX: any;

interface FormsManagerProps {
  onBack: () => void;
}

const INITIAL_FORM: FormModel = {
  id: '',
  title: 'Formulário sem título',
  description: '',
  campaign: '',
  isLeadCapture: false,
  questions: [],
  createdAt: '',
  submissionsCount: 0,
  style: {
      backgroundType: 'color', backgroundColor: '#f1f5f9', cardTransparent: false, primaryColor: '#0d9488', textColor: '#1e293b', fontFamily: 'sans', titleAlignment: 'left', borderRadius: 'medium', buttonText: 'Enviar Formulário', shadowIntensity: 'soft', successTitle: 'Enviado!', successMessage: 'Recebemos suas informações.', successButtonText: 'Fechar'
  },
  distributionMode: 'fixed', targetPipeline: 'Padrão', targetStage: 'new', folderId: null
};

const CRM_FIELDS = [
    { value: '', label: 'Nenhum (Campo Manual)' },
    { value: 'contact_name', label: 'Nome Completo (Cliente)' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone / WhatsApp' },
    { value: 'cpf', label: 'CPF' },
    { value: 'company_name', label: 'Nome da Empresa / Razão Social' },
    { value: 'product_type', label: 'Tipo de Produto' },
    { value: 'payment_method', label: 'Forma de Pagamento' },
    { value: 'observation', label: 'Observações' },
    { value: 'value', label: 'Valor Estimado (R$)' },
];

const QUESTION_TYPES: { id: QuestionType; label: string; icon: any }[] = [
    { id: 'text', label: 'Texto Curto', icon: Type },
    { id: 'paragraph', label: 'Parágrafo', icon: AlignLeft },
    { id: 'select', label: 'Múltipla Escolha', icon: List },
    { id: 'checkbox', label: 'Caixas de Seleção', icon: CheckboxIcon },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'phone', label: 'Telefone', icon: Phone },
    { id: 'number', label: 'Número', icon: Hash },
    { id: 'date', label: 'Data', icon: Calendar },
];

export const FormsManager: React.FC<FormsManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'editor' | 'responses' | 'preview'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'settings'>('editor');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<FormModel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => { loadForms(); loadFolders(); loadMetadata(); }, []);

  const loadForms = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getForms(); setForms(data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadFolders = async () => {
    try { const data = await appBackend.getFormFolders('form'); setFolders(data); } catch (e) {}
  };

  const loadMetadata = async () => {
      try {
          const [pRes, cRes] = await Promise.all([
              appBackend.getPipelines(),
              appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active')
          ]);
          if (pRes) setPipelines(pRes);
          if (cRes.data) setCollaborators(cRes.data);
      } catch (e) {}
  };

  const handleSaveForm = async () => { 
      if (!currentForm.title.trim()) { alert("O título é obrigatório."); return; }
      setIsSaving(true);
      try {
          await appBackend.saveForm(currentForm); 
          await loadForms(); 
          setView('list'); 
      } catch (e: any) { alert("Erro ao salvar formulário."); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => { 
      const target = forms.find(f => f.id === id); 
      if(window.confirm(`Excluir o formulário "${target?.title}"? Todas as respostas também serão apagadas.`)) { 
          try {
              await appBackend.deleteForm(id); 
              setForms(prev => prev.filter(f => f.id !== id));
          } catch (e: any) { alert("Erro ao excluir."); }
      } 
  };

  const updateStyle = (field: keyof FormStyle, value: any) => {
      setCurrentForm(prev => ({
          ...prev,
          style: { ...(prev.style || INITIAL_FORM.style!), [field]: value }
      }));
  };

  const addQuestion = (type: QuestionType) => {
      const newQ: FormQuestion = { id: crypto.randomUUID(), title: 'Nova Pergunta', type, required: false, options: (type === 'select' || type === 'checkbox') ? ['Opção 1'] : undefined };
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const filteredForms = useMemo(() => {
    if (currentFolderId === null) return forms;
    return forms.filter(f => f.folderId === currentFolderId);
  }, [forms, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder: FormFolder = { id: crypto.randomUUID(), name: newFolderName, createdAt: new Date().toISOString() };
    await appBackend.saveFormFolder(newFolder, 'form');
    await loadFolders();
    setShowFolderModal(false);
    setNewFolderName('');
  };

  const handleMoveForm = async (form: FormModel, folderId: string | null) => {
    const updated = { ...form, folderId: folderId || null };
    await appBackend.saveForm(updated);
    await loadForms();
    setShowMoveModal(null);
  };

  if (view === 'preview') return <FormViewer form={currentForm} onBack={() => setView('editor')} />;

  if (view === 'editor') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1"><ArrowLeft size={16} /> Sair</button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Perguntas</button>
                      <button onClick={() => setEditorStep('design')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'design' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Design</button>
                      <button onClick={() => setEditorStep('settings')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'settings' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Configurações</button>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('preview')} className="text-slate-600 hover:text-teal-600 font-bold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"><Eye size={18} /> Visualizar</button>
                  <button onClick={handleSaveForm} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Formulário
                  </button>
              </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
              {editorStep === 'editor' ? (
                  <>
                    <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 shrink-0 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adicionar Campo</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {QUESTION_TYPES.map(qt => (
                                <button key={qt.id} onClick={() => addQuestion(qt.id)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left group">
                                    <qt.icon size={18} className="text-teal-500 group-hover:scale-110 transition-transform" /> {qt.label}
                                </button>
                            ))}
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl border-t-[10px] border-teal-500 p-8 shadow-sm">
                                <input type="text" className="w-full text-3xl font-bold text-slate-800 border-b-2 border-transparent focus:border-teal-100 focus:ring-0 p-0 mb-4 outline-none" value={currentForm.title} onChange={e => setCurrentForm({...currentForm, title: e.target.value})} placeholder="Título do Formulário" />
                                <textarea className="w-full text-slate-500 border-none focus:ring-0 p-0 resize-none h-12 outline-none" value={currentForm.description} onChange={e => setCurrentForm({...currentForm, description: e.target.value})} placeholder="Descrição opcional..." />
                            </div>
                            <div className="space-y-4 pb-20">
                                {currentForm.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm group hover:border-teal-300 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase">Campo {idx + 1}</span>
                                            <button onClick={() => setCurrentForm({...currentForm, questions: currentForm.questions.filter(x => x.id !== q.id)})} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Título da Pergunta</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm font-bold" value={q.title} onChange={e => setCurrentForm({...currentForm, questions: currentForm.questions.map(x => x.id === q.id ? {...x, title: e.target.value} : x)})} />
                                            </div>
                                            {currentForm.isLeadCapture && (
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vincular Campo CRM</label>
                                                    <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white" value={q.crmMapping || ''} onChange={e => setCurrentForm({...currentForm, questions: currentForm.questions.map(x => x.id === q.id ? {...x, crmMapping: e.target.value} : x)})}>
                                                        {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                    </select>
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
                  <main className="flex-1 overflow-y-auto p-12 bg-white">
                      <div className="max-w-xl mx-auto space-y-8">
                          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><Palette className="text-teal-600" /> Estilo Visual</h3>
                          <div className="grid grid-cols-2 gap-6">
                              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cor Principal</label><input type="color" className="w-full h-12 border rounded-lg cursor-pointer" value={currentForm.style?.primaryColor} onChange={e => updateStyle('primaryColor', e.target.value)} /></div>
                              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cor do Texto</label><input type="color" className="w-full h-12 border rounded-lg cursor-pointer" value={currentForm.style?.textColor} onChange={e => updateStyle('textColor', e.target.value)} /></div>
                              <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">Alinhamento do Título</label><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => updateStyle('titleAlignment', 'left')} className={clsx("flex-1 py-2 text-xs font-bold rounded-md", currentForm.style?.titleAlignment === 'left' ? "bg-white text-teal-700 shadow" : "text-slate-500")}>Esquerda</button><button onClick={() => updateStyle('titleAlignment', 'center')} className={clsx("flex-1 py-2 text-xs font-bold rounded-md", currentForm.style?.titleAlignment === 'center' ? "bg-white text-teal-700 shadow" : "text-slate-500")}>Centro</button></div></div>
                              <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">Texto do Botão</label><input type="text" className="w-full px-4 py-2 border rounded-lg text-sm" value={currentForm.style?.buttonText} onChange={e => updateStyle('buttonText', e.target.value)} /></div>
                          </div>
                      </div>
                  </main>
              ) : (
                  <main className="flex-1 overflow-y-auto p-12 bg-white">
                      <div className="max-w-2xl mx-auto space-y-10">
                          <section>
                              <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b pb-4"><Target className="text-teal-600" /> Inteligência Comercial</h3>
                              <div className="space-y-6">
                                  <label className="flex items-center gap-4 p-5 bg-teal-50 rounded-2xl border border-teal-100 cursor-pointer">
                                      <div className={clsx("p-2 rounded-lg", currentForm.isLeadCapture ? "bg-teal-600 text-white" : "bg-white text-slate-300")}><Target size={24}/></div>
                                      <div className="flex-1"><span className="font-bold text-teal-900 block">Criar Leads no CRM</span><p className="text-xs text-teal-700">Respostas tornam-se negociações automaticamente.</p></div>
                                      <input type="checkbox" checked={currentForm.isLeadCapture} onChange={e => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})} className="w-6 h-6 rounded text-teal-600" />
                                  </label>

                                  {currentForm.isLeadCapture && (
                                      <div className="space-y-6 p-6 border rounded-2xl bg-white animate-in slide-in-from-top-2">
                                          <div className="grid grid-cols-2 gap-4">
                                              <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Funil de Vendas</label><select className="w-full border rounded-lg p-2 text-sm" value={currentForm.targetPipeline} onChange={e => setCurrentForm({...currentForm, targetPipeline: e.target.value})}>{pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                                              <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Modo Distribuição</label><select className="w-full border rounded-lg p-2 text-sm" value={currentForm.distributionMode} onChange={e => setCurrentForm({...currentForm, distributionMode: e.target.value as any})}><option value="fixed">Vendedor Fixo</option><option value="round-robin">Rodízio por Equipe</option></select></div>
                                          </div>
                                      </div>
                                  )}
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
        <button onClick={() => { setCurrentForm(INITIAL_FORM); setView('editor'); setEditorStep('editor'); }} className="w-full bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mb-4 active:scale-95"><Plus size={18} /> Novo Formulário</button>
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <button onClick={() => setCurrentFolderId(null)} className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors", currentFolderId === null ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}><LayoutGrid size={16} /> Todos</button>
            <div className="mt-4 flex items-center justify-between px-3 mb-2"><p className="text-xs font-bold text-slate-400 uppercase">Pastas</p><button onClick={() => setShowFolderModal(true)}><FolderPlus size={16}/></button></div>
            {folders.map(f => <button key={f.id} onClick={() => setCurrentFolderId(f.id)} className={clsx("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm", currentFolderId === f.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}><Folder size={16}/> {f.name}</button>)}
        </div>
      </aside>
      <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map(f => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-50 text-teal-700">FORMULÁRIO</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowMoveModal(f)} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg"><MoveRight size={16}/></button>
                            <button onClick={() => { setCurrentForm(f); setView('editor'); setEditorStep('editor'); }} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{f.title}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors">
                            <Table size={20} className="mb-1 text-teal-600" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                            <p className="text-xl font-black text-slate-800">{f.submissionsCount || 0}</p>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?publicFormId=${f.id}`); alert("Link copiado!"); }} className="bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl flex flex-col items-center justify-center">
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
                  <h3 className="font-bold text-slate-800 mb-4">Nova Pasta</h3>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg mb-4" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-bold">Criar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};