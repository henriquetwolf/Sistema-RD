
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, ChevronLeft, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2,
  ChevronDown, ChevronUp, Palette, Kanban as FunnelIcon, Settings2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, CompanySetting, Pipeline, PipelineStage } from '../services/appBackend';

// --- Types ---
interface DealTask {
    id: string;
    description: string;
    dueDate: string;
    isDone: boolean;
    type: 'call' | 'email' | 'meeting' | 'todo';
}

interface Deal {
  id: string;
  dealNumber?: number;
  title: string;
  contactName: string;
  companyName: string;
  value: number;
  
  pipeline_id?: string;
  pipeline?: string;
  source?: string;
  campaign?: string;
  entryValue?: number;
  paymentMethod?: string;
  installments?: number;
  installmentValue?: number;
  
  productType?: 'Digital' | 'Presencial' | 'Evento' | '';
  productName?: string;
  
  billingCnpj?: string;
  billingCompanyName?: string;

  email?: string;
  phone?: string;
  cpf?: string;
  firstDueDate?: string;
  receiptLink?: string;
  transactionCode?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  registrationData?: string;
  observation?: string;
  courseState?: string;
  courseCity?: string;
  classMod1?: string;
  classMod2?: string;

  stage: string;
  owner: string;
  createdAt: Date;
  closedAt?: Date;
  status: 'hot' | 'warm' | 'cold';
  nextTask?: string;
  tasks: DealTask[];
}

interface RegisteredClass {
    id: string;
    state: string;
    city: string;
    course: string;
    mod1Code: string;
    mod2Code: string;
}

interface DigitalProduct {
    id: string;
    name: string;
}

interface CollaboratorSimple {
    id: string;
    fullName: string;
    department: string;
}

interface Team {
  id: string;
  name: string;
  members: string[]; // IDs of collaborators
}

const STAGE_COLORS = [
    '#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
];

const formatCPF = (value: string = '') => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCEP = (value: string = '') => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
};

const handleDbError = (e: any) => {
    console.error("Erro de Banco de Dados:", e);
    const msg = e.message || "Erro desconhecido";
    if (msg.includes('relation "crm_deals" does not exist')) {
       alert("Erro Crítico: A tabela 'crm_deals' não existe no banco de dados.");
    } else if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('cache'))) {
       alert(`Erro de Schema: O banco de dados está desatualizado ou em cache.\n\nVá em Configurações > Diagnóstico e execute o SQL de reparo.\n\nDetalhe: ${msg}`);
    } else {
       alert(`Erro: ${msg}`);
    }
};

const generateDealNumber = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return Number(`${yyyy}${mm}${dd}${hh}${min}${random}`);
};

const INITIAL_FORM_STATE: Partial<Deal> = {
    dealNumber: undefined,
    title: '', companyName: '', contactName: '', value: 0, 
    paymentMethod: '', status: 'warm', stage: 'new', nextTask: '', owner: '',
    source: '', campaign: '', entryValue: 0, installments: 1, installmentValue: 0,
    cpf: '', email: '', phone: '', firstDueDate: '', receiptLink: '', transactionCode: '',
    zipCode: '', address: '', addressNumber: '',
    registrationData: '', observation: '', courseState: '', courseCity: '', classMod1: '', classMod2: '',
    pipeline: 'Padrão',
    productType: '', 
    productName: '',
    billingCnpj: '', billingCompanyName: '',
    tasks: []
};

