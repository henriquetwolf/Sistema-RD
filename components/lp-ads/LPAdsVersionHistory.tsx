import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, Loader2, Eye, ArrowLeftRight, Sparkles, Code, User } from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../../services/appBackend';
import { LPAdsLPVersion } from './types';

interface Props {
  landingPageId: string;
  currentVersion: number;
  onRestoreVersion?: (version: LPAdsLPVersion) => void;
}

export const LPAdsVersionHistory: React.FC<Props> = ({ landingPageId, currentVersion, onRestoreVersion }) => {
  const [versions, setVersions] = useState<LPAdsLPVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<LPAdsLPVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState<LPAdsLPVersion | null>(null);
  const [compareVersionB, setCompareVersionB] = useState<LPAdsLPVersion | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await appBackend.lpAds.lpVersions.listByLP(landingPageId);
      setVersions(data || []);
      setIsLoading(false);
    };
    load();
  }, [landingPageId, currentVersion]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        <Clock size={24} className="mx-auto mb-2 text-slate-300" />
        Nenhuma versão registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Clock size={14} /> Histórico de Versões ({versions.length})
        </h4>
        {versions.length >= 2 && (
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareVersionA(null);
              setCompareVersionB(null);
            }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors',
              compareMode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'
            )}
          >
            <ArrowLeftRight size={12} /> {compareMode ? 'Cancelar' : 'Comparar'}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {versions.map((version, idx) => {
          const isCurrent = version.version_number === currentVersion;
          const isSelectedA = compareVersionA?.id === version.id;
          const isSelectedB = compareVersionB?.id === version.id;

          return (
            <div
              key={version.id}
              onClick={() => {
                if (compareMode) {
                  if (!compareVersionA) setCompareVersionA(version);
                  else if (!compareVersionB && version.id !== compareVersionA.id) setCompareVersionB(version);
                  else {
                    setCompareVersionA(version);
                    setCompareVersionB(null);
                  }
                } else {
                  setSelectedVersion(selectedVersion?.id === version.id ? null : version);
                }
              }}
              className={clsx(
                'relative px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm',
                isCurrent ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200',
                (isSelectedA || isSelectedB) && 'border-purple-300 bg-purple-50',
                selectedVersion?.id === version.id && !compareMode && 'border-indigo-400 bg-indigo-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">v{version.version_number}</span>
                  {isCurrent && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">Atual</span>}
                  {isSelectedA && <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">A</span>}
                  {isSelectedB && <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">B</span>}
                </div>
                <span className="text-[10px] text-slate-400">{new Date(version.created_at).toLocaleString('pt-BR')}</span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5"><Sparkles size={10} /> {version.model_used || 'manual'}</span>
                {version.tokens_input > 0 && <span>{version.tokens_input + version.tokens_output} tokens</span>}
                <span className="flex items-center gap-0.5"><User size={10} /> {version.generated_by}</span>
              </div>

              {/* Expanded Details */}
              {selectedVersion?.id === version.id && !compareMode && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {version.prompt_used && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Prompt usado:</p>
                      <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg max-h-32 overflow-y-auto font-mono">{version.prompt_used.substring(0, 500)}...</p>
                    </div>
                  )}
                  {onRestoreVersion && !isCurrent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRestoreVersion(version); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Eye size={12} /> Restaurar esta versão
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compare View */}
      {compareMode && compareVersionA && compareVersionB && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 p-4">
          <h4 className="text-xs font-bold text-purple-600 mb-3">Comparação: v{compareVersionA.version_number} vs v{compareVersionB.version_number}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">v{compareVersionA.version_number} ({new Date(compareVersionA.created_at).toLocaleDateString('pt-BR')})</p>
              {compareVersionA.html_code ? (
                <iframe srcDoc={compareVersionA.html_code} className="w-full border rounded-lg" style={{ height: 400 }} sandbox="allow-scripts" title="Version A" />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-xs">
                  {(compareVersionA.content?.sections || []).map((s: any, i: number) => (
                    <div key={i} className="mb-2">
                      <span className="font-bold text-slate-500">{s.type}:</span> {s.headline}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-2">v{compareVersionB.version_number} ({new Date(compareVersionB.created_at).toLocaleDateString('pt-BR')})</p>
              {compareVersionB.html_code ? (
                <iframe srcDoc={compareVersionB.html_code} className="w-full border rounded-lg" style={{ height: 400 }} sandbox="allow-scripts" title="Version B" />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-xs">
                  {(compareVersionB.content?.sections || []).map((s: any, i: number) => (
                    <div key={i} className="mb-2">
                      <span className="font-bold text-slate-500">{s.type}:</span> {s.headline}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
