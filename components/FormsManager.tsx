
import React, { useState, useEffect } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle } from '../types';
import { FormViewer } from './FormViewer';
import { 
  FileText, Plus, MoreVertical, Trash2, Eye, Edit2, 
  ArrowLeft, Save, GripVertical, GripHorizontal, Copy, Settings,
  Type, AlignLeft, Mail, Phone, Calendar, Hash, CheckSquare, Target, Share2, CheckCircle,
  LayoutTemplate, Monitor, Smartphone, Palette, Columns, X, Image as ImageIcon, Grid, Ban, Users, User, ArrowRightLeft, Info, Code, ExternalLink, Tag
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
        title: 'Clássico',
        description: 'Formulário padrão para contato.',
        previewColor: 'bg-slate-200',
        questions: [
            { id: 't1', title: 'Nome', type: 'text', required: true, placeholder: 'Seu nome' },
            { id: 't2', title: 'Email', type: 'email', required: true, placeholder: 'Seu email' },
            { id: 't3', title: 'Empresa', type: 'text', required: false, placeholder: 'Sua empresa' },
            { id: 't4', title: 'Cargo', type: 'text', required: false, placeholder: 'Seu cargo' }
        ]
    },
    {
        id: 'ebook',
        title: 'Baixar eBook gratuito',
        description: 'Focado em conversão de materiais ricos.',
        previewColor: 'bg-pink-100',
        questions: [
            { id: 't1', title: 'Nome', type: 'text', required: true, placeholder: 'Digite seu nome' },
            { id: 't2', title: 'Email', type: 'email', required: true, placeholder: 'Digite seu melhor email' }
        ]
    },
    {
        id: 'newsletter',
        title: 'Assinar Newsletter',
        description: 'Captura rápida de leads para nutrição.',
        previewColor: 'bg-blue-100',
        questions: [
            { id: 't1', title: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' }
        ]
    }
];

const TEXTURES = [
    { id: 'dots', name: 'Pontilhado' },
    { id: 'grid', name: 'Grade' },
    { id: 'diagonal', name: 'Diagonal' },
];

