import React, { useState, useEffect } from 'react';
import {
  Save, Loader2, Shield, Eye, EyeOff, CheckCircle, XCircle,
  Zap, Settings, AlertTriangle, Globe2, BrainCircuit
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { AIProviderConfig, AIProvider } from './types';

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recomendado)' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rápido/Barato)' },
];

const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (via OpenRouter)' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Rápido)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Barato)' },
  { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B' },
  { id: 'custom', label: '-- Modelo customizado --' },
];

type ProviderTab = 'claude' | 'openrouter';

const PROVIDER_TABS: { id: ProviderTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'claude', label: 'Claude (Direto)', icon: <BrainCircuit size={18} />, description: 'API direta da Anthropic. Menor latência, acesso a modelos mais recentes.' },
  { id: 'openrouter', label: 'OpenRouter', icon: <Globe2 size={18} />, description: 'Acesso a centenas de modelos (Claude, GPT, Gemini, Llama...) com uma única API key.' },
];

const DEFAULT_CONFIGS: Record<ProviderTab, Partial<AIProviderConfig>> = {
  claude: {
    provider: 'claude',
    label: 'Claude (Direto)',
    api_key_encrypted: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 4096,
    system_prompt: '',
    is_active: false,
  },
  openrouter: {
    provider: 'openrouter',
    label: 'OpenRouter',
    api_key_encrypted: '',
    model: 'anthropic/claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 4096,
    system_prompt: '',
    is_active: false,
  },
};

export const LPAdsClaudeConfig: React.FC = () => {
  const [configs, setConfigs] = useState<Record<ProviderTab, Partial<AIProviderConfig>>>({
    claude: { ...DEFAULT_CONFIGS.claude },
    openrouter: { ...DEFAULT_CONFIGS.openrouter },
  });
  const [activeTab, setActiveTab] = useState<ProviderTab>('claude');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<ProviderTab | null>(null);
  const [showKey, setShowKey] = useState<Record<ProviderTab, boolean>>({ claude: false, openrouter: false });
  const [validating, setValidating] = useState<ProviderTab | null>(null);
  const [validationResult, setValidationResult] = useState<Record<ProviderTab, 'success' | 'error' | null>>({ claude: null, openrouter: null });
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const allConfigs = await appBackend.lpAds.aiConfigs.list();
        const newConfigs = { ...configs };
        const claudeConfig = allConfigs.find((c: any) => c.provider === 'claude');
        const openrouterConfig = allConfigs.find((c: any) => c.provider === 'openrouter');
        if (claudeConfig) newConfigs.claude = claudeConfig;
        if (openrouterConfig) {
          newConfigs.openrouter = openrouterConfig;
          if (!OPENROUTER_MODELS.some(m => m.id === openrouterConfig.model)) {
            setCustomModel(openrouterConfig.model);
          }
        }
        setConfigs(newConfigs);
        if (!claudeConfig?.is_active && openrouterConfig?.is_active) setActiveTab('openrouter');
      } catch { /* silent */ }
      setIsLoading(false);
    };
    load();
  }, []);

  const currentConfig = configs[activeTab];
  const models = activeTab === 'claude' ? CLAUDE_MODELS : OPENROUTER_MODELS;

  const updateConfig = (updates: Partial<AIProviderConfig>) => {
    setConfigs(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], ...updates } }));
  };

  const handleToggleActive = async (provider: ProviderTab) => {
    const otherProvider: ProviderTab = provider === 'claude' ? 'openrouter' : 'claude';
    const wasActive = configs[provider].is_active;

    const newConfigs = { ...configs };
    newConfigs[provider] = { ...newConfigs[provider], is_active: !wasActive };
    if (!wasActive) {
      newConfigs[otherProvider] = { ...newConfigs[otherProvider], is_active: false };
    }
    setConfigs(newConfigs);

    if (newConfigs[otherProvider].id && newConfigs[otherProvider].is_active !== configs[otherProvider].is_active) {
      await appBackend.lpAds.aiConfigs.save({ ...newConfigs[otherProvider] });
    }
  };

  const handleSave = async () => {
    const cfg = configs[activeTab];
    if (!cfg.api_key_encrypted?.trim()) { alert('API Key é obrigatória'); return; }

    let modelToSave = cfg.model;
    if (activeTab === 'openrouter' && cfg.model === 'custom') {
      if (!customModel.trim()) { alert('Informe o ID do modelo customizado'); return; }
      modelToSave = customModel.trim();
    }

    setSaving(activeTab);
    try {
      const saved = await appBackend.lpAds.aiConfigs.save({ ...cfg, model: modelToSave });
      if (saved) {
        setConfigs(prev => ({ ...prev, [activeTab]: saved }));
      }
    } catch { /* silent */ }
    setSaving(null);
  };

  const handleValidate = async () => {
    setValidating(activeTab);
    setValidationResult(prev => ({ ...prev, [activeTab]: null }));
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'generate_base_lp',
        project_id: 'validate-only',
      });
      setValidationResult(prev => ({ ...prev, [activeTab]: result?.success ? 'success' : 'error' }));
    } catch {
      setValidationResult(prev => ({ ...prev, [activeTab]: 'error' }));
    }
    setValidating(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Provider Tabs */}
      <div className="grid grid-cols-2 gap-3">
        {PROVIDER_TABS.map(tab => {
          const cfg = configs[tab.id];
          const isActive = cfg.is_active;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'relative rounded-2xl border-2 p-4 text-left transition-all',
                activeTab === tab.id
                  ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-100 hover:border-slate-200 bg-white'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={clsx(activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400')}>{tab.icon}</span>
                <span className="font-bold text-sm text-slate-800">{tab.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">{tab.description}</p>
              {isActive && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} /> Ativo
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Config Form */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Settings size={18} className="text-indigo-500" />
          Configuração — {PROVIDER_TABS.find(t => t.id === activeTab)?.label}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          {activeTab === 'claude'
            ? 'API direta da Anthropic. Obtenha sua chave em console.anthropic.com.'
            : 'OpenRouter dá acesso a centenas de modelos com uma só chave. Obtenha em openrouter.ai/keys.'}
        </p>

        <div className="space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield size={12} /> API Key *
            </label>
            <div className="relative">
              <input
                type={showKey[activeTab] ? 'text' : 'password'}
                value={currentConfig.api_key_encrypted || ''}
                onChange={e => updateConfig({ api_key_encrypted: e.target.value })}
                placeholder={activeTab === 'claude' ? 'sk-ant-...' : 'sk-or-...'}
                className="w-full px-4 py-3 pr-12 border-2 border-slate-100 rounded-xl text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => setShowKey(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showKey[activeTab] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Modelo</label>
            <select
              value={
                activeTab === 'openrouter' && !OPENROUTER_MODELS.some(m => m.id === currentConfig.model)
                  ? 'custom'
                  : currentConfig.model || models[0].id
              }
              onChange={e => {
                const val = e.target.value;
                if (val === 'custom') {
                  updateConfig({ model: 'custom' });
                } else {
                  updateConfig({ model: val });
                  setCustomModel('');
                }
              }}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none cursor-pointer"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Model ID (OpenRouter only) */}
          {activeTab === 'openrouter' && (currentConfig.model === 'custom' || (!OPENROUTER_MODELS.some(m => m.id === currentConfig.model) && currentConfig.model)) && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Model ID Customizado
              </label>
              <input
                type="text"
                value={customModel || (currentConfig.model !== 'custom' ? currentConfig.model : '') || ''}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="Ex: mistralai/mistral-large, cohere/command-r-plus..."
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Consulte <span className="font-mono">openrouter.ai/models</span> para ver todos os IDs de modelos disponíveis.
              </p>
            </div>
          )}

          {/* Temperature */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Temperatura: <span className="text-indigo-600">{(currentConfig.temperature ?? 0.7).toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentConfig.temperature ?? 0.7}
              onChange={e => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0.0 (Determinístico)</span>
              <span>1.0 (Criativo)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Tokens</label>
            <input
              type="number"
              value={currentConfig.max_tokens || 4096}
              onChange={e => updateConfig({ max_tokens: parseInt(e.target.value) || 4096 })}
              min={256}
              max={16384}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Prompt (opcional)</label>
            <textarea
              value={currentConfig.system_prompt || ''}
              onChange={e => updateConfig({ system_prompt: e.target.value })}
              placeholder="Prompt de sistema adicional que será incluído em todas as gerações..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none resize-none"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-700">Provider Ativo</p>
              <p className="text-[10px] text-slate-400">
                Apenas um provider pode estar ativo. Ativar este desativa o outro.
              </p>
            </div>
            <button
              onClick={() => handleToggleActive(activeTab)}
              className={clsx(
                'w-12 h-6 rounded-full transition-colors relative',
                currentConfig.is_active ? 'bg-indigo-600' : 'bg-slate-300'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                currentConfig.is_active ? 'left-6' : 'left-0.5'
              )} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={handleValidate}
            disabled={validating !== null || !currentConfig.api_key_encrypted?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {validating === activeTab ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Validar Credenciais
          </button>

          {validationResult[activeTab] === 'success' && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <CheckCircle size={14} /> Conexão OK
            </span>
          )}
          {validationResult[activeTab] === 'error' && (
            <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
              <XCircle size={14} /> Falha na validação
            </span>
          )}

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving !== null || !currentConfig.api_key_encrypted?.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving === activeTab ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>

      {/* Info Boxes */}
      {activeTab === 'claude' && (
        <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-5">
          <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle size={16} /> Sobre custos — Claude Direto
          </h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            Cada geração consome tokens da API do Claude. Use Haiku para testes rápidos e Sonnet para resultados finais.
            O custo estimado é exibido no histórico de gerações.
          </p>
        </div>
      )}

      {activeTab === 'openrouter' && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5">
          <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2">
            <Globe2 size={16} /> Sobre o OpenRouter
          </h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            O OpenRouter é um gateway que dá acesso a modelos de múltiplos providers (Anthropic, OpenAI, Google, Meta, etc.)
            com uma única API key. Os custos variam por modelo — consulte <span className="font-mono font-bold">openrouter.ai/models</span> para preços atualizados.
            Ideal para testar diferentes modelos e encontrar o melhor custo-benefício.
          </p>
        </div>
      )}
    </div>
  );
};
