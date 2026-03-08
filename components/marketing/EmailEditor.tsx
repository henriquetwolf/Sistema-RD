import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Type, Image, MousePointerClick, Minus, Columns2, Trash2, ChevronUp,
  ChevronDown, Variable, Eye, Code, GripVertical
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  htmlContent: string;
  onContentChange: (html: string) => void;
}

type BlockType = 'text' | 'image' | 'button' | 'divider' | 'columns';

interface EditorBlock {
  id: string;
  type: BlockType;
  data: Record<string, any>;
}

const VARIABLES = [
  { label: 'Nome', value: '{{nome}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Empresa', value: '{{empresa}}' },
  { label: 'Cidade', value: '{{cidade}}' },
];

const newId = () => crypto.randomUUID().slice(0, 8);

const defaultData: Record<BlockType, () => Record<string, any>> = {
  text: () => ({ html: '<p>Seu texto aqui...</p>' }),
  image: () => ({ url: '', alt: 'Imagem' }),
  button: () => ({ text: 'Clique aqui', url: '#', bgColor: '#9333ea', textColor: '#ffffff' }),
  divider: () => ({}),
  columns: () => ({
    left: '<p>Coluna esquerda</p>',
    right: '<p>Coluna direita</p>',
  }),
};

const blockToHtml = (block: EditorBlock): string => {
  switch (block.type) {
    case 'text':
      return `<div style="padding:12px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333">${block.data.html || ''}</div>`;
    case 'image':
      if (!block.data.url) return '';
      return `<div style="text-align:center;padding:12px 0"><img src="${block.data.url}" alt="${block.data.alt || ''}" style="max-width:100%;border-radius:8px" /></div>`;
    case 'button':
      return `<div style="text-align:center;padding:16px 0"><a href="${block.data.url || '#'}" style="display:inline-block;padding:12px 32px;background:${block.data.bgColor || '#9333ea'};color:${block.data.textColor || '#fff'};border-radius:8px;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif;font-size:15px">${block.data.text || 'Botão'}</a></div>`;
    case 'divider':
      return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />';
    case 'columns':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0"><tr><td width="50%" style="vertical-align:top;padding-right:8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333">${block.data.left || ''}</td><td width="50%" style="vertical-align:top;padding-left:8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333">${block.data.right || ''}</td></tr></table>`;
    default:
      return '';
  }
};

const generateFullHtml = (blocks: EditorBlock[]): string => {
  const body = blocks.map(blockToHtml).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px">${body}</div></body></html>`;
};