export const FormsManager: React.FC<FormsManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'templates' | 'editor' | 'preview'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'settings'>('editor');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingForm, setSharingForm] = useState<FormModel | null>(null);
  const [copiedType, setCopiedType] = useState<'link' | 'embed' | null>(null);

  useEffect(() => { loadForms(); loadTeamsData(); }, []);

  const loadForms = async () => { setLoading(true); const data = await appBackend.getForms(); setForms(data); setLoading(false); };
  const loadTeamsData = async () => { try { const [tRes, cRes] = await Promise.all([appBackend.client.from('crm_teams').select('*'), appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active')]); if (tRes.data) setTeams(tRes.data); if (cRes.data) setCollaborators(cRes.data); } catch (e) {} };

  const selectTemplate = (template: any) => { const newForm: FormModel = { ...INITIAL_FORM, id: crypto.randomUUID(), title: template.id === 'classic' ? 'Fale Conosco' : template.title, description: template.description, campaign: '', questions: template.questions.map((q: any) => ({ ...q, id: crypto.randomUUID() })), createdAt: new Date().toISOString(), isLeadCapture: true }; setCurrentForm(newForm); setView('editor'); setEditorStep('editor'); };
  const handleEdit = (form: FormModel) => { setCurrentForm({ ...INITIAL_FORM, ...form }); setView('editor'); setEditorStep('editor'); };
  const handleDelete = async (id: string) => { const target = forms.find(f => f.id === id); if(window.confirm("Excluir este formulário?")) { await appBackend.deleteForm(id); await appBackend.logActivity({ action: 'delete', module: 'forms', details: `Excluiu formulário: ${target?.title}`, recordId: id }); loadForms(); } };
  const handleSaveForm = async () => { const isUpdate = !!currentForm.id && forms.some(f => f.id === currentForm.id); await appBackend.saveForm(currentForm); await appBackend.logActivity({ action: isUpdate ? 'update' : 'create', module: 'forms', details: `${isUpdate ? 'Editou' : 'Criou'} formulário: ${currentForm.title}`, recordId: currentForm.id || undefined }); loadForms(); setView('list'); };

  const handleShare = (form: FormModel) => setSharingForm(form);
  const updateStyle = (key: keyof FormStyle, value: any) => setCurrentForm(prev => ({ ...prev, style: { ...prev.style!, [key]: value } }));
  const addQuestion = (type: QuestionType) => { const titles: Record<string, string> = { text: 'Texto Curto', email: 'Email', phone: 'Telefone', paragraph: 'Mensagem', number: 'Número', date: 'Data' }; const newQ: FormQuestion = { id: crypto.randomUUID(), title: titles[type] || 'Nova Pergunta', type: type, required: false, placeholder: 'Sua resposta...' }; setCurrentForm(prev => ({ ...prev, questions: [...prev.questions, newQ] })); };
  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => setCurrentForm(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q) }));
  const removeQuestion = (id: string) => setCurrentForm(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));

  if (view === 'preview') return <FormViewer form={currentForm} onBack={() => setView('list')} />;
  if (view === 'templates') return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-20 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4"><button onClick={() => setView('list')} className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"> <ArrowLeft size={16} /> Voltar</button><div className="h-6 w-px bg-slate-200"></div><div className="flex items-center text-sm"><span className="font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">1. Modelos</span><span className="mx-2 text-slate-300">/</span><span className="text-slate-400">2. Editor</span></div></div>
        </div>
        <div className="p-8"><h2 className="text-2xl font-bold text-slate-800 mb-8">Escolha um modelo</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-teal-500 transition-all cursor-pointer flex flex-col h-full" onClick={() => selectTemplate({ id: 'blank', title: 'Em branco', description: '', questions: [] })}><div className="h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center"><Plus size={48} className="text-slate-300 group-hover:text-teal-500" /></div><div className="p-5 flex-1"><h3 className="font-bold text-slate-800 mb-1">Em Branco</h3><p className="text-xs text-slate-500">Crie seu formulário do zero.</p></div></div>{TEMPLATES.map(tpl => (<div key={tpl.id} className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-teal-500 transition-all cursor-pointer flex flex-col h-full" onClick={() => selectTemplate(tpl)}><div className={clsx("h-40 border-b border-slate-100 p-6 flex flex-col justify-center gap-2", tpl.previewColor)}><div className="bg-white w-full h-full shadow-lg rounded-t-lg p-3 space-y-2 translate-y-2 opacity-80"><div className="h-2 w-1/2 bg-slate-200 rounded"></div><div className="h-6 w-full border border-slate-200 rounded bg-slate-50"></div><div className="h-6 w-1/3 bg-green-500 rounded mt-2"></div></div></div><div className="p-5 flex-1"><h3 className="font-bold text-slate-800 mb-1">{tpl.title}</h3><p className="text-xs text-slate-500">{tpl.description}</p></div></div>))}</div></div>
    </div>
  );

  if (view === 'editor') return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden animate-in fade-in">
        <div className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between shadow-sm z-30"><div className="flex items-center gap-4"><button onClick={() => setView('list')} className="text-slate-500 hover:text-teal-600 text-sm font-medium border border-slate-300 px-3 py-1.5 rounded">Voltar</button><div className="h-6 w-px bg-slate-200"></div><div className="flex bg-slate-100 rounded p-1"><button onClick={() => setEditorStep('editor')} className={clsx("px-4 py-1 text-sm font-medium rounded transition-all", editorStep === 'editor' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Editor</button><button onClick={() => setEditorStep('settings')} className={clsx("px-4 py-1 text-sm font-medium rounded transition-all", editorStep === 'settings' ? "bg-white shadow text-teal-700" : "text-slate-500")}>Configurações</button></div></div><button onClick={handleSaveForm} className="bg-teal-600 text-white px-5 py-2 rounded font-bold text-sm shadow-sm transition-all flex items-center gap-2"><Save size={16} /> Salvar e Sair</button></div>
        <div className="flex-1 flex overflow-hidden">
            {editorStep === 'editor' && (<><div className="w-80 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-20"><div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Campos disponíveis</h3></div><div className="p-4 overflow-y-auto flex-1 space-y-2"><button onClick={() => addQuestion('text')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 transition-all bg-white text-sm font-medium"><Type size={18} /> Texto Curto</button><button onClick={() => addQuestion('email')} className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 hover:border-teal-500 transition-all bg-white text-sm font-medium"><Mail size={18} /> Email</button></div></div><div className="flex-1 bg-slate-50 overflow-y-auto p-8 flex flex-col items-center"><div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate