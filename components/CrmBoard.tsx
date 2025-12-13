import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap
} from 'lucide-react';
import clsx from 'clsx';
import { MOCK_COLLABORATORS } from './CollaboratorsManager';
import { appBackend } from '../services/appBackend';

// --- Types ---
type DealStage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'closed';

interface Deal {
  id: string;
  title: string; // Nome da negociação
  contactName: string;
  companyName: string; // Cliente
  value: number; // Valor Total
  
  // Novos Campos Solicitados
  pipeline?: string; // Funil de Vendas
  source?: string; // Fonte
  campaign?: string; // Campanha
  entryValue?: number; // Valor de Entrada
  paymentMethod?: string; // Forma de Pagamento
  installments?: number; // Número de Parcelas
  installmentValue?: number; // Valor das Parcelas
  
  cpf?: string;
  firstDueDate?: string; // Dia do primeiro Vencimento
  receiptLink?: string; // Link do Comprovante
  transactionCode?: string; // Código da Transação
  
  zipCode?: string; // CEP
  address?: string; // Endereço
  addressNumber?: string; // Número
  
  registrationData?: string; // Dados da Inscrição
  observation?: string; // Observação
  
  courseCity?: string; // Cidade do Curso
  classMod1?: string; // Turma Módulo 1
  classMod2?: string; // Turma Módulo 2

  stage: DealStage;
  owner: string; // ID of the collaborator
  createdAt: Date;
  closedAt?: Date;
  status: 'hot' | 'warm' | 'cold';
  nextTask?: string;
}

interface Column {
  id: DealStage;
  title: string;
  color: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[]; // IDs of collaborators
}

interface ClassOption {
    id: string;
    code: string;
    city: string;
}

// --- Mock Columns ---
const COLUMNS: Column[] = [
  { id: 'new', title: 'Sem Contato', color: 'border-slate-300' },
  { id: 'contacted', title: 'Contatado', color: 'border-blue-400' },
  { id: 'proposal', title: 'Proposta Enviada', color: 'border-yellow-400' },
  { id: 'negotiation', title: 'Em Negociação', color: 'border-orange-500' },
  { id: 'closed', title: 'Fechamento', color: 'border-green-500' },
];

// Helper to find owner name
const getOwnerName = (id: string) => {
    const owner = MOCK_COLLABORATORS.find(c => c.id === id);
    return owner ? owner.fullName : 'Desconhecido';
};

// Masks
const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
};

// Helper for Error Handling
const handleDbError = (e: any) => {
    console.error("Erro de Banco de Dados:", e);
    const msg = e.message || "Erro desconhecido";
    
    if (msg.includes('relation "crm_deals" does not exist')) {
       alert("Erro Crítico: A tabela 'crm_deals' não existe no banco de dados.");
    } else if (msg.includes('column') && msg.includes('does not exist')) {
       alert(`Erro de Schema: Uma coluna nova (ex: cpf, campaign) não existe no banco de dados.\n\nDetalhe: ${msg}`);
    } else {
       alert(`Erro ao salvar: ${msg}`);
    }
};

const INITIAL_FORM_STATE: Partial<Deal> = {
    title: '', companyName: '', contactName: '', value: 0, 
    paymentMethod: '', status: 'warm', stage: 'new', nextTask: '', owner: '',
    source: '', campaign: '', entryValue: 0, installments: 1, installmentValue: 0,
    cpf: '', firstDueDate: '', receiptLink: '', transactionCode: '',
    zipCode: '', address: '', addressNumber: '',
    registrationData: '', observation: '', courseCity: '', classMod1: '', classMod2: '',
    pipeline: 'Padrão'
};

