
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, ChevronLeft, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2,
  ChevronDown, ChevronUp, Palette, Kanban as FunnelIcon, Settings2, MoreVertical, Tag, Globe, UserPlus,
  MousePointer2, Check
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend, CompanySetting, Pipeline, PipelineStage } from '../services/appBackend';

// --- Types ---
interface DealTask {
    id: string;
    description: string;
    dueDate: string;
    isDone: boolean;
    type: 'Tarefa' | 'Ligação' | 'E-mail' | 'Reunião';
}

interface Deal {
  id: string;
  dealNumber?: number;
  title: string;
  contactName: string;
  companyName: string;
  value: number;
  
  pipeline_id?: string;
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

interface Team {
  id: string;
  name: string;
  members: string[]; // IDs of collaborators
}

interface CollaboratorSimple {
    id: string;
    fullName: string;
    department: string;
}

const STAGE_COLORS = [
    '#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
];

const handleDbError = (e: any) => {
    console.error("Erro de Banco de Dados:", e);
    const msg = e.message || "Erro desconhecido";
    alert(`Erro: ${msg}`);
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
  const [allStages, setAllStages] = useState<PipelineStage[]>([]);
  const [showFunnelManager, setShowFunnelManager] = useState(false);
  const [isSavingFunnel, setIsSavingFunnel] = useState(false);
  
  // Funnel Editor State
  const [editingPipeline, setEditingPipeline] = useState<Partial<Pipeline>>({ name: '', is_default: false });
  const [editingStages, setEditingStages] = useState<Partial<PipelineStage>[]>([]);

  // Team State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  const [collaborators, setCollaborators] = useState<CollaboratorSimple[]>([]);
  const [companies, setCompanies] = useState<CompanySetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // Deal Modal State
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormData, setDealFormData] = useState<Partial<Deal>>(INITIAL_FORM_STATE);

