import React, { useState, useEffect } from 'react';
import { SupabaseConfig, SavedPreset } from '../types';
import { Key, Database, Link, Save, Trash2, ChevronDown, Plus } from 'lucide-react';

interface ConfigPanelProps {
  config: SupabaseConfig;
  setConfig: (config: SupabaseConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onNext, onBack }) => {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('supabase_sync_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load presets");
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    if (!presetId) return;
    
    const selected = presets.find(p => p.id === presetId);
    if (selected) {
      // Don't overwrite tableName if it's already set (from file upload) unless the preset has a specific one
      const tableNameToUse = config.tableName && !selected.tableName ? config.tableName : (selected.tableName || config.tableName);
      
      setConfig({
        url: selected.url,
        key: selected.key,
        tableName: tableNameToUse,
        primaryKey: selected.primaryKey
      });
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: SavedPreset = {
      ...config,
      id: Date.now().toString(),
      name: newPresetName
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('supabase_sync_presets', JSON.stringify(updatedPresets));
    
    setShowSaveInput(false);
    setNewPresetName('');
  };

  const handleDeletePreset = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta configuração salva?')) {
        const updatedPresets = presets.filter(p => p.id !== id);
        setPresets(updatedPresets);
        localStorage.setItem('supabase_sync_presets', JSON.stringify(updatedPresets));
    }
  };

  const isValid = config.url && config.key && config.tableName;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
       {/* Presets Section */}
      <div className="bg-slate-50 p-6 border-b border-slate-200">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Carregar Configuração Salva
        </label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <select 
                    className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleLoadPreset}
                    defaultValue=""
                >
                    <option value="" disabled>Selecione um preset...</option>
                    {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        {/* Preset List Management (Mini) */}
        {presets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
                {presets.map(p => (
                    <div key={p.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-600">
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
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Database className="text-indigo-600" />
            Detalhes da Conexão
        </h2>
      
        <div className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
            <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="text"
                name="url"
                value={config.url}
                onChange={handleChange}
                placeholder="https://xyz.supabase.co"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
            </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key (Service Role / Anon)</label>
            <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                type="password"
                name="key"
                value={config.key}
                onChange={handleChange}
                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Tabela</label>
                <input
                    type="text"
                    name="tableName"
                    value={config.tableName}
                    onChange={handleChange}
                    placeholder="users"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Coluna ID (Opcional)
                </label>
                <input
                    type="text"
                    name="primaryKey"
                    value={config.primaryKey || ''}
                    onChange={handleChange}
                    placeholder="id"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                </div>
            </div>

            {/* Save Preset Section */}
            <div className="pt-4 border-t border-slate-100 mt-4">
                {!showSaveInput ? (
                    <button 
                        onClick={() => setShowSaveInput(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                        <Save size={16} /> Salvar esta configuração para depois
                    </button>
                ) : (
                    <div className="flex items-end gap-2 bg-indigo-50 p-3 rounded-lg">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-indigo-800 mb-1">Nome do Preset</label>
                            <input 
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="Ex: Produção - Vendas"
                                className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded focus:outline-none focus:border-indigo-400"
                            />
                        </div>
                        <button 
                            onClick={handleSavePreset}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
                        >
                            Salvar
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
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={onNext}
            disabled={!isValid}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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
