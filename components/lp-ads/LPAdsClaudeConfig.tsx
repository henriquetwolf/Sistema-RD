import React, { useState, useEffect } from 'react';
import {
  Save, Loader2, Shield, Eye, EyeOff, CheckCircle, XCircle,
  Zap, Settings, AlertTriangle
} from 'lucide-react';
import { appBackend } from '../../services/appBackend';
import { AIProviderConfig } from './types';

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recomendado)' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rápido/Barato)' },
];

export const LPAdsClaudeConfig: React.FC = () => {
  const [config, setConfig] = useState<Partial<AIProviderConfig>>({
    provider: 'claude',
    label: 'Claude (LP + Anúncios)',
    api_key_encrypted: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 4096,
    system_prompt: '',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const configs = await appBackend.lpAds.aiConfigs.list();
        const claudeConfig = configs.find((c: any) => c.provider === 'claude');
        if (claudeConfig) setConfig(claudeConfig);
      } catch { /* silent */ }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!config.api_key_encrypted?.trim()) { alert('API Key é obrigatória'); return; }
    setSaving(true);
    try {
      const saved = await appBackend.lpAds.aiConfigs.save(config);
      if (saved) setConfig(saved);
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'generate_base_lp',
        project_id: 'validate-only',
      });
      setValidationResult(result?.success ? 'success' : 'error');
    } catch {
      setValidationResult('error');
    }
    setValidating(false);
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
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Settings size={18} className="text-indigo-500" />
          Configuração do Claude
        </h3>
        <p className="text-xs text-slate-400 mb-6">Configure a integração com a API do Claude para geração de landing pages e anúncios.</p>

        <div className="space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield size={12} /> API Key *
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.api_key_encrypted || ''}
                onChange={e => setConfig({ ...config, api_key_encrypted: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 pr-12 border-2 border-slate-100 rounded-xl text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Shield size={10} /> A chave é armazenada de forma segura e nunca exposta no frontend.
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Modelo</label>
            <select
              value={config.model || 'claude-sonnet-4-20250514'}
              onChange={e => setConfig({ ...config, model: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none cursor-pointer"
            >
              {CLAUDE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Temperatura: <span className="text-indigo-600">{config.temperature?.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature || 0.7}
              onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
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
              value={config.max_tokens || 4096}
              onChange={e => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
              min={256}
              max={8192}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-medium focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Prompt (opcional)</label>
            <textarea
              value={config.system_prompt || ''}
              onChange={e => setConfig({ ...config, system_prompt: e.target.value })}
              placeholder="Prompt de sistema adicional que será incluído em todas as gerações..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none resize-none"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-700">Integração Ativa</p>
              <p className="text-[10px] text-slate-400">Desative para pausar todas as gerações com Claude</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, is_active: !config.is_active })}
              className={`w-12 h-6 rounded-full transition-colors relative ${config.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.is_active ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={handleValidate}
            disabled={validating || !config.api_key_encrypted?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {validating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Validar Credenciais
          </button>

          {validationResult === 'success' && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <CheckCircle size={14} /> Conexão OK
            </span>
          )}
          {validationResult === 'error' && (
            <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
              <XCircle size={14} /> Falha na validação
            </span>
          )}

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving || !config.api_key_encrypted?.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-5">
        <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
          <AlertTriangle size={16} /> Sobre custos
        </h4>
        <p className="text-xs text-amber-700 leading-relaxed">
          Cada geração de landing page consome tokens da API do Claude. O custo estimado é exibido antes de confirmar a geração.
          Use o modelo Haiku para testes rápidos e o Sonnet para resultados finais de alta qualidade.
        </p>
      </div>
    </div>
  );
};
