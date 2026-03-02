
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2, Palette, Settings as SettingsIcon, ChevronDown, CheckCircle, Circle,
  CheckSquare, AlertTriangle, Bell
} from 'lucide-react';
import { appBackend, CompanySetting, Pipeline, PipelineStage, WebhookTrigger } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import { contaAzulService } from '../services/contaAzulService';
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
  neighborhood?: string;
  addressCity?: string;
  addressState?: string;
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

const formatCEP = (value: string = '') => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
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
    zipCode: '', address: '', addressNumber: '', neighborhood: '', addressCity: '', addressState: '',
    registrationData: '', observation: '', courseState: '', courseCity: '', classMod1: '', classMod2: '',
    pipeline: 'Padrão',
    productType: '', 
    productName: '',
    billingCnpj: '', billingCompanyName: '',
    tasks: []
};

export const CrmBoard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pipeline' | 'teams' | 'pipelines_config' | 'tasks'>('pipeline');
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

  // Conta Azul confirmation popup
  const [contaAzulConfirmDeal, setContaAzulConfirmDeal] = useState<any | null>(null);
  const [contaAzulFormData, setContaAzulFormData] = useState<{
    descricao: string; valor: number; data_competencia: string; data_vencimento: string;
    parcelas: number; categoria_id: string; centro_custo_id: string; observacoes: string;
    contato_nome: string; contato_cpf: string; produto_id: string; tipo_pagamento: string; deal_number: string;
  }>({ descricao: '', valor: 0, data_competencia: '', data_vencimento: '', parcelas: 1, categoria_id: '', centro_custo_id: '', observacoes: '', contato_nome: '', contato_cpf: '', produto_id: '', tipo_pagamento: '', deal_number: '' });
  const [contaAzulCategories, setContaAzulCategories] = useState<{ id: string; id_conta_azul: string; nome: string; tipo: string }[]>([]);
  const [contaAzulCostCenters, setContaAzulCostCenters] = useState<{ id: string; id_conta_azul: string; nome: string }[]>([]);
  const [contaAzulProducts, setContaAzulProducts] = useState<{ id: string; nome: string; tipo: string; valor: number }[]>([]);
  const [isCreatingReceivable, setIsCreatingReceivable] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  // Tasks Form State
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskType, setNewTaskType] = useState<DealTask['type']>('todo');

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
                  value: Number(d.value || 0), paymentMethod: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  nextTask: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number, neighborhood: d.neighborhood, addressCity: d.address_city, addressState: d.address_state,
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

  /**
   * Dispara automações de WhatsApp com base nos critérios da regra
   */
  const triggerWhatsAppAutomation = async (deal: any) => {
    // IMPORTANTE: deal aqui é o retorno direto do Supabase (snake_case)
    const rawPhone = deal.phone || deal.contact_phone || deal.cellphone;
    if (!rawPhone) return;

    try {
        const { data: rules } = await appBackend.client
            .from('crm_wa_automations')
            .select('*')
            .eq('is_active', true)
            .eq('pipeline_name', deal.pipeline)
            .eq('stage_id', deal.stage);

        if (!rules || rules.length === 0) return;

        for (const rule of rules) {
            // Valida filtros de produto
            if (rule.product_type && rule.product_type !== deal.product_type) continue;
            if (rule.product_id && rule.product_id !== deal.product_name) continue;

            let message = rule.message_template;
            if (!message) continue;

            // Substituição precisa das Tags para os campos:
            // Nome Completo do Cliente -> company_name
            // Produto / Curso -> product_name
            const clientName = deal.company_name || deal.contact_name || 'Cliente';
            const courseName = deal.product_name || 'Curso';

            // Regex global e case-insensitive para abranger as tags solicitadas
            message = message.replace(/\{\{nome_cliente\}\}/gi, clientName);
            message = message.replace(/\{\{curso\}\}/gi, courseName);

            try {
                // Envio via Evolution API
                const cleanPhone = rawPhone.replace(/\D/g, '');
                
                // Primeiro enviamos a mensagem
                await whatsappService.sendTextMessage({ 
                    wa_id: cleanPhone,
                    contact_phone: cleanPhone
                }, message);

                // SE O ENVIO FUNCIONOU, gravamos no histórico (Logs)
                // Utilizamos o método centralizado no backend para garantir gravação
                await appBackend.logWAAutomation({
                    ruleName: rule.name,
                    studentName: clientName,
                    phone: rawPhone,
                    message: message
                });
                
                console.log(`[CRM] Automação "${rule.name}" disparada e registrada para ${clientName}.`);
            } catch (sendErr: any) {
                console.error(`[CRM] Falha ao disparar ou registrar automação "${rule.name}":`, sendErr);
            }
        }
    } catch (err) {
        console.error("[CRM] Erro fatal no processamento da automação de WhatsApp:", err);
    }
  };

  /**
   * Função para disparar chamado automático para produtos digitais
   */
  const triggerDigitalSupportTicket = async (deal: any) => {
      // Verifica se o estágio é fechamento (normalmente id 'closed') e o produto é digital
      if (deal.product_type === 'Digital' && deal.stage === 'closed') {
          try {
              await appBackend.saveSupportTicket({
                  senderId: 'crm_automation',
                  senderName: 'Integração Comercial',
                  senderEmail: 'crm@vollpilates.com.br',
                  senderRole: 'admin',
                  subject: `🔒 Criação de Login: ${deal.product_name || 'Produto Digital'}`,
                  message: `Solicitação automática de criação de login para novo cliente digital.\n\n` +
                           `Nº Negócio: #${deal.deal_number}\n` +
                           `Cliente: ${deal.company_name || deal.contact_name}\n` +
                           `E-mail: ${deal.email || 'Não informado'}\n` +
                           `Telefone: ${deal.phone || 'Não informado'}\n` +
                           `Produto: ${deal.product_name}\n\n` +
                           `Favor providenciar os acessos e notificar o cliente.`,
                  tag: 'Suporte Técnico',
                  status: 'open'
              });
              console.log("Chamado automático de login criado com sucesso.");
          } catch (err) {
              console.error("Erro ao criar chamado automático de login:", err);
          }
      }
  };

  const triggerContaAzulReceivable = async (deal: any) => {
      if (deal.stage !== 'closed' || !deal.value || deal.value <= 0) return;
      try {
          const status = await contaAzulService.getAuthStatus();
          if (!status.connected) return;

          const [cats, ccs, prods] = await Promise.all([
              contaAzulService.getCategories(),
              contaAzulService.getCostCenters(),
              contaAzulService.getProducts(),
          ]);
          setContaAzulCategories(cats.filter((c: any) => c.tipo === 'RECEITA' || c.tipo === 'AMBOS'));
          setContaAzulCostCenters(ccs);
          setContaAzulProducts(prods);

          const dealProductName = (deal.product_name || deal.productName || '').toLowerCase().trim();
          let matchedProductId = '';
          if (dealProductName && prods.length > 0) {
              const exact = prods.find((p: any) => p.nome.toLowerCase().trim() === dealProductName);
              if (exact) {
                  matchedProductId = exact.id;
              } else {
                  const partial = prods.find((p: any) => p.nome.toLowerCase().includes(dealProductName) || dealProductName.includes(p.nome.toLowerCase()));
                  if (partial) matchedProductId = partial.id;
              }
          }

          const hoje = new Date().toISOString().split('T')[0];
          setContaAzulFormData({
              descricao: `[CRM #${deal.deal_number || ''}] ${deal.product_name || deal.company_name || deal.contact_name || 'Venda'}`,
              valor: deal.value,
              data_competencia: hoje,
              data_vencimento: deal.first_due_date || hoje,
              parcelas: deal.installments || 1,
              categoria_id: '',
              centro_custo_id: '',
              observacoes: `Negócio CRM: ${deal.title || ''} | Cliente: ${deal.company_name || deal.contact_name || ''} | CNPJ: ${deal.billing_cnpj || 'N/A'}`,
              contato_nome: deal.company_name || deal.contact_name || '',
              contato_cpf: deal.cpf || deal.billing_cnpj || '',
              produto_id: matchedProductId,
              tipo_pagamento: deal.payment_method || deal.paymentMethod || '',
              deal_number: String(deal.deal_number || deal.dealNumber || ''),
          });
          setContaAzulConfirmDeal(deal);
      } catch (err) {
          console.error('Erro ao preparar lançamento Conta Azul:', err);
      }
  };

  const handleConfirmContaAzulReceivable = async () => {
      if (!contaAzulFormData.produto_id) {
          alert('Selecione um Produto/Serviço antes de confirmar.');
          return;
      }
      if (!contaAzulFormData.valor || contaAzulFormData.valor <= 0) {
          alert('O valor deve ser maior que zero.');
          return;
      }
      if (!contaAzulFormData.data_vencimento) {
          alert('Informe a Data de Vencimento.');
          return;
      }
      setIsCreatingReceivable(true);
      try {
          await contaAzulService.createSale({
              descricao: contaAzulFormData.descricao,
              valor: contaAzulFormData.valor,
              data_venda: contaAzulFormData.data_competencia,
              data_vencimento: contaAzulFormData.data_vencimento,
              parcelas: contaAzulFormData.parcelas,
              categoria_id: contaAzulFormData.categoria_id,
              centro_custo_id: contaAzulFormData.centro_custo_id,
              produto_id: contaAzulFormData.produto_id,
              contato_nome: contaAzulFormData.contato_nome,
              contato_cpf: contaAzulFormData.contato_cpf,
              tipo_pagamento: contaAzulFormData.tipo_pagamento,
              deal_number: contaAzulFormData.deal_number,
              observacoes: contaAzulFormData.observacoes,
          });
          alert('Venda criada com sucesso no Conta Azul!');
          setContaAzulConfirmDeal(null);
      } catch (err: any) {
          alert(`Erro ao criar Venda: ${err.message}`);
      } finally {
          setIsCreatingReceivable(false);
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

        if (data) {
            dispatchNegotiationWebhook(data);
            triggerDigitalSupportTicket(data);
            triggerWhatsAppAutomation(data);
            triggerContaAzulReceivable(data);
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

        if (data) {
            dispatchNegotiationWebhook(data);
            triggerDigitalSupportTicket(data);
            triggerWhatsAppAutomation(data);
            triggerContaAzulReceivable(data);
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
        stage: firstStage,
        tasks: []
    }); 
    setShowDealModal(true); 
  };

  const openEditDealModal = (deal: Deal) => { setEditingDealId(deal.id); setDealFormData({ ...deal, tasks: deal.tasks || [] }); setShowDealModal(true); };

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

  const dispatchNegotiationWebhook = async (deal: any) => {
      if (!deal.billing_cnpj) return;
      
      // Verificação de Gatilho (Connection Plug)
      const trigger = webhookTriggers.find(t => t.pipelineName === deal.pipeline && t.stageId === deal.stage);
      
      // Se não houver trigger configurado para este estágio+funil, interrompe
      if (!trigger) return;

      const company = companies.find(c => c.cnpj === deal.billing_cnpj);
      if (!company || !company.webhookUrl) return;

      const sellerName = collaborators.find(c => c.id === deal.owner_id)?.fullName || "Vendedor Não Localizado";
      const pipelineObj = pipelines.find(p => p.name === deal.pipeline);
      const stageObj = pipelineObj?.stages?.find(s => s.id === deal.stage);
      const stageLabel = stageObj?.title || deal.stage || "Novo Lead";

      let webhookPayload: any;

      // Se houver um JSON customizado no gatilho, processa os placeholders
      if (trigger.payloadJson) {
          try {
              let template = trigger.payloadJson;
              
              // Mapeamento de placeholders dinâmicos
              const replacements: Record<string, string> = {
                  "{{data_venda}}": new Date().toISOString().split('T')[0],
                  "{{deal_number}}": String(deal.deal_number || ""),
                  "{{nome_cliente}}": deal.company_name || deal.contact_name || "",
                  "{{email_cliente}}": deal.email || "",
                  "{{telefone_cliente}}": deal.phone || "",
                  "{{cpf_cnpj_cliente}}": deal.cpf || "",
                  "{{nome_vendedor}}": sellerName,
                  "{{tipo_produto}}": deal.product_type || "",
                  "{{curso_produto}}": deal.product_name || "",
                  "{{fonte_negociacao}}": deal.source || "",
                  "{{campanha}}": deal.campaign || "",
                  "{{funil_vendas}}": deal.pipeline || "",
                  "{{etapa_funil}}": stageLabel,
                  "{{cidade_cliente}}": deal.course_city || "",
                  "{{turma_modulo}}": deal.class_mod_1 || deal.class_mod_2 || "",
                  "{{valor_total}}": String(Number(deal.value || 0).toFixed(2)),
                  "{{forma_pagamento}}": deal.payment_method || "",
                  "{{valor_entrada}}": String(Number(deal.entry_value || 0).toFixed(2)),
                  "{{numero_parcelas}}": String(deal.installments || "1"),
                  "{{valor_parcelas}}": String(Number(deal.installment_value || 0).toFixed(2)),
                  "{{dia_primeiro_vencimento}}": deal.first_due_date || "",
                  "{{link_comprovante}}": deal.receipt_link || "",
                  "{{codigo_transacao}}": deal.transaction_code || ""
              };

              // Substituição em massa
              Object.keys(replacements).forEach(placeholder => {
                  template = template.split(placeholder).join(replacements[placeholder]);
              });

              webhookPayload = JSON.parse(template);
          } catch(e) {
              console.error("Erro ao processar JSON customizado do Webhook:", e);
              return;
          }
      } else {
          // Fallback para o formato padrão caso não haja template
          webhookPayload = {
              "data_venda": new Date().toISOString().split('T')[0],  
              "situacao_venda": "Aprovada",                        
              "numero_venda": String(deal.deal_number || ""),                              
              "numero_negociacao": String(deal.deal_number || ""),                        
              "nome_cliente": deal.company_name || deal.contact_name || "",
              "email_cliente": deal.email || "",                             
              "telefone_cliente": deal.phone || "",                            
              "cpf_cnpj_cliente": deal.cpf || "",              
              "nome_vendedor": sellerName,  
              "tipo_produto": deal.product_type || "", 
              "curso_produto": deal.product_name || "", 
              "fonte_negociacao": deal.source || "", 
              "campanha": deal.campaign || "",
              "funil_vendas": deal.pipeline || "", 
              "etapa_funil": stageLabel,
              "cidade_cliente": deal.course_city || "", 
              "turma_modulo": deal.class_mod_1 || deal.class_mod_2 || "", 
              "valor_total": String(Number(deal.value || 0).toFixed(2)), 
              "itens_venda": "1", 
              "forma_pagamento": deal.payment_method || "", 
              "valor_entrada": String(Number(deal.entry_value || 0).toFixed(2)),  
              "numero_parcelas": String(deal.installments || "1"),
              "valor_parcelas": String(Number(deal.installment_value || 0).toFixed(2)), 
              "dia_primeiro_vencimento": deal.first_due_date || "",
              "link_comprovante": deal.receipt_link || "", 
              "codigo_transacao": deal.transaction_code || ""
          };
      }

      try {
          await fetch(company.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload)
          });
          console.log(`Webhook disparado com sucesso para a empresa: ${company.legalName}`);
      } catch (err) {
          console.error("Falha ao disparar Webhook de negociação:", err);
      }
  };

  const fetchAddressByCep = async (rawCep: string) => {
      const digits = rawCep.replace(/\D/g, '');
      if (digits.length !== 8) return;
      setIsFetchingCep(true);
      try {
          const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          const data = await resp.json();
          if (data.erro) {
              alert('CEP não encontrado.');
              return;
          }
          setDealFormData(prev => ({
              ...prev,
              address: data.logradouro || prev.address,
              neighborhood: data.bairro || prev.neighborhood,
              addressCity: data.localidade || prev.addressCity,
              addressState: data.uf || prev.addressState,
          }));
      } catch {
          alert('Erro ao buscar CEP. Verifique sua conexão.');
      } finally {
          setIsFetchingCep(false);
      }
  };

  const handleSaveDeal = async () => {
      if (!dealFormData.companyName) { alert("Preencha o Nome Completo do Cliente."); return; }
      const payload = {
          title: dealFormData.companyName, company_name: dealFormData.companyName, contact_name: dealFormData.contactName, value: Number(dealFormData.value) || 0,
          payment_method: dealFormData.paymentMethod, stage: dealFormData.stage, owner_id: dealFormData.owner, status: dealFormData.status || 'warm',
          next_task: dealFormData.nextTask, source: dealFormData.source, campaign: dealFormData.campaign, entry_value: Number(dealFormData.entryValue) || 0,
          installments: Number(dealFormData.installments) || 1, installment_value: Number(dealFormData.installmentValue || 0),
          product_type: dealFormData.productType || null, product_name: dealFormData.productName, email: dealFormData.email, phone: dealFormData.phone,
          cpf: dealFormData.cpf, first_due_date: dealFormData.firstDueDate || null, receipt_link: dealFormData.receiptLink, transaction_code: dealFormData.transactionCode,
          zip_code: dealFormData.zipCode, address: dealFormData.address, address_number: dealFormData.addressNumber, neighborhood: dealFormData.neighborhood, address_city: dealFormData.addressCity, address_state: dealFormData.addressState, registration_data: dealFormData.registrationData,
          observation: dealFormData.observation, course_state: dealFormData.courseState, course_city: dealFormData.courseCity, 
          class_mod_1: dealFormData.classMod1, class_mod_2: dealFormData.classMod2, pipeline: dealFormData.pipeline, 
          tasks: dealFormData.tasks || [], billing_cnpj: dealFormData.billingCnpj, billing_company_name: dealFormData.billingCompanyName
      };
      try {
          if (editingDealId) {
              const { data, error = null } = await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId).select().single();
              if (error) throw error;
              
              if (data) {
                  dispatchNegotiationWebhook(data);
                  triggerDigitalSupportTicket(data);
                  triggerWhatsAppAutomation(data);
              }
          } else {
              const dealNumber = generateDealNumber();
              const { data, error = null } = await appBackend.client.from('crm_deals').insert([{ ...payload, deal_number: dealNumber }]).select().single();
              if (error) throw error;
              
              if (data) {
                  dispatchNegotiationWebhook(data);
                  triggerDigitalSupportTicket(data);
                  triggerWhatsAppAutomation(data);
              }
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

  // --- Task Helpers ---
  const addTaskToForm = () => {
      if (!newTaskDesc.trim()) return;
      const newTask: DealTask = {
          id: crypto.randomUUID(),
          description: newTaskDesc.trim(),
          dueDate: newTaskDate,
          type: newTaskType,
          isDone: false
      };
      setDealFormData(prev => ({
          ...prev,
          tasks: [...(prev.tasks || []), newTask]
      }));
      setNewTaskDesc('');
  };

  const toggleTaskDone = (taskId: string) => {
      setDealFormData(prev => ({
          ...prev,
          tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, isDone: !t.isDone } : t)
      }));
  };

  const removeTaskFromForm = (taskId: string) => {
      setDealFormData(prev => ({
          ...prev,
          tasks: (prev.tasks || []).filter(t => t.id !== taskId)
      }));
  };

  // --- Task Reporting ---
  const allPendingTasks = useMemo(() => {
    const tasks: any[] = [];
    deals.forEach(deal => {
        (deal.tasks || []).forEach(task => {
            if (!task.isDone) {
                tasks.push({
                    ...task,
                    dealId: deal.id,
                    dealTitle: deal.title,
                    dealNumber: deal.dealNumber,
                    clientName: deal.companyName || deal.contact_name,
                    ownerName: getOwnerName(deal.owner),
                    parentDeal: deal
                });
            }
        });
    });
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [deals, collaborators]);

  const getDealTaskStatus = (deal: Deal) => {
      const pending = (deal.tasks || []).filter(t => !t.isDone);
      if (pending.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const urgent = pending.sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0];
      
      if (urgent.dueDate < today) return { color: 'text-red-500', label: 'Atrasada' };
      if (urgent.dueDate === today) return { color: 'text-amber-500', label: 'Hoje' };
      return { color: 'text-blue-500', label: 'Futura' };
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
                <button onClick={() => setActiveView('tasks')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all relative", activeView === 'tasks' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    <ListTodo size={16} /> Agenda 
                    {allPendingTasks.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{allPendingTasks.length}</span>}
                </button>
                <button onClick={() => setActiveView('teams')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'teams' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users size={16} /> Equipes</button>
                <button onClick={() => setActiveView('pipelines_config')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all", activeView === 'pipelines_config' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><SettingsIcon size={16} /> Funis</button>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            {activeView === 'pipeline' || activeView === 'tasks' ? (
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
                                        columnDeals.map(deal => {
                                            const taskStatus = getDealTaskStatus(deal);
                                            return (
                                                <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400" : "")}>
                                                    <div className={clsx("absolute left-0 top-3 bottom-3 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                                                    <div className="pl-3">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div>
                                                                {deal.dealNumber && <span className="text-[10px] text-slate-400 font-mono block">#{deal.dealNumber}</span>}
                                                                <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{deal.title}</h4>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                                <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'prev')}} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={14} className="rotate-180" /></button>
                                                                <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'next')}} className="p-1 hover:bg-green-50 rounded text-green-600"><ChevronRight size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-2 truncate">{deal.companyName}</p>
                                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold text-slate-700 text-sm">{formatCurrency(deal.value)}</span>
                                                                {taskStatus && (
                                                                    <div className={clsx("flex items-center gap-0.5 ml-1", taskStatus.color)} title={`Tarefa ${taskStatus.label}`}>
                                                                        <Clock size={10} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm" title={`Responsável: ${getOwnerName(deal.owner)}`}>
                                                                {(getOwnerName(deal.owner) || '?').charAt(0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
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

            {activeView === 'tasks' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Agenda de Tarefas</h2>
                            <p className="text-sm text-slate-500">Controle global de todos os agendamentos pendentes.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                                <Clock size={14} className="text-red-500" /> {allPendingTasks.filter(t => t.dueDate < new Date().toISOString().split('T')[0]).length} Atrasadas
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                                <Calendar size={14} className="text-amber-500" /> {allPendingTasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length} Hoje
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Negócio / Cliente</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allPendingTasks.length === 0 ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">Nenhum agendamento pendente.</td></tr>
                                ) : allPendingTasks.map(task => {
                                    const isOverdue = task.dueDate < new Date().toISOString().split('T')[0];
                                    const isToday = task.dueDate === new Date().toISOString().split('T')[0];
                                    
                                    return (
                                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={clsx("font-bold", isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-slate-700")}>
                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={clsx("w-fit p-1.5 rounded-lg", 
                                                    task.type === 'call' ? "bg-blue-50 text-blue-600" :
                                                    task.type === 'email' ? "bg-purple-50 text-purple-600" :
                                                    task.type === 'meeting' ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-600"
                                                )}>
                                                    {task.type === 'call' && <Phone size={14}/>}
                                                    {task.type === 'email' && <Mail size={14}/>}
                                                    {task.type === 'meeting' && <Users size={14}/>}
                                                    {task.type === 'todo' && <CheckSquare size={14}/>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{task.description}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => openEditDealModal(task.parentDeal)} className="text-left group">
                                                    <p className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">#{task.dealNumber} - {task.dealTitle}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">{task.clientName}</p>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-500">{task.ownerName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditDealModal(task.parentDeal)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronRight size={20}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                        <button onClick={openNewPipelineModal} className="bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-teal-300 transition-all group"><div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-teal-500 mb-2"><Plus size={24} /></div><span className="font-bold text-slate-600 group-hover:text-indigo-600">Novo Funil</span></button>
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
                          <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-50" placeholder="Ex: Funil Cursos, Funil Equipamentos..." value={pipelineName} onChange={e => setPipelineName(e.target.value)} />
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
                      <button onClick={handleSaveTeam} disabled={isSavingTeam || !teamName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all">
                          {isSavingTeam ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar Equipe
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- CONTA AZUL CONFIRMATION MODAL --- */}
      {contaAzulConfirmDeal && (() => {
          const d = contaAzulConfirmDeal;
          const pm = (d.payment_method || d.paymentMethod || '').toUpperCase();
          const isBoleto = pm.includes('BOLETO');
          const isCartao = pm.includes('CART') || pm.includes('CRÉD') || pm.includes('DÉBI') || pm.includes('CREDIT') || pm.includes('DEBIT');
          const isAVista = !isBoleto && !isCartao;
          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 shrink-0">
                      <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                          <DollarSign size={20} className="text-green-600" />
                          Lançar Venda no Conta Azul
                      </h3>
                      <button onClick={() => setContaAzulConfirmDeal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 font-medium">
                          Negócio <strong>#{d.deal_number || d.dealNumber}</strong> — {d.title || d.contact_name || 'Sem título'}. Confira os dados abaixo antes de lançar.
                      </div>

                      {/* DADOS DO CLIENTE */}
                      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5"><User size={14}/> Dados do Cliente</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Nome Completo</span>
                                  <span className="text-sm font-semibold text-slate-800">{d.company_name || d.companyName || d.contact_name || d.contactName || '—'}</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">CPF / CNPJ</span>
                                  <span className="text-sm font-semibold text-slate-800">{d.cpf || d.billing_cnpj || d.billingCnpj || '—'}</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">E-mail</span>
                                  <span className="text-sm font-semibold text-slate-800">{d.email || '—'}</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Telefone</span>
                                  <span className="text-sm font-semibold text-slate-800">{d.phone || '—'}</span>
                              </div>
                              <div className="md:col-span-2">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Endereço</span>
                                  <span className="text-sm font-semibold text-slate-800">
                                      {[d.address || d.addressName, d.address_number || d.addressNumber].filter(Boolean).join(', ') || '—'}
                                      {(d.neighborhood) ? ` — ${d.neighborhood}` : ''}
                                  </span>
                                  <span className="block text-xs text-slate-500">
                                      {[d.address_city || d.addressCity, d.address_state || d.addressState].filter(Boolean).join('/') || ''}
                                      {(d.zip_code || d.zipCode) ? ` — CEP: ${d.zip_code || d.zipCode}` : ''}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {/* CONDIÇÕES DA VENDA */}
                      <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/30">
                          <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={14}/> Condições da Venda</h4>
                          <div className="flex items-center gap-2 mb-2">
                              <span className={clsx("px-3 py-1 rounded-lg text-[10px] font-black uppercase", isAVista ? "bg-green-100 text-green-700" : isCartao ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700")}>
                                  {isBoleto ? 'Boleto' : isCartao ? 'Cartão' : 'À Vista'}
                              </span>
                              <span className="text-sm font-bold text-slate-700">{d.payment_method || d.paymentMethod || 'Não informado'}</span>
                          </div>

                          {isAVista && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Valor Total</span>
                                      <span className="text-lg font-black text-green-700">R$ {(d.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Link do Comprovante</span>
                                      {(d.receipt_link || d.receiptLink) ? (
                                          <a href={d.receipt_link || d.receiptLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 underline break-all">{d.receipt_link || d.receiptLink}</a>
                                      ) : <span className="text-sm text-slate-400">Não informado</span>}
                                  </div>
                              </div>
                          )}

                          {isCartao && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Valor Total</span>
                                      <span className="text-lg font-black text-purple-700">R$ {(d.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Parcelamento</span>
                                      <span className="text-sm font-bold text-slate-800">{d.installments || 1}x de R$ {((d.installment_value || d.installmentValue) || ((d.value || 0) / (d.installments || 1))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Código de Transação</span>
                                      <span className="text-sm font-semibold text-slate-800">{d.transaction_code || d.transactionCode || '—'}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Link do Comprovante</span>
                                      {(d.receipt_link || d.receiptLink) ? (
                                          <a href={d.receipt_link || d.receiptLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 underline break-all">{d.receipt_link || d.receiptLink}</a>
                                      ) : <span className="text-sm text-slate-400">Não informado</span>}
                                  </div>
                              </div>
                          )}

                          {isBoleto && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Valor de Entrada</span>
                                      <span className="text-lg font-black text-orange-700">R$ {(d.entry_value || d.entryValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Parcelas</span>
                                      <span className="text-sm font-bold text-slate-800">{d.installments || 1}x de R$ {((d.installment_value || d.installmentValue) || (((d.value || 0) - (d.entry_value || d.entryValue || 0)) / (d.installments || 1))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Vencimento 1º Boleto</span>
                                      <span className="text-sm font-bold text-slate-800">{(d.first_due_date || d.firstDueDate) ? new Date(d.first_due_date || d.firstDueDate).toLocaleDateString('pt-BR') : '—'}</span>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Link Comprovante Entrada</span>
                                      {(d.receipt_link || d.receiptLink) ? (
                                          <a href={d.receipt_link || d.receiptLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 underline break-all">{d.receipt_link || d.receiptLink}</a>
                                      ) : <span className="text-sm text-slate-400">Não informado</span>}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* DADOS PARA O CONTA AZUL */}
                      <div className="border border-green-200 rounded-xl p-4 space-y-3 bg-green-50/30">
                          <h4 className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={14}/> Dados da Venda — Conta Azul</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Produto / Serviço *</label>
                                  <select value={contaAzulFormData.produto_id} onChange={e => setContaAzulFormData(f => ({ ...f, produto_id: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 outline-none">
                                      <option value="">Selecione um produto/serviço do Conta Azul...</option>
                                      {contaAzulProducts.map(p => (
                                          <option key={p.id} value={p.id}>[{p.tipo === 'SERVICO' ? 'Serviço' : 'Produto'}] {p.nome}</option>
                                      ))}
                                  </select>
                                  {contaAzulProducts.length === 0 && <p className="text-[10px] text-amber-600 mt-1 font-medium">Nenhum produto/serviço encontrado no Conta Azul. Cadastre pelo menos um.</p>}
                              </div>

                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                  <input type="text" value={contaAzulFormData.descricao} onChange={e => setContaAzulFormData(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$) *</label>
                                  <input type="number" step="0.01" value={contaAzulFormData.valor || ''} onChange={e => setContaAzulFormData(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                                  <input type="number" min={1} value={contaAzulFormData.parcelas} onChange={e => setContaAzulFormData(f => ({ ...f, parcelas: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Competência</label>
                                  <input type="date" value={contaAzulFormData.data_competencia} onChange={e => setContaAzulFormData(f => ({ ...f, data_competencia: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Vencimento *</label>
                                  <input type="date" value={contaAzulFormData.data_vencimento} onChange={e => setContaAzulFormData(f => ({ ...f, data_vencimento: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                  <select value={contaAzulFormData.categoria_id} onChange={e => setContaAzulFormData(f => ({ ...f, categoria_id: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 outline-none">
                                      <option value="">Selecione uma categoria...</option>
                                      {contaAzulCategories.map(c => (
                                          <option key={c.id} value={c.id_conta_azul}>{c.nome}</option>
                                      ))}
                                  </select>
                              </div>

                              {contaAzulCostCenters.length > 0 && (
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Centro de Custo</label>
                                      <select value={contaAzulFormData.centro_custo_id} onChange={e => setContaAzulFormData(f => ({ ...f, centro_custo_id: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 outline-none">
                                          <option value="">Nenhum</option>
                                          {contaAzulCostCenters.map(cc => (
                                              <option key={cc.id} value={cc.id_conta_azul}>{cc.nome}</option>
                                          ))}
                                      </select>
                                  </div>
                              )}

                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                                  <textarea value={contaAzulFormData.observacoes} onChange={e => setContaAzulFormData(f => ({ ...f, observacoes: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium h-20 resize-none focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setContaAzulConfirmDeal(null)} className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">
                          Cancelar
                      </button>
                      <button onClick={handleConfirmContaAzulReceivable} disabled={isCreatingReceivable} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all disabled:opacity-50">
                          {isCreatingReceivable ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          Confirmar e Lançar
                      </button>
                  </div>
              </div>
          </div>
          );
      })()}

      {/* --- DEAL MODAL --- */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">
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
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14}/> Endereço do Cliente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">CEP</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border rounded-lg text-sm pr-8"
                                        placeholder="00000-000"
                                        maxLength={9}
                                        value={dealFormData.zipCode}
                                        onChange={e => {
                                            const formatted = formatCEP(e.target.value);
                                            setDealFormData({...dealFormData, zipCode: formatted});
                                            if (formatted.replace(/\D/g, '').length === 8) fetchAddressByCep(formatted);
                                        }}
                                    />
                                    {isFetchingCep && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Rua / Logradouro</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={dealFormData.address} onChange={e => setDealFormData({...dealFormData, address: e.target.value})} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Número</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={dealFormData.addressNumber} onChange={e => setDealFormData({...dealFormData, addressNumber: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Bairro</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={dealFormData.neighborhood} onChange={e => setDealFormData({...dealFormData, neighborhood: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Cidade</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={dealFormData.addressCity} onChange={e => setDealFormData({...dealFormData, addressCity: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">UF</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm uppercase" maxLength={2} value={dealFormData.addressState} onChange={e => setDealFormData({...dealFormData, addressState: e.target.value.toUpperCase()})} />
                            </div>
                        </div>
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
                                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:bg-slate-100" value={dealFormData.productName} onChange={e => setDealFormData({...dealFormData, productName: e.target.value})} disabled={!dealFormData.productType}>
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
                             <div className="md:col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Turmas Presenciais</div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">UF Curso</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.courseState} onChange={e => setDealFormData({...dealFormData, courseState: e.target.value, courseCity: '', classMod1: '', classMod2: ''})}>
                                    <option value="">--</option>{Array.from(new Set(registeredClasses.map(c => c.state))).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Cidade Curso</label>
                                <select className="w-full px-2 py-1.5 border rounded text-xs" value={dealFormData.courseCity} onChange={e => { setDealFormData({...dealFormData, courseCity: e.target.value, classMod1: '', classMod2: '' }); }} disabled={!dealFormData.courseState}>
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
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                             {/* Form para adicionar tarefa */}
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl shadow-sm">
                                 <div className="md:col-span-6">
                                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">O que precisa ser feito?</label>
                                     <input 
                                        type="text" 
                                        className="w-full px-3 py-1.5 border rounded-lg text-sm" 
                                        placeholder="Ex: Ligar para confirmar pagamento" 
                                        value={newTaskDesc}
                                        onChange={e => setNewTaskDesc(e.target.value)}
                                     />
                                 </div>
                                 <div className="md:col-span-2">
                                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data</label>
                                     <input 
                                        type="date" 
                                        className="w-full px-3 py-1.5 border rounded-lg text-sm" 
                                        value={newTaskDate}
                                        onChange={e => setNewTaskDate(e.target.value)}
                                     />
                                 </div>
                                 <div className="md:col-span-2">
                                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                                     <select 
                                        className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white" 
                                        value={newTaskType}
                                        onChange={e => setNewTaskType(e.target.value as any)}
                                     >
                                         <option value="todo">Geral</option>
                                         <option value="call">Ligação</option>
                                         <option value="email">E-mail</option>
                                         <option value="meeting">Reunião</option>
                                     </select>
                                 </div>
                                 <div className="md:col-span-2">
                                     <button 
                                        type="button" 
                                        onClick={addTaskToForm}
                                        disabled={!newTaskDesc.trim()}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                                     >
                                         Agendar
                                     </button>
                                 </div>
                             </div>

                             {/* Lista de tarefas agendadas */}
                             <div className="space-y-2">
                                 {(dealFormData.tasks || []).length === 0 ? (
                                     <div className="text-center py-6 text-slate-400 text-xs italic">Nenhuma tarefa agendada para este negócio.</div>
                                 ) : (
                                     dealFormData.tasks?.map(task => (
                                         <div key={task.id} className={clsx("flex items-center gap-4 p-3 rounded-xl border transition-all", task.isDone ? "bg-slate-100 border-slate-200 opacity-60" : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm")}>
                                             <button onClick={() => toggleTaskDone(task.id)} className={clsx("shrink-0 transition-colors", task.isDone ? "text-green-500" : "text-slate-300 hover:text-indigo-500")}>
                                                 {task.isDone ? <CheckCircle size={20}/> : <Circle size={20}/>}
                                             </button>
                                             
                                             <div className="flex-1 min-w-0">
                                                 <div className="flex items-center gap-2 mb-0.5">
                                                     <div className={clsx("p-1 rounded-md", 
                                                        task.type === 'call' ? "bg-blue-50 text-blue-600" :
                                                        task.type === 'email' ? "bg-purple-50 text-purple-600" :
                                                        task.type === 'meeting' ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-600"
                                                     )}>
                                                         {task.type === 'call' && <Phone size={12}/>}
                                                         {task.type === 'email' && <Mail size={12}/>}
                                                         {task.type === 'meeting' && <Users size={12}/>}
                                                         {task.type === 'todo' && <CheckSquare size={12}/>}
                                                     </div>
                                                     <span className={clsx("text-xs font-bold truncate", task.isDone ? "text-slate-500 line-through" : "text-slate-800")}>{task.description}</span>
                                                 </div>
                                                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                                     <Calendar size={10}/> {new Date(task.dueDate).toLocaleDateString()}
                                                 </div>
                                             </div>

                                             <button onClick={() => removeTaskFromForm(task.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                 <Trash2 size={14}/>
                                             </button>
                                         </div>
                                     ))
                                 )}
                             </div>
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
