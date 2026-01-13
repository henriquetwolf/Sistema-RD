
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2, Palette, Settings as SettingsIcon, ChevronDown, CheckCircle, Circle,
  /* Added Kanban and Info to the imports below to fix the "Cannot find name" errors */
  CheckSquare, AlertTriangle, Bell, ExternalLink, Kanban, Info
} from 'lucide-react';
import { appBackend, CompanySetting, Pipeline, PipelineStage, WebhookTrigger } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import clsx from 'clsx';

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
    alert(`Erro: ${e.message || "Erro desconhecido"}`);
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

interface CrmBoardProps {
  initialDealId?: string;
  onClearNavigation?: () => void;
}

export const CrmBoard: React.FC<CrmBoardProps> = ({ initialDealId, onClearNavigation }) => {
  const [activeView, setActiveView] = useState<'pipeline' | 'teams' | 'pipelines_config' | 'tasks'>('pipeline');
  const [deals, setDeals] = useState<Deal[]>([]);
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
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormData, setDealFormData] = useState<Partial<Deal>>(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialDealId && deals.length > 0) {
        const deal = deals.find(d => d.id === initialDealId);
        if (deal) {
            openEditDealModal(deal);
            if (onClearNavigation) onClearNavigation();
        }
    }
  }, [initialDealId, deals]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [dealsResult, pipelinesResult, classesResult, productsResult, eventsResult, collabResult, companiesResult, triggersResult] = await Promise.all([
              appBackend.client.from('crm_deals').select('*').order('created_at', { ascending: false }),
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
                  value: Number(d.value || 0), paymentMethod: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  nextTask: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, classMod2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name, tasks: d.tasks || []
              })));
          }

          setPipelines(pipelinesResult || []);
          if (classesResult.data) setRegisteredClasses(classesResult.data as any);
          if (productsResult.data) setDigitalProducts(productsResult.data as any);
          if (eventsResult.data) setEventsList(eventsResult.data as any);
          if (collabResult.data) setCollaborators(collabResult.data as any);
          setCompanies(companiesResult || []);
          setWebhookTriggers(triggersResult || []);

      } catch (e: any) {
          console.error("Erro ao carregar dados do CRM:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveDeal = async () => {
    if (!dealFormData.contactName && !dealFormData.companyName) {
        alert("Preencha o nome do cliente ou empresa.");
        return;
    }
    setIsSaving(true);
    const payload = {
        deal_number: dealFormData.dealNumber || generateDealNumber(),
        title: dealFormData.title || dealFormData.companyName || dealFormData.contactName,
        contact_name: dealFormData.contactName,
        company_name: dealFormData.companyName,
        value: dealFormData.value,
        stage: dealFormData.stage,
        owner_id: dealFormData.owner,
        status: dealFormData.status,
        pipeline: dealFormData.pipeline,
        source: dealFormData.source,
        campaign: dealFormData.campaign,
        entry_value: dealFormData.entryValue,
        payment_method: dealFormData.paymentMethod,
        installments: dealFormData.installments,
        installment_value: dealFormData.installmentValue,
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
        address_number: dealFormData.address_number,
        registration_data: dealFormData.registrationData,
        observation: dealFormData.observation,
        course_state: dealFormData.courseState,
        course_city: dealFormData.courseCity,
        class_mod_1: dealFormData.classMod1,
        class_mod_2: dealFormData.classMod2,
        billing_cnpj: dealFormData.billingCnpj,
        billing_company_name: dealFormData.billingCompanyName,
        tasks: dealFormData.tasks || []
    };

    try {
        if (editingDealId) {
            const { error } = await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId);
            if (error) throw error;
        } else {
            const { error } = await appBackend.client.from('crm_deals').insert([payload]);
            if (error) throw error;
        }
        await fetchData();
        setShowDealModal(false);
    } catch (e: any) {
        handleDbError(e);
    } finally {
        setIsSaving(false);
    }
  };

  const openNewDealModal = () => { 
    setEditingDealId(null); 
    const firstPipe = pipelines[0]?.name || 'Padrão';
    const firstStage = pipelines[0]?.stages[0]?.id || 'new';
    setDealFormData({ ...INITIAL_FORM_STATE, pipeline: firstPipe, stage: firstStage }); 
    setShowDealModal(true); 
  };

  const openEditDealModal = (deal: Deal) => { 
      setEditingDealId(deal.id); 
      setDealFormData({ ...deal }); 
      setShowDealModal(true); 
  };

  const formatCurrency = (val: number = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const getOwnerName = (id: string) => collaborators.find(c => c.id === id)?.fullName || 'Desconhecido';

  const productOptions = useMemo(() => {
    if (dealFormData.productType === 'Digital') return digitalProducts.map(p => p.name).sort();
    if (dealFormData.productType === 'Evento') return eventsList.map(e => e.name).sort();
    if (dealFormData.productType === 'Presencial') return Array.from(new Set(registeredClasses.map(c => c.course).filter(Boolean))).sort();
    return [];
  }, [dealFormData.productType, digitalProducts, registeredClasses, eventsList]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
        <header className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Kanban className="text-indigo-600" /> CRM Comercial</h2>
            <div className="flex gap-2">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
                </div>
                <button onClick={openNewDealModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"><Plus size={18}/> Novo Negócio</button>
            </div>
        </header>

        <div className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar">
            {pipelines.length > 0 && pipelines[0].stages.map(stage => {
                const stageDeals = deals.filter(d => d.pipeline === pipelines[0].name && d.stage === stage.id && d.title.toLowerCase().includes(searchTerm.toLowerCase()));
                const totalValue = stageDeals.reduce((acc, curr) => acc + curr.value, 0);
                return (
                    <div key={stage.id} className="w-80 shrink-0 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500">{stage.title}</h4>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black">{stageDeals.length}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">{formatCurrency(totalValue)}</p>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {stageDeals.map(deal => (
                                <div key={deal.id} onClick={() => openEditDealModal(deal)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group">
                                    <h5 className="font-bold text-slate-800 text-sm mb-1 truncate">{deal.title}</h5>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{deal.productName || 'S/ Produto'}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-emerald-600">{formatCurrency(deal.value)}</span>
                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border">{getOwnerName(deal.owner).charAt(0)}</div>
                                            {getOwnerName(deal.owner).split(' ')[0]}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* MODAL DE NEGOCIAÇÃO / CADASTRO */}
        {showDealModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl my-8 animate-in zoom-in-95 flex flex-col max-h-[95vh] overflow-hidden">
                    <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{editingDealId ? `Negociação #${dealFormData.dealNumber}` : 'Nova Negociação'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cadastro Comercial Direto</p>
                        </div>
                        <button onClick={() => setShowDealModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24}/></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Título da Negociação</label><input type="text" className="w-full px-4 py-2 border rounded-xl font-bold" value={dealFormData.title} onChange={e => setDealFormData({...dealFormData, title: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Valor Total (R$)</label><input type="number" className="w-full px-4 py-2 border rounded-xl font-black text-emerald-600" value={dealFormData.value} onChange={e => setDealFormData({...dealFormData, value: parseFloat(e.target.value) || 0})} /></div>
                            
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo do Produto</label>
                                <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm" value={dealFormData.productType} onChange={e => setDealFormData({...dealFormData, productType: e.target.value as any, productName: ''})}>
                                    <option value="">Selecione...</option><option value="Presencial">Presencial</option><option value="Digital">Digital</option><option value="Evento">Evento</option>
                                </select>
                            </div>
                            <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Produto / Curso</label>
                                <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm font-bold" value={dealFormData.productName} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})}>
                                    <option value="">Escolha um item...</option>
                                    {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Dados do Cliente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nome Completo</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" value={dealFormData.companyName} onChange={e => setDealFormData({...dealFormData, companyName: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CPF</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" value={dealFormData.cpf} onChange={e => setDealFormData({...dealFormData, cpf: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">E-mail</label><input type="email" className="w-full px-4 py-2 border rounded-xl text-sm" value={dealFormData.email} onChange={e => setDealFormData({...dealFormData, email: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</label><input type="text" className="w-full px-4 py-2 border rounded-xl text-sm" value={dealFormData.phone} onChange={e => setDealFormData({...dealFormData, phone: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vendedor</label>
                                    <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm" value={dealFormData.owner} onChange={e => setDealFormData({...dealFormData, owner: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {collaborators.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Etapa Atual</label>
                                    <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm font-bold" value={dealFormData.stage} onChange={e => setDealFormData({...dealFormData, stage: e.target.value})}>
                                        {pipelines[0]?.stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações Internas</label>
                            <textarea className="w-full px-4 py-2 border rounded-2xl text-sm h-32 resize-none" value={dealFormData.observation} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})} />
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-slate-50 border-t flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic"><Info size={14}/><span>Todas as alterações são sincronizadas com o histórico de vendas.</span></div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDealModal(false)} className="px-6 py-2.5 text-slate-600 font-bold text-sm">Cancelar</button>
                            <button onClick={handleSaveDeal} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Cadastro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
