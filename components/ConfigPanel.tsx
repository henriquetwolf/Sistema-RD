import React, { useState, useEffect } from 'react';
import { SupabaseConfig, SavedPreset } from '../types';
import { Key, Database, Link, Save, Trash2, ChevronDown, Loader2, Fingerprint, Info, Clock } from 'lucide-react';
import { appBackend } from '../services/appBackend';

interface ConfigPanelProps {
  config: SupabaseConfig;
  setConfig: (config: SupabaseConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onNext, onBack }) => {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Defaults
  useEffect(() => {
     if (!config.intervalMinutes) {
         setConfig({ ...config, intervalMinutes: 5 });
     }
  }, []);

  // Load presets from Supabase on mount
  useEffect(() => {
    const loadPresets = async () => {
      setIsLoadingPresets(true);
      try {
        const data = await appBackend.getPresets();
        setPresets(data);
      } catch (e) {
        console.error("Failed to load presets from backend", e);
      } finally {
        setIsLoadingPresets(false);
      }
    };
    loadPresets();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    if (!presetId) return;
    
    const selected = presets.find(p => p.id === presetId);
    if (selected) {
      const tableNameToUse = config.tableName && !selected.tableName ? config.tableName : (selected.tableName || config.tableName);
      
      setConfig({
        url: selected.url,
        key: selected.key,
        tableName: tableNameToUse,
        primaryKey: selected.primaryKey,
        intervalMinutes: selected.intervalMinutes || 5
      });
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    setIsSaving(true);

    try {
      const newPreset = await appBackend.savePreset({
        ...config,
        name: newPresetName,
        intervalMinutes: config.intervalMinutes || 5
      });

      setPresets([newPreset, ...presets]);
      setShowSaveInput(false);
      setNewPresetName('');
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message || 'Ocorreu um erro desconhecido.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta configuração salva?')) {
        try {
          await appBackend.deletePreset(id);
          const updatedPresets = presets.filter(p => p.id !== id);
          setPresets(updatedPresets);
        } catch (e) {
          alert('Erro ao excluir configuração.');
        }
    }
  };

  const isValid = config.url && config.key && config.tableName;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 p-6 border-b border-slate-200">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>Carregar Configuração Salva</span>
            {isLoadingPresets && <Loader2 size={14} className="animate-spin text-teal-600" />}
        </label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <select 
                    className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 pl-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 font-medium"
                    onChange={handleLoadPreset}
                    defaultValue=""
                    disabled={isLoadingPresets}
                >
                    <option value="" disabled>
                        {isLoadingPresets ? 'Carregando...' : 'Selecione um preset...'}
                    </option>
                    {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        {presets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
                {presets.map(p => (
                    <div key={p.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-600 font-medium">
                        <span>{p.name}</span>
                        <button 
                            onClick={() => handleDeletePreset(p.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                            title="Remover preset"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Database className="text-teal-600" />
            Credenciais do Banco
        </h2>
      
        <div className="space-y-5">
            <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Project URL (Supabase)</label>
            <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                name="url"
                value={config.url}
                onChange={handleChange}
                placeholder="https://xyz.supabase.co"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                />
            </div>
            </div>

            <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">API Key (Anon / Service Role)</label>
            <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="password"
                name="key"
                value={config.key}
                onChange={handleChange}
                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                />
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Tabela</label>
                    <input
                        type="text"
                        name="tableName"
                        value={config.tableName}
                        onChange={handleChange}
                        placeholder="users"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Clock size={16} className="text-slate-500" /> Frequência
                    </label>
                    <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            name="intervalMinutes"
                            value={config.intervalMinutes || 5}
                            onChange={handleChange}
                            className="w-full appearance-none px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition bg-white"
                        >
                            <option value={5}>A cada 5 minutos</option>
                            <option value={15}>A cada 15 minutos</option>
                            <option value={30}>A cada 30 minutos</option>
                            <option value={60}>A cada 1 hora</option>
                            <option value={120}>A cada 2 horas</option>
                            <option value={1440}>A cada 24 horas</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                <label className="block text-sm font-bold text-teal-900 mb-1 flex items-center gap-2">
                    <Fingerprint size={16} />
                    Chave Primária (ID)
                </label>
                <input
                    type="text"
                    name="primaryKey"
                    value={config.primaryKey || ''}
                    onChange={handleChange}
                    placeholder="ex: id, email, sku"
                    className="w-full px-3 py-1.5 border border-teal-200 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition mb-1 text-teal-900 placeholder-teal-400"
                />
                    <div className="flex items-start gap-1.5 mt-2">
                    <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-700 leading-snug">
                        Obrigatório para <b>atualizar (upsert)</b> registros existentes. Se vazio, o sistema apenas inserirá novas linhas (append).
                    </p>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-2">
                {!showSaveInput ? (
                    <button 
                        onClick={() => setShowSaveInput(true)}
                        className="text-sm text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                    >
                        <Save size={16} /> Salvar esta configuração na nuvem
                    </button>
                ) : (
                    <div className="flex items-end gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Preset</label>
                            <input 
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="Ex: Produção - Vendas"
                                disabled={isSaving}
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-teal-400"
                            />
                        </div>
                        <button 
                            onClick={handleSavePreset}
                            disabled={isSaving}
                            className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                        </button>
                        <button 
                            onClick={() => setShowSaveInput(false)}
                            className="text-slate-500 px-2 py-1.5 text-sm hover:text-slate-700"
                        >
                            <XIcon />
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={onNext}
            disabled={!isValid}
            className="flex-[2] bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
          >
            Verificar e Gerar SQL
          </button>
        </div>
      </div>
    </div>
  );
};

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);