
import React, { useState, useEffect } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle } from '../types';
import { FormViewer } from './FormViewer';
import { 
  FileText, Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, GripHorizontal, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, CheckSquare, Target, Share2, CheckCircle,
  LayoutTemplate, Monitor, Smartphone, Palette, Columns, X, Image as ImageIcon, Grid, Ban, Users, User, ArrowRightLeft, Info, Code, ExternalLink, Tag, Loader2,
  Layers, Check
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import clsx from 'clsx';

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
      cardTransparent: false
  },
  distributionMode: 'fixed'
};

const TEMPLATES = [
    {
        id: 'classic',
        title: 'Contato Geral',
        description: 'Formulário padrão para captação de novos contatos.',
        previewColor: 'bg-slate-200',
        questions: [
            { id: 't1', title: 'Nome', type: 'text', required: true, placeholder: 'Seu nome completo' },
            { id: 't2', title: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' },
            { id: 't3', title: 'Telefone', type: 'phone', required: true, placeholder: '(00) 00000-0000' }
        ]
    },
    {
        id: 'lead',
        title: 'Captura de Lead',
        description: 'Focado em conversão com campo de campanha rastreável.',
        previewColor: 'bg-indigo-100',
        questions: [
            { id: 't1', title: 'Nome Completo', type: 'text', required: true, placeholder: '' },
            { id: 't2', title: 'E-mail', type: 'email', required: true, placeholder: '' },
            { id: 't3', title: 'Interesse', type: 'text', required: false, placeholder: 'Ex: Pilates Clássico' }
        ]
    }
];

export const FormsManager: React.FC<FormsManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'templates' | 'editor' | 'preview'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'settings'>('editor');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingForm, setSharingForm] = useState<FormModel | null>(null);
  const [copiedType, setCopiedType] = useState<'link' | 'embed' | null>(null);

  useEffect(() => { loadForms(); loadTeamsData(); }, []);

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

  const loadTeamsData = async () => { 
      try { 
          const [tRes, cRes] = await Promise.all([
              appBackend.client.from('crm_teams').select('*'), 
              appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active')
          ]); 
          if (tRes.data) setTeams(tRes.data); 
          if (cRes.data) setCollaborators(cRes.data.map((c: any) => ({ id: c.id, full_name: c.full_name }))); 
      } catch (e) {} 
  };

  const selectTemplate = (template: any) => { 
      const newForm: FormModel = { 
          ...INITIAL_FORM, 
          id: crypto.randomUUID(), 
          title: template.title, 
          description: template.description, 
          questions: template.id === 'blank' ? [] : template.questions.map((q: any) => ({ ...q, id: crypto.randomUUID() })), 
          createdAt: new Date().toISOString(), 
          isLeadCapture: template.id !== 'blank' 
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

  const addQuestion = (type: QuestionType) => { 
      const titles: Record<string, string> = { text: 'Texto Curto', email: 'Email', phone: 'Telefone', paragraph: 'Mensagem Longa', number: 'Número', date: 'Data' }; 
      const newQ: FormQuestion = { 
          id: crypto.randomUUID(), 
          title: titles[type] || 'Nova Pergunta', 
          type: type, 
          required: false, 
          placeholder: 'Sua resposta...' 
      }; 
      setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] })); 
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
      setCurrentForm(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q) }));
  };

  const removeQuestion = (id: string) => {
      setCurrentForm(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const handleShare = (form: FormModel) => {
      setSharingForm(form);
  };

  const copyToClipboard = (text: string, type: 'link' | 'embed') => {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
  };

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
                onClick={() => selectTemplate({ id: 'blank', title: 'Novo Formulário', description: '', questions: [] })}
            >
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Plus size={32} />
                </div>
                <h3 className="font-bold text-slate-700">Em Branco</h3>
                <p className="text-xs text-slate-500 mt-1">Crie seu formulário totalmente personalizado.</p>
            </div>
            {TEMPLATES.map(tpl => (
                <div 
                    key={tpl.id} 
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer flex flex-col group"
                    onClick={() => selectTemplate(tpl)}
                >
                    <div className={clsx("h-32 flex items-center justify-center", tpl.previewColor)}>
                        <FileText size={48} className="text-white/50 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-5 flex-1">
                        <h3 className="font-bold text-slate-800">{tpl.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  if (view === 'editor') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1">
                      <ArrowLeft size={16} /> Sair
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Perguntas</button>
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
                    <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 shrink-0">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adicionar Campo</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => addQuestion('text')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <Type size={18} className="text-teal-500" /> Texto Curto
                            </button>
                            <button onClick={() => addQuestion('paragraph')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <AlignLeft size={18} className="text-teal-500" /> Mensagem Longa
                            </button>
                            <button onClick={() => addQuestion('email')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <Mail size={18} className="text-teal-500" /> E-mail
                            </button>
                            <button onClick={() => addQuestion('phone')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <Phone size={18} className="text-teal-500" /> Telefone
                            </button>
                            <button onClick={() => addQuestion('number')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <Hash size={18} className="text-teal-500" /> Número
                            </button>
                            <button onClick={() => addQuestion('date')} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-medium text-slate-700 transition-all text-left">
                                <Calendar size={18} className="text-teal-500" /> Data
                            </button>
                        </div>
                    </aside>
                    <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl border-2 border-teal-500 p-8 shadow-sm">
                                <input 
                                    type="text" 
                                    className="w-full text-3xl font-black text-slate-800 border-none focus:ring-0 placeholder:text-slate-200 p-0 mb-2" 
                                    value={currentForm.title} 
                                    onChange={e => setCurrentForm({...currentForm, title: e.target.value})}
                                    placeholder="Título do Formulário"
                                />
                                <textarea 
                                    className="w-full text-slate-500 border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none" 
                                    value={currentForm.description} 
                                    onChange={e => setCurrentForm({...currentForm, description: e.target.value})}
                                    placeholder="Descrição opcional..."
                                />
                            </div>

                            <div className="space-y-4">
                                {currentForm.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm group hover:border-teal-300 transition-all relative">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-slate-300">#{idx + 1}</span>
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 font-bold text-slate-700 border-b border-transparent focus:border-teal-500 focus:ring-0 p-0"
                                                        value={q.title}
                                                        onChange={e => updateQuestion(q.id, 'title', e.target.value)}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded border">{q.type}</span>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                                                    value={q.placeholder || ''}
                                                    onChange={e => updateQuestion(q.id, 'placeholder', e.target.value)}
                                                    placeholder="Dica de preenchimento (Placeholder)"
                                                />
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <button onClick={() => removeQuestion(q.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Obrigatório</span>
                                                    <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, 'required', e.target.checked)} className="rounded text-teal-600" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {currentForm.questions.length === 0 && (
                                    <div className="text-center py-20 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                                        <Layers className="mx-auto mb-2 opacity-20" size={48} />
                                        <p className="font-medium">Comece adicionando um campo lateral.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                  </>
              ) : (
                  <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                      <div className="max-w-2xl mx-auto space-y-10">
                          <section>
                              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4"><Settings size={20} className="text-teal-600"/> Comportamento e CRM</h3>
                              <div className="space-y-6">
                                  <label className="flex items-start gap-4 p-5 bg-teal-50 rounded-2xl border border-teal-100 cursor-pointer group">
                                      <div className={clsx("mt-1 p-2 rounded-lg transition-colors", currentForm.isLeadCapture ? "bg-teal-600 text-white" : "bg-white text-slate-300")}>
                                          <Target size={20} />
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold text-teal-900">Habilitar Captura de Leads</span>
                                              <input type="checkbox" checked={currentForm.isLeadCapture} onChange={e => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})} className="w-6 h-6 rounded text-teal-600 focus:ring-teal-500" />
                                          </div>
                                          <p className="text-xs text-teal-700 leading-relaxed">Se ativado, cada resposta criará automaticamente uma nova Negociação no CRM Comercial.</p>
                                      </div>
                                  </label>

                                  {currentForm.isLeadCapture && (
                                      <div className="space-y-4 animate-in slide-in-from-top-2 p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Tag size={12}/> Nome da Campanha (Rastreio)</label>
                                              <input type="text" className="w-full px-4 py-2 border rounded-xl" placeholder="Ex: Black Friday 2024, Instagram Link Bio..." value={currentForm.campaign} onChange={e => setCurrentForm({...currentForm, campaign: e.target.value})} />
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div>
                                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><ArrowRightLeft size={12}/> Distribuição de Leads</label>
                                                  <select className="w-full px-3 py-2 border rounded-xl bg-white" value={currentForm.distributionMode} onChange={e => setCurrentForm({...currentForm, distributionMode: e.target.value as any})}>
                                                      <option value="fixed">Vendedor Único Fixo</option>
                                                      <option value="round-robin">Rodízio por Equipe (Fila)</option>
                                                  </select>
                                              </div>

                                              {currentForm.distributionMode === 'fixed' ? (
                                                  <div>
                                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><User size={12}/> Vendedor Responsável</label>
                                                      <select className="w-full px-3 py-2 border rounded-xl bg-white" value={currentForm.fixedOwnerId || ''} onChange={e => setCurrentForm({...currentForm, fixedOwnerId: e.target.value})}>
                                                          <option value="">Selecione um vendedor...</option>
                                                          {collaborators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                                      </select>
                                                  </div>
                                              ) : (
                                                  <div>
                                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> Equipe Comercial</label>
                                                      <select className="w-full px-3 py-2 border rounded-xl bg-white" value={currentForm.teamId || ''} onChange={e => setCurrentForm({...currentForm, teamId: e.target.value})}>
                                                          <option value="">Escolha a Equipe...</option>
                                                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                      </select>
                                                  </div>
                                              )}
                                          </div>

                                          <div className="mt-2 flex items-start gap-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-lg italic">
                                              <Info size={14} className="shrink-0 text-indigo-400" />
                                              <span>No modo Rodízio, o sistema atribui cada novo lead ao próximo membro disponível na equipe, garantindo igualdade na distribuição.</span>
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
            <div><h2 className="text-2xl font-bold text-slate-800">Formulários de Captura</h2><p className="text-slate-500 text-sm">Crie formulários e converta visitantes em alunos.</p></div>
        </div>
        <button onClick={() => setView('templates')} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Plus size={18} /> Novo Formulário</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-teal-600" size={32}/></div> : forms.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide", f.isLeadCapture ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                        {f.isLeadCapture ? 'Lead Capture' : 'Pesquisa'}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-teal-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 mb-4">{f.questions.length} perguntas cadastradas</p>
                
                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p>
                        <p className="text-lg font-black text-slate-700">{f.submissionsCount || 0}</p>
                    </div>
                    <button onClick={() => handleShare(f)} className="bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg flex flex-col items-center justify-center transition-colors">
                        <Share2 size={18} />
                        <span className="text-[10px] font-bold uppercase mt-1">Compartilhar</span>
                    </button>
                </div>
            </div>
          </div>
        ))}
        {!loading && forms.length === 0 && <div className="col-span-full text-center py-20 text-slate-400">Nenhum formulário criado.</div>}
      </div>

      {sharingForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Share2 size={18} className="text-teal-600"/> Compartilhar Formulário</h3>
                      <button onClick={() => setSharingForm(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Link Direto</label>
                          <div className="flex gap-2">
                              <input readOnly value={`${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}`} className="flex-1 bg-slate-50 border rounded-lg px-3 py-2 text-xs font-mono text-slate-600" />
                              <button onClick={() => copyToClipboard(`${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}`, 'link')} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm">
                                  {copiedType === 'link' ? <Check size={14}/> : <Copy size={14}/>} {copiedType === 'link' ? 'Copiado' : 'Copiar'}
                              </button>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Código para Site (IFrame)</label>
                          <textarea readOnly value={`<iframe src="${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}&embed=true" width="100%" height="600" frameborder="0"></iframe>`} className="w-full bg-slate-50 border rounded-lg p-3 text-[10px] font-mono text-slate-500 h-24" />
                          <button onClick={() => copyToClipboard(`<iframe src="${window.location.origin}${window.location.pathname}?publicFormId=${sharingForm.id}&embed=true" width="100%" height="600" frameborder="0"></iframe>`, 'embed')} className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
                              {copiedType === 'embed' ? <Check size={14}/> : <Code size={14}/>} {copiedType === 'embed' ? 'Código Copiado' : 'Copiar código de incorporação'}
                          </button>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => setSharingForm(null)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm">Fechar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
