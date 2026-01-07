
import React, { useState, useEffect, useMemo } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle, FormAnswer, FormFolder } from '../types';
import { FormViewer } from './FormViewer';
import { 
  FileText, Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, GripHorizontal, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, CheckSquare, Target, Share2, CheckCircle,
  LayoutTemplate, Monitor, Smartphone, Palette, Columns, X, Image as ImageIcon, Grid, Ban, Users, User, ArrowRightLeft, Info, Code, ExternalLink, Tag, Loader2,
  Layers, Check, List, CheckSquare as CheckboxIcon, ChevronDown, ListPlus, Inbox, Download, Table, Link2, MousePointer2, AlignCenter, Layout, Sparkles,
  Filter, Folder, FolderPlus, MoveRight, LayoutGrid, ChevronRight
} from 'lucide-react';
import { appBackend, Pipeline } from '../services/appBackend';
import clsx from 'clsx';

// XLSX is global from CDN
declare const XLSX: any;

interface Team {
    id: string;
    name: string;
    members: string[];
}

interface CollaboratorSimple {
    id: string;
    full_name: string;
}

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
      backgroundType: 'color',
      backgroundColor: '#f1f5f9',
      cardTransparent: false,
      primaryColor: '#0d9488',
      textColor: '#1e293b',
      fontFamily: 'sans',
      titleAlignment: 'left',
      borderRadius: 'medium',
      buttonText: 'Enviar Formulário',
      shadowIntensity: 'soft',
      successTitle: 'Enviado com Sucesso!',
      successMessage: 'Recebemos suas informações. Entraremos em contato em breve.',
      successButtonText: 'Enviar outra resposta'
  },
  distributionMode: 'fixed',
  targetPipeline: 'Padrão',
  targetStage: 'new',
  folderId: null
};

