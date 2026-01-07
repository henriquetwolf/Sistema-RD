
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2, Palette, Settings as SettingsIcon, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, CompanySetting, Pipeline, PipelineStage, WebhookTrigger } from '../services/appBackend';

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
  const [webhookTriggers, setWebhookTriggers] = useState<WebhookTrigger[]>([]);
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

  // Lógica de preenchimento automático de CNPJ e Empresa
  useEffect(() => {
      if (companies.length > 0) {
          let matched: CompanySetting | undefined;

          // 1. Prioridade Máxima: Tenta encontrar por PRODUTO ESPECÍFICO
          if (dealFormData.productName) {
              matched = companies.find(c => (c.productIds || []).includes(dealFormData.productName!));
          }

          // 2. Fallback: Se não encontrou por produto, tenta por TIPO DE PRODUTO
          if (!matched && dealFormData.productType) {
              matched = companies.find(c => (c.productTypes || []).includes(dealFormData.productType!));
          }

          if (matched) {
              setDealFormData(prev => ({
                  ...prev,
                  billingCnpj: matched!.cnpj,
                  billingCompanyName: matched!.legalName
              }));
          } else {
              // Se não houver match algum, limpa os campos automáticos
              setDealFormData(prev => ({
                  ...prev,
                  billingCnpj: '',
                  billingCompanyName: ''
              }));
          }
      }
  }, [dealFormData.productName, dealFormData.productType, companies]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [dealsResult, teamsResult, pipelinesResult, classesResult, productsResult, eventsResult, collabResult, companiesResult, triggersResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
              appBackend.client.from('crm_teams').select('*').order('name', { ascending: true }),
              appBackend.getPipelines(),
              appBackend.client.from('crm_classes').select('id, course, state, city, mod_1_code, mod_2_code'),
              appBackend.client.from('crm_products').select('id, name').eq('status', 'active'),
              appBackend.client.from('crm_events').select('id, name').order('created_at', { ascending: false }),
              appBackend.client.from('crm_collaborators').select('id, full_name, department').order('full_name', { ascending: true }),
              appBackend.getCompanies(),
              appBackend.getWebhookTriggers()
          ]);

          if (dealsResult.data) {
              setDeals(dealsResult.data.map((d: any) => ({
                  id: d.id, dealNumber: d.deal_number, title: d.title || '', contactName: d.contact_name || '', companyName: d.company_name || '',
                  value: Number(d.value || 0), payment_method: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  next_task: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  /* Corrected property mapping to camelCase Deal interface and fix classMod2 mapping */
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number,
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
          setWebhookTriggers(triggersResult || []);

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
        const { data, error = null } = await appBackend.client.from('crm_deals').update(updates).eq('id', dealId).select().single();
        if (error) throw error;

        // Disparo condicional de Webhook baseado no estágio destino
        if (data) {
            dispatchNegotiationWebhook(data);
        }

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
        const { data, error = null } = await appBackend.client.from('crm_deals').update(updates).eq('id', draggedDealId).select().single();
        if (error) throw error;

        // Disparo condicional de Webhook baseado no estágio destino
        if (data) {
            dispatchNegotiationWebhook(data);
        }

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
