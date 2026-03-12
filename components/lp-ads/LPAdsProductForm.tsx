import React, { useState, useRef } from 'react';
import {
  Save, Upload, Link2, FileText, Trash2, Loader2, Plus,
  Target, MessageSquare, Users, Zap, Shield, HelpCircle,
  Palette, DollarSign, Eye, Award, AlertTriangle, Lightbulb, FileUp
} from 'lucide-react';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsSourceAsset } from './types';

interface Props {
  project: LPAdsProject;
  assets: LPAdsSourceAsset[];
  onSave: (updated: LPAdsProject) => void;
  onAssetsChange: () => void;
}

const FIELD_GROUPS = [
  {
    title: 'Dados Essenciais',
    icon: <Target size={16} className="text-indigo-500" />,
    fields: [
      { key: 'name', label: 'Nome do Produto *', placeholder: 'Ex: Curso de Gestão Estratégica', required: true },
      { key: 'description', label: 'Descrição do Produto *', placeholder: 'Descreva o produto, o que entrega e como funciona...', type: 'textarea', required: true },
      { key: 'campaign_objective', label: 'Objetivo da Página *', placeholder: 'Ex: Capturar leads, Vender curso, Inscrição em evento...', required: true },
      { key: 'cta_principal', label: 'CTA Principal *', placeholder: 'Ex: Quero me inscrever, Garantir minha vaga, Comprar agora', required: true },
      { key: 'target_audience', label: 'Público-alvo *', placeholder: 'Ex: Profissionais de saúde de 25 a 45 anos...', required: true },
    ]
  },
  {
    title: 'Estratégia de Copy',
    icon: <MessageSquare size={16} className="text-purple-500" />,
    fields: [
      { key: 'main_promise', label: 'Promessa Principal', placeholder: 'A grande transformação que o produto entrega...' },
      { key: 'unique_mechanism', label: 'Mecanismo Único', placeholder: 'O que torna este método/produto diferente de todos os outros...' },
      { key: 'main_pains', label: 'Principais Dores', placeholder: 'Liste as dores do público (uma por linha)', type: 'textarea' },
      { key: 'main_benefits', label: 'Principais Benefícios', placeholder: 'Liste os benefícios (um por linha)', type: 'textarea' },
      { key: 'objections', label: 'Objeções Comuns', placeholder: 'Quais objeções o público costuma ter? (uma por linha)', type: 'textarea' },
    ]
  },
  {
    title: 'Prova Social e Credibilidade',
    icon: <Award size={16} className="text-amber-500" />,
    fields: [
      { key: 'testimonials', label: 'Provas / Depoimentos', placeholder: 'Depoimentos de alunos ou clientes...', type: 'textarea' },
      { key: 'differentials', label: 'Diferenciais', placeholder: 'O que faz este produto ser melhor que os concorrentes...', type: 'textarea' },
      { key: 'competitors', label: 'Concorrentes / Referências', placeholder: 'URLs ou nomes de referências do mercado...' },
    ]
  },
  {
    title: 'Oferta e Preço',
    icon: <DollarSign size={16} className="text-green-500" />,
    fields: [
      { key: 'offer', label: 'Oferta', placeholder: 'Descreva a oferta completa (o que inclui, bônus, etc.)...', type: 'textarea' },
      { key: 'price_condition', label: 'Preço / Condição', placeholder: 'Ex: R$ 997 ou 12x R$ 97,42' },
      { key: 'faq', label: 'FAQ', placeholder: 'Perguntas frequentes (Pergunta? Resposta - uma por linha)', type: 'textarea' },
    ]
  },
  {
    title: 'Tom e Identidade',
    icon: <Palette size={16} className="text-rose-500" />,
    fields: [
      { key: 'tone_of_voice', label: 'Tom de Voz', placeholder: 'Ex: Profissional e Persuasivo, Casual e Empático...' },
      { key: 'visual_identity', label: 'Identidade Visual / Cores', placeholder: 'Ex: Azul escuro (#1a365d) e branco, estilo minimalista...' },
    ]
  },
  {
    title: 'Notas Adicionais',
    icon: <Lightbulb size={16} className="text-slate-400" />,
    fields: [
      { key: 'free_notes', label: 'Observações Livres', placeholder: 'Qualquer informação extra que ajude na geração...', type: 'textarea' },
    ]
  },
];

export const LPAdsProductForm: React.FC<Props> = ({ project, assets, onSave, onAssetsChange }) => {
  const [form, setForm] = useState<LPAdsProject>({ ...project });
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!form.name?.trim()) { alert('Nome do produto é obrigatório'); return; }
    setSaving(true);
    try {
      const saved = await appBackend.lpAds.projects.save(form);
      if (saved) onSave(saved);
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    await appBackend.lpAds.sourceAssets.save({ project_id: project.id, asset_type: 'url', file_url: urlInput.trim(), original_name: urlInput.trim() });
    setUrlInput('');
    onAssetsChange();
  };

  const handleAddText = async () => {
    if (!textInput.trim()) return;
    await appBackend.lpAds.sourceAssets.save({ project_id: project.id, asset_type: 'text', extracted_text: textInput.trim(), original_name: 'Descrição manual' });
    setTextInput('');
    onAssetsChange();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const url = await appBackend.lpAds.uploadAssetFile(project.id, file);
      const assetType = file.name.endsWith('.html') || file.name.endsWith('.htm') ? 'html_file' : 'pdf';
      await appBackend.lpAds.sourceAssets.save({ project_id: project.id, asset_type: assetType, file_url: url, original_name: file.name });
      onAssetsChange();
    } catch { /* silent */ }
    setUploadingFile(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteAsset = async (id: string) => {
    await appBackend.lpAds.sourceAssets.delete(id);
    onAssetsChange();
  };

  const updateField = (key: string, value: string) => {
    setForm({ ...form, [key]: value } as LPAdsProject);
  };

  return (
    <div className="space-y-8">
      {/* Source Assets */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileUp size={18} className="text-indigo-500" />
          Fontes de Referência
        </h3>
        <p className="text-xs text-slate-400 mb-4">Forneça materiais que ajudem a IA a entender seu produto. Quanto mais contexto, melhor o resultado.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Link2 size={12} /> URL de Referência</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border-2 border-slate-100 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button onClick={handleAddUrl} disabled={!urlInput.trim()} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-40 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* PDF / HTML */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Upload size={12} /> Upload PDF / HTML</label>
            <input ref={fileRef} type="file" accept=".pdf,.html,.htm" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFile}
              className="w-full px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {uploadingFile ? 'Enviando...' : 'Selecionar arquivo'}
            </button>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><FileText size={12} /> Texto Manual</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Informação adicional..."
                className="flex-1 px-3 py-2 border-2 border-slate-100 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button onClick={handleAddText} disabled={!textInput.trim()} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-40 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Assets List */}
        {assets.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase w-12">{asset.asset_type}</span>
                <span className="flex-1 text-slate-600 truncate">{asset.original_name || asset.file_url || 'Texto manual'}</span>
                <button onClick={() => handleDeleteAsset(asset.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Fields */}
      {FIELD_GROUPS.map((group, gi) => (
        <div key={gi} className="bg-white rounded-2xl border-2 border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            {group.icon}
            {group.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map(field => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={(form as any)[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={(form as any)[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-400 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !form.name?.trim()}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Dados do Produto
        </button>
      </div>
    </div>
  );
};