const CRM_FIELDS = [
    { value: '', label: 'Nenhum (Campo Manual)' },
    { value: 'contact_name', label: 'Nome Completo (Cliente)' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone / WhatsApp' },
    { value: 'cpf', label: 'CPF' },
    { value: 'company_name', label: 'Nome da Empresa / Razão Social' },
    { value: 'product_type', label: 'Tipo de Produto (Presencial/Digital/Evento)' },
    { value: 'payment_method', label: 'Forma de Pagamento' },
    { value: 'zip_code', label: 'CEP' },
    { value: 'address', label: 'Endereço' },
    { value: 'address_number', label: 'Número do Endereço' },
    { value: 'observation', label: 'Observações do Lead' },
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
  const [view, setView] = useState<'list' | 'templates' | 'editor' | 'preview' | 'responses'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'settings'>('editor');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorSimple[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingForm, setSharingForm] = useState<FormModel | null>(null);
  const [copiedType, setCopiedType] = useState<'link' | 'embed' | null>(null);
  
  // UI Folder States
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState<FormModel | null>(null);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => { loadForms(); loadMetadata(); loadFolders(); }, []);

  const loadForms = async () => { 
      setLoading(true); 
      try {
          const data = await appBackend.getForms(); 
          setForms(data); 
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false); 
      }
  };

  const loadFolders = async () => {
    try {
      const data = await appBackend.getFormFolders();
      setFolders(data);
    } catch (e) {}
  };

  const loadMetadata = async () => { 
      try { 
          const [tRes, cRes, pRes] = await Promise.all([
              appBackend.client.from('crm_teams').select('*'), 
              appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active'),
              appBackend.getPipelines()
          ]); 
          if (tRes.data) setTeams(tRes.data); 
          if (cRes.data) setCollaborators(cRes.data.map((c: any) => ({ id: c.id, full_name: c.full_name }))); 
          if (pRes) setPipelines(pRes);
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
    if (window.confirm('Excluir esta pasta? Os formulários não serão apagados, apenas voltarão para a raiz.')) {
        await appBackend.deleteFormFolder(id);
        if (currentFolderId === id) setCurrentFolderId(null);
        loadFolders();
    }
  };

  const handleMoveForm = async (form: FormModel, folderId: string | null) => {
    const updated = { ...form, folderId: folderId || null };
    await appBackend.saveForm(updated);
    await loadForms();
    setShowMoveModal(null);
  };

  const filteredForms = useMemo(() => {
    if (currentFolderId === null) return forms;
    return forms.filter(f => f.folderId === currentFolderId);
  }, [forms, currentFolderId]);

  const templateOptions = [
      { id: 'blank', title: 'Em Branco', description: 'Crie seu formulário do zero.' },
  ];

  const selectTemplate = (template: any) => { 
      const newForm: FormModel = { 
          ...INITIAL_FORM, 
          id: crypto.randomUUID(), 
          title: template.title || 'Formulário em Branco', 
          description: template.description || '', 
          questions: template.id === 'blank' ? [] : template.questions.map((q: any) => ({ ...q, id: crypto.randomUUID() })), 
          createdAt: new Date().toISOString(), 
          isLeadCapture: template.id !== 'blank',
          folderId: currentFolderId
      }; 
      setCurrentForm(newForm); 
      setView('editor'); 
      setEditorStep('editor'); 
  };

  const handleEdit = (form: FormModel) => { 
      setCurrentForm({ ...INITIAL_FORM, ...form }); 
      setView('editor'); 
      setEditorStep('editor'); 
  };

  const handleViewResponses = async (form: FormModel) => {
      setCurrentForm(form);
      setView('responses');
      setLoadingSubmissions(true);
      try {
          const data = await appBackend.getFormSubmissions(form.id);
          setSubmissions(data);
      } catch (e) {
          alert("Erro ao carregar respostas.");
      } finally {
          setLoadingSubmissions(false);
      }
  };

  const exportToExcel = () => {
    if (!currentForm || submissions.length === 0) return;

    // Build headers from questions
    const headers = ["Data Envio", ...currentForm.questions.map(q => q.title)];
    
    // Build rows
    const dataRows = submissions.map(sub => {
        const row: any = {};
        row["Data Envio"] = new Date(sub.created_at).toLocaleString('pt-BR');
        
        currentForm.questions.forEach(q => {
            const answer = (sub.answers as FormAnswer[]).find(a => a.questionId === q.id);
            row[q.title] = answer?.value || "";
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Respostas");
    XLSX.writeFile(workbook, `respostas_${currentForm.title.replace(/\s/g, '_').toLowerCase()}.xlsx`);
  };

  const handleDelete = async (id: string) => { 
      const target = forms.find(f => f.id === id); 
      if(window.confirm(`Excluir o formulário "${target?.title}"?`)) { 
          try {
              await appBackend.deleteForm(id); 
              await appBackend.logActivity({ action: 'delete', module: 'forms', details: `Excluiu formulário: ${target?.title}`, recordId: id }); 
              loadForms(); 
          } catch (e: any) {
              alert("Erro ao excluir formulário.");
          }
      } 
  };

  const handleSaveForm = async () => { 
      if (!currentForm.title.trim()) {
          alert("O título do formulário é obrigatório.");
          return;
      }
      setIsSaving(true);
      try {
          const isUpdate = !!currentForm.id && forms.some(f => f.id === currentForm.id); 
          await appBackend.saveForm(currentForm); 
          await appBackend.logActivity({ 
              action: isUpdate ? 'update' : 'create', 
              module: 'forms', 
              details: `${isUpdate ? 'Editou' : 'Criou'} formulário: ${currentForm.title}`, 
              recordId: currentForm.id || undefined 
          }); 
          await loadForms(); 
          setView('list'); 
      } catch (e: any) {
          alert("Erro ao salvar formulário.");
      } finally {
          setIsSaving(false);
      }
  };

  const updateStyle = (field: keyof FormStyle, value: any) => {
      setCurrentForm(prev => ({
          ...prev,
          style: { ...(prev.style || INITIAL_FORM.style!), [field]: value }
      }));
  };

  const addQuestion = (type: QuestionType) => { 
      const titles: Record<string, string> = { text: 'Texto Curto', email: 'Email', phone: 'Telefone', paragraph: 'Mensagem Longa', number: 'Número', date: 'Data', select: 'Múltipla Escolha', checkbox: 'Caixa de Seleção' }; 
      const newQ: FormQuestion = { 
          id: crypto.randomUUID(), 
          title: titles[type] || 'Nova Pergunta', 
          type: type, 
          required: false, 
          placeholder: 'Sua resposta...',
          options: (type === 'select' || type === 'checkbox') ? ['Opção 1'] : undefined,
          crmMapping: '' 
      }; 
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] })); 
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentForm(prev => ({ ...prev, questions: prev.questions.map(q => {
          if (q.id === id) {
              if ((field === 'type' && (value === 'select' || value === 'checkbox')) && !q.options) {
                  return { ...q, [field]: value, options: ['Opção 1'] };
              }
              return { ...q, [field]: value };
          }
          return q;
      }) }));
  };

  const duplicateQuestion = (question: FormQuestion) => {
      const newQ = { ...question, id: crypto.randomUUID() };
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const removeQuestion = (id: string) => {
      setCurrentForm(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const addOption = (qId: string) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: [...(q.options || []), `Opção ${(q.options?.length || 0) + 1}`] } : q)
      }));
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: q.options?.map((o, idx) => idx === optIdx ? value : o) } : q)
      }));
  };

  const removeOption = (qId: string, optIdx: number) => {
      setCurrentForm(prev => ({
          ...prev,
          questions: prev.questions.map(q => q.id === qId ? { ...q, options: q.options?.filter((_, idx) => idx !== optIdx) } : q)
      }));
  };

  const handleShare = (form: FormModel) => {
      setSharingForm(form);
  };

  const copyToClipboard = (text: string, type: 'link' | 'embed') => {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
  };

  // Helper for stages based on selected pipeline
  const activePipeline = useMemo(() => {
      return pipelines.find(p => p.name === currentForm.targetPipeline);
  }, [pipelines, currentForm.targetPipeline]);

  if (view === 'preview') return <FormViewer form={currentForm} onBack={() => setView('editor')} />;

  if (view === 'templates') return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">Escolha um Ponto de Partida</h2>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
                className="group bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer"
                onClick={() => selectTemplate({ id: 'blank' })}
            >
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Plus size={32} />
                </div>
                <h3 className="font-bold text-slate-700">Em Branco</h3>
                <p className="text-xs text-slate-500 mt-1">Crie seu formulário do zero, sem limites de campos.</p>
            </div>
        </div>
    </div>
  );

  if (view === 'responses') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800">{currentForm.title}</h2>
                      <p className="text-xs text-slate-400">Visualizando {submissions.length} respostas coletadas</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={exportToExcel} 
                    disabled={submissions.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                      <Download size={18} /> Exportar Excel
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50">
              {loadingSubmissions ? (
                  <div className="flex justify-center items-center h-64"><Loader2 size={32} className="animate-spin text-teal-600" /></div>
              ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12">
                      <Inbox size={64} className="opacity-10 mb-4" />
                      <p className="font-bold">Ainda não há respostas</p>
                      <p className="text-sm">Compartilhe o link do formulário para começar a coletar dados.</p>
                  </div>
              ) : (
                  <div className="w-full">
                      <table className="w-full text-left text-sm border-collapse bg-white">
                          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3 border-b border-r w-12 text-center">#</th>
                                  <th className="px-6 py-3 border-b border-r min-w-[180px]">Data Envio</th>
                                  {currentForm.questions.map(q => (
                                      <th key={q.id} className="px-6 py-3 border-b border-r min-w-[200px]">{q.title}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {submissions.map((sub, idx) => (
                                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 text-center text-slate-400 font-mono border-r">{submissions.length - idx}</td>
                                      <td className="px-6 py-4 text-slate-500 font-medium border-r">{new Date(sub.created_at).toLocaleString('pt-BR')}</td>
                                      {(sub.answers as FormAnswer[]).map(ans => (
                                          <td key={ans.questionId} className="px-6 py-4 border-r max-w-xs truncate" title={ans.value}>
                                              {ans.value || <span className="text-slate-200 italic">vazio</span>}
                                          </td>
                                      ))}
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
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1">
                      <ArrowLeft size={16} /> Sair
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Perguntas</button>
                      <button onClick={() => setEditorStep('design')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'design' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Design & Cores</button>
                      <button onClick={() => setEditorStep('settings')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'settings' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Configurações</button>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('preview')} className="text-slate-600 hover:text-teal-600 font-bold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50">
                      <Eye size={18} /> Visualizar
                  </button>
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
                                <button 
                                    key={qt.id}
                                    onClick={() => addQuestion(qt.id)} 
                                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left group"
                                >
                                    <qt.icon size={18} className="text-teal-500 group-hover:scale-110 transition-transform" /> {qt.label}
                                </button>
                            ))}
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl border-t-[10px] border-teal-500 p-8 shadow-sm">
                                <input 
                                    type="text" 
                                    className="w-full text-3xl font-bold text-slate-800 border-b-2 border-transparent focus:border-teal-100 focus:ring-0 placeholder:text-slate-200 p-0 mb-4 transition-all" 
                                    value={currentForm.title} 
                                    onChange={e => setCurrentForm({...currentForm, title: e.target.value})}
                                    placeholder="Título do Formulário"
                                />
                                <textarea 
                                    className="w-full text-slate-500 border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none h-12" 
                                    value={currentForm.description} 
                                    onChange={e => setCurrentForm({...currentForm, description: e.target.value})}
                                    placeholder="Descrição opcional..."
                                />
                            </div>

                            <div className="space-y-4 pb-20">
                                {currentForm.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm group hover:border-teal-300 transition-all relative">
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-col md:flex-row gap-4 items-start">
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-widest">Pergunta {idx + 1}</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className="w-full text-lg font-bold text-slate-800 bg-slate-50 border border-transparent rounded-lg px-4 py-3 focus:bg-white focus:border-teal-500 transition-all outline-none"
                                                        value={q.title}
                                                        onChange={e => updateQuestion(q.id, 'title', e.target.value)}
                                                        placeholder="Pergunta sem título"
                                                    />
                                                </div>
                                                <div className="w-full md:w-60">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Formato da Resposta</label>
                                                    <div className="relative group">
                                                        <select 
                                                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-10 pr-8 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                                                            value={q.type}
                                                            onChange={e => updateQuestion(q.id, 'type', e.target.value as QuestionType)}
                                                        >
                                                            {QUESTION_TYPES.map(type => (
                                                                <option key={type.id} value={type.id}>{type.label}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none">
                                                            {React.createElement(QUESTION_TYPES.find(t => t.id === q.type)?.icon || Type, { size: 18 })}
                                                        </div>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            {currentForm.isLeadCapture && (
                                                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center gap-3 animate-in fade-in">
                                                    <div className="flex items-center gap-2 text-indigo-600 shrink-0">
                                                        <Link2 size={16} />
                                                        <span className="text-xs font-black uppercase tracking-tighter">Vincular ao CRM:</span>
                                                    </div>
                                                    <select 
                                                        className="flex-1 bg-white border border-indigo-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={q.crmMapping || ''}
                                                        onChange={e => updateQuestion(q.id, 'crmMapping', e.target.value)}
                                                    >
                                                        {CRM_FIELDS.map(field => (
                                                            <option key={field.value} value={field.value}>{field.label}</option>
                                                        ))}
                                                    </select>
                                                    {/* Corrected: Wrapped Info icon in span to use title safely */}
                                                    <span title="Escolha qual campo da Negociação será preenchido com esta resposta." className="hidden md:block">
                                                        <Info size={14} className="text-indigo-300" />
                                                    </span>
                                                </div>
                                            )}

                                            <div className="pl-0 md:pl-2">
                                                {(q.type === 'select' || q.type === 'checkbox') ? (
                                                    <div className="space-y-3">
                                                        {q.options?.map((option, optIdx) => (
                                                            <div key={optIdx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                                                <div className="text-slate-300">
                                                                    {q.type === 'select' ? <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div> : <div className="w-5 h-5 rounded border-2 border-slate-200"></div>}
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    className="flex-1 bg-transparent border-b border-slate-100 focus:border-teal-500 outline-none py-1 text-sm font-medium text-slate-700"
                                                                    value={option}
                                                                    onChange={e => updateOption(q.id, optIdx, e.target.value)}
                                                                />
                                                                <button onClick={() => removeOption(q.id, optIdx)} className="p-1.5 text-slate-300 hover:text-red-500"><X size={14}/></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => addOption(q.id)} className="flex items-center gap-2 text-xs font-bold text-teal-600 hover:text-teal-700 mt-2 px-8 py-2 border-2 border-dashed border-teal-100 rounded-lg w-fit">
                                                            <ListPlus size={14}/> Adicionar Outra Opção
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <input 
                                                            type="text" 
                                                            className="w-full text-sm text-slate-400 bg-white border-b-2 border-slate-100 py-2 focus:border-teal-500 transition-all outline-none"
                                                            value={q.placeholder || ''}
                                                            onChange={e => updateQuestion(q.id, 'placeholder', e.target.value)}
                                                            placeholder="Texto de ajuda (Placeholder)..."
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-50">
                                                <button onClick={() => duplicateQuestion(q)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors" title="Duplicar"><Copy size={18}/></button>
                                                <button onClick={() => removeQuestion(q.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Remover"><Trash2 size={18} /></button>
                                                <div className="h-6 w-px bg-slate-200"></div>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-slate-600 transition-colors">Obrigatório</span>
                                                    <div onClick={() => updateQuestion(q.id, 'required', !q.required)} className={clsx("w-10 h-5 rounded-full p-1 transition-all", q.required ? "bg-teal-500" : "bg-slate-200")}>
                                                        <div className={clsx("w-3 h-3 bg-white rounded-full transition-all", q.required ? "translate-x-5" : "translate-x-0")}></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {currentForm.questions.length === 0 && (
                                    <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 shadow-inner">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Layers className="opacity-20" size={40} />
                                        </div>
                                        <p className="font-bold text-lg text-slate-500">Seu formulário está vazio</p>
                                        <p className="text-sm mt-1 max-w-xs mx-auto">Clique nos botões à esquerda para adicionar os campos que você deseja coletar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                  </>
              ) : editorStep === 'design' ? (
                  <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                      <div className="max-w-4xl mx-auto">
                          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 border-b pb-4"><Palette size={28} className="text-teal-600"/> Personalização Visual</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              {/* PAINEL DE CONTROLES */}
                              <div className="space-y-10">
                                  <section>
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Layout size={14}/> Layout do Card</h4>
                                      <div className="space-y-4">
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Alinhamento do Cabeçalho</label>
                                              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                                                  <button onClick={() => updateStyle('titleAlignment', 'left')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2", currentForm.style?.titleAlignment === 'left' ? "bg-white shadow text-teal-700" : "text-slate-500")}><AlignLeft size={14}/> Esquerda</button>
                                                  <button onClick={() => updateStyle('titleAlignment', 'center')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2", currentForm.style?.titleAlignment === 'center' ? "bg-white shadow text-teal-700" : "text-slate-500")}><AlignCenter size={14}/> Centralizado</button>
                                              </div>
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Arredondamento das Bordas</label>
                                              <div className="flex flex-wrap gap-2">
                                                  {['none', 'small', 'medium', 'large', 'full'].map(rad => (
                                                      <button key={rad} onClick={() => updateStyle('borderRadius', rad)} className={clsx("px-4 py-1.5 text-xs font-bold border rounded-lg capitalize transition-all", currentForm.style?.borderRadius === rad ? "bg-teal-600 border-teal-600 text-white" : "bg-white text-slate-500")}>{rad}</button>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  </section>

                                  <section>
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Palette size={14}/> Cores e Estilo</h4>
                                      <div className="grid grid-cols-2 gap-6">
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Cor Principal</label>
                                              <div className="flex items-center gap-3">
                                                  <input type="color" className="w-10 h-10 border-none rounded-lg cursor-pointer bg-transparent" value={currentForm.style?.primaryColor} onChange={e => updateStyle('primaryColor', e.target.value)} />
                                                  <span className="font-mono text-xs text-slate-400 uppercase">{currentForm.style?.primaryColor}</span>
                                              </div>
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Cor do Texto</label>
                                              <div className="flex items-center gap-3">
                                                  <input type="color" className="w-10 h-10 border-none rounded-lg cursor-pointer bg-transparent" value={currentForm.style?.textColor} onChange={e => updateStyle('textColor', e.target.value)} />
                                                  <span className="font-mono text-xs text-slate-400 uppercase">{currentForm.style?.textColor}</span>
                                              </div>
                                          </div>
                                          <div className="col-span-2">
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Tipografia (Fonte)</label>
                                              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={currentForm.style?.fontFamily} onChange={e => updateStyle('fontFamily', e.target.value)}>
                                                  <option value="sans">Sans-Serif (Moderna / Limpa)</option>
                                                  <option value="serif">Serif (Clássica / Elegante)</option>
                                                  <option value="modern">Geometric Modern (Impacto)</option>
                                              </select>
                                          </div>
                                      </div>
                                  </section>

                                  <section>
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={14}/> Tela de Sucesso (Pós-Envio)</h4>
                                      <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-600 mb-1">Título da Confirmação</label>
                                              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="Enviado com Sucesso!" value={currentForm.style?.successTitle || ''} onChange={e => updateStyle('successTitle', e.target.value)} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-600 mb-1">Mensagem de Agradecimento</label>
                                              <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-white h-20 resize-none" placeholder="Recebemos suas informações..." value={currentForm.style?.successMessage || ''} onChange={e => updateStyle('successMessage', e.target.value)} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-600 mb-1">Texto do Botão de Reinício</label>
                                              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="Enviar outra resposta" value={currentForm.style?.successButtonText || ''} onChange={e => updateStyle('successButtonText', e.target.value)} />
                                          </div>
                                      </div>
                                  </section>

                                  <section>
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={14}/> Branding e Botão</h4>
                                      <div className="space-y-6">
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-1">Logo URL (Opcional)</label>
                                              <input type="text" className="w-full border rounded-lg px-3 py-2 text-xs font-mono" placeholder="https://..." value={currentForm.style?.logoUrl || ''} onChange={e => updateStyle('logoUrl', e.target.value)} />
                                              <p className="text-[10px] text-slate-400 mt-1">Se preenchido, substitui a logo padrão da VOLL.</p>
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-1">Texto do Botão de Envio</label>
                                              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enviar Formulário" value={currentForm.style?.buttonText} onChange={e => updateStyle('buttonText', e.target.value)} />
                                          </div>
                                      </div>
                                  </section>
                              </div>

                              {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
                              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 sticky top-12 max-h-[600px] flex flex-col items-center justify-center overflow-hidden">
                                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Preview em Tempo Real</span>
                                  <div 
                                    className={clsx(
                                        "bg-white shadow-xl w-full p-8 transition-all duration-300 overflow-hidden",
                                        currentForm.style?.borderRadius === 'none' && "rounded-none",
                                        currentForm.style?.borderRadius === 'small' && "rounded-lg",
                                        currentForm.style?.borderRadius === 'medium' && "rounded-2xl",
                                        currentForm.style?.borderRadius === 'large' && "rounded-[2.5rem]",
                                        currentForm.style?.borderRadius === 'full' && "rounded-[3.5rem]"
                                    )}
                                    style={{ color: currentForm.style?.textColor, fontFamily: currentForm.style?.fontFamily === 'serif' ? 'serif' : 'inherit' }}
                                  >
                                      {currentForm.style?.logoUrl && <img src={currentForm.style.logoUrl} className="h-8 mb-4 object-contain" alt="Logo" />}
                                      <div style={{ textAlign: currentForm.style?.titleAlignment }}>
                                          <h4 className="text-xl font-black mb-2">{currentForm.title}</h4>
                                          <p className="text-xs opacity-60 mb-6">Esta é uma prévia do estilo selecionado.</p>
                                      </div>
                                      <div className="space-y-4">
                                          <div className="h-3 w-1/3 bg-slate-100 rounded"></div>
                                          <div className="h-10 w-full bg-slate-50 border rounded-lg"></div>
                                          <button 
                                            className="w-full py-3 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                                            style={{ 
                                                backgroundColor: currentForm.style?.primaryColor,
                                                borderRadius: currentForm.style?.borderRadius === 'full' ? '9999px' : undefined
                                            }}
                                          >
                                              {currentForm.style?.buttonText}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </main>
              ) : (
                  <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                      <div className="max-w-2xl mx-auto space-y-10">
                          <section>
                              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Settings size={20} className="text-teal-600"/> Comportamento e Inteligência Comercial</h3>
                              <div className="space-y-6">
                                  <label className="flex items-start gap-4 p-5 bg-teal-50 rounded-2xl border border-teal-100 cursor-pointer group">
                                      <div className={clsx("mt-1 p-2 rounded-lg transition-colors", currentForm.isLeadCapture ? "bg-teal-600 text-white" : "bg-white text-slate-300")}>
                                          <Target size={20} />
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold text-teal-900">Transformar Respostas em Leads</span>
                                              <input type="checkbox" checked={currentForm.isLeadCapture} onChange={e => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})} className="w-6 h-6 rounded text-teal-600 focus:ring-teal-500" />
                                          </div>
                                          <p className="text-xs text-teal-700 leading-relaxed">Se ativado, cada nova resposta enviada criará automaticamente um card de Negociação no CRM Comercial.</p>
                                      </div>
                                  </label>

                                  {currentForm.isLeadCapture && (
                                      <div className="space-y-6 animate-in slide-in-from-top-2 p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
                                          {/* DESTINO NO CRM */}
                                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Filter size={14} className="text-teal-600"/> Destino do Lead</h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Funil de Vendas</label>
                                                      <select 
                                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-bold text-teal-800 outline-none focus:ring-2 focus:ring-teal-500"
                                                        value={currentForm.targetPipeline}
                                                        onChange={e => {
                                                            const newPipe = pipelines.find(p => p.name === e.target.value);
                                                            setCurrentForm({
                                                                ...currentForm, 
                                                                targetPipeline: e.target.value,
                                                                targetStage: (newPipe?.stages || [])[0]?.id || 'new'
                                                            });
                                                        }}
                                                      >
                                                          {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                      </select>
                                                  </div>
                                                  <div>
                                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Etapa Inicial</label>
                                                      <select 
                                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                                                        value={currentForm.targetStage}
                                                        onChange={e => setCurrentForm({...currentForm, targetStage: e.target.value})}
                                                      >
                                                          {(activePipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                                      </select>
                                                  </div>
                                              </div>
                                          </div>

                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Tag size={12}/> Nome da Campanha (Rastreio no CRM)</label>
                                              <input type="text" className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all outline-none" placeholder="Ex: Campanha Verão 2025, Bio Instagram..." value={currentForm.campaign} onChange={e => setCurrentForm({...currentForm, campaign: e.target.value})} />
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl">
                                              <div>
                                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><ArrowRightLeft size={12}/> Modo de Distribuição</label>
                                                  <select className="w-full px-3 py-2 border rounded-xl bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500" value={currentForm.distributionMode} onChange={e => setCurrentForm({...currentForm, distributionMode: e.target.value as any})}>
                                                      <option value="fixed">Vendedor Fixo (Sempre o mesmo)</option>
                                                      <option value="round-robin">Fila de Rodízio (Por Equipe)</option>
                                                  </select>
                                              </div>

                                              {currentForm.distributionMode === 'fixed' ? (
                                                  <div className="animate-in fade-in">
                                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><User size={12}/> Escolher Vendedor</label>
                                                      <select className="w-full px-3 py-2 border rounded-xl bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500" value={currentForm.fixedOwnerId || ''} onChange={e => setCurrentForm({...currentForm, fixedOwnerId: e.target.value})}>
                                                          <option value="">Selecione um vendedor...</option>
                                                          {collaborators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                                      </select>
                                                  </div>
                                              ) : (
                                                  <div className="animate-in fade-in">
                                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Users size={12}/> Selecionar Equipe Comercial</label>
                                                      <select className="w-full px-3 py-2 border border-indigo-200 rounded-xl bg-white font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" value={currentForm.teamId || ''} onChange={e => setCurrentForm({...currentForm, teamId: e.target.value})}>
                                                          <option value="">Escolha a Equipe...</option>
                                                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                      </select>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  )}

                                  {/* PASTA SELECTOR NO EDITOR */}
                                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Folder size={14}/> Organização</h4>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">Mover para Pasta</label>
                                          <select 
                                              className="w-full px-4 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                              value={currentForm.folderId || ''}
                                              onChange={e => setCurrentForm({...currentForm, folderId: e.target.value || null})}
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
                onClick={() => setView('templates')} 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 mb-4 active:scale-95"
            >
                <Plus size={18} /> Novo Formulário
            </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Navegação</p>
            
            <button 
                onClick={() => setCurrentFolderId(null)}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                    currentFolderId === null ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <span className="flex items-center gap-2"><LayoutGrid size={16} /> Todos os Formulários</span>
                <span className="text-xs opacity-60 bg-white px-1.5 rounded-full border border-slate-100">{forms.length}</span>
            </button>

            <div className="mt-4 flex items-center justify-between px-3 mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pastas</p>
                <button onClick={() => setShowFolderModal(true)} className="text-slate-400 hover:text-teal-600 p-1 rounded-md hover:bg-teal-50 transition-colors" title="Nova Pasta">
                    <FolderPlus size={16} />
                </button>
            </div>

            <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {folders.map(f => {
                    const count = forms.filter(form => form.folderId === f.id).length;
                    return (
                        <div key={f.id} className="group relative">
                            <button 
                                onClick={() => setCurrentFolderId(f.id)}
                                className={clsx(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    currentFolderId === f.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Folder size={16} className={currentFolderId === f.id ? "fill-teal-200 text-teal-600" : "text-slate-400 group-hover:text-teal-600"} />
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
                        <Folder className="text-teal-600" /> {folders.find(f => f.id === currentFolderId)?.name}
                      </>
                  ) : (
                      <>
                        <LayoutGrid className="text-teal-600" /> Todos os Formulários
                      </>
                  )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                  {filteredForms.length} itens localizados
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32}/></div>
            ) : filteredForms.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                    <LayoutTemplate className="mx-auto mb-4 opacity-20" size={64}/>
                    <p className="text-lg font-bold">Nenhum formulário nesta pasta</p>
                    <p className="text-sm">Mova formulários para cá ou crie um novo.</p>
                </div>
            ) : (
                filteredForms.map(f => (
                    <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all flex flex-col group overflow-hidden">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border", f.isLeadCapture ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                    {f.isLeadCapture ? 'Lead Capture ON' : 'Pesquisa Simples'}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setShowMoveModal(f)} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg" title="Mover p/ Pasta"><MoveRight size={16}/></button>
                                    <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <h3 className="font-black text-slate-800 text-lg mb-1 line-clamp-1">{f.title}</h3>
                            <p className="text-xs text-slate-400 mb-6">{f.questions.length} campos de entrada</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleViewResponses(f)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors"
                                >
                                    <Table size={20} className="mb-1 text-indigo-500" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                                    <p className="text-xl font-black text-slate-800">{f.submissionsCount || 0}</p>
                                </button>
                                <button onClick={() => handleShare(f)} className="bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl flex flex-col items-center justify-center transition-colors shadow-sm">
                                    <Share2 size={20} />
                                    <span className="text-[10px] font-black uppercase mt-1">Enviar Link</span>
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
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Nova Pasta de Formulários</h3>
                      <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Pasta</label>
                      <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Ex: Eventos 2025"
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          autoFocus
                      />
                  </div>
                  <div className="px-5 py-3 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700 shadow-sm">Criar Pasta</button>
                  </div>
              </div>
          </div>
      )}

      {/* Move Form Modal */}
      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Mover Formulário</h3>
                      <button onClick={() => setShowMoveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <p className="text-sm text-slate-500 mb-4">Selecione a pasta de destino para: <br/><strong className="text-slate-800">{showMoveModal.title}</strong></p>
                      <div className="space-y-1">
                          <button 
                              onClick={() => handleMoveForm(showMoveModal, null)}
                              className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors", !showMoveModal.folderId ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <span className="flex items-center gap-2"><LayoutGrid size={16} /> Sem Pasta (Raiz)</span>
                              {!showMoveModal.folderId && <Check size={14}/>}
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={() => handleMoveForm(showMoveModal, f.id)}
                                  className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors", showMoveModal.folderId === f.id ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
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

      {sharingForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Share2 size={18} className="text-teal-600"/> Compartilhar Formulário</h3>
                      <button onClick={() => setSharingForm(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-8 space-y-8">
                      <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Link Direto (WhatsApp/Redes)</label>
                          <div className="flex gap-2">
                              <input readOnly value={`${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}`} className="flex-1 bg-slate-50 border rounded-lg px-3 py-3 text-xs font-mono text-slate-600 focus:outline-none" />
                              <button onClick={() => copyToClipboard(`${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}`, 'link')} className="bg-teal-600 text-white px-5 py-3 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95">
                                  {copiedType === 'link' ? <Check size={16}/> : <Copy size={16}/>} {copiedType === 'link' ? 'Copiado' : 'Copiar'}
                              </button>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Incorporar no Site (IFrame)</label>
                          <textarea readOnly value={`<iframe src="${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}&embed=true" width="100%" height="600" frameborder="0"></iframe>`} className="w-full bg-slate-50 border rounded-lg p-4 text-[10px] font-mono text-slate-500 h-28 focus:outline-none" />
                          <button onClick={() => copyToClipboard(`<iframe src="${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}&embed=true" width="100%" height="600" frameborder="0"></iframe>`, 'embed')} className="text-xs font-black text-teal-600 hover:underline flex items-center gap-2 mt-2">
                              {copiedType === 'embed' ? <Check size={14}/> : <Code size={14}/>} {copiedType === 'embed' ? 'Código Copiado' : 'Copiar código de incorporação'}
                          </button>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => setSharingForm(null)} className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors">Fechar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
