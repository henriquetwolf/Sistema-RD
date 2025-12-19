
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building2, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
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
  
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  const [newTaskDesc, setNoTaskDesc] = useState('');
  const [newTaskDate, setNoTaskDate] = useState('');
  const [newTaskType, setNoTaskType] = useState<'call' | 'email' | 'meeting' | 'todo'>('todo');

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
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, class_mod_2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          } else {
              setDeals([]);
          }

          setTeams(teamsResult.data || []);
          if (classesResult.data) {
              setRegisteredClasses(classesResult.data.map((c: any) => ({
                  id: c.id, course: c.course, state: c.state, city: c.city, mod1Code: c.mod_1_code, mod2Code: c.mod_2_code
              })));
          } else {
              setRegisteredClasses([]);
          }
          setDigitalProducts(productsResult.data || []);
          setEventsList(productsResult.data || []);
          if (collabResult.data) {
            setCollaborators(collabResult.data.map((c: any) => ({ id: c.id, fullName: c.full_name || 'Sem Nome', department: c.department || 'Geral' })));
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

  const productOptions = useMemo(() => {
      if (dealFormData.productType === 'Digital') return (digitalProducts || []).map(p => p.name).sort();
      if (dealFormData.productType === 'Evento') return (eventsList || []).map(e => e.name).sort();
      if (dealFormData.productType === 'Presencial') return Array.from(new Set((registeredClasses || []).map(c => c.course).filter(Boolean))).sort();
      return [];
  }, [dealFormData.productType, digitalProducts, registeredClasses, eventsList]);

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const getOwnerName = (id: string) => (collaborators || []).find(c => c.id === id)?.fullName || 'Nara';

  // --- WEBHOOK PLUGA INTEGRATION ---
  const sendToPlugaWebhook = async (deal: Deal) => {
    const PLUGA_URL = "https://hooks.pluga.co/v2/webhooks/MzkxODM1ODg4MjcxOTY2MDQ5NFQxNzY2MDAwMjI4";
    const ownerName = getOwnerName(deal.owner);
    const today = new Date().toISOString().split('T')[0];
    
    const obsArray = [
        { label: "Vendedor", value: ownerName },
        { label: "Tipo de Produto", value: deal.productType || "--" },
        { label: "Produto", value: deal.productName || "--" },
        { label: "Fonte", value: deal.source || "--" },
        { label: "Campanha", value: deal.campaign || "--" },
        { label: "Funil de Vendas", value: deal.pipeline || "Padrão" },
        { label: "Etapa do Funil", value: "Fechamento" },
        { label: "Forma de Pagamento", value: deal.paymentMethod || "--" },
        { label: "Valor de Entrada", value: formatCurrency(deal.entryValue) },
        { label: "Número de Parcelas", value: String(deal.installments || "1") },
        { label: "Valor das Parcelas", value: formatCurrency(deal.installmentValue) },
        { label: "Dia do Primeiro Vencimento", value: deal.firstDueDate ? new Date(deal.firstDueDate).toLocaleDateString('pt-BR') : "--" },
        { label: "Turma/Módulo", value: deal.classMod1 || deal.classMod2 || "--" },
        { label: "Link do Comprovante", value: deal.receiptLink || "--" },
        { label: "Código da Transação", value: deal.transactionCode || "--" },
        { label: "Dados da Inscrição", value: deal.registrationData || "--" },
        { label: "Observação", value: deal.observation || "--" }
    ];

    const payload = {
        data_venda: today,
        situacao_venda: "Aprovada",
        numero_venda: String(deal.dealNumber || ""),
        numero_negociacao: "Automático",
        nome_cliente: String(deal.companyName || deal.contactName || ""),
        email_cliente: String(deal.email || ""),
        telefone_cliente: String(deal.phone || "").replace(/\D/g, ''),
        cpf_cnpj_cliente: String(deal.cpf || "").replace(/\D/g, ''),
        nome_vendedor: String(ownerName),
        tipo_cliente: "Todos os tipos de pessoa",
        tipo_item: "Serviço",
        tipo_perfil: "Cliente",
        tipo_produto: String(deal.productType || ""),
        curso_produto: String(deal.productName || ""),
        fonte_negociacao: String(deal.source || ""),
        campanha: String(deal.campaign || ""),
        funil_vendas: String(deal.pipeline || "Padrão"),
        etapa_funil: "Fechamento",
        cep_cliente: String(deal.zipCode || "").replace(/\D/g, ''),
        rua_cliente: String(deal.address || ""),
        numero_endereco_cliente: String(deal.addressNumber || ""),
        cidade_cliente: String(deal.courseCity || ""),
        pais_cliente: "Brasil",
        nomes_itens: String(deal.productName || ""),
        quantidades_itens: "1",
        valor_total: (deal.value || 0).toFixed(2),
        itens_venda: `${deal.productName || "Serviço"} (1 un) - ${formatCurrency(deal.value)}`,
        forma_pagamento: String(deal.paymentMethod || ""),
        valor_entrada: (deal.entryValue || 0).toFixed(2),
        numero_parcelas: String(deal.installments || "1"),
        valor_parcelas: (deal.installmentValue || 0).toFixed(2),
        dia_primeiro_vencimento: String(deal.firstDueDate || ""),
        turma_modulo: String(deal.classMod1 || deal.classMod2 || ""),
        link_comprovante: String(deal.receiptLink || ""),
        codigo_transacao: String(deal.transactionCode || ""),
        dados_inscricao: String(deal.registrationData || ""),
        observacoes_array: JSON.stringify(obsArray)
    };

    try {
        await fetch(PLUGA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("Webhook enviado para Pluga com sucesso.");
    } catch (error) {
        console.error("Erro ao enviar Webhook para Pluga:", error);
    }
  };

  const moveDeal = async (dealId: string, currentStage: DealStage, direction: 'next' | 'prev') => {
    const stageOrder: DealStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'closed'];
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
        
        if (newStage === 'closed') {
            sendToPlugaWebhook({ ...deal, stage: 'closed' });
        }
    } catch (e: any) { handleDbError(e); fetchData(); }
  };

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
        
        if (targetStage === 'closed') {
            sendToPlugaWebhook({ ...currentDeal, stage: 'closed' });
        }
    } catch (e) { handleDbError(e); fetchData(); }
    setDraggedDealId(null);
  };

  const handleSaveDeal = async () => {
      if (!dealFormData.companyName) { alert("Preencha o Nome Completo do Cliente."); return; }
      const dealTitle = dealFormData.companyName;
      const isClosing = dealFormData.stage === 'closed';
      
      const payload = {
          title: dealTitle, company_name: dealFormData.companyName, contact_name: dealFormData.contactName, value: Number(dealFormData.value) || 0,
          payment_method: dealFormData.paymentMethod, stage: dealFormData.stage || 'new', owner_id: dealFormData.owner, status: dealFormData.status || 'warm',
          next_task: dealFormData.nextTask, source: dealFormData.source, campaign: dealFormData.campaign, entry_value: Number(dealFormData.entryValue) || 0,
          installments: Number(dealFormData.installments) || 1, installment_value: Number(dealFormData.installmentValue || 0),
          product_type: dealFormData.productType || null, product_name: dealFormData.productName,
          email: dealFormData.email, phone: dealFormData.phone, cpf: dealFormData.cpf, first_due_date: dealFormData.firstDueDate || null,
          receipt_link: dealFormData.receiptLink, transaction_code: dealFormData.transactionCode, zip_code: dealFormData.zipCode, 
          address: dealFormData.address, address_number: dealFormData.addressNumber, registration_data: dealFormData.registrationData, 
          observation: dealFormData.observation, course_state: dealFormData.courseState, course_city: dealFormData.courseCity, 
          class_mod_1: dealFormData.classMod1, class_mod_2: dealFormData.classMod2, pipeline: dealFormData.pipeline || 'Padrão', 
          tasks: dealFormData.tasks, billing_cnpj: dealFormData.billingCnpj, billing_company_name: dealFormData.billingCompanyName
      };

      try {
          let savedDeal: any;
          if (editingDealId) {
              await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
              savedDeal = { ...dealFormData, id: editingDealId };
          } else {
              const dealNumber = generateDealNumber();
              const { data } = await appBackend.client.from('crm_deals').insert([{ ...payload, deal_number: dealNumber }]).select().single();
              savedDeal = { ...dealFormData, ...payload, id: data?.id, dealNumber };
          }

          if (isClosing) {
              sendToPlugaWebhook(savedDeal as Deal);
          }

          await fetchData();
          setShowDealModal(false);
      } catch (e: any) { handleDbError(e); }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => { setDraggedDealId(dealId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dealId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const openNewDealModal = () => { setEditingDealId(null); setDealFormData({ ...INITIAL_FORM_STATE, owner: collaborators.find(c => c.department === 'Comercial')?.id || '' }); setShowDealModal(true); };
  const openEditDealModal = (deal: Deal) => { setEditingDealId(deal.id); setDealFormData({ ...deal }); setShowDealModal(true); };
  const getStageSummary = (stage: DealStage) => { const stageDeals = (deals || []).filter(d => d.stage === stage); return { count: stageDeals.length, total: stageDeals.reduce((acc, curr) => acc + (curr.value || 0), 0) }; };
  const filteredDeals = (deals || []).filter(d => (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.dealNumber && d.dealNumber.toString().includes(searchTerm)));

  const handleAddTask = () => {
    if (!newTaskDesc || !newTaskDate) return;
    const newTask: DealTask = { id: crypto.randomUUID(), description: newTaskDesc, dueDate: newTaskDate, type: newTaskType, isDone: false };
    setDealFormData(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
    setNoTaskDesc(''); setNoTaskDate('');
  };

  const removeTask = (taskId: string) => {
    setDealFormData(prev => ({ ...prev, tasks: prev.tasks?.filter(t => t.id !== taskId) }));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={() => setActiveView('pipeline')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={16} /> Pipeline</button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative max-w-xs w-full hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar oportunidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm outline-none"/>
            </div>
            <button onClick={openNewDealModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Negócio</button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative custom-scrollbar">
        {isLoading && deals.length === 0 ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
            <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(column => {
                const summary = getStageSummary(column.id);
                const columnDeals = filteredDeals.filter(d => d.stage === column.id);
                return (
                <div key={column.id} className="w-[320px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)}>
                    <div className={clsx("p-3 border-t-4 bg-white rounded-t-xl border-b border-b-slate-100", column.color)}>
                        <div className="flex justify-between items-start mb-1"><h3 className="font-semibold text-slate-700">{column.title}</h3><button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button></div>
                        <div className="flex justify-between items-end"><span className="text-xs text-slate-500 font-medium">{summary.count} negócios</span><span className="text-xs font-bold text-slate-800">{formatCurrency(summary.total)}</span></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                    {columnDeals.map(deal => (
                        <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400" : "")}>
                            <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <div>{deal.dealNumber && <span className="text-[10px] text-slate-400 font-mono block">#{deal.dealNumber}</span>}<h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{deal.title}</h4></div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                        {column.id !== 'new' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180"/></button>}
                                        {column.id !== 'closed' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mb-2 truncate">{deal.companyName}</p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <span className="font-bold text-slate-700 text-sm">{formatCurrency(deal.value)}</span>
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm">{(getOwnerName(deal.owner)).charAt(0)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>

      {showDealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex flex-col"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={20} className="text-indigo-600" /> {editingDealId ? 'Editar Negociação' : 'Nova Oportunidade'}</h3>{editingDealId && dealFormData.dealNumber && <span className="text-xs text-slate-500 font-mono ml-7">Protocolo #{dealFormData.dealNumber}</span>}</div>
                      <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
                      {/* 1. DADOS DA NEGOCIAÇÃO */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Target size={16} /> Dados da Negociação</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Nº Negociação</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-500 font-mono" value={dealFormData.dealNumber || 'Automático'} disabled readOnly /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo do Cliente *</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.companyName} onChange={e => setDealFormData({ ...dealFormData, companyName: e.target.value, title: e.target.value })} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Responsável</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.owner} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}><option value="">Selecione...</option>{collaborators.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Produto</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.productType} onChange={e => setDealFormData({...dealFormData, productType: e.target.value as any, productName: ''})}><option value="">Tipo...</option><option value="Presencial">Curso Presencial</option><option value="Digital">Produto Digital</option><option value="Evento">Evento</option></select></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Produto</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.productName} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})} disabled={!dealFormData.productType}><option value="">Selecione...</option>{productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Etapa do Funil</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.stage} onChange={e => setDealFormData({...dealFormData, stage: e.target.value as any})}>{COLUMNS.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}</select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor Total (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: parseFloat(e.target.value) || 0})} /></div>
                          </div>
                      </div>

                      {/* 2. CONTATO E FATURAMENTO */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                              <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Phone size={16} /> Contato do Cliente</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Email Principal</label><input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.email} onChange={e => setDealFormData({...dealFormData, email: e.target.value})} /></div>
                                  <div><label className="block text-xs font-bold text-slate-500 mb-1">Telefone/WhatsApp</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.phone} onChange={e => setDealFormData({...dealFormData, phone: e.target.value})} /></div>
                                  <div><label className="block text-xs font-bold text-slate-500 mb-1">CPF/CNPJ Cliente</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.cpf} onChange={e => setDealFormData({...dealFormData, cpf: e.target.value})} /></div>
                              </div>
                          </div>
                          <div>
                              <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={16} /> Faturamento (Setor Comercial)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Empresa de Faturamento (Auto)</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500" value={dealFormData.billingCompanyName || '--'} readOnly /></div>
                                  <div><label className="block text-xs font-bold text-slate-500 mb-1">CNPJ de Faturamento</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500" value={dealFormData.billingCnpj || '--'} readOnly /></div>
                                  <div><label className="block text-xs font-bold text-slate-500 mb-1">Fonte de Negócio</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.source} onChange={e => setDealFormData({...dealFormData, source: e.target.value})} /></div>
                              </div>
                          </div>
                      </div>

                      {/* 3. ENDEREÇO E CURSO */}
                      <div>
                          <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><MapPin size={16} /> Endereço e Dados de Aluno</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">CEP</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.zipCode} onChange={e => setDealFormData({ ...dealFormData, zipCode: formatCEP(e.target.value) })} /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Logradouro / Rua</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.address} onChange={e => setDealFormData({...dealFormData, address: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">Nº Endereço</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.addressNumber} onChange={e => setDealFormData({...dealFormData, addressNumber: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">Cidade (Filtro)</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.courseCity} onChange={e => setDealFormData({...dealFormData, courseCity: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1">UF (Filtro)</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.courseState} onChange={e => setDealFormData({...dealFormData, courseState: e.target.value})} maxLength={2} /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Dados Complementares / Inscrição</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.registrationData} onChange={e => setDealFormData({...dealFormData, registrationData: e.target.value})} /></div>
                          </div>
                      </div>

                      {/* 4. PAGAMENTO E TURMAS */}
                      <div>
                          <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><CreditCard size={16} /> Pagamento e Agendamento</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Forma de Pagamento</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.paymentMethod} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})}><option value="">Selecione...</option><option value="Pix">Pix</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Boleto">Boleto</option><option value="Link de Pagamento">Link de Pagamento</option><option value="Transferência">Transferência</option></select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor de Entrada (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.entryValue} onChange={e => setDealFormData({...dealFormData, entryValue: parseFloat(e.target.value) || 0})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Nº Parcelas</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: parseInt(e.target.value) || 1})} min={1} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">Valor da Parcela (R$)</label><input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.installmentValue} onChange={e => setDealFormData({...dealFormData, installmentValue: parseFloat(e.target.value) || 0})} /></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">1º Vencimento</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><GraduationCap size={14}/> Turma / Código do Curso</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.classMod1} onChange={e => setDealFormData({...dealFormData, classMod1: e.target.value, classMod2: e.target.value})}><option value="">Vincular Turma...</option>{registeredClasses.map(c => <option key={c.id} value={c.mod1Code}>{c.mod1Code}</option>)}</select></div>
                              <div><label className="block text-xs font-bold text-slate-600 mb-1">ID da Transação / Pedido</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.transactionCode} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} /></div>
                          </div>
                      </div>

                      {/* 5. TAREFAS E OBSERVAÇÕES */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                              <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><ListTodo size={16} /> Próximas Tarefas</h4>
                              <div className="space-y-4">
                                  <div className="flex gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                      <input type="text" placeholder="O que precisa ser feito?" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" value={newTaskDesc} onChange={e => setNoTaskDesc(e.target.value)} />
                                      <input type="date" className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none" value={newTaskDate} onChange={e => setNoTaskDate(e.target.value)} />
                                      <button onClick={handleAddTask} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"><Plus size={18} /></button>
                                  </div>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {dealFormData.tasks?.map(task => (
                                          <div key={task.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg group">
                                              <div className="flex items-center gap-3">
                                                  <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={task.isDone} onChange={() => {}} />
                                                  <div><p className="text-xs font-bold text-slate-700">{task.description}</p><p className="text-[10px] text-slate-400">Vencimento: {new Date(task.dueDate).toLocaleDateString()}</p></div>
                                              </div>
                                              <button onClick={() => removeTask(task.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                          </div>
                                      ))}
                                      {(!dealFormData.tasks || dealFormData.tasks.length === 0) && <p className="text-center text-xs text-slate-300 italic py-4">Sem tarefas agendadas.</p>}
                                  </div>
                              </div>
                          </div>
                          <div>
                              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><FileText size={16} /> Observações Internas</h4>
                              <textarea className="w-full border border-slate-300 rounded-xl p-4 text-sm h-full min-h-[140px] outline-none focus:border-indigo-400 resize-none bg-slate-50/30" placeholder="Histórico de conversas, preferências do aluno..." value={dealFormData.observation} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})}></textarea>
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200 shrink-0">
                      <button onClick={() => setShowDealModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                      <button onClick={handleSaveDeal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20"><Save size={16} /> Salvar Negócio</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