export const CrmBoard: React.FC = () => {
  // Views
  const [activeView, setActiveView] = useState<'pipeline' | 'teams'>('pipeline');

  // State
  const [deals, setDeals] = useState<Deal[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]); // Mock or fetched
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drag and Drop State
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Modal States
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', members: [] as string[] });

  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormData, setDealFormData] = useState<Partial<Deal>>(INITIAL_FORM_STATE);

  // --- INITIAL LOAD (FROM DB) ---
  useEffect(() => {
    fetchData();
    // Fetch classes for dropdown (MOCK logic for now, ideally fetches from DB)
    // Simulating fetching classes from the ClassesManager module
    const mockClasses = [
        { id: 'c1', code: 'TURMA-2025-A', city: 'São Paulo - SP' },
        { id: 'c2', code: 'TURMA-2025-B', city: 'Rio de Janeiro - RJ' },
        { id: 'c3', code: 'TURMA-2025-C', city: 'Belo Horizonte - MG' },
    ];
    setAvailableClasses(mockClasses);
  }, []);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          // 1. Fetch Deals
          const { data: dealsData, error: dealsError } = await appBackend.client
              .from('crm_deals')
              .select('*')
              .order('created_at', { ascending: false }); // Ordenar pelos mais recentes
          
          if (dealsError) throw dealsError;

          // Map DB snake_case to Frontend camelCase
          const mappedDeals: Deal[] = (dealsData || []).map((d: any) => ({
              id: d.id,
              title: d.title,
              contactName: d.contact_name,
              companyName: d.company_name, // Cliente
              value: Number(d.value),
              paymentMethod: d.payment_method,
              stage: d.stage as DealStage,
              owner: d.owner_id,
              status: d.status,
              nextTask: d.next_task,
              createdAt: new Date(d.created_at),
              closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
              
              // Mapeamento dos novos campos (assumindo que colunas existam ou venham de jsonb)
              source: d.source,
              campaign: d.campaign,
              entryValue: Number(d.entry_value || 0),
              installments: Number(d.installments || 1),
              installmentValue: Number(d.installment_value || 0),
              cpf: d.cpf,
              firstDueDate: d.first_due_date,
              receiptLink: d.receipt_link,
              transactionCode: d.transaction_code,
              zipCode: d.zip_code,
              address: d.address,
              addressNumber: d.address_number,
              registrationData: d.registration_data,
              observation: d.observation,
              courseCity: d.course_city,
              classMod1: d.class_mod_1,
              classMod2: d.class_mod_2,
              pipeline: d.pipeline || 'Padrão'
          }));
          setDeals(mappedDeals);

          // 2. Fetch Teams
          const { data: teamsData, error: teamsError } = await appBackend.client
              .from('crm_teams')
              .select('*');
          
          if (teamsError) throw teamsError;
          
          setTeams(teamsData || []);

      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  // --- Helpers & Logic ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const moveDeal = async (dealId: string, currentStage: DealStage, direction: 'next' | 'prev') => {
    const stageOrder: DealStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'closed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= stageOrder.length) return;

    const newStage = stageOrder[newIndex];
    const now = new Date();

    // Determine closedAt logic
    let newClosedAt: Date | undefined | null = undefined;
    if (newStage === 'closed') {
        newClosedAt = now;
    } else if (currentStage === 'closed') {
        newClosedAt = null; 
    }

    // Optimistic Update
    setDeals(prev => prev.map(d => {
        if (d.id === dealId) {
            return { 
                ...d, 
                stage: newStage,
                closedAt: newStage === 'closed' ? now : (currentStage === 'closed' ? undefined : d.closedAt)
            };
        }
        return d;
    }));

    // DB Update
    try {
        const updates: any = { stage: newStage };
        if (newStage === 'closed') updates.closed_at = now.toISOString();
        if (currentStage === 'closed' && newStage !== 'closed') updates.closed_at = null;

        const { error } = await appBackend.client
            .from('crm_deals')
            .update(updates)
            .eq('id', dealId);
        
        if (error) throw error;
    } catch (e: any) {
        handleDbError(e);
        fetchData(); 
    }
  };

  const getStageSummary = (stage: DealStage) => {
    const stageDeals = deals.filter(d => d.stage === stage);
    const total = stageDeals.reduce((acc, curr) => acc + curr.value, 0);
    return { count: stageDeals.length, total };
  };

  const filteredDeals = deals.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const currentDeal = deals.find(d => d.id === draggedDealId);
    if (!currentDeal) return;
    
    if (currentDeal.stage === targetStage) {
        setDraggedDealId(null);
        return;
    }

    const now = new Date();

    // Local update
    setDeals(prev => prev.map(d => {
      if (d.id === draggedDealId) {
          return { 
              ...d, 
              stage: targetStage,
              closedAt: targetStage === 'closed' ? now : (d.stage === 'closed' ? undefined : d.closedAt)
          };
      }
      return d;
    }));

    try {
        const updates: any = { stage: targetStage };
        if (targetStage === 'closed') {
            updates.closed_at = now.toISOString();
        } 
        else if (currentDeal.stage === 'closed') {
            updates.closed_at = null;
        }

        const { error } = await appBackend.client
            .from('crm_deals')
            .update(updates)
            .eq('id', draggedDealId);
        
        if (error) throw error;
    } catch (e) {
        handleDbError(e);
        fetchData(); 
    }

    setDraggedDealId(null);
  };

  // --- Deal Modal Handlers ---
  const commercialCollaborators = MOCK_COLLABORATORS.filter(c => c.department === 'Comercial' || c.role === 'admin');

  const openNewDealModal = () => {
      setEditingDealId(null);
      setDealFormData({
          ...INITIAL_FORM_STATE,
          owner: commercialCollaborators[0]?.id || ''
      });
      setShowDealModal(true);
  };

  const openEditDealModal = (deal: Deal) => {
      setEditingDealId(deal.id);
      setDealFormData({ ...deal });
      setShowDealModal(true);
  };

  const handleSaveDeal = async () => {
      if (!dealFormData.title || !dealFormData.companyName) {
          alert("Por favor, preencha o Nome da Negociação e o Cliente.");
          return;
      }

      // Logic for closed_at
      const currentDeal = editingDealId ? deals.find(d => d.id === editingDealId) : null;
      let closedAtValue = currentDeal?.closedAt;
      
      if (dealFormData.stage === 'closed') {
          if (!closedAtValue || (currentDeal && currentDeal.stage !== 'closed')) {
              closedAtValue = new Date();
          }
      } else {
          closedAtValue = undefined;
      }

      const payload = {
          title: dealFormData.title, // Nome da negociação
          company_name: dealFormData.companyName, // Cliente
          contact_name: dealFormData.contactName, // (Opcional interno)
          value: Number(dealFormData.value) || 0, // Valor Total
          payment_method: dealFormData.paymentMethod, // Forma Pgto
          stage: dealFormData.stage || 'new', // Etapa
          owner_id: dealFormData.owner,
          status: dealFormData.status || 'warm',
          next_task: dealFormData.nextTask,
          closed_at: closedAtValue ? closedAtValue.toISOString() : null,
          
          // Novos Campos
          source: dealFormData.source,
          campaign: dealFormData.campaign,
          entry_value: Number(dealFormData.entryValue) || 0,
          installments: Number(dealFormData.installments) || 1,
          installment_value: Number(dealFormData.installmentValue) || 0,
          cpf: dealFormData.cpf,
          first_due_date: dealFormData.firstDueDate,
          receipt_link: dealFormData.receiptLink,
          transaction_code: dealFormData.transactionCode,
          zip_code: dealFormData.zipCode,
          address: dealFormData.address,
          address_number: dealFormData.addressNumber,
          registration_data: dealFormData.registrationData,
          observation: dealFormData.observation,
          course_city: dealFormData.courseCity,
          class_mod_1: dealFormData.classMod1,
          class_mod_2: dealFormData.classMod2,
          pipeline: dealFormData.pipeline || 'Padrão'
      };

      try {
          if (editingDealId) {
              // Edit DB
              const { error } = await appBackend.client
                  .from('crm_deals')
                  .update(payload)
                  .eq('id', editingDealId);
              
              if (error) throw error;
              
              // Local Update
              setDeals(prev => prev.map(d => d.id === editingDealId ? { 
                  ...d, 
                  ...dealFormData, 
                  closedAt: closedAtValue 
              } as Deal : d));
          } else {
              // Create DB
              const { data, error } = await appBackend.client
                  .from('crm_deals')
                  .insert([payload])
                  .select()
                  .single();
              
              if (error) throw error;

              // Local Update
              const newDeal: Deal = {
                  id: data.id,
                  title: data.title,
                  companyName: data.company_name,
                  contactName: data.contact_name,
                  value: Number(data.value),
                  paymentMethod: data.payment_method,
                  stage: data.stage,
                  owner: data.owner_id,
                  status: data.status,
                  nextTask: data.next_task,
                  createdAt: new Date(data.created_at),
                  closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
                  // Mapear novos campos localmente também se necessário para UI imediata
                  source: data.source,
                  campaign: data.campaign,
                  // ...etc
              };
              setDeals(prev => [newDeal, ...prev]);
          }
          setShowDealModal(false);
      } catch (e: any) {
          handleDbError(e);
      }
  };

  const handleDeleteDeal = async () => {
      if (editingDealId && window.confirm("Tem certeza que deseja excluir esta negociação?")) {
          try {
            const { error } = await appBackend.client.from('crm_deals').delete().eq('id', editingDealId);
            if (error) throw error;
            
            setDeals(prev => prev.filter(d => d.id !== editingDealId));
            setShowDealModal(false);
          } catch(e: any) {
            alert(`Erro ao excluir: ${e.message}`);
          }
      }
  };

  // --- Team Logic ---
  const handleCreateTeam = async () => {
      if (!newTeamData.name) return;
      // ... same logic as before
      alert("Criação de equipe simplificada para demo.");
      setShowTeamModal(false);
  };

  const toggleTeamMember = (collabId: string) => {
      setNewTeamData(prev => {
          const exists = prev.members.includes(collabId);
          if (exists) return { ...prev, members: prev.members.filter(id => id !== collabId) };
          return { ...prev, members: [...prev.members, collabId] };
      });
  };

  const getMemberDetails = (ids: string[]) => {
      return MOCK_COLLABORATORS.filter(c => ids && ids.includes(c.id));
  };

  // Unique Cities for Dropdown
  const uniqueCities = Array.from(new Set(availableClasses.map(c => c.city)));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      
      {/* --- Toolbar --- */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4">
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 self-start md:self-auto">
                <button 
                    onClick={() => setActiveView('pipeline')}
                    className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <LayoutGrid size={16} /> Pipeline
                </button>
                <button 
                    onClick={() => setActiveView('teams')}
                    className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Users size={16} /> Equipes
                </button>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
        </div>

        {activeView === 'pipeline' && (
            <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="relative max-w-xs w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar oportunidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm transition-all outline-none"/>
                </div>
                <button onClick={openNewDealModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Negócio</button>
            </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-6 relative">
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
                    <div key={column.id} className="w-[320px] flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100/50" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)}>
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
                            <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400 border-indigo-400" : "")}>
                                <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                                <div className="pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{deal.title}</h4>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                            {column.id !== 'new' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180"/></button>}
                                            {column.id !== 'closed' && <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 truncate">{deal.companyName}</p>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <span className="font-bold text-slate-700 text-sm">{formatCurrency(deal.value)}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm" title={`Responsável: ${getOwnerName(deal.owner)}`}>
                                                {getOwnerName(deal.owner).charAt(0)}
                                            </div>
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
                <div className="max-w-6xl mx-auto p-4 text-center text-slate-500">
                    Módulo de Equipes (Visualização)
                </div>
            )}
        </>
        )}
      </div>

      {/* --- DEAL EDIT/CREATE MODAL --- */}
      {showDealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase size={20} className="text-indigo-600" />
                          {editingDealId ? 'Editar Negociação' : 'Nova Oportunidade'}
                      </h3>
                      <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1"><X size={20}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
                      
                      {/* Section 1: Informações Gerais */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <Target size={16} /> Dados da Negociação
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome da negociação *</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ex: Curso Completo" value={dealFormData.title} onChange={e => setDealFormData({...dealFormData, title: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Cliente *</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Nome do Cliente/Empresa" value={dealFormData.companyName} onChange={e => setDealFormData({...dealFormData, companyName: e.target.value})} />
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
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Responsável</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.owner} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      {commercialCollaborators.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Fonte</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ex: Instagram, Indicação" value={dealFormData.source} onChange={e => setDealFormData({...dealFormData, source: e.target.value})} />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Campanha</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ex: Black Friday 2024" value={dealFormData.campaign} onChange={e => setDealFormData({...dealFormData, campaign: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      {/* Section 2: Financeiro */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <DollarSign size={16} /> Dados Financeiros
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Total (R$)</label>
                                  <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: parseFloat(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor de Entrada (R$)</label>
                                  <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.entryValue} onChange={e => setDealFormData({...dealFormData, entryValue: parseFloat(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Forma de Pagamento</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.paymentMethod} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      <option value="Boleto">Boleto</option>
                                      <option value="Pix">Pix</option>
                                      <option value="CartaoCredito">Cartão de Crédito</option>
                                      <option value="Recorrencia">Recorrência</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº Parcelas</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: parseInt(e.target.value)})}>
                                      {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                                  </select>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Parcelas (R$)</label>
                                  <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.installmentValue} onChange={e => setDealFormData({...dealFormData, installmentValue: parseFloat(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Dia 1º Vencimento</label>
                                  <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Cód. Transação</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.transactionCode} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Link Comprovante</label>
                                  <div className="relative">
                                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                      <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.receiptLink} onChange={e => setDealFormData({...dealFormData, receiptLink: e.target.value})} />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Section 3: Pessoal e Endereço */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <MapPin size={16} /> Dados Pessoais e Endereço
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.cpf} onChange={e => setDealFormData({...dealFormData, cpf: formatCPF(e.target.value)})} maxLength={14} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">CEP</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.zipCode} onChange={e => setDealFormData({...dealFormData, zipCode: formatCEP(e.target.value)})} maxLength={9} />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Endereço</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.address} onChange={e => setDealFormData({...dealFormData, address: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Número</label>
                                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={dealFormData.addressNumber} onChange={e => setDealFormData({...dealFormData, addressNumber: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      {/* Section 4: Logística / Turmas */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <GraduationCap size={16} /> Dados do Curso / Turma
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Cidade do Curso</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.courseCity} onChange={e => setDealFormData({...dealFormData, courseCity: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Turma Módulo 1</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.classMod1} onChange={e => setDealFormData({...dealFormData, classMod1: e.target.value})}>
                                      <option value="">Selecione a turma...</option>
                                      {availableClasses.map(c => <option key={c.id} value={c.code}>{c.code} - {c.city}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Turma Módulo 2</label>
                                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.classMod2} onChange={e => setDealFormData({...dealFormData, classMod2: e.target.value})}>
                                      <option value="">Selecione a turma...</option>
                                      {availableClasses.map(c => <option key={c.id} value={c.code}>{c.code} - {c.city}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Section 5: Outros */}
                      <div>
                          <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <FileText size={16} /> Detalhes Finais
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Dados da Inscrição</label>
                                  <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none" value={dealFormData.registrationData} onChange={e => setDealFormData({...dealFormData, registrationData: e.target.value})} placeholder="Informações adicionais de cadastro..."></textarea>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">Observação</label>
                                  <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 resize-none" value={dealFormData.observation} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})} placeholder="Anotações internas..."></textarea>
                              </div>
                          </div>
                      </div>

                  </div>

                  <div className="px-6 py-4 bg-slate-50 flex justify-between gap-3 border-t border-slate-200">
                        {editingDealId ? (
                             <button onClick={handleDeleteDeal} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center gap-2">
                                <Trash2 size={16} /> Excluir
                             </button>
                        ) : <div></div>}
                        
                        <div className="flex gap-2">
                            <button onClick={() => setShowDealModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                            <button onClick={handleSaveDeal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                                <Save size={16} /> Salvar Negócio
                            </button>
                        </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};