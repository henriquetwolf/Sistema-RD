
import React, { useState, useEffect, useMemo } from 'react';
import { FormModel, FormQuestion, QuestionType, FormStyle, FormAnswer, FormFolder, AutomationFlow, WAAutomationLog, EmailConfig } from '../types';
import { FormViewer } from './FormViewer';
import { AutomationFlowEditor } from './AutomationFlowEditor';
import { 
  Plus, Trash2, Eye, Edit2, ArrowLeft, Save, Copy, Target, Share2, 
  Loader2, Check, List, CheckSquare as CheckboxIcon, Inbox, Download, Table, 
  Layout, Folder, FolderPlus, MoveRight, LayoutGrid, X, Type, AlignLeft, 
  Mail, Phone, Calendar, Hash, Palette, Sparkles, Image as ImageIcon,
  AlignCenter, Filter, Tag, ArrowRightLeft, User, Users, Info, FileSpreadsheet, RefreshCw, Megaphone,
  Zap, GitBranch, Settings, Smartphone, Wifi, WifiOff, Link2, History
} from 'lucide-react';
import { appBackend, Pipeline } from '../services/appBackend';
import clsx from 'clsx';

declare const XLSX: any;

interface FormsManagerProps {
  onBack: () => void;
}

interface WAConfig {
  mode: 'evolution' | 'twilio';
  evolutionMethod: 'qr' | 'code';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  pairingNumber: string;
  isConnected: boolean;
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
    { value: 'company_name', label: 'Nome Completo do Cliente *' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone / WhatsApp' },
    { value: 'cpf', label: 'CPF' },
    { value: 'contact_name', label: 'Nome do Contato / Sócio (Opcional)' },
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
  const [activeTab, setActiveTab] = useState<'forms' | 'flows'>('forms');
  const [flowSubTab, setFlowSubTab] = useState<'list' | 'logs'>('list');
  const [view, setView] = useState<'list' | 'editor' | 'responses' | 'preview' | 'flow_editor'>('list');
  const [editorStep, setEditorStep] = useState<'editor' | 'design' | 'settings'>('editor');
  const [forms, setForms] = useState<FormModel[]>([]);
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [logs, setLogs] = useState<WAAutomationLog[]>([]);
  const [folders, setFolders] = useState<FormFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentForm, setCurrentForm] = useState<FormModel>(INITIAL_FORM);
  const [currentFlow, setCurrentFlow] = useState<AutomationFlow | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<FormModel | null>(null);
  const [showShareModal, setShowShareModal] = useState<FormModel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // WhatsApp Config States
  const [showWAConfig, setShowWAConfig] = useState(false);
  const [isSavingWAConfig, setIsSavingWAConfig] = useState(false);
  const [isGeneratingWAConnection, setIsGeneratingWAConnection] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [waConnLogs, setWaConnLogs] = useState<string[]>([]);
  const [waConfig, setWaConfig] = useState<WAConfig>({
      mode: 'evolution',
      evolutionMethod: 'qr',
      instanceUrl: '',
      instanceName: '',
      apiKey: '',
      pairingNumber: '',
      isConnected: false
  });

