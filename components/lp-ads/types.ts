// ── LP + Anúncios (IA) — Tipos do Módulo ─────────────────────

export type LPAdsProjectStatus = 'draft' | 'generating' | 'generated' | 'reviewing' | 'approved' | 'published' | 'archived';
export type LPAdsPageType = 'base' | 'variant';
export type LPAdsCreationMode = 'ai_claude' | 'ai_openrouter' | 'import_html' | 'blank_template';
export type LPAdsAssetType = 'url' | 'pdf' | 'text' | 'html_file';
export type LPAdsPlatform = 'google_ads' | 'meta_ads' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'other';
export type LPAdsJobType = 'generate_base_lp' | 'generate_ad' | 'generate_variant_lp' | 'regenerate_section' | 'rewrite_html';
export type LPAdsJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AIProvider = 'claude' | 'openrouter' | 'gemini' | 'openai' | 'custom';

export interface AIProviderConfig {
  id: string;
  provider: AIProvider;
  label: string;
  api_key_encrypted: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LPAdsProject {
  id: string;
  name: string;
  description: string;
  offer: string;
  target_audience: string;
  campaign_objective: string;
  main_promise: string;
  unique_mechanism: string;
  main_pains: string;
  main_benefits: string;
  objections: string;
  testimonials: string;
  differentials: string;
  tone_of_voice: string;
  price_condition: string;
  faq: string;
  competitors: string;
  visual_identity: string;
  cta_principal: string;
  free_notes: string;
  status: LPAdsProjectStatus;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  campaigns_count?: number;
  landing_pages_count?: number;
  base_lp_id?: string | null;
}

export interface LPAdsSourceAsset {
  id: string;
  project_id: string;
  asset_type: LPAdsAssetType;
  file_url: string;
  original_name: string;
  extracted_text: string;
  created_at: string;
}

export interface LPAdsLandingPageSection {
  id: string;
  type: string;
  enabled: boolean;
  headline: string;
  body: string;
  items?: string[];
  cta?: string;
  extra?: Record<string, any>;
}

export interface LPAdsLandingPageContent {
  sections: LPAdsLandingPageSection[];
  meta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  theme?: {
    primary_color: string;
    text_color: string;
    bg_color: string;
    font_family: string;
    tone: string;
  };
}

export interface LPAdsLandingPage {
  id: string;
  project_id: string;
  campaign_id: string | null;
  page_type: LPAdsPageType;
  creation_mode: LPAdsCreationMode;
  title: string;
  content: LPAdsLandingPageContent;
  html_code: string;
  selected_form_id: string | null;
  cta_link: string;
  show_popups: boolean;
  show_wa_button: boolean;
  status: LPAdsProjectStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
  // Joined
  campaign_name?: string;
}

export interface LPAdsLPVersion {
  id: string;
  landing_page_id: string;
  version_number: number;
  content: LPAdsLandingPageContent;
  html_code: string;
  prompt_used: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  generated_by: string;
  created_at: string;
}

export interface LPAdsCampaign {
  id: string;
  project_id: string;
  name: string;
  objective: string;
  platform: LPAdsPlatform;
  focus_angle: string;
  persona: string;
  specific_pain: string;
  specific_promise: string;
  cta: string;
  tone_of_voice: string;
  notes: string;
  ad_creatives: LPAdsAdCreative[];
  status: LPAdsProjectStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
  // Joined
  variant_lp?: LPAdsLandingPage | null;
}

export interface LPAdsAdCreative {
  id: string;
  type: 'headline' | 'description' | 'primary_text' | 'visual_suggestion';
  content: string;
  platform?: string;
}

export interface LPAdsCampaignVersion {
  id: string;
  campaign_id: string;
  version_number: number;
  snapshot: Record<string, any>;
  prompt_used: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  generated_by: string;
  created_at: string;
}

export interface LPAdsGenerationJob {
  id: string;
  project_id: string;
  target_id: string | null;
  target_type: 'landing_page' | 'campaign' | 'section' | '';
  job_type: LPAdsJobType;
  status: LPAdsJobStatus;
  error_message: string;
  prompt_used: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_estimate: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export const LP_ADS_STATUS_LABELS: Record<LPAdsProjectStatus, string> = {
  draft: 'Rascunho',
  generating: 'Gerando...',
  generated: 'Gerada',
  reviewing: 'Em Revisão',
  approved: 'Aprovada',
  published: 'Publicada',
  archived: 'Arquivada',
};

export const LP_ADS_STATUS_COLORS: Record<LPAdsProjectStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  generating: 'bg-amber-100 text-amber-700',
  generated: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-gray-100 text-gray-500',
};

export const LP_ADS_PLATFORM_LABELS: Record<LPAdsPlatform, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  other: 'Outro',
};

export const LP_ADS_SECTION_TYPES = [
  { type: 'hero', label: 'Destaque (Hero)' },
  { type: 'pain', label: 'Problema / Dor' },
  { type: 'transformation', label: 'Transformação' },
  { type: 'method', label: 'Método / Diferencial' },
  { type: 'benefits', label: 'Benefícios' },
  { type: 'target', label: 'Para Quem É' },
  { type: 'modules', label: 'Módulos / Entregáveis' },
  { type: 'bonuses', label: 'Bônus' },
  { type: 'testimonials', label: 'Prova Social' },
  { type: 'pricing', label: 'Oferta / Preço' },
  { type: 'guarantee', label: 'Garantia' },
  { type: 'faq', label: 'FAQ' },
  { type: 'cta_final', label: 'CTA Final' },
  { type: 'professor', label: 'Sobre o Autor' },
  { type: 'footer', label: 'Rodapé' },
];