export const CrmBoard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pipeline' | 'teams'>('pipeline');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Pipeline State
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [currentStages, setCurrentStages] = useState<PipelineStage[]>([]);
  const [showFunnelManager, setShowFunnelManager] = useState(false);
  const [isSavingFunnel, setIsSavingFunnel] = useState(false);
  
  // Funnel Editor State
  const [editingPipeline, setEditingPipeline] = useState<Partial<Pipeline>>({ name: '', is_default: false });
  const [editingStages, setEditingStages] = useState<Partial<PipelineStage>[]>([]);

  const [collaborators, setCollaborators] = useState<CollaboratorSimple[]>([]);
  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [registeredClasses, setRegisteredClasses] = useState<RegisteredClass[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<DigitalProduct[]>([]);
  const [eventsList, setEventsList] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // Modals
  const [showDealModal, setShowDealModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormData, setDealFormData] = useState<Partial<Deal>>(INITIAL_FORM_STATE);
  
  // Team form
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
      if (currentPipelineId) {
          fetchPipelineDetails(currentPipelineId);
      }
  }, [currentPipelineId]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [dealsResult, teamsResult, classesResult, productsResult, eventsResult, collabResult, companiesResult, pipelinesResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
              appBackend.client.from('crm_teams').select('*').order('name', { ascending: true }),
              appBackend.client.from('crm_classes').select('id, course, state, city, mod_1_code, mod_2_code'),
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name').order('created_at', { ascending: false }),
              appBackend.client.from('crm_collaborators').select('id, full_name, department').order('full_name', { ascending: true }),
              appBackend.getCompanies(),
              appBackend.getPipelines()
          ]);

          if (dealsResult.data) {
              setDeals(dealsResult.data.map((d: any) => ({
                  id: d.id, dealNumber: d.deal_number, title: d.title || '', contactName: d.contact_name || '', companyName: d.company_name || '',
                  value: Number(d.value || 0), paymentMethod: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  nextTask: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  pipeline_id: d.pipeline_id, source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, class_mod_2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          }

          setPipelines(pipelinesResult);
          // Se não houver funil selecionado ou o atual não existir mais, seleciona o primeiro
          if (pipelinesResult.length > 0) {
              if (!currentPipelineId || !pipelinesResult.find(p => p.id === currentPipelineId)) {
                  setCurrentPipelineId(pipelinesResult[0].id);
              }
          }

          setTeams(teamsResult.data || []);
          if (classesResult.data) setRegisteredClasses(classesResult.data);
          setDigitalProducts(productsResult.data || []);
          setEventsList(eventsResult.data || []);
          if (collabResult.data) setCollaborators(collabResult.data.map((c: any) => ({ id: c.id, fullName: c.full_name, department: c.department })));
          setCompanies(companiesResult || []);
      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const fetchPipelineDetails = async (id: string) => {
      try {
          const stages = await appBackend.getPipelineStages(id);
          setCurrentStages(stages);
      } catch (e) {
          console.error(e);
      }
  };

  const handleSaveFunnel = async () => {
    if (!editingPipeline.name || editingStages.length < 2) {
        alert("O funil deve ter um nome e pelo menos 2 etapas.");
        return;
    }
    setIsSavingFunnel(true);
    try {
        const saved = await appBackend.savePipeline(editingPipeline, editingStages);
        // Atualiza a lista e força a seleção do funil que acabou de salvar
        await fetchData();
        setCurrentPipelineId(saved.id);
        // Força o carregamento das etapas imediatamente
        await fetchPipelineDetails(saved.id);
        setShowFunnelManager(false);
    } catch (e: any) {
        alert(`Erro ao salvar funil: ${e.message}`);
    } finally {
        setIsSavingFunnel(false);
    }
  };

  const handleSaveDeal = async () => {
    if (!dealFormData.companyName) {
        alert("O nome do cliente é obrigatório.");
        return;
    }

    setIsLoading(true);
    const payload = {
        title: dealFormData.title || dealFormData.companyName,
        contact_name: dealFormData.contactName || dealFormData.companyName,
        company_name: dealFormData.companyName,
        value: Number(dealFormData.value || 0),
        pipeline_id: dealFormData.pipeline_id || currentPipelineId,
        stage: dealFormData.stage || (currentStages.length > 0 ? currentStages[0].key : 'new'),
        owner_id: dealFormData.owner || null,
        status: dealFormData.status || 'warm',
        next_task: dealFormData.nextTask,
        source: dealFormData.source,
        campaign: dealFormData.campaign,
        entry_value: Number(dealFormData.entryValue || 0),
        payment_method: dealFormData.paymentMethod,
        installments: Number(dealFormData.installments || 1),
        installment_value: Number(dealFormData.installmentValue || 0),
        product_type: dealFormData.productType,
        product_name: dealFormData.productName,
        billing_cnpj: dealFormData.billingCnpj,
        billing_company_name: dealFormData.billingCompanyName,
        email: dealFormData.email,
        phone: dealFormData.phone,
        cpf: dealFormData.cpf,
        first_due_date: dealFormData.firstDueDate || null,
        receipt_link: dealFormData.receiptLink,
        transaction_code: dealFormData.transactionCode,
        zip_code: dealFormData.zipCode,
        address: dealFormData.address,
        address_number: dealFormData.addressNumber,
        registration_data: dealFormData.registrationData,
        observation: dealFormData.observation,
        course_state: dealFormData.courseState,
        course_city: dealFormData.courseCity,
        class_mod_1: dealFormData.classMod1,
        class_mod_2: dealFormData.classMod2,
        pipeline: dealFormData.pipeline,
        tasks: dealFormData.tasks || []
    };

    try {
        if (editingDealId) {
            await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
            await appBackend.logActivity({ action: 'update', module: 'crm', details: `Editou negócio: ${payload.title}`, recordId: editingDealId });
        } else {
            const { data: newDeal } = await appBackend.client.from('crm_deals').insert([{
                ...payload,
                deal_number: generateDealNumber(),
                created_at: new Date().toISOString()
            }]).select().single();
            await appBackend.logActivity({ action: 'create', module: 'crm', details: `Criou novo negócio: ${payload.title}`, recordId: newDeal?.id });
        }
        await fetchData();
        setShowDealModal(false);
    } catch (e: any) {
        handleDbError(e);
    } finally {
        setIsLoading(false);
    }
  };

  const addEditingStage = () => {
      setEditingStages(prev => [...prev, { name: '', color: '#3b82f6', sort_order: prev.length }]);
  };

  const updateEditingStage = (idx: number, field: string, value: any) => {
      setEditingStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeEditingStage = (idx: number) => {
      setEditingStages(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStage = (idx: number, direction: 'up' | 'down') => {
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= editingStages.length) return;
      const updated = [...editingStages];
      const temp = updated[idx];
      updated[idx] = updated[newIdx];
      updated[newIdx] = temp;
      setEditingStages(updated);
  };

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const moveDeal = async (dealId: string, currentStageKey: string, direction: 'next' | 'prev') => {
    const currentIndex = currentStages.findIndex(s => s.key === currentStageKey);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= currentStages.length) return;
    const newStage = currentStages[newIndex];
    const now = new Date();
    
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage.key, closedAt: newStage.key === 'closed' || newStage.name.toLowerCase().includes('fechamento') ? now : d.closedAt } : d));

    try {
        const updates: any = { stage: newStage.key };
        if (newStage.key === 'closed' || newStage.name.toLowerCase().includes('fechamento')) updates.closed_at = now.toISOString();
        await appBackend.client.from('crm_deals').update(updates).eq('id', dealId);
    } catch (e) { fetchData(); }
  };

  const handleDrop = async (e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const currentDeal = deals.find(d => d.id === draggedDealId);
    if (!currentDeal || currentDeal.stage === targetStageKey) { setDraggedDealId(null); return; }
    
    const now = new Date();
    const isClosing = targetStageKey === 'closed' || currentStages.find(s => s.key === targetStageKey)?.name.toLowerCase().includes('fechamento');
    
    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stage: targetStageKey, closedAt: isClosing ? now : d.closedAt } : d));
    try {
        const updates: any = { stage: targetStageKey, pipeline_id: currentPipelineId };
        if (isClosing) updates.closed_at = now.toISOString();
        await appBackend.client.from('crm_deals').update(updates).eq('id', draggedDealId);
    } catch (e) { fetchData(); }
    setDraggedDealId(null);
  };

  const filteredDeals = deals.filter(d => {
      const matchesPipeline = d.pipeline_id === currentPipelineId || (!d.pipeline_id && currentPipelineId === pipelines[0]?.id);
      const matchesSearch = (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (d.dealNumber?.toString().includes(searchTerm));
      return matchesPipeline && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={() => setActiveView('pipeline')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><FunnelIcon size={16} /> Kanban</button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
            </div>

            {activeView === 'pipeline' && (
                <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                    <select 
                        value={currentPipelineId || ''} 
                        onChange={e => setCurrentPipelineId(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {pipelines.length === 0 && <option value="">Nenhum funil</option>}
                    </select>
                    <button 
                        onClick={() => {
                            const p = pipelines.find(x => x.id === currentPipelineId);
                            setEditingPipeline(p || { name: '', is_default: false });
                            setEditingStages(currentStages);
                            setShowFunnelManager(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Gerenciar Funis"
                    >
                        <Settings2 size={18} />
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative max-w-xs w-full hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar oportunidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-300 rounded-full text-sm outline-none transition-all"/>
            </div>
            <button 
                onClick={() => {
                    setEditingDealId(null);
                    setDealFormData({ ...INITIAL_FORM_STATE, pipeline_id: currentPipelineId || undefined });
                    setShowDealModal(true);
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
            >
                <Plus size={18} className="inline mr-1" /> Novo Negócio
            </button>
        </div>
      </div>

      {/* PIPELINE BOARD */}
      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative custom-scrollbar">
          {isLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
          ) : activeView === 'pipeline' ? (
              <div className="flex gap-4 h-full min-w-max">
                  {currentStages.map(stage => {
                      const stageDeals = filteredDeals.filter(d => d.stage === stage.key);
                      const totalValue = stageDeals.reduce((acc, curr) => acc + (curr.value || 0), 0);
                      
                      return (
                        <div 
                            key={stage.id} 
                            className="w-[300px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm"
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDrop(e, stage.key)}
                        >
                            <div className="p-3 bg-white rounded-t-xl border-b border-b-slate-100" style={{ borderTop: `4px solid ${stage.color}` }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-bold text-slate-700 text-sm">{stage.name}</h3>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 rounded-full">{stageDeals.length}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400">{formatCurrency(totalValue)}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                                {stageDeals.map(deal => (
                                    <div 
                                        key={deal.id} 
                                        draggable 
                                        onDragStart={e => { setDraggedDealId(deal.id); e.dataTransfer.setData("text/plain", deal.id); }}
                                        onClick={() => { setEditingDealId(deal.id); setDealFormData(deal); setShowDealModal(true); }}
                                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                                    >
                                        <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-500' : deal.status === 'warm' ? 'bg-amber-400' : 'bg-blue-400')}></div>
                                        <h4 className="font-bold text-slate-800 text-xs mb-1 line-clamp-2 leading-tight">{deal.title}</h4>
                                        <p className="text-[10px] text-slate-400 mb-2 truncate">{deal.companyName}</p>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <span className="font-bold text-slate-700 text-[11px]">{formatCurrency(deal.value)}</span>
                                            <div className="flex">
                                                <button onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, deal.stage, 'prev'); }} className="p-1 text-slate-300 hover:text-slate-600 md:opacity-0 group-hover:opacity-100"><ChevronLeft size={14}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, deal.stage, 'next'); }} className="p-1 text-slate-300 hover:text-indigo-600 md:opacity-0 group-hover:opacity-100"><ChevronRight size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                      );
                  })}
                  
                  {currentStages.length === 0 && !isLoading && (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic">
                          <FunnelIcon size={48} className="mb-4 opacity-20" />
                          <p>Nenhuma etapa configurada para este funil.</p>
                          <button onClick={() => setShowFunnelManager(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Configurar Funil</button>
                      </div>
                  )}
              </div>
          ) : (
              <div className="max-w-6xl mx-auto animate-in fade-in">
                  {/* ... conteúdo das equipes omitido para brevidade ... */}
              </div>
          )}
      </div>

      {/* FUNNEL MANAGER MODAL */}
      {showFunnelManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><FunnelIcon size={20} className="text-indigo-600" /> Editor de Funil de Vendas</h3>
                      <button onClick={() => setShowFunnelManager(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Funil</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 border rounded-lg text-sm font-bold" 
                                value={editingPipeline.name} 
                                onChange={e => setEditingPipeline({...editingPipeline, name: e.target.value})} 
                                placeholder="Ex: Funil Principal, Reativação..."
                              />
                          </div>
                          <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border w-full">
                                    <input type="checkbox" checked={editingPipeline.is_default} onChange={e => setEditingPipeline({...editingPipeline, is_default: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-600 uppercase">Definir como Padrão</span>
                                </label>
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14}/> Etapas do Funil</h4>
                              <button onClick={addEditingStage} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 flex items-center gap-1"><Plus size={14}/> Add Etapa</button>
                          </div>
                          
                          <div className="space-y-3">
                              {editingStages.map((stage, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 group animate-in fade-in slide-in-from-right-2">
                                      <div className="flex flex-col gap-1">
                                          <button onClick={() => moveStage(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0"><ChevronUp size={16}/></button>
                                          <button onClick={() => moveStage(idx, 'down')} disabled={idx === editingStages.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0"><ChevronDown size={16}/></button>
                                      </div>
                                      <div className="flex-1 flex gap-3 items-center">
                                          <input 
                                            type="text" 
                                            className="flex-1 px-3 py-1.5 border rounded-lg text-sm font-bold" 
                                            value={stage.name || ''} 
                                            onChange={e => updateEditingStage(idx, 'name', e.target.value)} 
                                            placeholder="Ex: Novo Lead"
                                          />
                                          <div className="flex items-center gap-2">
                                              <Palette size={14} className="text-slate-400" />
                                              <div className="flex gap-1 bg-white p-1 rounded-lg border">
                                                  {STAGE_COLORS.map(c => (
                                                      <button 
                                                        key={c} 
                                                        onClick={() => updateEditingStage(idx, 'color', c)}
                                                        className={clsx("w-4 h-4 rounded-full border border-black/5 transition-transform hover:scale-125", stage.color === c ? "ring-2 ring-indigo-500 ring-offset-1" : "")}
                                                        style={{ backgroundColor: c }}
                                                      />
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                      <button onClick={() => removeEditingStage(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                  </div>
                              ))}
                              {editingStages.length === 0 && <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">Nenhuma etapa. Clique em "Add Etapa" para começar.</div>}
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                      <button onClick={async () => {
                          if (editingPipeline.id && window.confirm("Excluir este funil permanentemente?")) {
                              await appBackend.deletePipeline(editingPipeline.id);
                              await fetchData();
                              setShowFunnelManager(false);
                          }
                      }} className="text-xs font-bold text-red-500 hover:underline">Excluir Funil</button>
                      <div className="flex gap-3">
                          <button onClick={() => setShowFunnelManager(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
                          <button onClick={handleSaveFunnel} disabled={isSavingFunnel} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                              {isSavingFunnel ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              Salvar Configurações
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DEAL MODAL */}
      {showDealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex flex-col">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={20} className="text-indigo-600" /> {editingDealId ? 'Editar Negociação' : 'Nova Oportunidade'}</h3>
                          {editingDealId && dealFormData.dealNumber && <span className="text-xs text-slate-500 font-mono ml-7">Protocolo #{dealFormData.dealNumber}</span>}
                      </div>
                      <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Target size={16} /> Dados da Negociação</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo do Cliente *</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Nome do Cliente/Empresa" value={dealFormData.companyName || ''} onChange={e => setDealFormData({ ...dealFormData, companyName: e.target.value, title: e.target.value })} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Funil de Vendas</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.pipeline_id || ''} onChange={e => setDealFormData({...dealFormData, pipeline_id: e.target.value})}>
                                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Etapa do Funil</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.stage} onChange={e => setDealFormData({...dealFormData, stage: e.target.value})}>
                                      {currentStages.map(st => <option key={st.key} value={st.key}>{st.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Status Térmico</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.status} onChange={e => setDealFormData({...dealFormData, status: e.target.value as any})}>
                                      <option value="warm">Morno (Warm)</option>
                                      <option value="hot">Quente (Hot)</option>
                                      <option value="cold">Frio (Cold)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Responsável</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.owner || ''} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      {collaborators.filter(c => c.department === 'Comercial').map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                      {/* ... restante dos campos do modal ... */}
                  </div>

                  <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200 shrink-0">
                        <button onClick={() => setShowDealModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                        <button onClick={handleSaveDeal} className="px-10 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"><Save size={16} /> Salvar Negociação</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
