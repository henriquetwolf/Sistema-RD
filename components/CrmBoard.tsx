
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2, Palette, Settings as SettingsIcon, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, CompanySetting, Pipeline, PipelineStage } from '../services/appBackend';

// --- Types ---
type DealStage = string; 

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

  stage: DealStage;
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
  members: string[]; 
}

const formatCPF = (value: string = '') => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const handleDbError = (e: any) => {
    console.error("Erro de Banco de Dados:", e);
    const msg = e.message || "Erro desconhecido";
    
    if (msg.includes('stages') && msg.includes('column')) {
        alert("Erro Estrutural: A coluna 'stages' não foi encontrada. Vá em 'Configurações' > 'Banco de Dados' e rode o script de reparo para atualizar as tabelas do CRM.");
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
    paymentMethod: '', status: 'warm', stage: '', nextTask: '', owner: '',
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
  const [activeView, setActiveView] = useState<'pipeline' | 'teams' | 'pipelines_config'>('pipeline');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
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
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormData, setDealFormData] = useState<Partial<Deal>>(INITIAL_FORM_STATE);
  
  // Team form
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  // Pipeline form
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
      if (dealFormData.productType && companies.length > 0) {
          const matched = companies.find(c => (c.productTypes || []).includes(dealFormData.productType!));
          if (matched) {
              setDealFormData(prev => ({
                  ...prev,
                  billingCnpj: matched.cnpj,
                  billingCompanyName: matched.legalName
              }));
          } else {
              setDealFormData(prev => ({
                  ...prev,
                  billingCnpj: '',
                  billingCompanyName: ''
              }));
          }
      }
  }, [dealFormData.productType, companies]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [dealsResult, teamsResult, pipelinesResult, classesResult, productsResult, eventsResult, collabResult, companiesResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
              appBackend.client.from('crm_teams').select('*').order('name', { ascending: true }),
              appBackend.getPipelines(),
              appBackend.client.from('crm_classes').select('id, course, state, city, mod_1_code, mod_2_code'),
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name').order('created_at', { ascending: false }),
              appBackend.client.from('crm_collaborators').select('id, full_name, department').order('full_name', { ascending: true }),
              appBackend.getCompanies()
          ]);

          if (dealsResult.data) {
              setDeals(dealsResult.data.map((d: any) => ({
                  id: d.id, dealNumber: d.deal_number, title: d.title || '', contactName: d.contact_name || '', companyName: d.company_name || '',
                  value: Number(d.value || 0), paymentMethod: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  nextTask: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, address_number: d.address_number,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, classMod2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          } else {
              setDeals([]);
          }

          setTeams(teamsResult.data || []);
          setPipelines(pipelinesResult || []);
          
          if (classesResult.data) {
              setRegisteredClasses(classesResult.data.map((c: any) => ({
                  id: c.id,
                  course: c.course,
                  state: c.state,
                  city: c.city,
                  mod1Code: c.mod_1_code,
                  mod2Code: c.mod_2_code
              })));
          }

          setDigitalProducts(productsResult.data || []);
          setEventsList(eventsResult.data || []);
          
          if (collabResult.data) {
            setCollaborators(collabResult.data.map((c: any) => ({
                id: c.id,
                fullName: c.full_name || 'Sem Nome',
                department: c.department || 'Geral'
            })));
          }

          setCompanies(companiesResult || []);

      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const productOptions = useMemo(() => {
      if (dealFormData.productType === 'Digital') return (digitalProducts || []).map(p => p.name).sort();
      if (dealFormData.productType === 'Evento') return (eventsList || []).map(e => e.name).sort();
      if (dealFormData.productType === 'Presencial') return Array.from(new Set((registeredClasses || []).map(c => c.course).filter(Boolean))).sort();
      return [];
  }, [dealFormData.productType, digitalProducts, registeredClasses, eventsList]);

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const getOwnerName = (id: string) => (collaborators || []).find(c => c.id === id)?.fullName || 'Desconhecido';

  const moveDeal = async (dealId: string, currentStage: DealStage, pipelineName: string, direction: 'next' | 'prev') => {
    const pipeline = pipelines.find(p => p.name === pipelineName);
    if (!pipeline) return;
    
    const stageOrder = (pipeline.stages || []).map(s => s.id);
    const currentIndex = stageOrder.indexOf(currentStage);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= stageOrder.length) return;
    const newStage = stageOrder[newIndex];
    const now = new Date();
    const deal = deals.find(d => d.id === dealId);

    if (!deal) return;

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage, closedAt: newStage === 'closed' ? now : (currentStage === 'closed' ? undefined : d.closedAt) } : d));

    try {
        const updates: any = { stage: newStage };
        if (newStage === 'closed') updates.closed_at = now.toISOString();
        if (currentStage === 'closed' && newStage !== 'closed') updates.closed_at = null;
        await appBackend.client.from('crm_deals').update(updates).eq('id', dealId);
        await appBackend.logActivity({ action: 'update', module: 'crm', details: `Moveu negócio "${deal.title}" para a etapa: ${newStage}`, recordId: dealId });
    } catch (e: any) { handleDbError(e); fetchData(); }
  };

  const getStageSummary = (pipelineName: string, stageId: string) => {
    const stageDeals = (deals || []).filter(d => d.pipeline === pipelineName && d.stage === stageId);
    return { count: stageDeals.length, total: stageDeals.reduce((acc, curr) => acc + (curr.value || 0), 0) };
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => { setDraggedDealId(dealId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dealId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  
  const handleDrop = async (e: React.DragEvent, pipelineName: string, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const currentDeal = (deals || []).find(d => d.id === draggedDealId);
    if (!currentDeal || (currentDeal.stage === targetStage && currentDeal.pipeline === pipelineName)) { setDraggedDealId(null); return; }
    const now = new Date();
    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, pipeline: pipelineName, stage: targetStage, closedAt: targetStage === 'closed' ? now : (d.stage === 'closed' ? undefined : d.closedAt) } : d));
    try {
        const updates: any = { pipeline: pipelineName, stage: targetStage };
        if (targetStage === 'closed') updates.closed_at = now.toISOString();
        else if (currentDeal.stage === 'closed') updates.closed_at = null;
        await appBackend.client.from('crm_deals').update(updates).eq('id', draggedDealId);
        await appBackend.logActivity({ action: 'update', module: 'crm', details: `Arrastou negócio "${currentDeal.title}" para Funil: ${pipelineName}, Etapa: ${targetStage}`, recordId: draggedDealId });
    } catch (e) { handleDbError(e); fetchData(); }
    setDraggedDealId(null);
  };

  const openNewDealModal = () => { 
    setEditingDealId(null); 
    const firstComercial = (collaborators || []).find(c => c.department === 'Comercial');
    const firstPipeObj = pipelines.length > 0 ? pipelines[0] : null;
    const firstPipeline = firstPipeObj?.name || 'Padrão';
    const firstStage = firstPipeObj?.stages?.[0]?.id || 'new';
    
    setDealFormData({ 
        ...INITIAL_FORM_STATE, 
        owner: firstComercial?.id || '', 
        pipeline: firstPipeline, 
        stage: firstStage 
    }); 
    setShowDealModal(true); 
  };

  const openEditDealModal = (deal: Deal) => { setEditingDealId(deal.id); setDealFormData({ ...deal }); setShowDealModal(true); };

  const openNewTeamModal = () => { setEditingTeam(null); setTeamName(''); setSelectedMembers([]); setShowTeamModal(true); };
  const openEditTeamModal = (team: Team) => { setEditingTeam(team); setTeamName(team.name || ''); setSelectedMembers(team.members || []); setShowTeamModal(true); };

  const openNewPipelineModal = () => {
    setEditingPipeline(null);
    setPipelineName('');
    setPipelineStages([
        { id: 'new', title: 'Sem Contato', color: 'border-slate-300' },
        { id: 'closed', title: 'Fechamento', color: 'border-green-500' }
    ]);
    setShowPipelineModal(true);
  };

  const openEditPipelineModal = (p: Pipeline) => {
    setEditingPipeline(p);
    setPipelineName(p.name);
    setPipelineStages(p.stages || []);
    setShowPipelineModal(true);
  };

  const handleSavePipeline = async () => {
      if (!pipelineName.trim()) return;
      setIsSavingPipeline(true);
      try {
          const pipeline: Pipeline = {
              id: editingPipeline?.id || crypto.randomUUID(),
              name: pipelineName,
              stages: pipelineStages
          };
          await appBackend.savePipeline(pipeline);
          await fetchData();
          setShowPipelineModal(false);
      } catch (e: any) { 
          handleDbError(e);
      } finally { 
          setIsSavingPipeline(false); 
      }
  };

  const handleDeletePipeline = async (id: string) => {
      const p = pipelines.find(x => x.id === id);
      if (p?.name === 'Padrão') { alert("O Funil Padrão não pode ser excluído."); return; }
      if (!window.confirm(`Deseja excluir o funil "${p?.name}"?`)) return;
      try {
          await appBackend.deletePipeline(id);
          await fetchData();
      } catch (e: any) { alert(`Erro: ${e.message}`); }
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;
    setIsSavingTeam(true);
    try {
        const payload = { name: teamName, members: selectedMembers || [] };
        if (editingTeam) {
            await appBackend.client.from('crm_teams').update(payload).eq('id', editingTeam.id);
        } else {
            await appBackend.client.from('crm_teams').insert([payload]);
        }
        await fetchData(); setShowTeamModal(false);
    } catch (e: any) { handleDbError(e); } finally { setIsSavingTeam(false); }
  };

  const handleDeleteTeam = async (id: string) => {
      if (!window.confirm("Excluir esta equipe?")) return;
      try {
          await appBackend.client.from('crm_teams').delete().eq('id', id);
          await fetchData();
      } catch (e: any) { alert(`Erro ao excluir equipe: ${e.message}`); }
  };

  const handleSaveDeal = async () => {
      if (!dealFormData.companyName) { alert("Preencha o Nome Completo do Cliente."); return; }
      const payload = {
          title: dealFormData.companyName, company_name: dealFormData.companyName, contact_name: dealFormData.contactName, value: Number(dealFormData.value) || 0,
          payment_method: dealFormData.paymentMethod, stage: dealFormData.stage, owner_id: dealFormData.owner, status: dealFormData.status || 'warm',
          next_task: dealFormData.nextTask, source: dealFormData.source, campaign: dealFormData.campaign, entry_value: Number(dealFormData.entryValue) || 0,
          installments: Number(dealFormData.installments) || 1, installment_value: Number(dealFormData.installmentValue || 0),
          product_type: dealFormData.productType || null, product_name: dealFormData.productName, email: dealFormData.email, phone: dealFormData.phone,
          cpf: dealFormData.cpf, first_due_date: dealFormData.firstDueDate || null, receipt_link: dealFormData.receipt_link, transaction_code: dealFormData.transactionCode,
          zip_code: dealFormData.zipCode, address: dealFormData.address, address_number: dealFormData.address_number, registration_data: dealFormData.registration_data,
          observation: dealFormData.observation, course_state: dealFormData.courseState, course_city: dealFormData.courseCity, 
          class_mod_1: dealFormData.class_mod_1, class_mod_2: dealFormData.class_mod_2, pipeline: dealFormData.pipeline, 
          tasks: dealFormData.tasks, billing_cnpj: dealFormData.billingCnpj, billing_company_name: dealFormData.billingCompanyName
      };
      try {
          if (editingDealId) {
              await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
          } else {
              const dealNumber = generateDealNumber();
              await appBackend.client.from('crm_deals').insert([{ ...payload, deal_number: dealNumber }]);
          }
          await fetchData(); setShowDealModal(false);
      } catch (e: any) { handleDbError(e); }
  };

  const handleDeleteDeal = async () => {
      if (editingDealId && window.confirm("Excluir esta negociação?")) {
          try {
            await appBackend.client.from('crm_deals').delete().eq('id', editingDealId);
            await fetchData(); setShowDealModal(false);
          } catch(e: any) { alert(`Erro ao excluir: ${e.message}`); }
      }
  };

  const filteredDeals = (deals || []).filter(d => 
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.dealNumber && d.dealNumber.toString().includes(searchTerm))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={() => setActiveView('pipeline')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={16} /> Pipeline</button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
                <button onClick={() => setActiveView('pipelines_config')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipelines_config' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><SettingsIcon size={16} /> Funis</button>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            {activeView === 'pipeline' ? (
                <>
                    <div className="relative max-w-xs w-full hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Buscar oportunidade ou Nº..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm outline-none"/>
                    </div>
                    <button onClick={openNewDealModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Negócio</button>
                </>
            ) : activeView === 'teams' ? (
                <button onClick={openNewTeamModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Nova Equipe</button>
            ) : (
                <button onClick={openNewPipelineModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Funil</button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative custom-scrollbar">
        {isLoading && deals.length === 0 && pipelines.length === 0 ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
        <>
            {activeView === 'pipeline' && (
                <div className="flex flex-col gap-12 min-w-max">
                {pipelines.length === 0 && !isLoading && (
                    <div className="text-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200 w-full max-w-3xl mx-auto">
                        <Filter size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Nenhum Funil Cadastrado</p>
                        <p className="text-sm">Vá em "Configurar Funis" para criar seu primeiro processo de vendas.</p>
                    </div>
                )}
                {pipelines.map(pipeline => (
                    <div key={pipeline.id} className="space-y-4">
                        <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-black text-slate-700 flex items-center gap-2">
                                <Filter size={20} className="text-indigo-600" /> Funil: {pipeline.name}
                            </h2>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{filteredDeals.filter(d => d.pipeline === pipeline.name).length} Negócios</span>
                        </div>
                        <div className="flex gap-4 h-full">
                        {(pipeline.stages || []).map(stage => {
                            const summary = getStageSummary(pipeline.name, stage.id);
                            const columnDeals = filteredDeals.filter(d => d.pipeline === pipeline.name && d.stage === stage.id);
                            return (
                                <div key={stage.id} className="w-[320px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, pipeline.name, stage.id)}>
                                    <div className={clsx("p-3 border-t-4 bg-white rounded-t-xl border-b border-b-slate-100", stage.color || "border-slate-200")}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-slate-700">{stage.title}</h3>
                                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-slate-500 font-medium">{summary.count} negócios</span>
                                            <span className="text-xs font-bold text-slate-800">{formatCurrency(summary.total)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar min-h-[150px]">
                                    {columnDeals.length === 0 ? (
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">Arraste aqui</div>
                                    ) : (
                                        columnDeals.map(deal => (
                                        <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400" : "")}>
                                            <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                                            <div className="pl-3">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        {deal.dealNumber && <span className="text-[10px] text-slate-400 font-mono block">#{deal.dealNumber}</span>}
                                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{deal.title}</h4>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                        <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180"/></button>
                                                        <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2 truncate">{deal.companyName}</p>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                    <span className="font-bold text-slate-700 text-sm">{formatCurrency(deal.value)}</span>
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm" title={`Responsável: ${getOwnerName(deal.owner)}`}>
                                                        {(getOwnerName(deal.owner) || '?').charAt(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        ))
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                ))}
                </div>
            )}
            
            {activeView === 'teams' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6"><h2 className="text-xl font-bold text-slate-800">Equipes Comerciais</h2><p className="text-sm text-slate-500">Agrupe seus vendedores para análise de performance.</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(teams || []).map(team => (
                            <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col group">
                                <div className="flex justify-between items-start mb-4"><div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><Users size={24} /></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditTeamModal(team)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button><button onClick={() => handleDeleteTeam(team.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{team.name || 'Sem nome'}</h3><p className="text-xs text-slate-400 mb-4">{(team.members || []).length} membros ativos</p>
                                <div className="flex flex-wrap gap-2 mb-4">{(team.members || []).map(memberId => { const col = (collaborators || []).find(c => c.id === memberId); if (!col) return null; return ( <div key={memberId} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={col.fullName}>{(col.fullName || '?').charAt(0)}</div> ); })}{(team.members || []).length === 0 && <span className="text-xs text-slate-400 italic">Sem membros</span>}</div>
                            </div>
                        ))}
                        <button onClick={openNewTeamModal} className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-indigo-300 transition-all group"><div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 mb-2"><Plus size={24} /></div><span className="font-bold text-slate-600 group-hover:text-indigo-600">Nova Equipe</span></button>
                    </div>
                </div>
            )}

            {activeView === 'pipelines_config' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6"><h2 className="text-xl font-bold text-slate-800">Funis de Vendas</h2><p className="text-sm text-slate-500">Configure seus processos comerciais personalizados.</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(pipelines || []).map(p => (
                            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col group">
                                <div className="flex justify-between items-start mb-4"><div className="bg-teal-100 text-teal-700 p-2 rounded-lg"><Filter size={24} /></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditPipelineModal(p)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 size={16} /></button><button onClick={() => handleDeletePipeline(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{p.name || 'Sem nome'}</h3><p className="text-xs text-slate-400 mb-4">{(p.stages || []).length} etapas</p>
                                <div className="flex flex-wrap gap-1 mb-4">{(p.stages || []).map(s => <span key={s.id} className={clsx("px-2 py-0.5 rounded text-[9px] font-bold border", s.color)}>{s.title}</span>)}</div>
                            </div>
                        ))}
                        <button onClick={openNewPipelineModal} className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-teal-300 transition-all group"><div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 mb-2"><Plus size={24} /></div><span className="font-bold text-slate-600 group-hover:text-indigo-600">Novo Funil</span></button>
                    </div>
                </div>
            )}
        </>
        )}
      </div>

      {/* --- PIPELINE MODAL --- */}
      {showPipelineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Filter size={20} className="text-teal-600" /> {editingPipeline ? 'Editar Funil' : 'Criar Novo Funil'}</h3>
                      <button onClick={() => setShowPipelineModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Nome do Funil</label>
                          <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="Ex: Funil Cursos, Funil Equipamentos..." value={pipelineName} onChange={e => setPipelineName(e.target.value)} />
                      </div>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center"><label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">Etapas</label><button onClick={() => setPipelineStages([...pipelineStages, { id: crypto.randomUUID().substring(0,8), title: 'Nova Etapa', color: 'border-slate-300' }])} className="text-xs font-bold text-teal-600 hover:underline">+ Adicionar Etapa</button></div>
                          <div className="space-y-2">
                              {pipelineStages.map((stage, idx) => (
                                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                      <div className="shrink-0 cursor-grab text-slate-300"><GripVertical size={16}/></div>
                                      <input type="text" className="flex-1 px-2 py-1 text-sm border rounded" value={stage.title} onChange={e => setPipelineStages(pipelineStages.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))} />
                                      <select className="px-2 py-1 text-xs border rounded bg-white" value={stage.color} onChange={e => setPipelineStages(pipelineStages.map((s, i) => i === idx ? { ...s, color: e.target.value } : s))}>
                                          <option value="border-slate-300">Cinza</option>
                                          <option value="border-blue-400">Azul</option>
                                          <option value="border-yellow-400">Amarelo</option>
                                          <option value="border-orange-500">Laranja</option>
                                          <option value="border-green-500">Verde</option>
                                          <option value="border-purple-500">Roxo</option>
                                          <option value="border-red-500">Vermelho</option>
                                      </select>
                                      <button onClick={() => setPipelineStages(pipelineStages.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowPipelineModal(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
                      <button onClick={handleSavePipeline} disabled={isSavingPipeline || !pipelineName.trim()} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all">
                          {isSavingPipeline ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Funil
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- TEAM MODAL --- */}
      {showTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-indigo-600" /> {editingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}</h3>
                      <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Nome da Equipe</label>
                          <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Time Vendas Sul, Time Digital..." value={teamName} onChange={e => setTeamName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Membros da Equipe</label>
                          <div className="space-y-1">
                              {(collaborators || []).map(col => (
                                  <label key={col.id} className={clsx("flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all", selectedMembers.includes(col.id) ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100 hover:border-slate-200")}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{(col.fullName || '?').charAt(0)}</div>
                                          <div><p className="text-sm font-bold text-slate-800">{col.fullName}</p><p className="text-[10px] text-slate-400 uppercase">{col.department}</p></div>
                                      </div>
                                      <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={selectedMembers.includes(col.id)} onChange={e => setSelectedMembers(e.target.checked ? [...selectedMembers, col.id] : selectedMembers.filter(id => id !== col.id))} />
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Cancelar</button>
                      <button onClick={handleSaveTeam} disabled={isSavingTeam || !teamName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all">
                          {isSavingTeam ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Equipe
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- DEAL MODAL --- */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 flex flex-col max-h-[95vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Briefcase className="text-indigo-600" /> {editingDealId ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h3>
                <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo do Cliente *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={dealFormData.companyName} onChange={e => setDealFormData({...dealFormData, companyName: e.target.value})} placeholder="Ex: João da Silva Santos" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável Comercial</label>
                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={dealFormData.owner} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                            <option value="">Selecione...</option>
                            {(collaborators || []).map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="email" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={dealFormData.email} onChange={e => setDealFormData({...dealFormData, email: e.target.value})} /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input type="text" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={dealFormData.phone} onChange={e => setDealFormData({...dealFormData, phone: e.target.value})} /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={dealFormData.cpf} onChange={e => setDealFormData({...dealFormData, cpf: formatCPF(e.target.value)})} maxLength={14} />
                    </div>

                    <div className="lg:col-span-3 border-t pt-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><ShoppingBag size={14}/> Dados do Produto</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Produto</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={dealFormData.productType} onChange={e => setDealFormData({...dealFormData, productType: e.target.value as any, productName: ''})}>
                                    <option value="">Selecione...</option><option value="Digital">Digital</option><option value="Presencial">Presencial</option><option value="Evento">Evento</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Produto / Curso</label>
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:bg-slate-50" value={dealFormData.productName} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})} disabled={!dealFormData.productType}>
                                    <option value="">Selecione o produto...</option>
                                    {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Negócio (R$)</label>
                                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/><input type="number" className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm font-bold text-green-700" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: parseFloat(e.target.value) || 0})} /></div>
                            </div>
                        </div>
                    </div>

                    {dealFormData.productType === 'Presencial' && (
                        <div className="lg:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                             <div className="md:col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Turmas Presenciais</div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">UF Curso</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.courseState} onChange={e => setDealFormData({...dealFormData, courseState: e.target.value, courseCity: '', classMod1: '', classMod2: ''})}>
                                    <option value="">--</option>{Array.from(new Set(registeredClasses.map(c => c.state))).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Cidade Curso</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.courseCity} onChange={e => setDealFormData({...dealFormData, courseCity: e.target.value, classMod1: '', classMod2: ''})} disabled={!dealFormData.courseState}>
                                    <option value="">--</option>{Array.from(new Set(registeredClasses.filter(c => c.state === dealFormData.courseState).map(c => c.city))).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Cód. Turma Mod I</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.classMod1} onChange={e => setDealFormData({...dealFormData, classMod1: e.target.value})} disabled={!dealFormData.courseCity}>
                                    <option value="">--</option>{registeredClasses.filter(c => c.state === dealFormData.courseState && c.city === dealFormData.courseCity).map(c => <option key={c.id} value={c.mod1Code}>{c.mod1Code}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Cód. Turma Mod II</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.classMod2} onChange={e => setDealFormData({...dealFormData, classMod2: e.target.value})} disabled={!dealFormData.courseCity}>
                                    <option value="">--</option>{registeredClasses.filter(c => c.state === dealFormData.courseState && c.city === dealFormData.courseCity).map(c => <option key={c.id} value={c.mod2Code}>{c.mod2Code}</option>)}
                                </select>
                             </div>
                        </div>
                    )}

                    <div className="lg:col-span-3 bg-blue-50 p-4 rounded-xl border border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Empresa de Faturamento (Auto)</label>
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 text-xs font-bold text-blue-900"><Building size={14}/> {dealFormData.billingCompanyName || '---'}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">CNPJ de Venda (Auto)</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" value={dealFormData.billingCnpj} readOnly />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fonte</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={dealFormData.source} onChange={e => setDealFormData({...dealFormData, source: e.target.value})} placeholder="Instagram, Indicação" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campanha</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value={dealFormData.campaign} onChange={e => setDealFormData({...dealFormData, campaign: e.target.value})} placeholder="Black Friday 2024" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Funil de Vendas</label>
                        <select 
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-bold text-indigo-700" 
                            value={dealFormData.pipeline} 
                            onChange={e => {
                                const newPipe = pipelines.find(p => p.name === e.target.value);
                                setDealFormData({
                                    ...dealFormData, 
                                    pipeline: e.target.value, 
                                    stage: (newPipe?.stages || [])[0]?.id || 'new'
                                });
                            }}
                        >
                            {pipelines.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etapa do Funil</label>
                        <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white" value={dealFormData.stage} onChange={e => setDealFormData({...dealFormData, stage: e.target.value})}>
                            {(pipelines.find(p => p.name === dealFormData.pipeline)?.stages || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>

                    <div className="lg:col-span-3 border-t pt-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListTodo size={14}/> Tarefas & Agendamentos</h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                             <div className="text-slate-400 text-sm italic">O módulo de gerenciamento individual de tarefas para este negócio será habilitado em breve.</div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 border-t pt-6">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={14}/> Dados Financeiros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Forma Pagamento</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.paymentMethod} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Entrada</label><input type="number" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.entryValue} onChange={e => setDealFormData({...dealFormData, entryValue: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Nº Parcelas</label><input type="number" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: parseInt(e.target.value) || 1})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Parcela</label><input type="number" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.installmentValue} onChange={e => setDealFormData({...dealFormData, installmentValue: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">1º Vencimento</label><input type="date" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Link do Comprovante</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.receiptLink} onChange={e => setDealFormData({...dealFormData, receiptLink: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Cód. Transação</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.transactionCode} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} /></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 rounded-b-xl">
                <div className="flex items-center gap-2">
                    {editingDealId && <button onClick={handleDeleteDeal} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"><Trash2 size={16}/> Excluir Negociação</button>}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowDealModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm transition-colors">Cancelar</button>
                    <button onClick={handleSaveDeal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"><Save size={18} /> Salvar Negócio</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