  // Task Form State (Internal to modal)
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskType, setNewTaskType] = useState<DealTask['type']>('Tarefa');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [dealsResult, teamsResult, collabResult, companiesResult, pipelinesResult, stagesResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
              appBackend.client.from('crm_teams').select('*').order('name', { ascending: true }),
              appBackend.client.from('crm_collaborators').select('id, full_name, department').order('full_name', { ascending: true }),
              appBackend.getCompanies(),
              appBackend.getPipelines(),
              appBackend.getAllPipelineStages()
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
                  classMod1: d.class_mod_1, classMod2: d.class_mod_2, 
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          }

          setPipelines(pipelinesResult);
          setAllStages(stagesResult);
          setTeams(teamsResult.data || []);
          if (collabResult.data) setCollaborators(collabResult.data.map((c: any) => ({ id: c.id, fullName: c.full_name, department: c.department })));
          setCompanies(companiesResult || []);
      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveFunnel = async () => {
    if (!editingPipeline.name || editingStages.length < 2) {
        alert("O funil deve ter um nome e pelo menos 2 etapas.");
        return;
    }
    setIsSavingFunnel(true);
    try {
        await appBackend.savePipeline(editingPipeline, editingStages);
        await fetchData();
        setShowFunnelManager(false);
    } catch (e: any) {
        alert(`Erro ao salvar funil: ${e.message}`);
    } finally {
        setIsSavingFunnel(false);
    }
  };

  const handleSaveTeam = async () => {
      if (!editingTeam?.name) return;
      setIsSavingTeam(true);
      try {
          if (editingTeam.id) {
              await appBackend.client.from('crm_teams').update({ name: editingTeam.name, members: editingTeam.members }).eq('id', editingTeam.id);
          } else {
              await appBackend.client.from('crm_teams').insert([{ name: editingTeam.name, members: editingTeam.members }]);
          }
          await fetchData();
          setShowTeamModal(false);
      } catch (e: any) {
          alert(`Erro ao salvar equipe: ${e.message}`);
      } finally {
          setIsSavingTeam(false);
      }
  };

  const handleDeleteTeam = async (id: string) => {
      if (window.confirm("Deseja excluir esta equipe comercial?")) {
          await appBackend.client.from('crm_teams').delete().eq('id', id);
          await fetchData();
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
        pipeline_id: dealFormData.pipeline_id || null,
        stage: dealFormData.stage || 'new',
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
        tasks: dealFormData.tasks || []
    };

    try {
        if (editingDealId) {
            await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
        } else {
            await appBackend.client.from('crm_deals').insert([{
                ...payload,
                deal_number: generateDealNumber(),
                created_at: new Date().toISOString()
            }]);
        }
        await fetchData();
        setShowDealModal(false);
    } catch (e: any) {
        handleDbError(e);
    } finally {
        setIsLoading(false);
    }
  };

  const addTask = () => {
      if (!newTaskText.trim()) return;
      const task: DealTask = {
          id: crypto.randomUUID(),
          description: newTaskText,
          dueDate: newTaskDate,
          type: newTaskType,
          isDone: false
      };
      setDealFormData(prev => ({ ...prev, tasks: [...(prev.tasks || []), task] }));
      setNewTaskText('');
      setNewTaskDate('');
  };

  const removeTask = (id: string) => {
      setDealFormData(prev => ({ ...prev, tasks: prev.tasks?.filter(t => t.id !== id) }));
  };

  const toggleTaskStatus = (id: string) => {
      setDealFormData(prev => ({
          ...prev,
          tasks: prev.tasks?.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t)
      }));
  };

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredDeals = deals.filter(d => 
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.dealNumber?.toString().includes(searchTerm))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={() => setActiveView('pipeline')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipeline' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><FunnelIcon size={16} /> Kanban Geral</button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
            </div>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar oportunidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-300 rounded-full text-sm outline-none transition-all"/>
            </div>
            <button 
                onClick={() => {
                    setEditingDealId(null);
                    setDealFormData({ ...INITIAL_FORM_STATE });
                    setShowDealModal(true);
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
            >
                <Plus size={18} className="inline mr-1" /> Novo Negócio
            </button>
        </div>
      </div>

      {/* BOARD VIEW */}
      <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6 space-y-12 custom-scrollbar">
          {activeView === 'pipeline' ? (
                pipelines.map(pipeline => {
                    const pipelineStages = allStages.filter(s => s.pipeline_id === pipeline.id);
                    return (
                      <div key={pipeline.id} className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                  <Target size={20} className="text-indigo-600" /> {pipeline.name}
                              </h2>
                          </div>
  
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                              {pipelineStages.map(stage => {
                                  const stageDeals = filteredDeals.filter(d => d.stage === stage.key && (d.pipeline_id === pipeline.id));
                                  return (
                                      <div key={stage.id} className="w-[280px] shrink-0 flex flex-col rounded-xl bg-white border border-slate-200 shadow-sm">
                                          <div className="p-3 bg-slate-50/50 rounded-t-xl border-b border-b-slate-100" style={{ borderTop: `4px solid ${stage.color}` }}>
                                              <div className="flex justify-between items-center mb-1">
                                                  <h3 className="font-bold text-slate-700 text-xs">{stage.name}</h3>
                                                  <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 rounded-full border">{stageDeals.length}</span>
                                              </div>
                                          </div>
                                          <div className="p-2 space-y-2 min-h-[150px]">
                                              {stageDeals.map(deal => (
                                                  <div key={deal.id} onClick={() => { setEditingDealId(deal.id); setDealFormData(deal); setShowDealModal(true); }} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:border-indigo-200 transition-all cursor-pointer">
                                                      <h4 className="font-bold text-slate-800 text-[11px] mb-1 leading-tight">{deal.title}</h4>
                                                      <span className="font-black text-slate-700 text-[10px]">{formatCurrency(deal.value)}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                    );
                })
          ) : (
             <div className="max-w-6xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col hover:border-indigo-300 transition-all group">
                             <div className="flex justify-between items-start mb-4">
                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Users size={24}/></div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditingTeam(team); setShowTeamModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteTeam(team.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{team.name}</h3>
                            <p className="text-xs text-slate-500">{team.members?.length || 0} integrantes</p>
                        </div>
                    ))}
                </div>
             </div>
          )}
      </div>

      {/* FULL DEAL MODAL (NEGOTIATION) EXACTLY AS SCREENSHOTS */}
      {showDealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  {/* MODAL HEADER */}
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                             <Briefcase size={20} />
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg">Nova Oportunidade</h3>
                      </div>
                      <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition-colors"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-10 bg-white">
                      {/* SECTION 1: DADOS DA NEGOCIAÇÃO */}
                      <div>
                          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                               <div className="bg-indigo-600 rounded-full p-1 text-white"><Target size={14}/></div>
                               <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">DADOS DA NEGOCIAÇÃO</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                              <div className="lg:col-span-1">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nº Negociação</label>
                                  <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400" value={editingDealId ? dealFormData.dealNumber : 'Automático'} disabled />
                              </div>
                              <div className="lg:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nome Completo do Cliente *</label>
                                  <input type="text" className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-indigo-500 outline-none" value={dealFormData.companyName || ''} onChange={e => setDealFormData({ ...dealFormData, companyName: e.target.value, contactName: e.target.value, title: e.target.value })} placeholder="Nome do Cliente/Empresa" />
                              </div>
                              
                              <div>
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Responsável</label>
                                  <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.owner || ''} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                                      <option value="">Selecione...</option>
                                      {collaborators.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tipo de Produto</label>
                                  <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.productType || ''} onChange={e => setDealFormData({...dealFormData, productType: e.target.value as any})}>
                                      <option value="">Selecione o tipo...</option>
                                      <option value="Digital">Digital</option>
                                      <option value="Presencial">Presencial</option>
                                      <option value="Evento">Evento</option>
                                  </select>
                              </div>
                              <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Curso Presencial</label>
                                  <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.productName || ''} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})}>
                                      <option value="">Selecione o produto...</option>
                                      <option value="Formação Completa">Formação Completa</option>
                                      <option value="Pilates Clássico">Pilates Clássico</option>
                                      <option value="MIT">MIT</option>
                                  </select>
                              </div>

                              <div className="lg:col-span-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex flex-wrap gap-12">
                                   <div>
                                       <span className="block text-[10px] font-black text-indigo-400 uppercase mb-1">Empresa de Faturamento (Auto)</span>
                                       <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                                           <Building size={16} className="text-indigo-300" />
                                           {dealFormData.billingCompanyName || 'Nenhuma empresa vinculada'}
                                       </div>
                                   </div>
                                   <div>
                                       <span className="block text-[10px] font-black text-indigo-400 uppercase mb-1">CNPJ de Venda (Auto)</span>
                                       <input type="text" className="bg-white border border-slate-200 rounded px-3 py-1 text-sm outline-none" value={dealFormData.billingCnpj || ''} onChange={e => setDealFormData({...dealFormData, billingCnpj: e.target.value})} placeholder="Selecione um Tipo de Produto..." />
                                   </div>
                              </div>

                              <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Fonte</label>
                                  <input type="text" className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.source || ''} onChange={e => setDealFormData({...dealFormData, source: e.target.value})} placeholder="Instagram, Indicação" />
                              </div>
                              <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Campanha</label>
                                  <input type="text" className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.campaign || ''} onChange={e => setDealFormData({...dealFormData, campaign: e.target.value})} placeholder="Black Friday 2024" />
                              </div>

                              <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Funil de Vendas</label>
                                  <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.pipeline_id || ''} onChange={e => setDealFormData({...dealFormData, pipeline_id: e.target.value, stage: ''})}>
                                      <option value="">Selecione o funil...</option>
                                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                              </div>
                              <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Etapa do Funil</label>
                                  <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={dealFormData.stage || ''} onChange={e => setDealFormData({...dealFormData, stage: e.target.value})}>
                                      <option value="">Selecione a etapa...</option>
                                      {allStages.filter(s => s.pipeline_id === dealFormData.pipeline_id).map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* SECTION 2: TAREFAS & AGENDAMENTOS */}
                      <div>
                          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                               <div className="bg-indigo-600 rounded-full p-1 text-white"><ListTodo size={14}/></div>
                               <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">TAREFAS & AGENDAMENTOS</h4>
                          </div>

                          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-6">
                               <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end mb-6">
                                   <div className="lg:col-span-3">
                                       <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nova Tarefa</label>
                                       <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white" placeholder="Ex: Ligar para confirmar..." value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
                                   </div>
                                   <div className="lg:col-span-1">
                                       <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Data</label>
                                       <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} />
                                   </div>
                                   <div className="lg:col-span-1">
                                       <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                                       <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={newTaskType} onChange={e => setNewTaskType(e.target.value as any)}>
                                            <option value="Tarefa">Tarefa</option>
                                            <option value="Ligação">Ligação</option>
                                            <option value="E-mail">E-mail</option>
                                            <option value="Reunião">Reunião</option>
                                       </select>
                                   </div>
                                   <div className="lg:col-span-1">
                                       <button onClick={addTask} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors flex justify-center"><Plus size={20}/></button>
                                   </div>
                               </div>

                               <div className="space-y-2">
                                   {dealFormData.tasks && dealFormData.tasks.length > 0 ? (
                                       dealFormData.tasks.map(t => (
                                           <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                               <div className="flex items-center gap-4">
                                                   <button onClick={() => toggleTaskStatus(t.id)} className={clsx("p-1 rounded border", t.isDone ? "bg-green-100 border-green-500 text-green-600" : "bg-white border-slate-300 text-slate-300")}>
                                                       <Check size={14} />
                                                   </button>
                                                   <div>
                                                       <p className={clsx("text-sm font-medium", t.isDone ? "line-through text-slate-400" : "text-slate-700")}>{t.description}</p>
                                                       <p className="text-[10px] text-slate-400 uppercase font-black">{t.type} • {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Sem data'}</p>
                                                   </div>
                                               </div>
                                               <button onClick={() => removeTask(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                           </div>
                                       ))
                                   ) : (
                                       <div className="text-center py-6 text-slate-400 text-sm italic">Nenhuma tarefa registrada.</div>
                                   )}
                               </div>
                          </div>
                      </div>

                      {/* SECTION 3: DADOS FINANCEIROS */}
                      <div>
                          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                               <div className="bg-indigo-600 rounded-full p-1 text-white"><DollarSign size={14}/></div>
                               <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">DADOS FINANCEIROS</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Valor Total (R$)</label>
                                   <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: Number(e.target.value)})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Valor de Entrada (R$)</label>
                                   <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.entryValue} onChange={e => setDealFormData({...dealFormData, entryValue: Number(e.target.value)})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Forma de Pagamento</label>
                                   <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.paymentMethod || ''} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        <option value="Cartão">Cartão</option>
                                        <option value="Boleto">Boleto</option>
                                        <option value="PIX">PIX</option>
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nº Parcelas</label>
                                   <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: Number(e.target.value)})}>
                                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Valor Parcelas (R$)</label>
                                   <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.installmentValue} onChange={e => setDealFormData({...dealFormData, installmentValue: Number(e.target.value)})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Dia 1º Vencimento</label>
                                   <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Cód. Transação</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.transactionCode || ''} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Link Comprovante</label>
                                   <div className="relative">
                                       <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                                       <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.receiptLink || ''} onChange={e => setDealFormData({...dealFormData, receiptLink: e.target.value})} />
                                   </div>
                               </div>
                          </div>
                      </div>

                      {/* SECTION 4: DADOS DE CONTATO E PESSOAIS */}
                      <div>
                          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                               <div className="bg-indigo-600 rounded-full p-1 text-white"><MapPin size={14}/></div>
                               <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">DADOS DE CONTATO E PESSOAIS</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                               <div className="md:col-span-2">
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Email</label>
                                   <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.email || ''} onChange={e => setDealFormData({...dealFormData, email: e.target.value})} />
                               </div>
                               <div className="md:col-span-2">
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Telefone / WhatsApp</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.phone || ''} onChange={e => setDealFormData({...dealFormData, phone: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">CPF</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.cpf || ''} onChange={e => setDealFormData({...dealFormData, cpf: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">CEP</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.zipCode || ''} onChange={e => setDealFormData({...dealFormData, zipCode: e.target.value})} />
                               </div>
                               <div className="md:col-span-2">
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Endereço</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.address || ''} onChange={e => setDealFormData({...dealFormData, address: e.target.value})} />
                               </div>
                               <div className="md:col-span-1">
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Número</label>
                                   <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" value={dealFormData.addressNumber || ''} onChange={e => setDealFormData({...dealFormData, addressNumber: e.target.value})} />
                               </div>
                          </div>
                      </div>

                      {/* SECTION 5: DETALHES FINAIS */}
                      <div>
                          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                               <div className="bg-indigo-600 rounded-full p-1 text-white"><FileText size={14}/></div>
                               <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">DETALHES FINAIS</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Dados da Inscrição</label>
                                   <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white h-32 resize-none" value={dealFormData.registrationData || ''} onChange={e => setDealFormData({...dealFormData, registrationData: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Observação</label>
                                   <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white h-32 resize-none" value={dealFormData.observation || ''} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})} />
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* MODAL FOOTER */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4 shrink-0">
                        <button onClick={() => setShowDealModal(false)} className="text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
                        <button onClick={handleSaveDeal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all">
                             <Save size={18} /> Salvar Negócio
                        </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
