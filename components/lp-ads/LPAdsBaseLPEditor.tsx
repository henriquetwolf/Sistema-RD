import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Code, Layout, Loader2, Save, RefreshCw, Eye,
  Monitor, Smartphone, Copy, ExternalLink, Upload, FileText,
  Plus, ChevronDown, ChevronUp, Trash2, GripVertical, Edit2,
  Wand2, CheckCircle, FormInput, MessageCircle, Megaphone
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { LPAdsProject, LPAdsLandingPage, LPAdsSourceAsset, LPAdsCreationMode, LP_ADS_SECTION_TYPES } from './types';
import { FormModel } from '../../types';

interface Props {
  project: LPAdsProject;
  baseLp: LPAdsLandingPage | null;
  assets: LPAdsSourceAsset[];
  onLPChange: () => void;
}

export const LPAdsBaseLPEditor: React.FC<Props> = ({ project, baseLp, assets, onLPChange }) => {
  const [lp, setLp] = useState<LPAdsLandingPage | null>(baseLp);
  const [creationMode, setCreationMode] = useState<LPAdsCreationMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [htmlCode, setHtmlCode] = useState(baseLp?.html_code || '');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [availableForms, setAvailableForms] = useState<FormModel[]>([]);
  const [selectedFormId, setSelectedFormId] = useState(baseLp?.selected_form_id || '');
  const [ctaLink, setCtaLink] = useState(baseLp?.cta_link || '');
  const [showPopups, setShowPopups] = useState(baseLp?.show_popups ?? true);
  const [showWaButton, setShowWaButton] = useState(baseLp?.show_wa_button ?? true);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    appBackend.getForms().then(forms => setAvailableForms(forms || []));
  }, []);

  useEffect(() => {
    setLp(baseLp);
    setHtmlCode(baseLp?.html_code || '');
    setSelectedFormId(baseLp?.selected_form_id || '');
    setCtaLink(baseLp?.cta_link || '');
    setShowPopups(baseLp?.show_popups ?? true);
    setShowWaButton(baseLp?.show_wa_button ?? true);
  }, [baseLp]);

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setGenerationProgress('Iniciando geração...');
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'generate_base_lp',
        project_id: project.id,
      });

      if (result?.success && result?.job_id) {
        if (result.status === 'completed') {
          onLPChange();
        } else {
          setGenerationProgress('IA gerando sua página de vendas... Isso pode levar até 2 minutos.');
          const jobResult = await appBackend.lpAds.waitForJob(result.job_id, (status) => {
            if (status === 'running') setGenerationProgress('IA gerando sua página de vendas... Aguarde...');
            else if (status === 'completed') setGenerationProgress('Página gerada! Carregando...');
          });
          if (jobResult.success) {
            onLPChange();
          } else if (jobResult.status !== 'timeout') {
            alert(jobResult.error || 'Erro na geração.');
          } else {
            alert('A geração está demorando mais que o esperado. Recarregue a página em alguns instantes.');
          }
        }
      } else if (result?.success && result?.result) {
        // Old Edge Function format — result returned directly
        onLPChange();
      } else if (result?.error) {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar landing page.');
    }
    setIsGenerating(false);
    setGenerationProgress('');
  };

  const handleImportHtml = async (html: string) => {
    setSaving(true);
    try {
      const payload: any = {
        project_id: project.id,
        page_type: 'base',
        creation_mode: 'import_html',
        title: `${project.name} - Landing Page Base`,
        html_code: html,
        content: { sections: [] },
        selected_form_id: selectedFormId || null,
        cta_link: ctaLink,
        show_popups: showPopups,
        show_wa_button: showWaButton,
        status: 'generated',
        current_version: 1,
      };
      if (lp?.id) payload.id = lp.id;
      await appBackend.lpAds.landingPages.save(payload);
      onLPChange();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleCreateBlank = async () => {
    setSaving(true);
    try {
      const blankSections = LP_ADS_SECTION_TYPES.map((s, i) => ({
        id: `section_${i}`,
        type: s.type,
        enabled: true,
        headline: '',
        body: '',
        items: [],
        cta: '',
      }));
      const payload: any = {
        project_id: project.id,
        page_type: 'base',
        creation_mode: 'blank_template',
        title: `${project.name} - Landing Page Base`,
        html_code: '',
        content: { sections: blankSections },
        selected_form_id: selectedFormId || null,
        cta_link: ctaLink,
        show_popups: showPopups,
        show_wa_button: showWaButton,
        status: 'draft',
        current_version: 1,
      };
      await appBackend.lpAds.landingPages.save(payload);
      onLPChange();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleSaveLP = async () => {
    if (!lp) return;
    setSaving(true);
    try {
      await appBackend.lpAds.landingPages.save({
        ...lp,
        html_code: htmlCode,
        selected_form_id: selectedFormId || null,
        cta_link: ctaLink,
        show_popups: showPopups,
        show_wa_button: showWaButton,
      });
      onLPChange();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleRewriteHtml = async () => {
    if (!rewriteInstruction.trim() || !htmlCode) return;
    setIsRewriting(true);
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'rewrite_html',
        project_id: project.id,
        target_id: lp?.id,
        user_instruction: rewriteInstruction,
      });
      if (result?.success) {
        if (result.job_id && result.status !== 'completed') {
          await appBackend.lpAds.waitForJob(result.job_id);
        }
        setRewriteInstruction('');
        onLPChange();
      }
    } catch { /* silent */ }
    setIsRewriting(false);
  };

  const handleRegenerateSection = async (sectionId: string) => {
    setRegeneratingSection(sectionId);
    try {
      const result = await appBackend.lpAds.generate({
        job_type: 'regenerate_section',
        project_id: project.id,
        target_id: lp?.id,
        section_id: sectionId,
      });
      if (result?.success) {
        if (result.job_id && result.status !== 'completed') {
          await appBackend.lpAds.waitForJob(result.job_id);
        }
        onLPChange();
      }
    } catch { /* silent */ }
    setRegeneratingSection(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setHtmlCode(text);
      setCreationMode('import_html');
    };
    reader.readAsText(file);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const sections = lp?.content?.sections || [];

  // No LP yet -- show creation mode selector
  if (!lp) {
    return (
      <div className="space-y-6">
        {!creationMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleGenerateWithAI()}
              disabled={isGenerating}
              className="bg-white rounded-2xl border-2 border-slate-100 p-8 hover:border-indigo-300 hover:shadow-lg transition-all text-center group"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={36} className="mx-auto mb-4 text-indigo-400 animate-spin" />
                  <h3 className="font-bold text-indigo-600 mb-1">Gerando página...</h3>
                  <p className="text-xs text-indigo-400">{generationProgress || 'Preparando...'}</p>
                </>
              ) : (
                <>
                  <Sparkles size={36} className="mx-auto mb-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-slate-800 mb-1">Gerar com IA</h3>
                  <p className="text-xs text-slate-400">A IA cria uma landing page completa e estilizada baseada nos dados do produto</p>
                </>
              )}
            </button>

            <button
              onClick={() => setCreationMode('import_html')}
              className="bg-white rounded-2xl border-2 border-slate-100 p-8 hover:border-purple-300 hover:shadow-lg transition-all text-center group"
            >
              <Code size={36} className="mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-800 mb-1">Importar Código HTML</h3>
              <p className="text-xs text-slate-400">Cole HTML de outra plataforma (Elementor, Webflow, etc.)</p>
            </button>

            <button
              onClick={handleCreateBlank}
              disabled={saving}
              className="bg-white rounded-2xl border-2 border-slate-100 p-8 hover:border-emerald-300 hover:shadow-lg transition-all text-center group"
            >
              <Layout size={36} className="mx-auto mb-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-800 mb-1">Template em Branco</h3>
              <p className="text-xs text-slate-400">Comece do zero com blocos vazios para preencher manualmente</p>
            </button>
          </div>
        )}

        {/* Import HTML Mode */}
        {creationMode === 'import_html' && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Code size={18} className="text-purple-500" /> Importar Código HTML
              </h3>
              <button onClick={() => setCreationMode(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">
                Voltar
              </button>
            </div>

            <div className="flex gap-3">
              <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
              >
                <Upload size={14} /> Upload arquivo .html
              </button>
            </div>

            <textarea
              value={htmlCode}
              onChange={e => setHtmlCode(e.target.value)}
              placeholder="Cole aqui o código HTML da sua página..."
              rows={16}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-xs font-mono focus:border-purple-400 focus:outline-none resize-none bg-slate-50"
            />

            <button
              onClick={() => handleImportHtml(htmlCode)}
              disabled={saving || !htmlCode.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Salvar Landing Page
            </button>
          </div>
        )}
      </div>
    );
  }

  // LP exists -- show editor + preview
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border-2 border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCodeEditor(!showCodeEditor)} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors', showCodeEditor ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-50')}>
            <Code size={14} /> Código
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setPreviewDevice('desktop')} className={clsx('p-1.5 transition-colors', previewDevice === 'desktop' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <Monitor size={14} />
            </button>
            <button onClick={() => setPreviewDevice('mobile')} className={clsx('p-1.5 transition-colors', previewDevice === 'mobile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <Smartphone size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={copyHtml} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
            {copiedHtml ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedHtml ? 'Copiado!' : 'Copiar HTML'}
          </button>
          {lp && (
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?lpAdsPageId=${lp.id}`;
                window.open(url, '_blank');
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <ExternalLink size={14} /> Abrir Página
            </button>
          )}
          <button onClick={handleSaveLP} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>

      {/* Marketing Integrations Panel */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Integrações VOLL Marketing</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <FormInput size={10} /> Formulário
            </label>
            <select
              value={selectedFormId}
              onChange={e => setSelectedFormId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-100 rounded-lg text-xs focus:border-indigo-400 focus:outline-none cursor-pointer"
            >
              <option value="">Nenhum formulário</option>
              {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Link do CTA</label>
            <input
              type="text"
              value={ctaLink}
              onChange={e => setCtaLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-100 rounded-lg text-xs focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showPopups} onChange={e => setShowPopups(e.target.checked)} className="accent-indigo-600" />
              <span className="text-xs text-slate-600 font-medium">Pop-ups</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showWaButton} onChange={e => setShowWaButton(e.target.checked)} className="accent-indigo-600" />
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1"><MessageCircle size={12} /> WhatsApp</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* AI Rewrite */}
          {htmlCode && (
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-4">
              <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                <Wand2 size={14} className="text-indigo-500" /> Pedir ao Claude para melhorar
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rewriteInstruction}
                  onChange={e => setRewriteInstruction(e.target.value)}
                  placeholder="Ex: Mude as cores para azul, melhore a headline, adicione mais provas sociais..."
                  className="flex-1 px-3 py-2 border border-slate-100 rounded-lg text-xs focus:border-indigo-400 focus:outline-none"
                />
                <button
                  onClick={handleRewriteHtml}
                  disabled={isRewriting || !rewriteInstruction.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {isRewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Reescrever
                </button>
              </div>
            </div>
          )}

          {/* Code Editor */}
          {showCodeEditor && (
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-4">
              <textarea
                value={htmlCode}
                onChange={e => setHtmlCode(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-slate-100 rounded-lg text-xs font-mono bg-slate-50 focus:border-purple-400 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Section Editor */}
          {!showCodeEditor && sections.length > 0 && (
            <div className="space-y-2">
              {sections.map((section: any, idx: number) => (
                <div key={section.id || idx} className="bg-white rounded-2xl border-2 border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-500 uppercase">{LP_ADS_SECTION_TYPES.find(s => s.type === section.type)?.label || section.type}</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={section.enabled !== false}
                          onChange={e => {
                            const updated = [...sections];
                            updated[idx] = { ...updated[idx], enabled: e.target.checked };
                            setLp({ ...lp!, content: { ...lp!.content, sections: updated } });
                          }}
                          className="accent-indigo-600"
                        />
                        <span className="text-[10px] text-slate-400">Visível</span>
                      </label>
                    </div>
                    <button
                      onClick={() => handleRegenerateSection(section.id)}
                      disabled={regeneratingSection === section.id}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {regeneratingSection === section.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Regenerar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={section.headline || ''}
                    onChange={e => {
                      const updated = [...sections];
                      updated[idx] = { ...updated[idx], headline: e.target.value };
                      setLp({ ...lp!, content: { ...lp!.content, sections: updated } });
                    }}
                    placeholder="Headline..."
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg text-sm font-bold focus:border-indigo-400 focus:outline-none mb-2"
                  />
                  <textarea
                    value={section.body || ''}
                    onChange={e => {
                      const updated = [...sections];
                      updated[idx] = { ...updated[idx], body: e.target.value };
                      setLp({ ...lp!, content: { ...lp!.content, sections: updated } });
                    }}
                    placeholder="Conteúdo..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg text-xs focus:border-indigo-400 focus:outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Generate again */}
          <button
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? (generationProgress || 'Gerando...') : lp ? 'Regenerar Landing Page Completa' : 'Gerar com IA'}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Eye size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Preview</span>
          </div>
          <div className={clsx('mx-auto transition-all', previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full')}>
            {htmlCode ? (
              <iframe
                srcDoc={htmlCode}
                className="w-full border-0"
                style={{ minHeight: 600 }}
                sandbox="allow-scripts allow-same-origin"
                title="LP Preview"
              />
            ) : sections.length > 0 ? (
              <div className="p-6 space-y-6">
                {sections.filter((s: any) => s.enabled !== false).map((section: any, idx: number) => (
                  <div key={idx} className="border-b border-slate-100 pb-4 last:border-0">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">{section.type}</p>
                    {section.headline && <h3 className="text-lg font-bold text-slate-800 mb-1">{section.headline}</h3>}
                    {section.body && <p className="text-sm text-slate-600">{section.body}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-32 text-slate-300">
                <p className="text-sm">Nenhum conteúdo ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
