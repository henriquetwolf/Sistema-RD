
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, 
  User, DollarSign, Phone, Mail, ArrowRight, CheckCircle2, 
  AlertCircle, ChevronRight, GripVertical, Users, Target, LayoutGrid,
  Building, X, Save, Trash2, Briefcase, CreditCard, Loader2, RefreshCw, Archive, ArchiveRestore,
  MapPin, Hash, Link as LinkIcon, FileText, GraduationCap, ShoppingBag, Mic, ListTodo, Clock, Edit2, Palette, Settings as SettingsIcon, ChevronDown, CheckCircle, Circle,
  CheckSquare, AlertTriangle, Bell, Minimize2, Maximize2, Layers
} from 'lucide-react';
import { appBackend, CompanySetting, Pipeline, PipelineStage, WebhookTrigger } from '../services/appBackend';
import { whatsappService } from '../services/whatsappService';
import { contaAzulService } from '../services/contaAzulService';
import { ContaAzulAccount } from '../types';
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

  contaAzulSaleNumberService?: string;
  contaAzulSaleNumberProduct?: string;
  contaAzulSaleId?: string;

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
  archivedAt?: Date;
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
    contaAzulSaleNumberService: '', contaAzulSaleNumberProduct: '',
    tasks: []
};

const PAYMENT_METHODS = [
    { value: '', label: 'Selecione...' },
    { value: 'Boleto', label: 'Boleto Bancário' },
    { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
    { value: 'Cartão de Débito', label: 'Cartão de Débito' },
    { value: 'PIX', label: 'PIX' },
    { value: 'Dinheiro', label: 'Dinheiro / À Vista' },
    { value: 'Transferência', label: 'Transferência Bancária' },
];

const formatCurrencyInput = (raw: string): { display: string; numeric: number } => {
    const digits = raw.replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const numeric = cents / 100;
    const display = numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { display: `R$ ${display}`, numeric };
};

export const CrmBoard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pipeline' | 'teams' | 'pipelines_config' | 'tasks' | 'archived'>('pipeline');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
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
    descricao: string; valor: number; valor_entrada: number; data_competencia: string; data_vencimento: string;
    parcelas: number; categoria_id: string; centro_custo_id: string; observacoes: string;
    contato_nome: string; contato_cpf: string; contato_email: string; contato_telefone: string;
    contato_endereco: string; contato_numero: string; contato_bairro: string; contato_cidade: string; contato_uf: string; contato_cep: string;
    produto_id: string; tipo_pagamento: string; deal_number: string; vendedor_nome: string;
  }>({ descricao: '', valor: 0, valor_entrada: 0, data_competencia: '', data_vencimento: '', parcelas: 1, categoria_id: '', centro_custo_id: '', observacoes: '', contato_nome: '', contato_cpf: '', contato_email: '', contato_telefone: '', contato_endereco: '', contato_numero: '', contato_bairro: '', contato_cidade: '', contato_uf: '', contato_cep: '', produto_id: '', tipo_pagamento: '', deal_number: '', vendedor_nome: '' });
  const [contaAzulCategories, setContaAzulCategories] = useState<{ id: string; id_conta_azul: string; nome: string; tipo: string }[]>([]);
  const [contaAzulCostCenters, setContaAzulCostCenters] = useState<{ id: string; id_conta_azul: string; nome: string }[]>([]);
  const [contaAzulProducts, setContaAzulProducts] = useState<{ id: string; nome: string; tipo: string; valor: number }[]>([]);
  const [isCreatingReceivable, setIsCreatingReceivable] = useState(false);
  const [activeMapping, setActiveMapping] = useState<any | null>(null);
  const [dealProductMapping, setDealProductMapping] = useState<any | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isFetchingAluno, setIsFetchingAluno] = useState(false);
  const [alunoFound, setAlunoFound] = useState<{ id: string; full_name: string } | null>(null);
  const [pendingCloseMove, setPendingCloseMove] = useState<{ dealId: string; pipeline: string; targetStage: string; previousStage: string } | null>(null);
  const [caAccounts, setCaAccounts] = useState<ContaAzulAccount[]>([]);
  const [selectedCaAccountId, setSelectedCaAccountId] = useState<string | null>(null);

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

  // Pipeline view controls
  const [activePipelineTab, setActivePipelineTab] = useState<string | 'all'>('all');
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('crm_compact_mode') === 'true');
  const [showFunnelFilter, setShowFunnelFilter] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('crm_compact_mode', String(compactMode));
  }, [compactMode]);

  useEffect(() => {
      const total = Number(dealFormData.value) || 0;
      const entry = Number(dealFormData.entryValue) || 0;
      const inst = Number(dealFormData.installments) || 1;
      const remaining = Math.max(total - entry, 0);
      const perInstallment = inst > 0 ? Math.round((remaining / inst) * 100) / 100 : 0;
      if (dealFormData.installmentValue !== perInstallment) {
          setDealFormData(prev => ({ ...prev, installmentValue: perInstallment }));
      }
  }, [dealFormData.value, dealFormData.entryValue, dealFormData.installments]);

  // Lógica de preenchimento automático de CNPJ, Empresa e Configuração Conta Azul
  useEffect(() => {
      const resolve = async () => {
          const productTypeToItemType: Record<string, string> = { Digital: 'produto_digital', Presencial: 'turma', Evento: 'evento' };

          let foundMapping: any = null;

          // Busca mapping do cadastro Produtos e Serviços
          if (dealFormData.productName) {
              try {
                  const mappings = await appBackend.getContaAzulProductMappings();
                  const pName = (dealFormData.productName || '').toLowerCase().trim();
                  const expectedType = productTypeToItemType[dealFormData.productType || ''] || '';

                  // Busca por nome + tipo (mais preciso)
                  foundMapping = mappings.find(m =>
                      m.itemName.toLowerCase().trim() === pName &&
                      (!expectedType || m.itemType === expectedType)
                  );
                  // Fallback: busca apenas por nome
                  if (!foundMapping) {
                      foundMapping = mappings.find(m => m.itemName.toLowerCase().trim() === pName);
                  }

                  if (foundMapping?.billingCnpj && foundMapping?.billingCompanyName) {
                      setDealFormData(prev => ({
                          ...prev,
                          billingCnpj: foundMapping.billingCnpj!,
                          billingCompanyName: foundMapping.billingCompanyName!,
                      }));
                      setDealProductMapping(foundMapping);
                      return;
                  }
              } catch (e) { /* fallback abaixo */ }
          }

          setDealProductMapping(foundMapping || null);

          if (companies.length > 0) {
              let matched: CompanySetting | undefined;

              if (dealFormData.productName) {
                  matched = companies.find(c => (c.productIds || []).includes(dealFormData.productName!));
              }

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
                  setDealFormData(prev => ({
                      ...prev,
                      billingCnpj: '',
                      billingCompanyName: ''
                  }));
              }
          }
      };
      resolve();
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
              const mapDeal = (d: any): Deal => ({
                  id: d.id, dealNumber: d.deal_number, title: d.title || '', contactName: d.contact_name || '', companyName: d.company_name || '',
                  value: Number(d.value || 0), paymentMethod: d.payment_method || '', stage: d.stage || 'new', owner: d.owner_id || '', status: d.status || 'warm',
                  nextTask: d.next_task || '', createdAt: new Date(d.created_at), closedAt: d.closed_at ? new Date(d.closed_at) : undefined,
                  archivedAt: d.archived_at ? new Date(d.archived_at) : undefined,
                  source: d.source || '', campaign: d.campaign || '', entryValue: Number(d.entry_value || 0), installments: Number(d.installments || 1),
                  installmentValue: Number(d.installment_value || 0), productType: d.product_type || '', productName: d.product_name,
                  email: d.email || '', phone: d.phone || '', cpf: d.cpf || '', firstDueDate: d.first_due_date, receiptLink: d.receipt_link,
                  transactionCode: d.transaction_code, zipCode: d.zip_code, address: d.address, addressNumber: d.address_number, neighborhood: d.neighborhood, addressCity: d.address_city, addressState: d.address_state,
                  registrationData: d.registration_data, observation: d.observation, courseState: d.course_state, courseCity: d.course_city,
                  classMod1: d.class_mod_1, classMod2: d.class_mod_2, pipeline: d.pipeline || 'Padrão',
                  billingCnpj: d.billing_cnpj, billingCompanyName: d.billing_company_name,
                  contaAzulSaleNumberService: d.conta_azul_sale_number_service || '', contaAzulSaleNumberProduct: d.conta_azul_sale_number_product || '',
                  contaAzulSaleId: d.conta_azul_sale_id || '',
                  tasks: d.tasks || []
              });
              const allDeals = dealsResult.data.map(mapDeal);
              setDeals(allDeals.filter(d => !d.archivedAt));
              setArchivedDeals(allDeals.filter(d => !!d.archivedAt));
          } else {
              setDeals([]);
              setArchivedDeals([]);
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

          contaAzulService.getAccounts().then(accs => setCaAccounts(accs)).catch(() => {});

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

  const findContaAzulProductByName = (name: string, prods: any[]): string => {
      if (!name || !prods.length) return '';
      const n = name.toLowerCase().trim();
      const exact = prods.find((p: any) => p.nome.toLowerCase().trim() === n);
      if (exact) return exact.id;
      const partial = prods.find((p: any) => p.nome.toLowerCase().includes(n) || n.includes(p.nome.toLowerCase()));
      return partial ? partial.id : '';
  };

  const triggerContaAzulReceivable = async (deal: any) => {
      let cats: any[] = [];
      let ccs: any[] = [];
      let prods: any[] = [];
      let mappingsData: any[] = [];
      let matchedProductId = '';
      let matchedCategoryId = '';

      const dealCnpj = (deal.billing_cnpj || deal.billingCnpj || '').replace(/\D/g, '');
      const matchedAccount = caAccounts.find(a => a.cnpj?.replace(/\D/g, '') === dealCnpj && dealCnpj.length > 0);
      const accountId = matchedAccount?.id || undefined;

      if (dealCnpj && !matchedAccount) {
          alert(`Nenhuma conta Conta Azul configurada para o CNPJ ${deal.billing_cnpj || deal.billingCnpj}.\n\nConfigure a conta correspondente em Configurações > Conta Azul antes de lançar a venda.`);
          return;
      }

      setSelectedCaAccountId(accountId || null);

      try {
          const status = await contaAzulService.getAuthStatus(accountId);
          if (status.connected) {
              const results = await Promise.allSettled([
                  contaAzulService.getCategories(accountId),
                  contaAzulService.getCostCenters(accountId),
                  contaAzulService.getProducts(accountId!),
                  appBackend.getContaAzulProductMappings(),
              ]);
              cats = results[0].status === 'fulfilled' ? results[0].value : [];
              ccs = results[1].status === 'fulfilled' ? results[1].value : [];
              prods = results[2].status === 'fulfilled' ? results[2].value : [];
              mappingsData = results[3].status === 'fulfilled' ? results[3].value : [];

              if (cats.length === 0 && accountId) {
                  console.log('[CA] Nenhuma categoria encontrada, sincronizando automaticamente...');
                  await contaAzulService.triggerSync('categories', accountId);
                  cats = await contaAzulService.getCategories(accountId);
              }
              if (ccs.length === 0 && accountId) {
                  console.log('[CA] Nenhum centro de custo encontrado, sincronizando automaticamente...');
                  await contaAzulService.triggerSync('cost-centers', accountId);
                  ccs = await contaAzulService.getCostCenters(accountId);
              }
          }
      } catch (err) {
          console.error('Erro ao buscar dados do Conta Azul (modal será exibido mesmo assim):', err);
      }

      let filteredCats = cats.filter((c: any) => c.tipo === 'RECEITA' || c.tipo === 'AMBOS');

      const findDefaultCategory = (catList: any[]) => catList.find((c: any) =>
          c.nome?.toLowerCase().includes('receita não realizada') ||
          c.nome?.toLowerCase().includes('receita nao realizada') ||
          c.nome?.toLowerCase().includes('diferidas')
      );

      if (accountId && !findDefaultCategory(filteredCats)) {
          console.log('[CA] Categoria padrão "DIFERIDAS" não encontrada, re-sincronizando categorias...');
          await contaAzulService.triggerSync('categories', accountId);
          cats = await contaAzulService.getCategories(accountId);
          filteredCats = cats.filter((c: any) => c.tipo === 'RECEITA' || c.tipo === 'AMBOS');
      }

      setContaAzulCategories(filteredCats);
      setContaAzulCostCenters(ccs);
      setContaAzulProducts(prods);

      const dealProductName = (deal.product_name || deal.productName || '').toLowerCase().trim();
      const dealProductType = (deal.product_type || deal.productType || '').toLowerCase().trim();
      const typeMap: Record<string, string> = { digital: 'produto_digital', presencial: 'turma', evento: 'evento' };
      const expectedItemType = typeMap[dealProductType] || '';

      let mapping = mappingsData.find((m: any) =>
          m.itemName?.toLowerCase().trim() === dealProductName &&
          (!expectedItemType || m.itemType === expectedItemType)
      );
      if (!mapping) {
          mapping = mappingsData.find((m: any) => m.itemName?.toLowerCase().trim() === dealProductName);
      }

      if (mapping) {
          matchedCategoryId = mapping.contaAzulCategoryId || '';
          if (mapping.splitMode === 'divided') {
              const serviceId = mapping.contaAzulServiceId || findContaAzulProductByName(mapping.contaAzulServiceName || '', prods);
              const productId = mapping.contaAzulProductId || findContaAzulProductByName(mapping.contaAzulProductName || '', prods);
              mapping._resolvedServiceId = serviceId;
              mapping._resolvedProductId = productId;
              matchedProductId = serviceId || productId;
              console.log('[CA] Divided mapping resolved — serviceId:', serviceId, 'productId:', productId);
          } else if (mapping.splitMode === 'all_product') {
              matchedProductId = mapping.contaAzulProductId || findContaAzulProductByName(mapping.contaAzulProductName || '', prods);
          } else {
              matchedProductId = mapping.contaAzulServiceId || findContaAzulProductByName(mapping.contaAzulServiceName || '', prods);
          }
      }
      setActiveMapping(mapping ? { ...mapping } : null);

      if (matchedCategoryId && filteredCats.length > 0) {
          const catExists = filteredCats.some((c: any) => c.id_conta_azul === matchedCategoryId);
          if (!catExists) {
              console.log('[CA] Categoria do mapeamento não encontrada nas categorias da conta, limpando para fallback');
              matchedCategoryId = '';
          }
      }

      if (!matchedCategoryId && filteredCats.length > 0) {
          const defaultCat = findDefaultCategory(filteredCats);
          if (defaultCat) {
              matchedCategoryId = defaultCat.id_conta_azul;
              console.log('[CA] Categoria padrão aplicada:', defaultCat.nome, '->', matchedCategoryId);
          }
      }

      if (!matchedProductId && dealProductName) {
          matchedProductId = findContaAzulProductByName(dealProductName, prods);
      }

      const hoje = new Date().toISOString().split('T')[0];
      const classMod1 = (deal.class_mod_1 || deal.classMod1 || '').trim();
      let matchedCcId = '';

      if (classMod1 && ccs.length > 0) {
          const ccMatch = ccs.find((cc: any) => cc.nome?.toLowerCase().trim() === classMod1.toLowerCase());
          if (ccMatch) {
              matchedCcId = ccMatch.id_conta_azul;
              console.log('[CA] Centro de custo encontrado:', classMod1, '->', matchedCcId);
          }
      }

      if (classMod1 && !matchedCcId) {
          try {
              console.log('[CA] Centro de custo não encontrado, criando:', classMod1);
              const newCc = await contaAzulService.createCostCenter(classMod1, selectedCaAccountId!);
              if (newCc?.id_conta_azul) {
                  matchedCcId = newCc.id_conta_azul;
                  setContaAzulCostCenters(prev => [...prev, { id: newCc.id_conta_azul, id_conta_azul: newCc.id_conta_azul, nome: newCc.nome || classMod1 }]);
                  console.log('[CA] Centro de custo criado:', classMod1, '->', matchedCcId);
              }
          } catch (e: any) {
              console.error('[CA] Erro ao criar centro de custo:', e.message);
          }
      }

      const ownerName = (collaborators || []).find(c => c.id === (deal.owner || deal.owner_id))?.fullName || '';

      const valorTotal = deal.value || 0;
      const entrada = deal.entry_value || deal.entryValue || 0;
      const nParcelas = deal.installments || 1;
      const valorParcela = nParcelas > 0 ? ((valorTotal - entrada) / nParcelas) : 0;

      const obsLines = [
          `Negócio CRM: ${deal.title || ''}`,
          `Cliente: ${deal.company_name || deal.contact_name || ''}`,
          `CNPJ: ${deal.billing_cnpj || 'N/A'}`,
          deal.receipt_link || deal.receiptLink ? `Link Comprovante: ${deal.receipt_link || deal.receiptLink}` : '',
          deal.transaction_code || deal.transactionCode ? `Cód. Transação: ${deal.transaction_code || deal.transactionCode}` : '',
          `Valor Total: R$ ${valorTotal.toFixed(2)}`,
          entrada > 0 ? `Entrada: R$ ${entrada.toFixed(2)}` : '',
          `Parcelas: ${nParcelas}x R$ ${valorParcela.toFixed(2)}`,
          `Forma Pgto: ${deal.payment_method || deal.paymentMethod || ''}`,
          deal.observation ? `Obs: ${deal.observation}` : '',
      ].filter(Boolean).join(' | ');

      setContaAzulFormData({
          descricao: `[CRM #${deal.deal_number || ''}] ${deal.product_name || deal.company_name || deal.contact_name || 'Venda'}`,
          valor: valorTotal,
          valor_entrada: entrada,
          data_competencia: hoje,
          data_vencimento: deal.first_due_date || hoje,
          parcelas: nParcelas,
          categoria_id: matchedCategoryId,
          centro_custo_id: matchedCcId,
          observacoes: ownerName ? `${obsLines}\nVENDEDOR COMERCIAL: ${ownerName}` : obsLines,
          contato_nome: deal.company_name || deal.contact_name || '',
          contato_cpf: deal.cpf || deal.billing_cnpj || '',
          contato_email: deal.email || '',
          contato_telefone: deal.phone || '',
          contato_endereco: deal.address || '',
          contato_numero: deal.address_number || deal.addressNumber || '',
          contato_bairro: deal.neighborhood || '',
          contato_cidade: deal.address_city || deal.addressCity || '',
          contato_uf: deal.address_state || deal.addressState || '',
          contato_cep: deal.zip_code || deal.zipCode || '',
          produto_id: matchedProductId,
          tipo_pagamento: deal.payment_method || deal.paymentMethod || '',
          deal_number: String(deal.deal_number || deal.dealNumber || ''),
          vendedor_nome: ownerName,
      });
      setContaAzulConfirmDeal(deal);
  };

  const handleConfirmContaAzulReceivable = async () => {
      const isDivided = activeMapping?.splitMode === 'divided';

      let resolvedSvcId = '';
      let resolvedProdId = '';

      if (isDivided) {
          resolvedSvcId = activeMapping?._resolvedServiceId || activeMapping?.contaAzulServiceId || contaAzulFormData.produto_id || '';
          resolvedProdId = activeMapping?._resolvedProductId || activeMapping?.contaAzulProductId || '';

          if (!resolvedSvcId && activeMapping?.contaAzulServiceName) {
              const match = contaAzulProducts.find(p => p.nome?.toLowerCase().trim() === activeMapping.contaAzulServiceName.toLowerCase().trim());
              if (match) resolvedSvcId = match.id;
          }
          if (!resolvedProdId && activeMapping?.contaAzulProductName) {
              const match = contaAzulProducts.find(p => p.nome?.toLowerCase().trim() === activeMapping.contaAzulProductName.toLowerCase().trim());
              if (match) resolvedProdId = match.id;
          }

          console.log('[CA] handleConfirm — resolvedSvcId:', resolvedSvcId, 'resolvedProdId:', resolvedProdId);

          if (!resolvedSvcId || !resolvedProdId) {
              alert(`Para lançamento dividido, é necessário que ambos os itens (Serviço e Produto) estejam vinculados no Conta Azul.\n\nServiço ID: ${resolvedSvcId || '(vazio)'}\nProduto ID: ${resolvedProdId || '(vazio)'}\n\nVerifique os nomes/IDs configurados no cadastro de Produtos e Serviços.`);
              return;
          }
      } else if (!contaAzulFormData.produto_id) {
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
          const basePayload = {
              data_venda: contaAzulFormData.data_competencia,
              data_vencimento: contaAzulFormData.data_vencimento,
              parcelas: contaAzulFormData.parcelas,
              valor_entrada: contaAzulFormData.valor_entrada || 0,
              categoria_id: contaAzulFormData.categoria_id,
              centro_custo_id: contaAzulFormData.centro_custo_id,
              centro_custo_nome: contaAzulCostCenters.find(cc => cc.id_conta_azul === contaAzulFormData.centro_custo_id)?.nome || '',
              contato_nome: contaAzulFormData.contato_nome,
              contato_cpf: contaAzulFormData.contato_cpf,
              contato_email: contaAzulFormData.contato_email,
              contato_telefone: contaAzulFormData.contato_telefone,
              contato_endereco: contaAzulFormData.contato_endereco,
              contato_numero: contaAzulFormData.contato_numero,
              contato_bairro: contaAzulFormData.contato_bairro,
              contato_cidade: contaAzulFormData.contato_cidade,
              contato_uf: contaAzulFormData.contato_uf,
              contato_cep: contaAzulFormData.contato_cep,
              tipo_pagamento: contaAzulFormData.tipo_pagamento,
              deal_number: contaAzulFormData.deal_number,
              vendedor_nome: contaAzulFormData.vendedor_nome,
          };

          const dealId = contaAzulConfirmDeal?.id || pendingCloseMove?.dealId || '';

          if (isDivided && activeMapping) {
              const svcPct = activeMapping.servicePercentage / 100;
              const prodPct = activeMapping.productPercentage / 100;
              const totalValue = contaAzulFormData.valor;
              const serviceValue = Math.round(totalValue * svcPct * 100) / 100;
              const productValue = Math.round(totalValue * prodPct * 100) / 100;
              const svcName = activeMapping.contaAzulServiceName || 'Serviço';
              const prodName = activeMapping.contaAzulProductName || 'Material Didático';

              const dealNum = contaAzulFormData.deal_number || '';

              console.log('[CA] Sending unified sale with 2 items — svc:', resolvedSvcId, 'prod:', resolvedProdId, 'total:', totalValue);
              const saleResult = await contaAzulService.createSale({
                  ...basePayload,
                  valor: totalValue,
                  itens: [
                      {
                          id: resolvedSvcId,
                          valor: serviceValue,
                          quantidade: 1,
                          descricao: `[CRM #${dealNum}] ${svcName} (${activeMapping.servicePercentage}%)`,
                      },
                      {
                          id: resolvedProdId,
                          valor: productValue,
                          quantidade: 1,
                          descricao: `[CRM #${dealNum}] ${prodName} (${activeMapping.productPercentage}%)`,
                      },
                  ],
                  observacoes: `${contaAzulFormData.observacoes} | Dividido: ${activeMapping.servicePercentage}% serviço + ${activeMapping.productPercentage}% produto de R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              }, selectedCaAccountId!);

              const saleNum = saleResult?.numero_venda || saleResult?.data?.numero || '';
              const saleId = saleResult?.data?.id || '';
              console.log('[CA] Número da venda unificada:', saleNum, '| ID:', saleId);

              if (dealId && saleNum) {
                  await appBackend.client.from('crm_deals').update({
                      conta_azul_sale_number_service: String(saleNum),
                      conta_azul_sale_number_product: String(saleNum),
                      ...(saleId ? { conta_azul_sale_id: String(saleId) } : {}),
                  }).eq('id', dealId);
              }

              if (pendingCloseMove) {
                  await executePendingMove(pendingCloseMove);
                  setPendingCloseMove(null);
              }
              alert(`Venda criada no Conta Azul! Venda nº ${saleNum || '(auto)'}\n\n2 itens na mesma venda:\n• Serviço: R$ ${serviceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${activeMapping.servicePercentage}%)\n• Produto: R$ ${productValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${activeMapping.productPercentage}%)\n\nO negócio foi movido para a etapa final.`);
          } else {
              const saleResult = await contaAzulService.createSale({
                  ...basePayload,
                  descricao: contaAzulFormData.descricao,
                  valor: contaAzulFormData.valor,
                  produto_id: contaAzulFormData.produto_id,
                  observacoes: contaAzulFormData.observacoes,
              }, selectedCaAccountId!);

              const saleNum = saleResult?.numero_venda || saleResult?.data?.numero || '';
              const saleId = saleResult?.data?.id || '';
              console.log('[CA] Número de venda:', saleNum, '| ID:', saleId);

              if (dealId && saleNum) {
                  await appBackend.client.from('crm_deals').update({
                      conta_azul_sale_number_service: String(saleNum),
                      ...(saleId ? { conta_azul_sale_id: String(saleId) } : {}),
                  }).eq('id', dealId);
              }

              if (pendingCloseMove) {
                  await executePendingMove(pendingCloseMove);
                  setPendingCloseMove(null);
              }
              alert(`Venda criada com sucesso no Conta Azul! Venda nº ${saleNum || '(auto)'}\n\nO negócio foi movido para a etapa final.`);
          }

          setContaAzulConfirmDeal(null);
          setActiveMapping(null);
          setSelectedCaAccountId(null);
      } catch (err: any) {
          alert(`Erro ao criar Venda: ${err.message}\n\nO negócio NÃO foi movido.`);
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

  const isLastStage = (pipelineName: string, stageId: string): boolean => {
      const pipeline = pipelines.find(p => p.name === pipelineName);
      if (!pipeline || !pipeline.stages?.length) return false;
      return pipeline.stages[pipeline.stages.length - 1].id === stageId;
  };

  const executePendingMove = async (moveInfo: { dealId: string; pipeline: string; targetStage: string; previousStage: string }) => {
      const now = new Date();
      setDeals(prev => prev.map(d => d.id === moveInfo.dealId ? { ...d, pipeline: moveInfo.pipeline, stage: moveInfo.targetStage, closedAt: now } : d));
      try {
          const updates: any = { pipeline: moveInfo.pipeline, stage: moveInfo.targetStage, closed_at: now.toISOString() };
          const { data, error = null } = await appBackend.client.from('crm_deals').update(updates).eq('id', moveInfo.dealId).select().single();
          if (error) throw error;
          if (data) {
              dispatchNegotiationWebhook(data);
              triggerDigitalSupportTicket(data);
              triggerWhatsAppAutomation(data);
              appBackend.executeMarketingCrmAutomations('deal_stage_changed', data);
              if (data.stage === 'closed' || isLastStage(data.pipeline, data.stage)) {
                  appBackend.executeMarketingCrmAutomations('deal_won', data);
              }
          }
          const deal = deals.find(d => d.id === moveInfo.dealId);
          await appBackend.logActivity({ action: 'update', module: 'crm', details: `Moveu negócio "${deal?.title || ''}" para a etapa final após venda confirmada no Conta Azul`, recordId: moveInfo.dealId });
      } catch (e) { handleDbError(e); fetchData(); }
  };

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

    if (isLastStage(pipelineName, newStage)) {
        setPendingCloseMove({ dealId, pipeline: pipelineName, targetStage: newStage, previousStage: currentStage });
        triggerContaAzulReceivable({ ...deal, stage: newStage, deal_number: deal.dealNumber, company_name: deal.companyName, contact_name: deal.contactName, product_name: deal.productName, product_type: deal.productType, payment_method: deal.paymentMethod, first_due_date: deal.firstDueDate, billing_cnpj: deal.billingCnpj, class_mod_1: deal.classMod1, entry_value: deal.entryValue, receipt_link: deal.receiptLink, transaction_code: deal.transactionCode, observation: deal.observation, email: deal.email, phone: deal.phone, address: deal.address, address_number: deal.addressNumber, neighborhood: deal.neighborhood, address_city: deal.addressCity, address_state: deal.addressState, zip_code: deal.zipCode, owner: deal.owner });
        return;
    }

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
            appBackend.executeMarketingCrmAutomations('deal_stage_changed', data);
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

    if (isLastStage(pipelineName, targetStage)) {
        setPendingCloseMove({ dealId: draggedDealId, pipeline: pipelineName, targetStage, previousStage: currentDeal.stage });
        triggerContaAzulReceivable({ ...currentDeal, stage: targetStage, deal_number: currentDeal.dealNumber, company_name: currentDeal.companyName, contact_name: currentDeal.contactName, product_name: currentDeal.productName, product_type: currentDeal.productType, payment_method: currentDeal.paymentMethod, first_due_date: currentDeal.firstDueDate, billing_cnpj: currentDeal.billingCnpj, class_mod_1: currentDeal.classMod1, entry_value: currentDeal.entryValue, receipt_link: currentDeal.receiptLink, transaction_code: currentDeal.transactionCode, observation: currentDeal.observation, email: currentDeal.email, phone: currentDeal.phone, address: currentDeal.address, address_number: currentDeal.addressNumber, neighborhood: currentDeal.neighborhood, address_city: currentDeal.addressCity, address_state: currentDeal.addressState, zip_code: currentDeal.zipCode, owner: currentDeal.owner });
        setDraggedDealId(null);
        return;
    }

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
            appBackend.executeMarketingCrmAutomations('deal_stage_changed', data);
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

  const fetchAlunoByCpf = async (rawCpf: string) => {
      const digits = rawCpf.replace(/\D/g, '');
      if (digits.length < 11) { setAlunoFound(null); return; }
      setIsFetchingAluno(true);
      try {
          const { data: aluno } = await appBackend.client
              .from('crm_alunos')
              .select('*')
              .eq('cpf', digits)
              .maybeSingle();
          if (!aluno) { setAlunoFound(null); return; }
          setAlunoFound({ id: aluno.id, full_name: aluno.full_name });

          const { data: emails } = await appBackend.client
              .from('crm_aluno_emails')
              .select('email, is_primary')
              .eq('aluno_id', aluno.id)
              .order('is_primary', { ascending: false });

          const primaryEmail = emails?.find(e => e.is_primary)?.email || emails?.[0]?.email || '';

          setDealFormData(prev => ({
              ...prev,
              companyName: prev.companyName || aluno.full_name || '',
              phone: prev.phone || aluno.phone || '',
              email: prev.email || primaryEmail,
              zipCode: prev.zipCode || aluno.zip_code || '',
              address: prev.address || aluno.address || '',
              addressNumber: prev.addressNumber || aluno.address_number || '',
              neighborhood: prev.neighborhood || aluno.neighborhood || '',
              addressCity: prev.addressCity || aluno.city || '',
              addressState: prev.addressState || aluno.state || '',
          }));
      } catch (err) {
          console.error('Erro ao buscar aluno por CPF:', err);
          setAlunoFound(null);
      } finally {
          setIsFetchingAluno(false);
      }
  };

  const upsertAlunoCadastro = async (cpf: string, dealData: any) => {
      const digits = cpf?.replace(/\D/g, '') || '';
      if (digits.length < 11) return;
      try {
          const { data: existing } = await appBackend.client
              .from('crm_alunos')
              .select('id')
              .eq('cpf', digits)
              .maybeSingle();

          const alunoPayload = {
              cpf: digits,
              full_name: dealData.company_name || dealData.contact_name || '',
              phone: dealData.phone || '',
              zip_code: dealData.zip_code || '',
              address: dealData.address || '',
              address_number: dealData.address_number || '',
              neighborhood: dealData.neighborhood || '',
              city: dealData.address_city || '',
              state: dealData.address_state || '',
          };

          let alunoId: string;
          if (existing) {
              await appBackend.client.from('crm_alunos').update(alunoPayload).eq('id', existing.id);
              alunoId = existing.id;
          } else {
              const { data: created } = await appBackend.client.from('crm_alunos').insert([alunoPayload]).select('id').single();
              alunoId = created?.id;
          }

          if (alunoId && dealData.email && dealData.email.trim()) {
              const emailLower = dealData.email.trim().toLowerCase();
              const { data: existingEmails } = await appBackend.client
                  .from('crm_aluno_emails')
                  .select('id')
                  .eq('aluno_id', alunoId);

              const hasNone = !existingEmails || existingEmails.length === 0;
              await appBackend.client.from('crm_aluno_emails')
                  .upsert({ aluno_id: alunoId, email: emailLower, is_primary: hasNone }, { onConflict: 'aluno_id,email' });
          }
      } catch (err) {
          console.error('Erro ao atualizar cadastro do aluno:', err);
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
              const originalDeal = [...deals, ...archivedDeals].find(d => d.id === editingDealId);
              const { data, error = null } = await appBackend.client.from('crm_deals').update(payload).eq('id', editingDealId).select().single();
              if (error) throw error;
              
              if (data) {
                  dispatchNegotiationWebhook(data);
                  triggerDigitalSupportTicket(data);
                  triggerWhatsAppAutomation(data);
                  if (originalDeal && originalDeal.stage !== data.stage) {
                      appBackend.executeMarketingCrmAutomations('deal_stage_changed', data);
                  }
              }

              const oldClassMod1 = (originalDeal?.classMod1 || '').trim();
              const newClassMod1 = (dealFormData.classMod1 || '').trim();
              const saleId = originalDeal?.contaAzulSaleId;
              if (saleId && newClassMod1 && oldClassMod1 !== newClassMod1) {
                  try {
                      const dealCnpj = (dealFormData.billingCnpj || '').replace(/\D/g, '');
                      const matchedAccount = caAccounts.find(a => a.cnpj?.replace(/\D/g, '') === dealCnpj && dealCnpj.length > 0);
                      if (matchedAccount?.id) {
                          console.log(`[CA] Centro de Custo alterado: "${oldClassMod1}" -> "${newClassMod1}", atualizando venda ${saleId}...`);
                          const result = await contaAzulService.updateSaleCostCenter(saleId, newClassMod1, matchedAccount.id);
                          if (result?.success) {
                              console.log('[CA] Centro de Custo atualizado com sucesso no Conta Azul');
                          } else {
                              console.warn('[CA] Falha ao atualizar Centro de Custo:', result?.error);
                              alert(`Negócio salvo, mas houve um erro ao atualizar o Centro de Custo no Conta Azul: ${result?.error || 'Erro desconhecido'}`);
                          }
                      }
                  } catch (caErr: any) {
                      console.error('[CA] Erro ao atualizar Centro de Custo:', caErr.message);
                      alert(`Negócio salvo, mas houve um erro ao atualizar o Centro de Custo no Conta Azul: ${caErr.message}`);
                  }
              }
          } else {
              const dealNumber = generateDealNumber();
              const { data, error = null } = await appBackend.client.from('crm_deals').insert([{ ...payload, deal_number: dealNumber }]).select().single();
              if (error) throw error;
              
              if (data) {
                  dispatchNegotiationWebhook(data);
                  triggerDigitalSupportTicket(data);
                  triggerWhatsAppAutomation(data);
                  appBackend.executeMarketingCrmAutomations('deal_created', data);
              }
          }
          upsertAlunoCadastro(payload.cpf || '', payload);
          await fetchData(); setShowDealModal(false); setAlunoFound(null);
      } catch (e: any) { handleDbError(e); }
  };

  const handleArchiveDeal = async () => {
      if (editingDealId && window.confirm("Arquivar esta negociação? Ela poderá ser restaurada na aba Arquivados.")) {
          try {
            await appBackend.client.from('crm_deals').update({ archived_at: new Date().toISOString() }).eq('id', editingDealId);
            await fetchData(); setShowDealModal(false);
          } catch(e: any) { alert(`Erro ao arquivar: ${e.message}`); }
      }
  };

  const handleUnarchiveDeal = async (dealId: string) => {
      try {
          await appBackend.client.from('crm_deals').update({ archived_at: null }).eq('id', dealId);
          await fetchData();
      } catch(e: any) { alert(`Erro ao desarquivar: ${e.message}`); }
  };

  const handlePermanentDeleteDeal = async (dealId: string) => {
      if (window.confirm("Excluir permanentemente esta negociação? Esta ação NÃO pode ser desfeita.")) {
          try {
              await appBackend.client.from('crm_deals').delete().eq('id', dealId);
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
                <button onClick={() => setActiveView('archived')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all relative", activeView === 'archived' ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    <Archive size={16} /> Arquivados
                    {archivedDeals.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{archivedDeals.length}</span>}
                </button>
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={18} className={clsx(isLoading && "animate-spin")} /></button>
        </div>
        
        <div className="flex items-center gap-3 flex-1 justify-end">
            {activeView === 'pipeline' || activeView === 'tasks' ? (
                <>
                    {activeView === 'pipeline' && (
                        <button onClick={() => setCompactMode(!compactMode)} className={clsx("p-1.5 rounded-lg border transition-all hidden md:flex items-center gap-1 text-xs font-medium", compactMode ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700")} title={compactMode ? "Modo normal" : "Modo compacto"}>
                            {compactMode ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                            <span className="hidden lg:inline">{compactMode ? "Normal" : "Compacto"}</span>
                        </button>
                    )}
                    <div className="relative max-w-xs w-full hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Buscar oportunidade ou Nº..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm outline-none"/>
                    </div>
                    <button onClick={openNewDealModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Negócio</button>
                </>
            ) : activeView === 'archived' ? (
                <div className="relative max-w-xs w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar nos arquivados..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-300 border rounded-full text-sm outline-none"/>
                </div>
            ) : activeView === 'teams' ? (
                <button onClick={openNewTeamModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Nova Equipe</button>
            ) : (
                <button onClick={openNewPipelineModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"><Plus size={18} /> Novo Funil</button>
            )}
        </div>
      </div>

      {activeView === 'pipeline' && pipelines.length > 1 && (
        <div className="bg-white border-b border-slate-200 px-6 py-1.5 flex items-center gap-2 shrink-0 overflow-x-auto custom-scrollbar">
            <Layers size={14} className="text-slate-400 flex-shrink-0" />
            <button onClick={() => setActivePipelineTab('all')} className={clsx("px-3 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap", activePipelineTab === 'all' ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100")}>Todos</button>
            {pipelines.map(p => (
                <button key={p.id} onClick={() => setActivePipelineTab(p.id)} className={clsx("px-3 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap", activePipelineTab === p.id ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100")}>
                    {p.name} <span className="text-[10px] opacity-60 ml-1">({filteredDeals.filter(d => d.pipeline === p.name).length})</span>
                </button>
            ))}
        </div>
      )}

      <div className="flex-1 overflow-x-auto bg-slate-100/50 p-4 relative custom-scrollbar">
        {isLoading && deals.length === 0 && pipelines.length === 0 ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
        <>
            {activeView === 'pipeline' && (
                <div className="flex flex-col gap-6 min-w-max">
                {pipelines.length === 0 && !isLoading && (
                    <div className="text-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200 w-full max-w-3xl mx-auto">
                        <Filter size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Nenhum Funil Cadastrado</p>
                        <p className="text-sm">Vá em "Configurar Funis" para criar seu primeiro processo de vendas.</p>
                    </div>
                )}
                {pipelines.filter(p => activePipelineTab === 'all' || p.id === activePipelineTab).map(pipeline => (
                    <div key={pipeline.id} className="space-y-2">
                        {activePipelineTab === 'all' && <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Filter size={16} className="text-indigo-600" /> {pipeline.name}
                            </h2>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{filteredDeals.filter(d => d.pipeline === pipeline.name).length} Negócios</span>
                        </div>}
                        <div className={clsx("flex h-full", compactMode ? "gap-2" : "gap-3")}>
                        {(pipeline.stages || []).map(stage => {
                            const summary = getStageSummary(pipeline.name, stage.id);
                            const columnDeals = filteredDeals.filter(d => d.pipeline === pipeline.name && d.stage === stage.id);
                            return (
                                <div key={stage.id} className={clsx("flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200 shadow-sm", compactMode ? "w-[220px]" : "w-[270px]")} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, pipeline.name, stage.id)}>
                                    <div className={clsx("border-t-4 bg-white rounded-t-xl border-b border-b-slate-100", compactMode ? "px-2 py-1.5" : "p-2.5", stage.color || "border-slate-200")}>
                                        <div className="flex justify-between items-center">
                                            <h3 className={clsx("font-semibold text-slate-700", compactMode ? "text-xs" : "text-sm")}>{stage.title}</h3>
                                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={14} /></button>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className={clsx("text-slate-500 font-medium", compactMode ? "text-[10px]" : "text-xs")}>{summary.count} negócios</span>
                                            <span className={clsx("font-bold text-slate-800", compactMode ? "text-[10px]" : "text-xs")}>{formatCurrency(summary.total)}</span>
                                        </div>
                                    </div>
                                    <div className={clsx("flex-1 overflow-y-auto custom-scrollbar", compactMode ? "p-1 space-y-1 min-h-[80px]" : "p-1.5 space-y-2 min-h-[100px]")}>
                                    {columnDeals.length === 0 ? (
                                        <div className={clsx("border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs", compactMode ? "h-14" : "h-20")}>Arraste aqui</div>
                                    ) : (
                                        columnDeals.map(deal => {
                                            const taskStatus = getDealTaskStatus(deal);
                                            if (compactMode) {
                                                return (
                                                    <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white px-2 py-1.5 rounded border border-slate-200 hover:shadow-sm relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400" : "")}>
                                                        <div className={clsx("absolute left-0 top-1 bottom-1 w-0.5 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                                                        <div className="pl-2 flex items-center justify-between gap-1">
                                                            <span className="text-xs font-semibold text-slate-800 truncate flex-1">{deal.title}</span>
                                                            <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">{formatCurrency(deal.value)}</span>
                                                            {taskStatus && <div className={clsx("flex-shrink-0", taskStatus.color)}><Clock size={8} /></div>}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={deal.id} draggable onDragStart={(e) => handleDragStart(e, deal.id)} onClick={() => openEditDealModal(deal)} className={clsx("group bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:shadow-md relative cursor-grab active:cursor-grabbing", draggedDealId === deal.id ? "opacity-40 ring-2 ring-indigo-400" : "")}>
                                                    <div className={clsx("absolute left-0 top-2 bottom-2 w-1 rounded-r", deal.status === 'hot' ? 'bg-red-400' : deal.status === 'warm' ? 'bg-yellow-400' : 'bg-blue-300')}></div>
                                                    <div className="pl-2.5">
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <div className="min-w-0 flex-1">
                                                                {deal.dealNumber && <span className="text-[9px] text-slate-400 font-mono block">#{deal.dealNumber}</span>}
                                                                <h4 className="font-bold text-slate-800 text-xs line-clamp-1 leading-tight">{deal.title}</h4>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-shrink-0">
                                                                <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'prev')}} className="p-0.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={12} className="rotate-180" /></button>
                                                                <button onClick={(e) => {e.stopPropagation(); moveDeal(deal.id, deal.stage, pipeline.name, 'next')}} className="p-0.5 hover:bg-green-50 rounded text-green-600"><ChevronRight size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mb-1 truncate">{deal.companyName}</p>
                                                        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold text-slate-700 text-xs">{formatCurrency(deal.value)}</span>
                                                                {taskStatus && (
                                                                    <div className={clsx("flex items-center gap-0.5 ml-0.5", taskStatus.color)} title={`Tarefa ${taskStatus.label}`}>
                                                                        <Clock size={8} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {deal.contaAzulSaleNumberService && <span className="text-[7px] bg-green-100 text-green-700 px-0.5 rounded font-bold" title={`CA Serviço: ${deal.contaAzulSaleNumberService}${deal.contaAzulSaleNumberProduct ? ' | Produto: ' + deal.contaAzulSaleNumberProduct : ''}`}>CA</span>}
                                                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold border border-white shadow-sm" title={`Responsável: ${getOwnerName(deal.owner)}`}>
                                                                    {(getOwnerName(deal.owner) || '?').charAt(0)}
                                                                </div>
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

            {activeView === 'archived' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Archive size={22} className="text-amber-600" /> Negociações Arquivadas</h2>
                        <p className="text-sm text-slate-500">Negociações removidas do pipeline. Você pode visualizar, editar ou restaurá-las.</p>
                    </div>
                    {archivedDeals.filter(d =>
                        !searchTerm || (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (d.dealNumber && d.dealNumber.toString().includes(searchTerm))
                    ).length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <Archive size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold">{archivedDeals.length === 0 ? 'Nenhuma negociação arquivada' : 'Nenhum resultado encontrado'}</p>
                            <p className="text-sm">Negociações arquivadas aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nº</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                                        <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Arquivado em</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {archivedDeals.filter(d =>
                                        !searchTerm || (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (d.dealNumber && d.dealNumber.toString().includes(searchTerm))
                                    ).map(deal => (
                                        <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">#{deal.dealNumber || '—'}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-800 truncate max-w-[200px]">{deal.companyName || deal.title}</p>
                                                <p className="text-[10px] text-slate-400">{deal.email || deal.phone || ''}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{deal.productName || '—'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">R$ {(deal.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-slate-600 text-xs">{deal.pipeline || '—'}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{deal.archivedAt ? deal.archivedAt.toLocaleDateString('pt-BR') : '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => openEditDealModal(deal)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Visualizar / Editar"><Edit2 size={15} /></button>
                                                    <button onClick={() => handleUnarchiveDeal(deal.id)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Desarquivar"><ArchiveRestore size={15} /></button>
                                                    <button onClick={() => handlePermanentDeleteDeal(deal.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir permanentemente"><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                      <div>
                          <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                              <DollarSign size={20} className="text-green-600" />
                              Lançar Venda no Conta Azul
                          </h3>
                          {selectedCaAccountId && (() => {
                              const acc = caAccounts.find(a => a.id === selectedCaAccountId);
                              return acc ? (
                                  <span className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                                      <Building size={12} /> {acc.nome} {acc.cnpj ? `(${acc.cnpj})` : ''}
                                  </span>
                              ) : null;
                          })()}
                      </div>
                      <button onClick={() => { setContaAzulConfirmDeal(null); setActiveMapping(null); setPendingCloseMove(null); setSelectedCaAccountId(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"><X size={20}/></button>
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

                      {/* DIVISÃO AUTOMÁTICA (se mapping dividido) */}
                      {activeMapping?.splitMode === 'divided' && (() => {
                          const total = contaAzulFormData.valor || 0;
                          const svcPct = activeMapping.servicePercentage || 0;
                          const prodPct = activeMapping.productPercentage || 0;
                          const svcVal = Math.round(total * (svcPct / 100) * 100) / 100;
                          const prodVal = Math.round(total * (prodPct / 100) * 100) / 100;
                          const svcName = activeMapping.contaAzulServiceName || 'Serviço';
                          const prodName = activeMapping.contaAzulProductName || 'Material Didático';
                          const svcResolved = activeMapping._resolvedServiceId;
                          const prodResolved = activeMapping._resolvedProductId;
                          const svcMatch = svcResolved ? contaAzulProducts.find(p => p.id === svcResolved) : null;
                          const prodMatch = prodResolved ? contaAzulProducts.find(p => p.id === prodResolved) : null;
                          return (
                          <div className="border-2 border-amber-300 rounded-xl p-4 space-y-3 bg-amber-50/60">
                              <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <AlertTriangle size={14}/> Lançamento Dividido — 2 itens serão criados
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="bg-white rounded-xl p-3 border border-blue-200">
                                      <span className="block text-[10px] font-black text-blue-600 uppercase mb-1">Serviço ({svcPct}%)</span>
                                      <span className="block text-sm font-bold text-slate-800 mb-1">{svcName}</span>
                                      <span className="block text-lg font-black text-blue-700">R$ {svcVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      {svcMatch
                                          ? <span className="block text-[10px] text-green-600 font-bold mt-1">Vinculado: {svcMatch.nome}</span>
                                          : <span className="block text-[10px] text-red-600 font-bold mt-1">Não encontrado no Conta Azul</span>
                                      }
                                  </div>
                                  <div className="bg-white rounded-xl p-3 border border-purple-200">
                                      <span className="block text-[10px] font-black text-purple-600 uppercase mb-1">Produto ({prodPct}%)</span>
                                      <span className="block text-sm font-bold text-slate-800 mb-1">{prodName}</span>
                                      <span className="block text-lg font-black text-purple-700">R$ {prodVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      {prodMatch
                                          ? <span className="block text-[10px] text-green-600 font-bold mt-1">Vinculado: {prodMatch.nome}</span>
                                          : <span className="block text-[10px] text-red-600 font-bold mt-1">Não encontrado no Conta Azul</span>
                                      }
                                  </div>
                              </div>
                              <p className="text-[10px] text-amber-700 font-medium">Valor total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ {svcVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (serviço) + R$ {prodVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (produto)</p>
                          </div>
                          );
                      })()}

                      {/* DADOS PARA O CONTA AZUL */}
                      <div className="border border-green-200 rounded-xl p-4 space-y-3 bg-green-50/30">
                          <h4 className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={14}/> Dados da Venda — Conta Azul</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {activeMapping?.splitMode !== 'divided' && (
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
                              )}

                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                  <input type="text" value={contaAzulFormData.descricao} onChange={e => setContaAzulFormData(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (R$) *</label>
                                  <input type="number" step="0.01" value={contaAzulFormData.valor || ''} onChange={e => setContaAzulFormData(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Entrada (R$)</label>
                                  <input type="number" step="0.01" min={0} value={contaAzulFormData.valor_entrada || ''} onChange={e => setContaAzulFormData(f => ({ ...f, valor_entrada: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                                  <input type="number" min={1} value={contaAzulFormData.parcelas} onChange={e => setContaAzulFormData(f => ({ ...f, parcelas: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none" />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor da Parcela</label>
                                  <div className="w-full px-4 py-2.5 border border-slate-100 rounded-xl text-sm font-bold bg-slate-50 text-slate-700">
                                      R$ {(() => {
                                          const rest = Math.max((contaAzulFormData.valor || 0) - (contaAzulFormData.valor_entrada || 0), 0);
                                          const pp = contaAzulFormData.parcelas > 0 ? rest / contaAzulFormData.parcelas : 0;
                                          return pp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      })()}
                                  </div>
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
                      <button onClick={() => { setContaAzulConfirmDeal(null); setActiveMapping(null); setPendingCloseMove(null); }} className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">
                          Cancelar
                      </button>
                      <button onClick={handleConfirmContaAzulReceivable} disabled={isCreatingReceivable} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all disabled:opacity-50">
                          {isCreatingReceivable ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          {activeMapping?.splitMode === 'divided' ? 'Confirmar e Lançar (2 itens)' : 'Confirmar e Lançar'}
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
                            {(collaborators || []).filter(c => c.department === 'Comercial').map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
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
                        <div className="relative">
                            <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm pr-8" value={dealFormData.cpf} onChange={e => {
                                const formatted = formatCPF(e.target.value);
                                setDealFormData({...dealFormData, cpf: formatted});
                                const digits = formatted.replace(/\D/g, '');
                                if (digits.length === 11) fetchAlunoByCpf(formatted);
                                else setAlunoFound(null);
                            }} maxLength={14} />
                            {isFetchingAluno && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />}
                        </div>
                        {dealFormData.cpf && dealFormData.cpf.replace(/\D/g, '').length === 11 && !isFetchingAluno && (
                            <div className={clsx("mt-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1", alunoFound ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                {alunoFound ? <><CheckCircle size={12}/> Aluno encontrado: {alunoFound.full_name}</> : <><User size={12}/> Novo aluno — será cadastrado automaticamente</>}
                            </div>
                        )}
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

                    {/* CONFIGURAÇÃO CONTA AZUL DO PRODUTO (auto-preenchida) */}
                    {dealProductMapping && (
                        <div className="lg:col-span-3 rounded-xl border-2 border-green-300 bg-green-50/50 p-4 space-y-3 animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign size={12}/> Configuração Conta Azul — {dealProductMapping.itemName}
                                </h4>
                                <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                                    dealProductMapping.splitMode === 'divided' ? "bg-amber-100 text-amber-700" :
                                    dealProductMapping.splitMode === 'all_product' ? "bg-purple-100 text-purple-700" :
                                    "bg-blue-100 text-blue-700"
                                )}>
                                    {dealProductMapping.splitMode === 'divided' ? 'Dividido' : dealProductMapping.splitMode === 'all_product' ? 'Tudo Produto' : 'Tudo Serviço'}
                                </span>
                            </div>

                            {dealProductMapping.splitMode === 'divided' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                                        <span className="block text-[9px] font-black text-blue-600 uppercase">Serviço ({dealProductMapping.servicePercentage}%)</span>
                                        <span className="block text-xs font-bold text-slate-800 mt-0.5">{dealProductMapping.contaAzulServiceName || '—'}</span>
                                        {dealFormData.value ? (
                                            <span className="block text-sm font-black text-blue-700 mt-1">R$ {(Math.round((dealFormData.value || 0) * (dealProductMapping.servicePercentage / 100) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        ) : null}
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                                        <span className="block text-[9px] font-black text-purple-600 uppercase">Produto ({dealProductMapping.productPercentage}%)</span>
                                        <span className="block text-xs font-bold text-slate-800 mt-0.5">{dealProductMapping.contaAzulProductName || '—'}</span>
                                        {dealFormData.value ? (
                                            <span className="block text-sm font-black text-purple-700 mt-1">R$ {(Math.round((dealFormData.value || 0) * (dealProductMapping.productPercentage / 100) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <span className="block text-[9px] font-black text-slate-500 uppercase">
                                        {dealProductMapping.splitMode === 'all_product' ? 'Produto' : 'Serviço'} no Conta Azul
                                    </span>
                                    <span className="block text-xs font-bold text-slate-800 mt-0.5">
                                        {(dealProductMapping.splitMode === 'all_product' ? dealProductMapping.contaAzulProductName : dealProductMapping.contaAzulServiceName) || '—'}
                                    </span>
                                </div>
                            )}

                            {dealProductMapping.billingCompanyName && (
                                <p className="text-[10px] text-green-700 font-medium">
                                    Faturamento: {dealProductMapping.billingCompanyName} — CNPJ: {dealProductMapping.billingCnpj}
                                </p>
                            )}
                        </div>
                    )}

                    {(dealFormData.contaAzulSaleNumberService || dealFormData.contaAzulSaleNumberProduct) && (
                        <div className="lg:col-span-3 rounded-xl border-2 border-indigo-300 bg-indigo-50/50 p-4">
                            <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <DollarSign size={12}/> Vendas Registradas no Conta Azul
                            </h4>
                            <div className="flex flex-wrap gap-4">
                                {dealFormData.contaAzulSaleNumberService && (
                                    <div className="bg-white rounded-lg px-4 py-2 border border-indigo-200">
                                        <span className="block text-[9px] font-black text-blue-600 uppercase">Serviço</span>
                                        <span className="block text-sm font-black text-indigo-800">Venda nº {dealFormData.contaAzulSaleNumberService}</span>
                                    </div>
                                )}
                                {dealFormData.contaAzulSaleNumberProduct && (
                                    <div className="bg-white rounded-lg px-4 py-2 border border-indigo-200">
                                        <span className="block text-[9px] font-black text-purple-600 uppercase">Produto</span>
                                        <span className="block text-sm font-black text-indigo-800">Venda nº {dealFormData.contaAzulSaleNumberProduct}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Forma Pagamento</label>
                                <select className="w-full px-3 py-1.5 border rounded text-xs bg-white" value={dealFormData.paymentMethod} onChange={e => setDealFormData({...dealFormData, paymentMethod: e.target.value})}>
                                    {PAYMENT_METHODS.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Entrada</label>
                                <input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={`R$ ${(dealFormData.entryValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} onChange={e => { const { numeric } = formatCurrencyInput(e.target.value); setDealFormData({...dealFormData, entryValue: numeric}); }} />
                            </div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Nº Parcelas</label><input type="number" min={1} className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.installments} onChange={e => setDealFormData({...dealFormData, installments: parseInt(e.target.value) || 1})} /></div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor Parcela</label>
                                <input type="text" readOnly className="w-full px-3 py-1.5 border rounded text-xs bg-slate-50 text-slate-600 cursor-default" value={`R$ ${(dealFormData.installmentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">1º Vencimento</label>
                                <div className="flex gap-1.5">
                                    <input type="date" className="flex-1 px-3 py-1.5 border rounded text-xs" value={dealFormData.firstDueDate} onChange={e => setDealFormData({...dealFormData, firstDueDate: e.target.value})} />
                                    <button type="button" className="px-2 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[9px] font-bold hover:bg-blue-100 transition-colors whitespace-nowrap" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 30); setDealFormData({...dealFormData, firstDueDate: d.toISOString().split('T')[0]}); }}>30d</button>
                                </div>
                            </div>
                            <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Link do Comprovante</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.receiptLink} onChange={e => setDealFormData({...dealFormData, receiptLink: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Cód. Transação</label><input type="text" className="w-full px-3 py-1.5 border rounded text-xs" value={dealFormData.transactionCode} onChange={e => setDealFormData({...dealFormData, transactionCode: e.target.value})} /></div>
                            <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 mb-1">Observações</label><textarea className="w-full px-3 py-1.5 border rounded text-xs h-16 resize-none" placeholder="Anotações gerais sobre o negócio..." value={dealFormData.observation || ''} onChange={e => setDealFormData({...dealFormData, observation: e.target.value})} /></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 rounded-b-xl">
                <div className="flex items-center gap-2">
                    {editingDealId && (() => {
                        const currentDeal = [...deals, ...archivedDeals].find(d => d.id === editingDealId);
                        const isArchived = !!currentDeal?.archivedAt;
                        return isArchived ? (
                            <>
                                <button onClick={() => { handleUnarchiveDeal(editingDealId); setShowDealModal(false); }} className="text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"><ArchiveRestore size={16}/> Desarquivar</button>
                                <button onClick={() => handlePermanentDeleteDeal(editingDealId)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"><Trash2 size={16}/> Excluir Permanente</button>
                            </>
                        ) : (
                            <button onClick={handleArchiveDeal} className="text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"><Archive size={16}/> Arquivar Negociação</button>
                        );
                    })()}
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