export const EmailEditor: React.FC<Props> = ({ htmlContent, onContentChange }) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    if (!htmlContent) return [];
    return [{ id: newId(), type: 'text', data: { html: htmlContent } }];
  });
  const [showVarDropdown, setShowVarDropdown] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const syncToParent = useCallback((updatedBlocks: EditorBlock[]) => {
    setBlocks(updatedBlocks);
    onContentChange(generateFullHtml(updatedBlocks));
  }, [onContentChange]);

  const addBlock = useCallback((type: BlockType) => {
    const block: EditorBlock = { id: newId(), type, data: defaultData[type]() };
    syncToParent([...blocks, block]);
  }, [blocks, syncToParent]);

  const removeBlock = useCallback((id: string) => {
    syncToParent(blocks.filter(b => b.id !== id));
  }, [blocks, syncToParent]);

  const moveBlock = useCallback((id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    syncToParent(copy);
  }, [blocks, syncToParent]);

  const updateBlockData = useCallback((id: string, patch: Record<string, any>) => {
    syncToParent(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...patch } } : b));
  }, [blocks, syncToParent]);

  const insertVariable = useCallback((blockId: string, field: string, variable: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const current = (block.data[field] || '') as string;
    updateBlockData(blockId, { [field]: current + variable });
    setShowVarDropdown(null);
  }, [blocks, updateBlockData]);

  const composedHtml = useMemo(() => generateFullHtml(blocks), [blocks]);

  const TOOLBAR_ITEMS: { type: BlockType; icon: React.ReactNode; label: string }[] = [
    { type: 'text', icon: <Type size={16} />, label: 'Texto' },
    { type: 'image', icon: <Image size={16} />, label: 'Imagem' },
    { type: 'button', icon: <MousePointerClick size={16} />, label: 'Botão' },
    { type: 'divider', icon: <Minus size={16} />, label: 'Divisor' },
    { type: 'columns', icon: <Columns2 size={16} />, label: '2 Colunas' },
  ];

  const renderBlockEditor = (block: EditorBlock) => {
    const varKey = `${block.id}_var`;
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Texto</span>
              <div className="relative">
                <button
                  onClick={() => setShowVarDropdown(showVarDropdown === varKey ? null : varKey)}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"
                >
                  <Variable size={12} /> Variável
                </button>
                {showVarDropdown === varKey && (
                  <div className="absolute top-8 left-0 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
                    {VARIABLES.map(v => (
                      <button
                        key={v.value}
                        onClick={() => insertVariable(block.id, 'html', v.value)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-slate-700"
                      >
                        <code className="text-purple-600 text-xs mr-2">{v.value}</code> {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              className="min-h-[80px] p-3 border border-slate-200 rounded-xl bg-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-300"
              dangerouslySetInnerHTML={{ __html: block.data.html }}
              onBlur={(e) => updateBlockData(block.id, { html: e.currentTarget.innerHTML })}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Imagem</span>
            <input
              type="text"
              placeholder="URL da imagem..."
              value={block.data.url || ''}
              onChange={e => updateBlockData(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <input
              type="text"
              placeholder="Texto alternativo (alt)"
              value={block.data.alt || ''}
              onChange={e => updateBlockData(block.id, { alt: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            {block.data.url && (
              <div className="flex justify-center p-2 bg-slate-50 rounded-xl">
                <img src={block.data.url} alt={block.data.alt || ''} className="max-h-40 rounded-lg object-contain" />
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Botão</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Texto do botão"
                value={block.data.text || ''}
                onChange={e => updateBlockData(block.id, { text: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <input
                type="text"
                placeholder="URL de destino"
                value={block.data.url || ''}
                onChange={e => updateBlockData(block.id, { url: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Cor fundo:</label>
              <input
                type="color"
                value={block.data.bgColor || '#9333ea'}
                onChange={e => updateBlockData(block.id, { bgColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <label className="text-xs text-slate-500">Cor texto:</label>
              <input
                type="color"
                value={block.data.textColor || '#ffffff'}
                onChange={e => updateBlockData(block.id, { textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
            </div>
            <div className="flex justify-center py-2">
              <span
                style={{ background: block.data.bgColor || '#9333ea', color: block.data.textColor || '#fff' }}
                className="inline-block px-6 py-2 rounded-lg font-bold text-sm"
              >
                {block.data.text || 'Botão'}
              </span>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-2">
            <hr className="border-slate-300" />
            <span className="text-xs text-slate-400">Linha divisória</span>
          </div>
        );

      case 'columns':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">2 Colunas</span>
              <div className="relative">
                <button
                  onClick={() => setShowVarDropdown(showVarDropdown === varKey ? null : varKey)}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"
                >
                  <Variable size={12} /> Variável
                </button>
                {showVarDropdown === varKey && (
                  <div className="absolute top-8 left-0 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
                    {VARIABLES.map(v => (
                      <button
                        key={v.value}
                        onClick={() => { insertVariable(block.id, 'left', v.value); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-slate-700"
                      >
                        <code className="text-purple-600 text-xs mr-2">{v.value}</code> {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[60px] p-3 border border-slate-200 rounded-xl bg-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-300"
                dangerouslySetInnerHTML={{ __html: block.data.left }}
                onBlur={e => updateBlockData(block.id, { left: e.currentTarget.innerHTML })}
              />
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[60px] p-3 border border-slate-200 rounded-xl bg-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-300"
                dangerouslySetInnerHTML={{ __html: block.data.right }}
                onBlur={e => updateBlockData(block.id, { right: e.currentTarget.innerHTML })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl mb-3">
        <span className="text-xs font-bold text-slate-500 mr-2">Inserir:</span>
        {TOOLBAR_ITEMS.map(item => (
          <button
            key={item.type}
            onClick={() => addBlock(item.type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors border border-slate-200"
          >
            {item.icon} {item.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            previewMode
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700"
          )}
        >
          {previewMode ? <Code size={14} /> : <Eye size={14} />}
          {previewMode ? 'Editor' : 'Preview'}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Editor */}
        {!previewMode && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Type size={40} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhum bloco adicionado</p>
                <p className="text-xs mt-1">Use a barra acima para inserir blocos</p>
              </div>
            )}
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical size={14} className="text-slate-300" />
                  <div className="flex-1" />
                  <button
                    onClick={() => moveBlock(block.id, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, 1)}
                    disabled={idx === blocks.length - 1}
                    className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => removeBlock(block.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {renderBlockEditor(block)}
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className={clsx("bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden", previewMode ? "flex-1" : "w-[360px] flex-shrink-0")}>
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
            <Eye size={14} className="text-purple-500" />
            <span className="text-xs font-bold text-slate-500 uppercase">Preview</span>
          </div>
          <div className="p-2 h-full">
            <iframe
              ref={iframeRef}
              srcDoc={composedHtml}
              className="w-full h-full border-0 rounded-xl bg-white"
              style={{ minHeight: 400 }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
