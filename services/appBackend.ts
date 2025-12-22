
import { createClient, Session } from '@supabase/supabase-js';
import { SavedPreset, FormModel, FormAnswer, Contract, ContractFolder, CertificateModel, StudentCertificate, EventModel, Workshop, EventRegistration, EventBlock, Role, Banner, PartnerStudio, InstructorLevel, InventoryRecord, SyncJob, ActivityLog, CollaboratorSession } from '../types';

const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const isConfigured = !!APP_URL && !!APP_KEY;

const supabase = createClient(
  APP_URL || 'https://placeholder.supabase.co', 
  APP_KEY || 'placeholder'
);

const TABLE_NAME = 'app_presets';

export interface Pipeline {
    id: string;
    name: string;
    is_default: boolean;
    created_at?: string;
}

export interface PipelineStage {
    id: string;
    pipeline_id: string;
    name: string;
    key: string;
    color: string;
    sort_order: number;
    created_at?: string;
}

const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'local-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'local@admin.com',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
};

export interface CompanySetting {
    id: string;
    legalName: string;
    cnpj: string;
    productTypes: string[]; 
}

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

export const appBackend = {
  isLocalMode: !isConfigured,
  client: supabase,

  auth: {
    signIn: async (email: string, password: string) => {
      if (!isConfigured) {
        return { data: { user: MOCK_SESSION.user, session: MOCK_SESSION }, error: null };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => {
      if (!isConfigured) {
        window.location.reload(); 
        return;
      }
      await supabase.auth.signOut();
    },
    getSession: async () => {
      if (!isConfigured) return MOCK_SESSION as unknown as Session;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    onAuthStateChange: (callback: (session: Session | null) => void) => {
      if (!isConfigured) {
          callback(MOCK_SESSION as unknown as Session);
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return supabase.auth.onAuthStateChange((_event, session) => callback(session));
    }
  },

  // --- ACTIVITY LOGS ---
  logActivity: async (log: Omit<ActivityLog, 'id' | 'createdAt' | 'userName'>): Promise<void> => {
      if (!isConfigured) return;
      
      let userName = 'Sistema';
      
      const savedCollab = sessionStorage.getItem('collaborator_session');
      if (savedCollab) {
          const collab = JSON.parse(savedCollab) as CollaboratorSession;
          userName = collab.name;
      } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) userName = user.email || 'Admin';
      }

      await supabase.from('crm_activity_logs').insert([{
          user_name: userName,
          action: log.action,
          module: log.module,
          details: log.details,
          record_id: log.recordId
      }]);
  },

  getActivityLogs: async (limit = 100): Promise<ActivityLog[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase
          .from('crm_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
      
      if (error) throw error;
      return (data || []).map(d => ({
          id: d.id,
          userName: d.user_name,
          action: d.action as any,
          module: d.module,
          details: d.details,
          recordId: d.record_id,
          createdAt: d.created_at
      }));
  },

  // --- CRM PIPELINES & STAGES ---
  getPipelines: async (): Promise<Pipeline[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_pipelines').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
  },

  getPipelineStages: async (pipelineId: string): Promise<PipelineStage[]> => {
      if (!isConfigured || !pipelineId) return [];
      const { data, error } = await supabase.from('crm_pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
  },

  getAllPipelineStages: async (): Promise<PipelineStage[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_pipeline_stages').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
  },

  savePipeline: async (pipeline: Partial<Pipeline>, stages: Partial<PipelineStage>[]): Promise<Pipeline> => {
      if (!isConfigured) throw new Error("Backend not configured");
      
      // 1. Salvar Pipeline
      const pipelinePayload: any = {
          name: pipeline.name,
          is_default: !!pipeline.is_default
      };
      if (pipeline.id && pipeline.id.trim() !== '') {
          pipelinePayload.id = pipeline.id;
      }

      const { data: savedPipeline, error: pError } = await supabase.from('crm_pipelines').upsert(pipelinePayload).select().single();
      
      if (pError) throw pError;

      // 2. Salvar Etapas
      const formattedStages = stages.map((s, idx) => {
          const stagePayload: any = {
              pipeline_id: savedPipeline.id,
              name: s.name,
              key: s.key || s.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '_'),
              color: s.color || '#cbd5e1',
              sort_order: idx
          };
          if (s.id && s.id.trim() !== '') {
              stagePayload.id = s.id;
          }
          return stagePayload;
      });

      // Se for edição, remove estágios que não estão mais na lista
      if (pipeline.id) {
          const presentIds = formattedStages.filter(s => s.id).map(s => s.id);
          if (presentIds.length > 0) {
              await supabase.from('crm_pipeline_stages').delete().eq('pipeline_id', pipeline.id).not('id', 'in', `(${presentIds.join(',')})`);
          } else {
              await supabase.from('crm_pipeline_stages').delete().eq('pipeline_id', pipeline.id);
          }
      }

      const { error: sError } = await supabase.from('crm_pipeline_stages').upsert(formattedStages);
      if (sError) throw sError;

      return savedPipeline;
  },

  deletePipeline: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
      if (error) throw error;
  },

  // --- SYNC JOBS ---
  getSyncJobs: async (): Promise<SyncJob[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_sync_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sheetUrl: row.sheet_url,
      config: row.config,
      lastSync: row.last_sync,
      status: row.status,
      lastMessage: row.last_message,
      active: row.active,
      intervalMinutes: row.interval_minutes,
      createdBy: row.created_by_name,
      createdAt: row.created_at
    }));
  },

  saveSyncJob: async (job: SyncJob): Promise<void> => {
    if (!isConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      id: job.id,
      user_id: user?.id,
      name: job.name,
      sheet_url: job.sheetUrl,
      config: job.config,
      active: job.active,
      interval_minutes: job.intervalMinutes,
      last_sync: job.lastSync,
      status: job.status,
      last_message: job.lastMessage,
      created_by_name: job.createdBy,
      created_at: job.createdAt
    };
    const { error } = await supabase.from('crm_sync_jobs').upsert(payload);
    if (error) throw error;
  },

  updateJobStatus: async (jobId: string, status: string, lastSync: string | null, message: string | null): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').update({
        status,
        last_sync: lastSync,
        last_message: message
    }).eq('id', jobId);
    if (error) throw error;
  },

  deleteSyncJob: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_sync_jobs').delete().eq('id', id);
    if (error) throw error;
  },

  getPresets: async (): Promise<SavedPreset[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id, 
      name: row.name, 
      url: row.project_url, 
      key: row.api_key, 
      tableName: row.target_table_name, 
      primaryKey: row.target_primary_key || '', 
      intervalMinutes: row.interval_minutes || 5,
      createdByName: row.created_by_name || ''
    }));
  },

  savePreset: async (preset: Omit<SavedPreset, 'id'>): Promise<SavedPreset> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id, 
      name: preset.name, 
      project_url: preset.url, 
      api_key: preset.key, 
      target_table_name: preset.tableName, 
      target_primary_key: preset.primaryKey || null, 
      interval_minutes: preset.intervalMinutes || 5, 
      /* Fix: Changed preset.created_by_name to preset.createdByName to match the interface definition */
      created_by_name: preset.createdByName || null
    };
    const { data, error } = await supabase.from(TABLE_NAME).insert([payload]).select().single();
    if (error) throw error;
    return {
      id: data.id, 
      name: data.name, 
      url: data.project_url, 
      key: data.api_key, 
      tableName: data.target_table_name, 
      primaryKey: data.target_primary_key || '', 
      intervalMinutes: data.interval_minutes || 5, 
      createdByName: data.created_by_name || ''
    };
  },

  deletePreset: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
  },

  getAppSetting: async (key: string): Promise<any | null> => {
    if (!isConfigured) return null;
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    return data ? data.value : null;
  },

  saveAppSetting: async (key: string, value: any): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  getAppLogo: async (): Promise<string | null> => {
    return await appBackend.getAppSetting('app_logo_url');
  },
  
  saveAppLogo: async (url: string) => {
    await appBackend.saveAppSetting('app_logo_url', url);
  },

  getInventorySecurityMargin: async (): Promise<number> => {
    const val = await appBackend.getAppSetting('inventory_security_margin');
    return val !== null ? parseInt(val) : 5;
  },

  saveInventorySecurityMargin: async (val: number) => {
    await appBackend.saveAppSetting('inventory_security_margin', val);
  },

  getWhatsAppConfig: async (): Promise<any | null> => {
    return await appBackend.getAppSetting('whatsapp_config');
  },

  saveWhatsAppConfig: async (config: any): Promise<void> => {
    await appBackend.saveAppSetting('whatsapp_config', config);
  },

  getCompanies: async (): Promise<CompanySetting[]> => {
      if (!isConfigured) return [];
      const { data } = await supabase.from('crm_companies').select('*').order('created_at', { ascending: true });
      return (data || []).map((c: any) => ({ id: c.id, legalName: c.legal_name, cnpj: c.cnpj, productTypes: c.product_types || [] }));
  },

  saveCompany: async (company: CompanySetting): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: company.id || undefined, legal_name: company.legalName, cnpj: company.cnpj, product_types: company.productTypes };
      const { error } = await supabase.from('crm_companies').upsert(payload);
      if (error) throw error;
  },

  deleteCompany: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_companies').delete().eq('id', id);
      if (error) throw error;
  },

  getRoles: async (): Promise<Role[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_roles').select('*').order('name', { ascending: true });
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, permissions: r.permissions || {}, created_at: r.created_at }));
  },

  saveRole: async (role: Role): Promise<void> => {
    if (!isConfigured) return;
    const payload = { name: role.name, permissions: role.permissions };
    let error;
    if (role.id) {
        const result = await supabase.from('crm_roles').update(payload).eq('id', role.id);
        error = result.error;
    } else {
        const result = await supabase.from('crm_roles').insert([payload]);
        error = result.error;
    }
    if (error) throw error;
  },

  deleteRole: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_roles').delete().eq('id', id);
      if (error) throw error;
  },

  getBanners: async (audience?: 'student' | 'instructor'): Promise<Banner[]> => {
    if (!isConfigured) return [];
    let query = supabase.from('app_banners').select('*').order('created_at', { ascending: false });
    if (audience) query = query.eq('target_audience', audience);
    const { data } = await query;
    return (data || []).map((b: any) => ({ 
      id: b.id, 
      title: b.title, 
      imageUrl: b.image_url, 
      link_url: b.link_url, 
      targetAudience: b.target_audience, 
      active: b.active 
    }));
  },

  saveBanner: async (banner: Banner): Promise<void> => {
    if (!isConfigured) return;
    const payload = { title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, target_audience: banner.targetAudience, active: banner.active };
    let error;
    if (banner.id) {
        const result = await supabase.from('app_banners').update(payload).eq('id', banner.id);
        error = result.error;
    } else {
        const result = await supabase.from('app_banners').insert([payload]);
        error = result.error;
    }
    if (error) throw error;
  },

  deleteBanner: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('app_banners').delete().eq('id', id);
    if (error) throw error;
  },

  getPartnerStudios: async (): Promise<PartnerStudio[]> => {
    if (!isConfigured) return [];
    const { data } = await supabase.from('crm_partner_studios').select('*').order('fantasy_name', { ascending: true });
    return (data || []).map((d: any) => ({
      id: d.id, 
      status: d.status || 'active', 
      responsibleName: d.responsible_name, 
      cpf: d.cpf, 
      phone: d.phone, 
      email: d.email, 
      password: d.password || '', 
      secondContactName: d.second_contact_name, 
      secondContactPhone: d.second_contact_phone, 
      fantasyName: d.fantasy_name, 
      legalName: d.legal_name, 
      cnpj: d.cnpj, 
      studioPhone: d.studio_phone, 
      address: d.address, 
      city: d.city, 
      state: d.state, 
      country: d.country, 
      sizeM2: d.size_m2, 
      studentCapacity: d.student_capacity, 
      rentValue: d.rent_value, 
      methodology: d.methodology, 
      studioType: d.studio_type, 
      nameOnSite: d.name_on_site, 
      bank: d.bank, 
      agency: d.agency, 
      account: d.account, 
      beneficiary: d.beneficiary, 
      pixKey: d.pix_key, 
      hasReformer: d.has_reformer, 
      qtyReformer: d.qty_reformer, 
      hasLadderBarrel: d.has_ladder_barrel, 
      qtyLadderBarrel: d.qty_ladder_barrel, 
      hasChair: d.has_chair, 
      qtyChair: d.qty_chair, 
      hasCadillac: d.has_cadillac, 
      qtyCadillac: d.qty_cadillac, 
      hasChairsForCourse: d.has_chairs_for_course, 
      hasTv: d.has_tv, 
      maxKitsCapacity: d.max_kits_capacity, 
      attachments: d.attachments
    }));
  },

  savePartnerStudio: async (studio: PartnerStudio): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      status: studio.status, 
      responsible_name: studio.responsibleName, 
      cpf: studio.cpf, 
      phone: studio.phone, 
      email: studio.email, 
      password: studio.password, 
      second_contact_name: studio.secondContactName, 
      second_contact_phone: studio.secondContactPhone, 
      fantasy_name: studio.fantasyName, 
      legal_name: studio.legalName, 
      cnpj: studio.cnpj, 
      studio_phone: studio.studioPhone, 
      address: studio.address, 
      city: studio.city, 
      state: studio.state, 
      country: studio.country, 
      size_m2: studio.sizeM2, 
      student_capacity: studio.studentCapacity, 
      rent_value: studio.rentValue, 
      methodology: studio.methodology, 
      studio_type: studio.studioType, 
      name_on_site: studio.nameOnSite, 
      bank: studio.bank, 
      agency: studio.agency, 
      account: studio.account, 
      beneficiary: studio.beneficiary, 
      pix_key: studio.pixKey, 
      has_reformer: studio.hasReformer, 
      qty_reformer: studio.qtyReformer, 
      has_ladder_barrel: studio.hasLadderBarrel, 
      qty_ladder_barrel: studio.qtyLadderBarrel, 
      has_chair: studio.hasChair, 
      qty_chair: studio.qtyChair, 
      has_cadillac: studio.hasCadillac, 
      qty_cadillac: studio.qtyCadillac, 
      has_chairs_for_course: studio.hasChairsForCourse, 
      has_tv: studio.hasTv, 
      max_kits_capacity: studio.maxKitsCapacity, 
      attachments: studio.attachments
    };
    let error;
    if (studio.id) {
        const result = await supabase.from('crm_partner_studios').update(payload).eq('id', studio.id);
        error = result.error;
    } else {
        const result = await supabase.from('crm_partner_studios').insert([payload]);
        error = result.error;
    }
    if (error) throw error;
  },

  deletePartnerStudio: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_partner_studios').delete().eq('id', id);
    if (error) throw error;
  },

  getInstructorLevels: async (): Promise<InstructorLevel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_instructor_levels').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, honorarium: Number(d.honorarium || 0), observations: d.observations || '', createdAt: d.created_at }));
  },

  saveInstructorLevel: async (level: InstructorLevel): Promise<void> => {
    if (!isConfigured) return;
    const payload = { name: level.name, honorarium: level.honorarium, observations: level.observations };
    let error;
    if (level.id) {
        const result = await supabase.from('crm_instructor_levels').update(payload).eq('id', level.id);
        error = result.error;
    } else {
        const result = await supabase.from('crm_instructor_levels').insert([payload]);
        error = result.error;
    }
    if (error) throw error;
  },

  deleteInstructorLevel: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_instructor_levels').delete().eq('id', id);
    if (error) throw error;
  },

  saveForm: async (form: FormModel): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: form.id || undefined, title: form.title, description: form.description, campaign: form.campaign || null, is_lead_capture: form.isLeadCapture, questions: form.questions, style: form.style, team_id: form.teamId || null, distribution_mode: form.distributionMode || 'fixed', fixed_owner_id: form.fixedOwnerId || null, submissions_count: form.submissionsCount || 0 };
      const { error } = await supabase.from('crm_forms').upsert(payload);
      if (error) throw error;
  },

  getForms: async (): Promise<FormModel[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, description: d.description, campaign: d.campaign, isLeadCapture: d.is_lead_capture, teamId: d.team_id, distributionMode: d.distribution_mode, fixedOwnerId: d.fixed_owner_id, questions: d.questions || [], style: d.style || {}, createdAt: d.created_at, submissionsCount: d.submissions_count || 0 }));
  },

  getFormById: async (id: string): Promise<FormModel | null> => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('crm_forms').select('*').eq('id', id).single();
      if (error || !data) return null;
      return { id: data.id, title: data.title, description: data.description, campaign: data.campaign, isLeadCapture: data.is_lead_capture, teamId: data.team_id, distributionMode: data.distribution_mode, fixedOwnerId: data.fixed_owner_id, questions: data.questions || [], style: data.style || {}, createdAt: data.created_at, submissionsCount: data.submissions_count || 0 };
  },

  deleteForm: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_forms').delete().eq('id', id);
      if (error) throw error;
  },

  submitForm: async (formId: string, answers: FormAnswer[], isLeadCapture: boolean): Promise<void> => {
      const form = await appBackend.getFormById(formId);
      if (!form) throw new Error("Form not found");

      if (isConfigured) {
          const { error: subError } = await supabase.from('crm_form_submissions').insert([{
              form_id: formId,
              answers: answers
          }]);
          if (subError) console.error("Error saving raw submission:", subError);
      }

      if (isLeadCapture && isConfigured) {
          const dealPayload: any = {
              title: `Lead: ${form.title}`,
              status: 'warm',
              stage: 'new',
              deal_number: generateDealNumber(),
              source: form.title,
              campaign: form.campaign || '',
              created_at: new Date().toISOString()
          };

          answers.forEach(ans => {
              const question = form.questions.find(q => q.id === ans.questionId);
              if (question && question.crmMapping) {
                  dealPayload[question.crmMapping] = ans.value;
              }
          });

          const finalName = dealPayload.company_name || dealPayload.contact_name;
          
          if (!finalName) {
              const fallbackName = answers.find(a => 
                  ['nome', 'name', 'completo'].some(k => a.questionTitle.toLowerCase().includes(k))
              );
              if (fallbackName) {
                  const nameValue = fallbackName.value;
                  dealPayload.contact_name = nameValue;
                  dealPayload.company_name = nameValue;
                  dealPayload.title = `Lead: ${nameValue}`;
              }
          } else {
              dealPayload.contact_name = finalName;
              dealPayload.company_name = finalName;
              dealPayload.title = `Lead: ${finalName}`;
          }

          if (dealPayload.contact_name) {
              let assignedOwnerId = form.fixedOwnerId || null;
              if (form.distributionMode === 'round-robin' && form.teamId) {
                  const { data: teamData } = await supabase.from('crm_teams').select('members').eq('id', form.teamId).single();
                  const members = (teamData as any)?.members || [];
                  if (members.length > 0) {
                      const { data: counterData } = await supabase.from('crm_form_counters').select('last_index').eq('form_id', formId).single();
                      const lastIndex = counterData ? (counterData as any).last_index : -1;
                      const nextIndex = (lastIndex + 1) % members.length;
                      assignedOwnerId = members[nextIndex];
                      await supabase.from('crm_form_counters').upsert({ form_id: formId, last_index: nextIndex, updated_at: new Date().toISOString() });
                  }
              }
              dealPayload.owner_id = assignedOwnerId;
              
              if (!dealPayload.observation) {
                  const email = dealPayload.email || '';
                  const phone = dealPayload.phone || '';
                  dealPayload.next_task = `Entrar em contato (${email || phone || 'sem dados'})`;
              }

              await supabase.from('crm_deals').insert([dealPayload]);
          }
      }
      if (isConfigured) {
          const { error } = await supabase.from('crm_forms').update({ submissions_count: (form.submissionsCount || 0) + 1 }).eq('id', formId);
          if (error) throw error;
      }
  },

  getFormSubmissions: async (formId: string): Promise<any[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('crm_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
  },

  getFolders: async (): Promise<ContractFolder[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('app_contract_folders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, name: d.name, createdAt: d.created_at }));
  },

  saveFolder: async (folder: ContractFolder): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').upsert({ id: folder.id, name: folder.name });
      if (error) throw error;
  },

  deleteFolder: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contract_folders').delete().eq('id', id);
      if (error) throw error;
  },

  getContracts: async (): Promise<Contract[]> => {
      if (!isConfigured) return [];
      const { data, error } = await supabase.from('app_contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ id: d.id, title: d.title, content: d.content, city: d.city, contractDate: d.contract_date, status: d.status, folderId: d.folder_id, signers: d.signers || [], createdAt: d.created_at }));
  },

  getContractById: async (id: string): Promise<Contract | null> => {
      if (!isConfigured) return null;
      const { data, error } = await supabase.from('app_contracts').select('*').eq('id', id).single();
      if (error || !data) return null;
      /* Fix: Changed undefined variable 'd' to 'data' and accessed correct properties */
      return { id: data.id, title: data.title, content: data.content, city: data.city, contractDate: data.contract_date, status: data.status, folderId: data.folder_id, signers: data.signers || [], createdAt: data.created_at };
  },

  saveContract: async (contract: Contract): Promise<void> => {
      if (!isConfigured) return;
      const payload = { id: contract.id, title: contract.title, content: contract.content, city: contract.city, contract_date: contract.contractDate, status: contract.status, folder_id: contract.folderId || null, signers: contract.signers };
      const { error } = await supabase.from('app_contracts').upsert(payload);
      if (error) throw error;
  },

  deleteContract: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('app_contracts').delete().eq('id', id);
      if (error) throw error;
  },

  signContract: async (contractId: string, signerId: string, signatureBase64: string): Promise<void> => {
      const contract = await appBackend.getContractById(contractId);
      if (!contract) throw new Error("Contrato não encontrado.");
      const signerIdx = contract.signers.findIndex(s => s.id === signerId);
      if (signerIdx === -1) throw new Error("Signatário não encontrado.");
      contract.signers[signerIdx].status = 'signed';
      contract.signers[signerIdx].signatureData = signatureBase64;
      contract.signers[signerIdx].signedAt = new Date().toISOString();
      if (contract.signers.every(s => s.status === 'signed')) contract.status = 'signed';
      await appBackend.saveContract(contract);
  },

  getCertificates: async (): Promise<CertificateModel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_certificates').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ 
        id: d.id, 
        title: d.title, 
        backgroundData: d.background_base_64, 
        backBackgroundData: d.back_background_base_64, 
        linkedProductId: d.linked_product_id, 
        bodyText: d.body_text, 
        layoutConfig: d.layout_config, 
        createdAt: d.created_at 
    }));
  },

  saveCertificate: async (cert: CertificateModel): Promise<void> => {
    if (!isConfigured) return;
    const payload = { 
        id: cert.id || undefined, 
        title: cert.title, 
        background_base_64: cert.backgroundData, 
        back_background_base_64: cert.backBackgroundData, 
        linked_product_id: cert.linkedProductId || null, 
        body_text: cert.bodyText, 
        layout_config: cert.layoutConfig 
    };
    const { error } = await supabase.from('crm_certificates').upsert(payload);
    if (error) throw error;
  },

  deleteCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_certificates').delete().eq('id', id);
    if (error) throw error;
  },

  issueCertificate: async (studentDealId: string, certificateTemplateId: string): Promise<string> => {
    if (!isConfigured) throw new Error("Backend not configured.");
    const hash = crypto.randomUUID();
    const { error } = await supabase.from('crm_student_certificates').insert([{ student_deal_id: studentDealId, certificate_template_id: certificateTemplateId, hash: hash, issued_at: new Date().toISOString() }]);
    if (error) throw error;
    return hash;
  },

  deleteStudentCertificate: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_student_certificates').delete().eq('id', id);
    if (error) throw error;
  },

  getStudentCertificate: async (hash: string): Promise<any> => {
    if (!isConfigured) return null;
    const { data: certData, error: certError } = await supabase.from('crm_student_certificates').select('*').eq('hash', hash).single();
    if (certError || !certData) return null;
    const { data: dealData } = await supabase.from('crm_deals').select('contact_name, company_name, course_city').eq('id', (certData as any).student_deal_id).single();
    const { data: templateData } = await supabase.from('crm_certificates').select('*').eq('id', (certData as any).certificate_template_id).single();
    if (!dealData || !templateData) return null;
    return { 
        id: (certData as any).id, 
        studentDealId: (certData as any).student_deal_id, 
        certificateTemplateId: (certData as any).certificate_template_id, 
        hash: (certData as any).hash, 
        issuedAt: (certData as any).issued_at, 
        studentName: (dealData as any).company_name || (dealData as any).contact_name, 
        studentCity: (dealData as any).course_city || 'Local', 
        template: { 
            id: (templateData as any).id, 
            title: (templateData as any).title, 
            backgroundData: (templateData as any).background_base_64, 
            backBackgroundData: (templateData as any).back_background_base_64, 
            linkedProductId: (templateData as any).linked_product_id, 
            bodyText: (templateData as any).body_text, 
            layoutConfig: (templateData as any).layout_config, 
            createdAt: (templateData as any).created_at 
        } 
    };
  },

  getEvents: async (): Promise<EventModel[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_events').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, description: d.description, location: d.location, dates: d.dates || [], createdAt: d.created_at, registrationOpen: d.registration_open || false }));
  },

  saveEvent: async (event: EventModel): Promise<EventModel> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = { id: event.id, name: event.name, description: event.description, location: event.location, dates: event.dates, registration_open: event.registrationOpen };
    const { data, error } = await supabase.from('crm_events').upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, description: data.description, location: data.location, dates: data.dates || [], createdAt: data.created_at, registrationOpen: data.registration_open || false };
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_events').delete().eq('id', id);
    if (error) throw error;
  },

  getBlocks: async (eventId: string): Promise<EventBlock[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_event_blocks').select('*').eq('event_id', eventId).order('title', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, date: d.date, title: d.title, maxSelections: d.max_selections }));
  },

  saveBlock: async (block: EventBlock): Promise<EventBlock> => {
      if (!isConfigured) throw new Error("Backend not configured");
      const payload = { id: block.id, event_id: block.eventId, date: block.date, title: block.title, max_selections: block.maxSelections };
      const { data, error } = await supabase.from('crm_event_blocks').upsert(payload).select().single();
      if (error) throw error;
      return { id: data.id, eventId: data.event_id, date: data.date, title: data.title, maxSelections: data.max_selections };
  },

  deleteBlock: async (id: string): Promise<void> => {
      if (!isConfigured) return;
      const { error } = await supabase.from('crm_event_blocks').delete().eq('id', id);
      if (error) throw error;
  },

  getWorkshops: async (eventId: string): Promise<Workshop[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_workshops').select('*').eq('event_id', eventId).order('date', { ascending: true }).order('time', { ascending: true });
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, blockId: d.block_id, title: d.title, description: d.description, speaker: d.speaker, date: d.date, time: d.time, spots: d.spots }));
  },

  saveWorkshop: async (workshop: Workshop): Promise<Workshop> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const payload = { id: workshop.id, event_id: workshop.eventId, block_id: workshop.blockId || null, title: workshop.title, description: workshop.description, speaker: workshop.speaker, date: workshop.date, time: workshop.time, spots: workshop.spots };
    const { data, error } = await supabase.from('crm_workshops').upsert(payload).select().single();
    if (error) throw error;
    return { id: data.id, eventId: data.event_id, blockId: data.block_id, title: data.title, description: data.description, speaker: data.speaker, date: data.date, time: data.time, spots: data.spots };
  },

  deleteWorkshop: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_workshops').delete().eq('id', id);
    if (error) throw error;
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_event_registrations').select('*').eq('event_id', eventId);
    if (error) throw error;
    return (data || []).map((d: any) => ({ id: d.id, eventId: d.event_id, workshopId: d.workshop_id, studentId: d.student_id, studentName: d.student_name, studentEmail: d.student_email, registeredAt: d.created_at }));
  },

  saveEventRegistrations: async (eventId: string, studentId: string, studentName: string, studentEmail: string, workshopIds: string[]): Promise<void> => {
    if (!isConfigured) throw new Error("Backend not configured");
    const { error: delError } = await supabase.from('crm_event_registrations').delete().eq('event_id', eventId).eq('student_id', studentId);
    if (delError) throw delError;
    if (workshopIds.length > 0) {
      const payload = workshopIds.map(wId => ({ event_id: eventId, workshop_id: wId, student_id: studentId, student_name: studentName, student_email: studentEmail }));
      const { error: insError } = await supabase.from('crm_event_registrations').insert(payload);
      if (insError) throw insError;
    }
  },

  getInventory: async (): Promise<InventoryRecord[]> => {
    if (!isConfigured) return [];
    const { data, error } = await supabase.from('crm_inventory').select('*').order('registration_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id, 
      type: d.type, 
      itemApostilaNova: d.item_apostila_nova, 
      itemApostilaClassico: d.item_apostila_classico, 
      itemSacochila: d.item_sacochila, 
      itemLapis: d.item_lapis, 
      registrationDate: d.registration_date, 
      studioId: d.studio_id, 
      trackingCode: d.tracking_code, 
      observations: d.observations, 
      conferenceDate: d.conference_date, 
      attachments: d.attachments, 
      createdAt: d.created_at
    }));
  },

  saveInventoryRecord: async (record: InventoryRecord): Promise<void> => {
    if (!isConfigured) return;
    const payload = {
      type: record.type, 
      item_apostila_nova: record.itemApostilaNova, 
      item_apostila_classico: record.itemApostilaClassico, 
      item_sacochila: record.itemSacochila, 
      item_lapis: record.itemLapis, 
      registration_date: record.registrationDate, 
      /* Fix: Changed record.studio_id to record.studioId to match the interface definition */
      studio_id: record.studioId || null, 
      tracking_code: record.trackingCode, 
      observations: record.observations, 
      conference_date: record.conferenceDate || null, 
      attachments: record.attachments
    };
    let error;
    if (record.id) {
        const result = await supabase.from('crm_inventory').update(payload).eq('id', record.id);
        error = result.error;
    } else {
        const result = await supabase.from('crm_inventory').insert([payload]);
        error = result.error;
    }
    if (error) throw error;
  },

  deleteInventoryRecord: async (id: string): Promise<void> => {
    if (!isConfigured) return;
    const { error } = await supabase.from('crm_inventory').delete().eq('id', id);
    if (error) throw error;
  },
};
