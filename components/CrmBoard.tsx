
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, CompanySetting } from '../services/appBackend';

// --- Types ---
type DealStage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'closed';

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
  
  productType?: 'Digital' | 'Presencial' | 'Evento';
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

interface Column {
  id: DealStage;
  title: string;
  color: string;
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

const COLUMNS: Column[] = [
  { id: 'new', title: 'Sem Contato', color: 'border-slate-300' },
  { id: 'contacted', title: 'Contatado', color: 'border-blue-400' },
  { id: 'proposal', title: 'Proposta Enviada', color: 'border-yellow-400' },
  { id: 'negotiation', title: 'Em Negociação', color: 'border-orange-500' },
  { id: 'closed', title: 'Fechamento', color: 'border-green-500' },
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
    productType: 'Presencial', productName: '',
    billingCnpj: '', billingCompanyName: '',
    tasks: []
};

export const CrmBoard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pipeline' | 'teams'>('pipeline');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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

  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskType, setNewTaskType] = useState<'call' | 'email' | 'meeting' | 'todo'>('todo');

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
          const [dealsResult, teamsResult, classesResult, productsResult, eventsResult, collabResult, companiesResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
              appBackend.client.from('crm_teams').select('*').order('name', { ascending: true }),
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
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type, productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receipt_link: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, address_number: d.address_number,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, classMod2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          } else {
              setDeals([]);
          }

          setTeams(teamsResult.data || []);
          setRegisteredClasses(classesResult.data || []);
          setDigitalProducts(productsResult.data || []);
          setEventsList(eventsResult.data || []);
          
          if (collabResult.data) {
            setCollaborators(collabResult.data.map((c: any) => ({
                id: c.id,
                fullName: c.full_name || 'Sem Nome',
                department: c.department || 'Geral'
            })));
          } else {
            setCollaborators([]);
          }

          setCompanies(companiesResult || []);

      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const availableStates = useMemo(() => Array.from(new Set((registeredClasses || []).map(c => c.state).filter(Boolean))).sort(), [registeredClasses]);
  const availableCities = useMemo(() => dealFormData.courseState ? Array.from(new Set((registeredClasses || []).filter(c => c.state === dealFormData.courseState).map(c => c.city).filter(Boolean))).sort() : [], [registeredClasses, dealFormData.courseState]);
  const availableMod1Codes = useMemo(() => dealFormData.courseCity ? (registeredClasses || []).filter(c => c.state === dealFormData.courseState && c.city === dealFormData.courseCity && c.mod1Code).map(c => c.mod1Code) : [], [registeredClasses, dealFormData.courseState, dealFormData.courseCity]);
  const availableMod2Codes = useMemo(() => dealFormData.courseCity ? (registeredClasses || []).filter(c => c.state === dealFormData.courseState && c.city === dealFormData.courseCity && c.mod2Code).map(c => c.mod2Code) : [], [registeredClasses, dealFormData.courseState, dealFormData.courseCity]);

  const productOptions = useMemo(() => {
      if (dealFormData.productType === 'Digital') return (digitalProducts || []).map(p => p.name).sort();
      if (dealFormData.productType === 'Evento') return (eventsList || []).map(e => e.name).sort();
      return Array.from(new Set((registeredClasses || []).map(c => c.course).filter(Boolean))).sort();
  }, [dealFormData.productType, digitalProducts, registeredClasses, eventsList]);

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const getOwnerName = (id: string) => (collaborators || []).find(c => c.id === id)?.fullName || 'Desconhecido';

  const moveDeal = async (dealId: string, currentStage: DealStage, direction: 'next' | 'prev') => {
    const stageOrder: DealStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'closed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= stageOrder.length) return;
    const newStage = stageOrder[newIndex];
    const now = new Date();

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage, closedAt: newStage === 'closed' ? now : (currentStage === 'closed' ? undefined : d.closedAt) } : d));

    try {
        const updates: any = { stage: newStage };
        if (newStage === 'closed') updates.closed_at = now.toISOString();
        if (currentStage === 'closed' && newStage !== 'closed') updates.closed_at = null;
        await appBackend.client.from('crm_deals').update(updates).eq('id', dealId);
    } catch (e: any) {
        handleDbError(e);
        fetchData(); 
    }
  };

  const getStageSummary = (stage: DealStage) => {
    const stageDeals = (deals || []).filter(d => d.stage === stage);
    return { count: stageDeals.length, total: stageDeals.reduce((acc, curr) => acc + (curr.value || 0), 0) };
  };

  const filteredDeals = (deals || []).filter(d => 
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.dealNumber && d.dealNumber.toString().includes(searchTerm))
  );

  const handleDragStart = (e: React.DragEvent, dealId: string) => { setDraggedDealId(dealId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dealId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const currentDeal = (deals || []).find(d => d.id === draggedDealId);
    if (!currentDeal || currentDeal.stage === targetStage) { setDraggedDealId(null); return; }
    const now = new Date();
    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stage: targetStage, closedAt: targetStage === 'closed' ? now : (d.stage === 'closed' ? undefined : d.closedAt) } : d));
    try {
        const updates: any = { stage: targetStage };
        if (targetStage === 'closed') updates.closed_at = now.toISOString();
        else if (currentDeal.stage === 'closed') updates.closed_at = null;
        await appBackend.client.from('crm_deals').update(updates).eq('id', draggedDealId);
    } catch (e) { handleDbError(e); fetchData(); }
    setDraggedDealId(null);
  };

  const openNewDealModal = () => { 
    setEditingDealId(null); 
    const firstComercial = (collaborators || []).find(c => c.department === 'Comercial');
    setDealFormData({ ...INITIAL_FORM_STATE, owner: firstComercial?.id || '' }); 
    setShowDealModal(true); 
  };
  const openEditDealModal = (deal: Deal) => { setEditingDealId(deal.id); setDealFormData({ ...deal }); setShowDealModal(true); };

  // --- TEAM ACTIONS ---
  const openNewTeamModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setSelectedMembers([]);
    setShowTeamModal(true);
  };

  const openEditTeamModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name || '');
    setSelectedMembers(team.members || []);
    setShowTeamModal(true);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;
    setIsSavingTeam(true);
    try {
        const payload = {
            name: teamName,
            members: selectedMembers || []
        };
        
        let response;
        if (editingTeam) {
            response = await appBackend.client.from('crm_teams').update(payload).eq('id', editingTeam.id);
        } else {
            response = await appBackend.client.from('crm_teams').insert([payload]);
        }

        if (response.error) {
            throw response.error;
        }

        await fetchData();
        setShowTeamModal(false);
    } catch (e: any) {
        console.error("Erro ao salvar equipe:", e);
        handleDbError(e);
    } finally {
        setIsSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
      if (!window.confirm("Excluir esta equipe?")) return;
      try {
          const { error } = await appBackend.client.from('crm_teams').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
      } catch (e: any) {
          alert(`Erro ao excluir equipe: ${e.message}`);
      }
  };

  const toggleMember = (id: string) => {
      setSelectedMembers(prev => {
          const current = prev || [];
          return current.includes(id) ? current.filter(m => m !== id) : [...current, id];
      });
  };

  const handleAddTask = () => {
      if(!newTaskDesc) return;
      const newTask: DealTask = { id: crypto.randomUUID(), description: newTaskDesc, dueDate: newTaskDate, type: newTaskType, isDone: false };
      setDealFormData(prev => ({ ...prev, tasks: [newTask, ...(prev.tasks || [])] }));
      setNewTaskDesc(''); setNewTaskDate('');
  };

  const handleSaveDeal = async () => {
      if (!dealFormData.companyName) { alert("Preencha o Nome Completo do Cliente."); return; }
      const dealTitle = dealFormData.companyName;
      const payload = {
          title: dealTitle, 
          company_name: dealFormData.companyName, 
          contact_name: dealFormData.contactName, 
          value: Number(dealFormData.value) || 0,
          payment_method: dealFormData.paymentMethod, 
          stage: dealFormData.stage || 'new', 
          owner_id: dealFormData.owner, 
          status: dealFormData.status || 'warm',
          next_task: dealFormData.nextTask, 
          source: dealFormData.source, 
          campaign: dealFormData.campaign, 
          entry_value: Number(dealFormData.entryValue) || 0,
          installments: Number(dealFormData.installments) || 1, 
          installment_value: Number(dealFormData.installmentValue || 0),
          product_type: dealFormData.productType, 
          product_name: dealFormData.productName,
          email: dealFormData.email, 
          phone: dealFormData.phone,
          cpf: dealFormData.cpf, 
          first_due_date: dealFormData.firstDueDate, 
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
          pipeline: dealFormData.pipeline || 'Padrão', 
          tasks: dealFormData.tasks,
          billing_cnpj: dealFormData.billingCnpj, 
          billing_company_name: dealFormData.billingCompanyName
      };

      try {
          if (editingDealId) {
              await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
          } else {
              const dealNumber = generateDealNumber();
              await appBackend.client.from('crm_deals').insert([{ ...payload, deal_number: dealNumber }]);
          }
          await fetchData();
          setShowDealModal(false);
      } catch (e: any) { handleDbError(e); }
  };

  const handleDeleteDeal = async () => {
      if (editingDealId && window.confirm("Excluir esta negociação?")) {
          try {
            await appBackend.client.from('crm_deals').delete().eq('id', editingDealId);
            await fetchData();
            setShowDealModal(false);
          } catch(e: any) { alert(`Erro ao excluir: ${e.message}`); }
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={() => setActiveView('pipeline')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={16} /> Pipeline</button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
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
            ) : (
                <button onClick={openNewTeamModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Nova Equipe</button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative custom-scrollbar">
        {isLoading && deals.length === 0 ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
        <>
            {activeView === 'pipeline' && (
                <div className="flex gap-4 h-full min-w-max">
                {COLUMNS.map(column => {
                    const summary = getStageSummary(column.id);
                    const columnDeals = filteredDeals.filter(d => d.stage === column.id);
                    return (
                    <div key={column.id} className="w-[320px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)}>
                        <div className={clsx("p-3 border-t-4 bg-white rounded-t-xl border-b border-b-slate-100", column.color)}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-slate-700">{column.title}</h3>
                                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-500 font-medium">{summary.count} negócios</span>
                                <span className="text-xs font-bold text-slate-800">{formatCurrency(summary.total)}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
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
                                            {column.id !== 'new' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180"/></button>}
                                            {column.id !== 'closed' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>}
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
            )}
            
            {activeView === 'teams' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Equipes Comerciais</h2>
                        <p className="text-sm text-slate-500">Agrupe seus vendedores para análise de performance.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(teams || []).map(team => (
                            <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                                        <Users size={24} />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditTeamModal(team)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteTeam(team.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{team.name || 'Sem nome'}</h3>
                                <p className="text-xs text-slate-400 mb-4">{(team.members || []).length} membros ativos</p>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(team.members || []).map(memberId => {
                                        const col = (collaborators || []).find(c => c.id === memberId);
                                        if (!col) return null;
                                        return (
                                            <div key={memberId} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={col.fullName}>
                                                {(col.fullName || '?').charAt(0)}
                                            </div>
                                        );
                                    })}
                                    {(team.members || []).length === 0 && <span className="text-xs text-slate-400 italic">Sem membros</span>}
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={openNewTeamModal}
                            className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-indigo-300 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 mb-2">
                                <Plus size={24} />
                            </div>
                            <span className="font-bold text-slate-600 group-hover:text-indigo-600">Nova Equipe</span>
                        </button>
                    </div>
                </div>
            )}
        </>
        )}
      </div>

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
                          <input 
                            type="text" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Ex: Time Vendas Sul, Inside Sales..." 
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Membros do Comercial</label>
                          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              {(collaborators || []).filter(c => c.department === 'Comercial').length === 0 ? (
                                  <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                      <p className="text-sm text-slate-400 italic">Nenhum colaborador do Comercial encontrado.</p>
                                  </div>
                              ) : (
                                  (collaborators || []).filter(c => c.department === 'Comercial').map(col => (
                                      <label key={col.id} className={clsx("flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all", (selectedMembers || []).includes(col.id) ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:bg-slate-50")}>
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{(col.fullName || '?').charAt(0)}</div>
                                              <span className="text-sm font-medium text-slate-700">{col.fullName}</span>
                                          </div>
                                          <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                            checked={(selectedMembers || []).includes(col.id)}
                                            onChange={() => toggleMember(col.id)}
                                          />
                                      </label>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                      <button 
                        onClick={handleSaveTeam} 
                        disabled={isSavingTeam || !teamName.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                      >
                          {isSavingTeam ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Salvar Equipe
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showDealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
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
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº Negociação</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-500 font-mono" value={dealFormData.dealNumber || 'Automático'} disabled readOnly />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo do Cliente *</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Nome do Cliente/Empresa" value={dealFormData.companyName} onChange={e => setDealFormData({ ...dealFormData, companyName: e.target.value, title: e.target.value })} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Responsável</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.owner} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      {(collaborators || []).filter(c => c.department === 'Comercial').map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Produto</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.productType} onChange={e => setDealFormData({...dealFormData, productType: e.target.value as any, productName: ''})}>
                                      <option value="Presencial">Curso Presencial</option>
                                      <option value="Digital">Produto Digital</option>
                                      <option value="Evento">Evento Presencial</option>
                                  </select>
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">{dealFormData.productType === 'Evento' ? 'Evento' : dealFormData.productType === 'Digital' ? 'Curso Online / E-book' : 'Curso Presencial'}</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.productName} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})}>
                                      <option value="">Selecione o produto...</option>
                                      {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                              </div>

                              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
                                  <div>
                                      <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">Empresa de Faturamento (Auto)</label>
                                      <div className="flex items-center gap-2 text-indigo-900 font-bold">
                                          <Building size={16} />
                                          <span className="text-sm truncate">{dealFormData.billingCompanyName || 'Nenhuma empresa vinculada'}</span>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">CNPJ de Venda (Auto)</label>
                                      <input 
                                        type="text" 
                                        className="w-full px-3 py-1.5 border border-indigo-200 rounded text-sm bg-white text-indigo-900 font-mono focus:outline-none" 
                                        value={dealFormData.billingCnpj || ''} 
                                        readOnly 
                                        placeholder="Selecione um Tipo de Produto..."
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Fonte</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" placeholder="Instagram, Indicação" value={dealFormData.source} readOnly />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Campanha</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" placeholder="Black Friday 2024" value={dealFormData.campaign} readOnly />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Funil de Vendas</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50" value={dealFormData.pipeline} disabled />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Etapa do Funil</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.stage} onChange={e => setDealFormData({...dealFormData, stage: e.target.value as any})}>
                                      {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><ListTodo size={16} /> Tarefas & Agendamentos</h4>
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <div className="flex gap-2 items-end mb-4">
                                  <div className="flex-1">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Nova Tarefa</label>
                                      <input type="text" placeholder="Ex: Ligar para confirmar..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
                                  </div>
                                  <div className="w-32">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                                      <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} />
                                  </div>
                                  <div className="w-28">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={newTaskType} onChange={e => setNewTaskType(e.target.value as any)}>
                                          <option value="todo">Tarefa</option><option value="call">Ligação</option><option value="email">Email</option><option value="meeting">Reunião</option>
                                      </select>
                                  </div>
                                  <button onClick={handleAddTask} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg h-[38px] w-[38px] flex items-center justify-center"><Plus size={20} /></button>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                  {(dealFormData.tasks || []).length ? dealFormData.tasks!.map(task => (
                                      <div key={task.id} className={clsx("flex items-center gap-3 p-2 bg-white rounded border", task.isDone ? "border-green-200 bg-green-50" : "border-slate-200")}>
                                          <button onClick={() => setDealFormData(prev => ({...prev, tasks: prev.tasks?.map(t => t.id === task.id ? {...t, isDone: !t.isDone} : t)}))} className={clsx("w-5 h-5 rounded border flex items-center justify-center", task.isDone ? "bg-green-500 border-green-500 text-white" : "border-slate-300")}>{task.isDone && <CheckCircle2 size={14} />}</button>
                                          <div className={clsx("flex-1 text-sm", task.isDone ? "text-slate-400 line-through" : "text-slate-700")}>{task.description}</div>
                                          {task.dueDate && <div className={clsx("text-xs px-2 py-0.5 rounded flex items-center gap-1", task.isDone ? "bg-slate-100 text-slate-400" : "bg-red-50 text-red-600 border border-red-100")}><Clock size={10} />{new Date(task.dueDate).toLocaleDateString()}</div>}
                                          <button onClick={() => setDealFormData(prev => ({...prev, tasks: prev.tasks?.filter(t => t.id !== task.id)}))} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                      </div>
                                  )) : <p className="text-xs text-slate-400 text-center py-2 italic">Nenhuma tarefa registrada.</p>}
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><DollarSign size={16} /> Dados Financeiros</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor Total (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor de Entrada (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.entryValue} onChange={e => setDealFormData({...dealFormData, entryValue: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Forma de Pagamento</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.paymentMethod} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})}><option value="">Selecione...</option><option value="Boleto">Boleto</option><option value="Pix">Pix</option><option value="CartaoCredito">Cartão de Crédito</option><option value="Recorrencia">Recorrência</option></select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Nº Parcelas</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: parseInt(e.target.value)})}>{[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}</select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor Parcelas (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.installmentValue} onChange={e => setDealFormData({...dealFormData, installmentValue: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Dia 1º Vencimento</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Cód. Transação</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.transactionCode} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Link Comprovante</label><div className="relative"><LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.receiptLink} onChange={e => setDealFormData({...dealFormData, receiptLink: e.target.value})} /></div></div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><MapPin size={16} /> Dados de Contato e Pessoais</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Email</label><input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.email} onChange={e => setDealFormData({...dealFormData, email: e.target.value})} /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Telefone / WhatsApp</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.phone} onChange={e => setDealFormData({...dealFormData, phone: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">CPF</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.cpf} onChange={e => setDealFormData({...dealFormData, cpf: formatCPF(e.target.value)})} maxLength={14} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">CEP</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.zipCode} onChange={e => setDealFormData({...dealFormData, zipCode: formatCEP(e.target.value)})} maxLength={9} /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Endereço</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.address} onChange={e => setDealFormData({...dealFormData, address: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Número</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.addressNumber} onChange={e => setDealFormData({...dealFormData, addressNumber: e.target.value})} /></div>
                          </div>
                      </div>

                      {dealFormData.productType === 'Presencial' && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                              <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><GraduationCap size={16} /> Logística do Curso</h4>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Estado (UF)</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.courseState} onChange={e => setDealFormData({...dealFormData, courseState: e.target.value, courseCity: '', classMod1: '', classMod2: ''})}><option value="">Selecione...</option>{availableStates.map(uf => <option key={uf} value={uf}>{uf}</option>)}</select></div>
                                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Cidade do Curso</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100" value={dealFormData.courseCity} onChange={e => setDealFormData({...dealFormData, courseCity: e.target.value, classMod1: '', classMod2: ''})} disabled={!dealFormData.courseState || availableCities.length === 0}><option value="">Selecione...</option>{availableCities.map(city => <option key={city} value={city}>{city}</option>)}</select></div>
                                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Turma Módulo 1</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.classMod1} onChange={e => setDealFormData({...dealFormData, classMod1: e.target.value})} disabled={!dealFormData.courseCity}><option value="">Selecione...</option>{availableMod1Codes.map(code => <option key={code} value={code}>{code}</option>)}</select></div>
                                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Turma Módulo 2</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.classMod2} onChange={e => setDealFormData({...dealFormData, classMod2: e.target.value})} disabled={!dealFormData.courseCity}><option value="">Selecione...</option>{availableMod2Codes.map(code => <option key={code} value={code}>{code}</option>)}</select></div>
                              </div>
                          </div>
                      )}

                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><FileText size={16} /> Detalhes Finais</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Dados da Inscrição</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none" value={dealFormData.registrationData} onChange={e => setDealFormData({...dealFormData, registrationData: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Observação</label><textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none" value={dealFormData.observation} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})} /></div>
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 flex justify-between gap-3 border-t border-slate-200 shrink-0">
                        {editingDealId ? <button onClick={handleDeleteDeal} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center gap-2"><Trash2 size={16} /> Excluir</button> : <div></div>}
                        <div className="flex gap-2">
                            <button onClick={() => setShowDealModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                            <button onClick={handleSaveDeal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2"><Save size={16} /> Salvar Negócio</button>
                        </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