  // Email Config States
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [isSavingEmailConfig, setIsSavingEmailConfig] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    apiKey: '',
    senderEmail: '',
    senderName: 'VOLL Pilates'
  });

  const webhookUrlDisplay = "https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/rapid-service";

  useEffect(() => { 
    loadForms(); 
    loadFlows(); 
    loadFolders(); 
    loadMetadata(); 
    loadWAConfig(); 
    loadEmailConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'flows' && flowSubTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, flowSubTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await appBackend.getWAAutomationLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWAConfig = async () => {
    const c = await appBackend.getWhatsAppConfig();
    if (c) {
        setWaConfig(prev => ({ ...prev, ...c }));
        checkWARealStatus(c);
    }
  };

  const loadEmailConfig = async () => {
    const c = await appBackend.getEmailConfig();
    if (c) {
      setEmailConfig(c);
    }
  };

  const checkWARealStatus = async (targetConfig?: any) => {
    const target = targetConfig || waConfig;
    if (!target.instanceUrl || !target.instanceName) return;
    try {
        let baseUrl = target.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        const response = await fetch(`${baseUrl}/instance/connectionState/${target.instanceName.trim()}`, {
            headers: { 'apikey': target.apiKey.trim() }
        });
        const data = await response.json();
        const state = data.instance?.state || data.state || 'closed';
        setWaConfig(prev => ({ ...prev, isConnected: state === 'open' }));
    } catch (e) {
        setWaConfig(prev => ({ ...prev, isConnected: false }));
    }
  };

  const handleSaveWAConfig = async () => {
    setIsSavingWAConfig(true);
    try {
        const sanitizedConfig = {
            ...waConfig,
            instanceUrl: waConfig.instanceUrl.trim().replace(/\/$/, ""),
            instanceName: waConfig.instanceName.trim(),
            apiKey: waConfig.apiKey.trim()
        };
        await appBackend.saveWhatsAppConfig(sanitizedConfig);
        setWaConfig(sanitizedConfig);
        setShowWAConfig(false);
        alert("Configurações do WhatsApp salvas!");
        checkWARealStatus(sanitizedConfig);
    } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsSavingWAConfig(false); }
  };

  const handleSaveEmailConfig = async () => {
    setIsSavingEmailConfig(true);
    try {
      await appBackend.saveEmailConfig(emailConfig);
      setShowEmailConfig(false);
      alert("Configurações de E-mail salvas!");
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setIsSavingEmailConfig(false);
    }
  };

  const handleConnectWAEvolution = async () => {
    setIsGeneratingWAConnection(true);
    setQrCodeUrl(null);
    setPairingCodeValue(null);
    setWaConnLogs([`Iniciando tentativa de conexão...`]);
    try {
        if (!waConfig.instanceUrl || !waConfig.instanceName) throw new Error("Preencha os dados da instância.");
        
        let baseUrl = waConfig.instanceUrl.trim();
        if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.replace(/\/$/, "");

        if (waConfig.evolutionMethod === 'code') {
            const cleanNumber = waConfig.pairingNumber.replace(/\D/g, '');
            if (!cleanNumber) throw new Error("Número de pareamento é obrigatório.");
            
            let response = await fetch(`${baseUrl}/instance/connect/pairing-code/${waConfig.instanceName.trim()}?number=${cleanNumber}`, {
                headers: { 'apikey': waConfig.apiKey.trim() }
            });
            
            if (!response.ok && response.status === 404) {
                response = await fetch(`${baseUrl}/instance/connect/pairingCode/${waConfig.instanceName.trim()}?number=${cleanNumber}`, {
                    headers: { 'apikey': waConfig.apiKey.trim() }
                });
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro no pareamento.");
            setPairingCodeValue(data.code || data.pairingCode);
        } else {
            const response = await fetch(`${baseUrl}/instance/connect/${waConfig.instanceName.trim()}`, {
                headers: { 'apikey': waConfig.apiKey.trim() }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro ao gerar QR.");
            const token = data.base64 || data.code;
            setQrCodeUrl(token.startsWith('data:image') ? token : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
        }
    } catch (err: any) { 
        setWaConnLogs(prev => [`[ERRO] ${err.message}`, ...prev]);
    } finally { setIsGeneratingWAConnection(false); }
  };

  const loadForms = async () => { 
      setLoading(true); 
      try { const data = await appBackend.getForms(); setForms(data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadFlows = async () => {
      try { const data = await appBackend.getAutomationFlows(); setFlows(data); } catch (e) {}
  };

  const loadFolders = async () => {
    try { const data = await appBackend.getFormFolders('form'); setFolders(data); } catch (e) {}
  };

  const loadMetadata = async () => {
      try {
          const [pRes, cRes, tRes] = await Promise.all([
              appBackend.getPipelines(),
              appBackend.client.from('crm_collaborators').select('id, full_name').eq('status', 'active'),
              appBackend.client.from('crm_teams').select('id, name')
          ]);
          if (pRes) setPipelines(pRes);
          if (cRes.data) setCollaborators(cRes.data);
          if (tRes.data) setTeams(tRes.data);
      } catch (e) {}
  };

  const handleCreateFlow = () => {
      const newFlow: AutomationFlow = {
          id: crypto.randomUUID(),
          name: 'Nova Automação Sem Título',
          description: '',
          formId: '',
          isActive: false,
          nodes: [{ id: 'trigger_root', type: 'trigger', title: 'Entrada via Formulário', config: {} }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      setCurrentFlow(newFlow);
      setView('flow_editor');
      setFlowSubTab('list');
  };

  const handleEditFlow = (flow: AutomationFlow) => {
      setCurrentFlow(flow);
      setView('flow_editor');
  };

  const handleDeleteFlow = async (id: string) => {
      if (window.confirm("Excluir este fluxo de automação permanentemente?")) {
          await appBackend.deleteAutomationFlow(id);
          setFlows(prev => prev.filter(f => f.id !== id));
      }
  };

  const handleSaveFlow = async (flow: AutomationFlow) => {
      try {
          await appBackend.saveAutomationFlow(flow);
          await loadFlows();
          setView('list');
          setCurrentFlow(null);
          alert("Fluxo de automação salvo com sucesso!");
      } catch (e: any) {
          console.error("Erro ao salvar fluxo:", e);
          alert(`Falha ao salvar o fluxo no banco de dados: ${e.message || 'Erro desconhecido'}. Certifique-se de que a tabela crm_automation_flows foi criada.`);
      }
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
              setLoading(true);
              await appBackend.deleteForm(id); 
              setForms(prev => prev.filter(f => f.id !== id));
          } catch (e: any) { 
              alert("Erro ao excluir. Verifique se existem respostas vinculadas ou rode o script de reparo em configurações."); 
          } finally {
              setLoading(false);
          }
      } 
  };

  const handleOpenResponses = async (form: FormModel) => {
      setCurrentForm(form);
      setView('responses');
      setLoadingSubmissions(true);
      try {
          const data = await appBackend.getFormSubmissions(form.id);
          setSubmissions(data || []);
      } catch (e) {
          alert("Erro ao carregar respostas.");
      } finally {
          setLoadingSubmissions(false);
      }
  };

  const exportToExcel = () => {
    if (submissions.length === 0) return;
    
    const dataToExport = submissions.map(sub => {
        const row: any = { 'Data': new Date(sub.created_at).toLocaleString() };
        currentForm.questions.forEach(q => {
            const ans = (sub.answers || []).find((a: any) => a.questionId === q.id);
            row[q.title] = ans ? ans.value : '';
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Respostas");
    XLSX.writeFile(workbook, `Respostas_${currentForm.title.replace(/\s/g, '_')}.xlsx`);
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

  const currentPipeline = useMemo(() => {
      return pipelines.find(p => p.name === currentForm.targetPipeline) || pipelines[0];
  }, [pipelines, currentForm.targetPipeline]);

  if (view === 'preview') return <FormViewer form={currentForm} onBack={() => setView('editor')} />;

  if (view === 'flow_editor' && currentFlow) {
      return <AutomationFlowEditor flow={currentFlow} onBack={() => setView('list')} onSave={handleSaveFlow} availableForms={forms} />;
  }

  if (view === 'responses') return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl overflow-hidden border border-slate-200 animate-in fade-in">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1">
                      <ArrowLeft size={16} /> Voltar
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                      <h3 className="font-bold text-slate-800">{currentForm.title}</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{submissions.length} respostas coletadas</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={exportToExcel}
                    disabled={submissions.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                  >
                      <FileSpreadsheet size={16} /> Exportar Excel
                  </button>
                  <button onClick={() => handleOpenResponses(currentForm)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                      <RefreshCw size={18} className={loadingSubmissions ? "animate-spin" : ""} />
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
              {loadingSubmissions ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
              ) : submissions.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4">
                      <Inbox size={48} className="opacity-10"/>
                      <p className="font-bold">Nenhuma resposta encontrada.</p>
                  </div>
              ) : (
                  <table className="w-full text-left text-sm border-collapse min-w-max">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4 border-b border-r border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50">Data/Hora</th>
                              {currentForm.questions.map(q => (
                                  <th key={q.id} className="px-6 py-4 border-b border-r border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 max-w-[250px] truncate">{q.title}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {submissions.map((sub, sIdx) => (
                              <tr key={sub.id} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-4 border-r border-slate-50 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                      {new Date(sub.created_at).toLocaleString('pt-BR')}
                                  </td>
                                  {currentForm.questions.map(q => {
                                      const ans = (sub.answers || []).find((a: any) => a.questionId === q.id);
                                      return (
                                          <td key={q.id} className="px-6 py-4 border-r border-slate-50 text-slate-700 font-medium max-w-[250px] truncate">
                                              {ans ? ans.value : '--'}
                                          </td>
                                      );
                                  })}
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
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5"><ArrowRightLeft size={10} className="text-teal-500"/> Vincular Campo Comercial (CRM)</label>
                                                    <select className="w-full px-4 py-2 border rounded-lg text-sm bg-white font-bold text-teal-700" value={q.crmMapping || ''} onChange={e => setCurrentForm({...currentForm, questions: currentForm.questions.map(x => x.id === q.id ? {...x, crmMapping: e.target.value} : x)})}>
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
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-2">
                                          <Megaphone size={14} className="text-teal-500" /> Nome da Campanha (UTM Campaign)
                                      </label>
                                      <input 
                                          type="text" 
                                          className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-teal-100 transition-all" 
                                          value={currentForm.campaign} 
                                          onChange={e => setCurrentForm({...currentForm, campaign: e.target.value})} 
                                          placeholder="Ex: Black_Friday_2024, Instagram_Ads, Indicação..." 
                                      />
                                      <p className="text-[10px] text-slate-400 mt-1">Este nome será vinculado aos novos leads gerados por este formulário.</p>
                                  </div>

                                  <label className="flex items-center gap-4 p-5 bg-teal-50 rounded-2xl border border-teal-100 cursor-pointer">
                                      <div className={clsx("p-2 rounded-lg", currentForm.isLeadCapture ? "bg-teal-600 text-white" : "bg-white text-slate-300")}><Target size={24}/></div>
                                      <div className="flex-1"><span className="font-bold text-teal-900 block">Criar Leads no CRM</span><p className="text-xs text-teal-700">Respostas tornam-se negociações automaticamente.</p></div>
                                      <input type="checkbox" checked={currentForm.isLeadCapture} onChange={e => setCurrentForm({...currentForm, isLeadCapture: e.target.checked})} className="w-6 h-6 rounded text-teal-600" />
                                  </label>

                                  {currentForm.isLeadCapture && (
                                      <div className="space-y-6 p-6 border rounded-2xl bg-white animate-in slide-in-from-top-2">
                                          <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Funil de Vendas</label>
                                                <select className="w-full border rounded-lg p-2 text-sm font-bold" value={currentForm.targetPipeline} onChange={e => setCurrentForm({...currentForm, targetPipeline: e.target.value, targetStage: (pipelines.find(p => p.name === e.target.value)?.stages || [])[0]?.id || 'new'})}>
                                                  {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Etapa do Funil</label>
                                                <select className="w-full border rounded-lg p-2 text-sm" value={currentForm.targetStage} onChange={e => setCurrentForm({...currentForm, targetStage: e.target.value})}>
                                                  {(currentPipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                                </select>
                                              </div>
                                          </div>

                                          <div className="space-y-4 pt-4 border-t border-slate-100">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Users size={16} className="text-teal-600"/>
                                                <label className="block text-xs font-bold text-slate-700 uppercase">Atribuição e Distribuição</label>
                                              </div>
                                              
                                              <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                                                  <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Modo de Distribuição</label>
                                                    <select className="w-full border rounded-lg p-2 text-sm font-medium bg-white" value={currentForm.distributionMode} onChange={e => setCurrentForm({...currentForm, distributionMode: e.target.value as any})}>
                                                      <option value="fixed">Vendedor Fixo (Sempre o mesmo)</option>
                                                      <option value="round-robin">Rodízio por Equipe (Divisão Igualitária)</option>
                                                    </select>
                                                  </div>

                                                  {currentForm.distributionMode === 'fixed' ? (
                                                    <div className="animate-in slide-in-from-top-1">
                                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selecionar Vendedor Responsável</label>
                                                      <select className="w-full border rounded-lg p-2 text-sm font-bold text-indigo-700 bg-white" value={currentForm.fixedOwnerId || ''} onChange={e => setCurrentForm({...currentForm, fixedOwnerId: e.target.value})}>
                                                        <option value="">Escolha um vendedor...</option>
                                                        {collaborators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                                      </select>
                                                    </div>
                                                  ) : (
                                                    <div className="animate-in slide-in-from-top-1">
                                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selecionar Equipe de Vendas</label>
                                                      <select className="w-full border rounded-lg p-2 text-sm font-bold text-indigo-700 bg-white" value={currentForm.teamId || ''} onChange={e => setCurrentForm({...currentForm, teamId: e.target.value})}>
                                                        <option value="">Escolha uma equipe...</option>
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                      </select>
                                                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1"><Info size={10}/> Os leads serão distribuídos sequencialmente entre os membros ativos desta equipe.</p>
                                                    </div>
                                                  )}
                                              </div>
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
        
        <div className="space-y-2 mb-4">
            <button onClick={() => { setCurrentForm(INITIAL_FORM); setView('editor'); setEditorStep('editor'); }} className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Plus size={18} /> Novo Formulário</button>
            <button onClick={handleCreateFlow} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Zap size={18} /> Criar Fluxo</button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                <button onClick={() => setActiveTab('forms')} className={clsx("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'forms' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500")}><LayoutGrid size={14}/> Listas</button>
                <button onClick={() => { setActiveTab('flows'); setFlowSubTab('list'); }} className={clsx("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'flows' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}><GitBranch size={14}/> Fluxos</button>
            </div>

            {activeTab === 'forms' && (
                <div className="animate-in slide-in-from-left-2 duration-300">
                    <button onClick={() => setCurrentFolderId(null)} className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors", currentFolderId === null ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}><LayoutGrid size={16} /> Todos</button>
                    <div className="mt-4 flex items-center justify-between px-3 mb-2"><p className="text-xs font-bold text-slate-400 uppercase">Pastas</p><button onClick={() => setShowFolderModal(true)}><FolderPlus size={16}/></button></div>
                    {folders.map(f => <button key={f.id} onClick={() => setCurrentFolderId(f.id)} className={clsx("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm", currentFolderId === f.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50")}><Folder size={16}/> {f.name}</button>)}
                </div>
            )}

            {activeTab === 'flows' && (
                <div className="animate-in slide-in-from-left-2 duration-300 p-2 space-y-2">
                    <button 
                        onClick={() => setFlowSubTab('list')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            flowSubTab === 'list' ? "bg-white border-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 border-transparent"
                        )}
                    >
                        <LayoutGrid size={16} /> Meus Fluxos
                    </button>
                    <button 
                        onClick={() => setFlowSubTab('logs')}
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            flowSubTab === 'logs' ? "bg-white border-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 border-transparent"
                        )}
                    >
                        <History size={16} /> Histórico
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <button 
                        onClick={() => setShowWAConfig(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                    >
                        <Settings size={16} /> Configurar WhatsApp
                    </button>
                    <button 
                        onClick={() => setShowEmailConfig(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                    >
                        <Mail size={16} /> Configurar E-mail
                    </button>
                    <div className={clsx("p-3 rounded-xl border flex items-center justify-between transition-all", waConfig.isConnected ? "bg-teal-50 border-teal-100" : "bg-red-50 border-red-100")}>
                        <div className="flex items-center gap-2">
                            <div className={clsx("w-1.5 h-1.5 rounded-full", waConfig.isConnected ? "bg-teal-500 animate-pulse" : "bg-red-500")}></div>
                            <span className={clsx("text-[9px] font-black uppercase tracking-widest", waConfig.isConnected ? "text-teal-700" : "text-red-700")}>{waConfig.isConnected ? "Online" : "Offline"}</span>
                        </div>
                        {waConfig.isConnected ? <Wifi size={12} className="text-teal-400" /> : <WifiOff size={12} className="text-red-400" />}
                    </div>
                </div>
            )}
        </div>
      </aside>

      <div className="flex-1">
          {activeTab === 'forms' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {filteredForms.map(f => (
                    <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-50 text-teal-700 uppercase tracking-widest">Formulário</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setShowMoveModal(f)} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg"><MoveRight size={16}/></button>
                                <button onClick={() => { setCurrentForm(f); setView('editor'); setEditorStep('editor'); }} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-1">{f.title}</h3>
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button onClick={() => handleOpenResponses(f)} className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center transition-colors"><Table size={20} className="mb-1 text-teal-600" /><p className="text-[10px] font-bold text-slate-400 uppercase">Respostas</p><p className="text-xl font-black text-slate-800">{f.submissionsCount || 0}</p></button>
                            <button onClick={() => setShowShareModal(f)} className="bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl flex flex-col items-center justify-center"><Share2 size={20} /><span className="text-[10px] font-black uppercase mt-1">Link Público</span></button>
                        </div>
                    </div>
                ))}
              </div>
          ) : flowSubTab === 'logs' ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                  <div className="px-8 py-6 border-b bg-slate-50 flex items-center justify-between">
                      <div>
                          <h3 className="text-lg font-black text-slate-800">Histórico de Disparos</h3>
                          <p className="text-xs text-slate-500 font-medium">Logs de mensagens automáticas enviadas pelos fluxos.</p>
                      </div>
                      <button onClick={loadLogs} className="p-2 text-slate-400 hover:text-indigo-600">
                          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                      </button>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50">
                              <tr className="border-b border-slate-100">
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fluxo</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contato</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Número</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mensagem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {loading && logs.length === 0 ? (
                                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin text-indigo-600 mx-auto" /></td></tr>
                              ) : logs.length === 0 ? (
                                  <tr><td colSpan={5} className="py-20 text-center text-slate-300 italic">Nenhum disparo registrado ainda.</td></tr>
                              ) : logs.map(log => (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex flex-col">
                                              <span className="text-[11px] font-bold text-slate-600">{new Date(log.createdAt).toLocaleDateString()}</span>
                                              <span className="text-[9px] text-slate-400 font-black">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{log.ruleName}</span>
                                      </td>
                                      <td className="px-6 py-4 font-bold text-slate-700">{log.studentName}</td>
                                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{log.phone}</td>
                                      <td className="px-6 py-4 max-w-xs"><p className="text-[11px] text-slate-400 truncate" title={log.message}>{log.message}</p></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                  {flows.map(flow => (
                      <div key={flow.id} className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col overflow-hidden border-t-8 border-t-indigo-600">
                          <div className="p-6 flex-1">
                              <div className="flex justify-between items-start mb-4">
                                  <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest", flow.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500")}>{flow.isActive ? 'Ativo' : 'Pausado'}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditFlow(flow)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                                      <button onClick={() => handleDeleteFlow(flow.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                              <h3 className="font-black text-slate-800 text-xl mb-2 group-hover:text-indigo-600 transition-colors">{flow.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 flex items-center gap-2"><Zap size={12}/> {flow.nodes.length} Passos na Jornada</p>
                              
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gatilho de Entrada</p>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 truncate">
                                      <Target size={14} className="text-teal-600"/>
                                      {forms.find(f => f.id === flow.formId)?.title || 'Nenhum formulário vinculado'}
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => handleEditFlow(flow)} className="w-full py-4 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-400 font-black text-[10px] uppercase tracking-widest transition-all border-t">Abrir Construtor de Fluxo</button>
                      </div>
                  ))}
                  <button onClick={handleCreateFlow} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                      <Zap size={48} className="mb-4 opacity-10 group-hover:opacity-100 group-hover:text-indigo-500 transition-all"/>
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Criar Fluxo de Automação</span>
                  </button>
              </div>
          )}
      </div>

      {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Nova Pasta</h3>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg mb-4 outline-none focus:ring-2 focus:ring-teal-50" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nome..." />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowFolderModal(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancelar</button>
                      <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-bold">Criar</button>
                  </div>
              </div>
          </div>
      )}

      {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Mover Formulário</h3>
                      <button onClick={() => setShowMoveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-5">
                      <p className="text-sm text-slate-500 mb-4">Selecione o destino para: <br/><strong className="text-slate-800">{showMoveModal.title}</strong></p>
                      <div className="space-y-1">
                          <button 
                              onClick={() => handleMoveForm(showMoveModal, null)}
                              className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", !showMoveModal.folderId ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                          >
                              <LayoutGrid size={16} /> Sem Pasta (Raiz)
                          </button>
                          {folders.map(f => (
                              <button 
                                  key={f.id}
                                  onClick={() => handleMoveForm(showMoveModal, f.id)}
                                  className={clsx("w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors", showMoveModal.folderId === f.id ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50")}
                              >
                                  <Folder size={16} /> {f.name}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showShareModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Share2 size={20}/></div>
                          <h3 className="text-lg font-black text-slate-800">Compartilhar Formulário</h3>
                      </div>
                      <button onClick={() => setShowShareModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Link Público</label>
                          <div className="flex gap-2">
                              <input readOnly className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl text-xs font-mono" value={`${window.location.origin}/?publicFormId=${showShareModal.id}`} />
                              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?publicFormId=${showShareModal.id}`); alert("Link copiado!"); }} className="p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-md active:scale-95 transition-all"><Copy size={16}/></button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Código de Incorporação (iFrame)</label>
                          <div className="flex gap-2">
                              <textarea readOnly className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl text-[10px] font-mono h-24 resize-none leading-relaxed" value={`<iframe src="${window.location.origin}/?publicFormId=${showShareModal.id}&embed=true" width="100%" height="800" frameborder="0"></iframe>`} />
                              <button onClick={() => { navigator.clipboard.writeText(`<iframe src="${window.location.origin}/?publicFormId=${showShareModal.id}&embed=true" width="100%" height="800" frameborder="0"></iframe>`); alert("Código de incorporação copiado!"); }} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 shadow-md active:scale-95 h-fit transition-all"><Copy size={16}/></button>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 italic px-1">* Use este código para exibir o formulário dentro do seu próprio site ou landing page.</p>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end">
                      <button onClick={() => setShowShareModal(null)} className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Fechar</button>
                  </div>
              </div>
          </div>
      )}

      {/* WHATSAPP CONFIG MODAL */}
      {showWAConfig && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-3"><Settings className="text-teal-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Evolution API Config</h3></div>
                      <button onClick={() => setShowWAConfig(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL da API</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={waConfig.instanceUrl} onChange={e => setWaConfig({...waConfig, instanceUrl: e.target.value})} placeholder="https://api.voll.com" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Instância</label><input type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={waConfig.instanceName} onChange={e => setWaConfig({...waConfig, instanceName: e.target.value})} placeholder="Instancia_VOLL" /></div>
                          <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">API Key Global</label><input type="password" title="API Key" className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" value={waConfig.apiKey} onChange={e => setWaConfig({...waConfig, apiKey: e.target.value})} /></div>
                      </div>

                      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] space-y-3">
                          <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2"><Link2 size={12}/> URL de Webhook p/ Evolution API</label>
                          <div className="flex gap-2">
                              <input type="text" readOnly className="flex-1 px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-[11px] font-mono text-indigo-900 shadow-sm" value={webhookUrlDisplay} />
                              <button onClick={() => { navigator.clipboard.writeText(webhookUrlDisplay); alert("Link do Webhook copiado!"); }} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95" title="Copiar URL"><Copy size={20}/></button>
                          </div>
                      </div>

                      <div className="p-6 bg-teal-50 rounded-[2rem] border-2 border-teal-100 space-y-4">
                        <div className="flex justify-between items-center"><h4 className="text-xs font-black text-teal-800 uppercase tracking-widest">Conectar Novo Aparelho</h4><div className="flex gap-2"><button onClick={() => setWaConfig({...waConfig, evolutionMethod: 'qr'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", waConfig.evolutionMethod === 'qr' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>QR Code</button><button onClick={() => setWaConfig({...waConfig, evolutionMethod: 'code'})} className={clsx("px-3 py-1 rounded-lg text-[10px] font-bold uppercase", waConfig.evolutionMethod === 'code' ? "bg-teal-600 text-white" : "bg-white text-teal-600 border")}>Código</button></div></div>
                        {waConfig.evolutionMethod === 'code' && (<div><label className="block text-[10px] font-bold text-teal-700 uppercase mb-1">Celular (com DDI+DDD)</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="5551999999999" value={waConfig.pairingNumber} onChange={e => setWaConfig({...waConfig, pairingNumber: e.target.value})} /></div>)}
                        <button onClick={handleConnectWAEvolution} disabled={isGeneratingWAConnection} className="w-full py-4 bg-white border-2 border-teal-500 text-teal-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-teal-500 hover:text-white transition-all flex items-center justify-center gap-2">{isGeneratingWAConnection ? <Loader2 size={18} className="animate-spin"/> : <Wifi size={18}/>} Iniciar Pareamento</button>
                        {qrCodeUrl && (<div className="flex flex-col items-center pt-4 animate-in zoom-in-95"><div className="p-4 bg-white rounded-3xl shadow-xl border-2 border-teal-100"><img src={qrCodeUrl} className="w-48 h-48" alt="QR" /></div><p className="text-xs text-teal-600 font-bold mt-4">ESCANEIE COM SEU CELULAR</p></div>)}
                        {pairingCodeValue && (<div className="text-center pt-4 animate-in zoom-in-95"><div className="inline-block px-10 py-6 bg-white rounded-3xl shadow-xl border-2 border-teal-200 text-3xl font-black tracking-[0.5em] text-teal-600">{pairingCodeValue}</div><p className="text-xs text-teal-600 font-bold mt-4 uppercase">DIGITE NO SEU WHATSAPP</p></div>)}
                        <div className="space-y-1">{waConnLogs.map((log, i) => (<p key={i} className="text-[10px] font-mono text-teal-400">{log}</p>))}</div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2rem]"><button onClick={handleSaveWAConfig} disabled={isSavingWAConfig} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2">{isSavingWAConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configurações</button></div>
              </div>
          </div>
      )}

      {/* EMAIL CONFIG MODAL */}
      {showEmailConfig && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                      <div className="flex items-center gap-3"><Mail className="text-indigo-600" size={24}/> <h3 className="text-lg font-black text-slate-800">Configuração SendGrid API</h3></div>
                      <button onClick={() => setShowEmailConfig(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-xs text-blue-800 mb-2">
                        <Info size={16} className="shrink-0" />
                        <p>Configure sua chave do SendGrid para disparar e-mails automáticos nos fluxos.</p>
                      </div>
                      <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">SendGrid API Key</label>
                            <input 
                              type="password" 
                              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                              value={emailConfig.apiKey} 
                              onChange={e => setEmailConfig({...emailConfig, apiKey: e.target.value})} 
                              placeholder="SG.xxxxxxxxxxxxxx" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">E-mail do Remetente (Verified Sender)</label>
                            <input 
                              type="email" 
                              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                              value={emailConfig.senderEmail} 
                              onChange={e => setEmailConfig({...emailConfig, senderEmail: e.target.value})} 
                              placeholder="contato@seudominio.com" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome de Exibição</label>
                            <input 
                              type="text" 
                              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
                              value={emailConfig.senderName} 
                              onChange={e => setEmailConfig({...emailConfig, senderName: e.target.value})} 
                              placeholder="VOLL Pilates Group" 
                            />
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3 rounded-b-[2rem]">
                    <button onClick={() => setShowEmailConfig(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm transition-all">Cancelar</button>
                    <button onClick={handleSaveEmailConfig} disabled={isSavingEmailConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-2">
                      {isSavingEmailConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Configurações
                    </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
