import React from 'react';
import { X, Copy, BarChart3, Check } from 'lucide-react';
import { SupabaseConfig } from '../types';

interface IntegrationHelpProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
}

export const IntegrationHelp: React.FC<IntegrationHelpProps> = ({ isOpen, onClose, config }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Extract project ID from URL if available
  const getProjectRef = () => {
    if (!config.url) return '[PROJECT_REF]';
    const match = config.url.match(/https:\/\/(.*?)\.supabase\.co/);
    return match ? match[1] : '[PROJECT_REF]';
  };

  const projectRef = getProjectRef();
  const tableName = config.tableName || '[NOME_DA_TABELA]';
  
  // Construct the example URL
  const apiUrl = `https://${projectRef}.supabase.co/rest/v1/${tableName}?select=*`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-900">
            <div className="bg-indigo-100 p-2 rounded-lg">
                <BarChart3 size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold">Integrar Supabase com Power BI</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-slate-700 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 mb-6">
            Siga os passos abaixo no <strong>Power BI Desktop</strong> para conectar sua tabela do Supabase em tempo real.
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Iniciar Conexão Web</h3>
              <p className="text-sm text-slate-500">
                Abra o Power BI, clique em <strong>Obter Dados</strong> na barra superior e selecione a opção <strong>Web</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Configurar URL da API</h3>
              <p className="text-sm text-slate-500 mb-2">
                Selecione a opção <strong>Avançado</strong>. No campo URL, insira o endpoint da sua tabela:
              </p>
              <div className="bg-slate-100 border border-slate-200 rounded p-3 text-xs font-mono break-all relative group">
                {apiUrl}
                <button 
                    onClick={() => handleCopy(apiUrl, 'url')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar Template"
                >
                    {copiedField === 'url' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                 O link acima foi gerado com base na sua configuração atual.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Adicionar Cabeçalhos (Headers)</h3>
              <p className="text-sm text-slate-500 mb-3">
                Ainda na tela "Avançado", adicione os seguintes parâmetros de cabeçalho de solicitação HTTP:
              </p>

              <div className="space-y-3">
                {/* Header 1 */}
                <div className="flex items-center gap-2">
                    <div className="w-24 text-xs font-bold text-slate-600 text-right">apikey</div>
                    <div className="flex-1 bg-slate-100 border border-slate-200 rounded p-2 text-xs font-mono flex justify-between items-center group">
                        <span>SUA_ANON_KEY</span>
                        <button 
                            onClick={() => handleCopy('SUA_ANON_KEY', 'apikey')}
                            className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {copiedField === 'apikey' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* Header 2 */}
                <div className="flex items-center gap-2">
                    <div className="w-24 text-xs font-bold text-slate-600 text-right">Authorization</div>
                    <div className="flex-1 bg-slate-100 border border-slate-200 rounded p-2 text-xs font-mono flex justify-between items-center group">
                        <span>Bearer SUA_ANON_KEY</span>
                        <button 
                            onClick={() => handleCopy('Bearer SUA_ANON_KEY', 'auth')}
                            className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {copiedField === 'auth' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                 {/* Header 3 */}
                 <div className="flex items-center gap-2">
                    <div className="w-24 text-xs font-bold text-slate-600 text-right">Content-Type</div>
                    <div className="flex-1 bg-slate-100 border border-slate-200 rounded p-2 text-xs font-mono flex justify-between items-center group">
                        <span>application/json</span>
                        <button 
                            onClick={() => handleCopy('application/json', 'content')}
                            className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
                <strong>Nota:</strong> Substitua <code>SUA_ANON_KEY</code> pela chave "anon/public" encontrada nas configurações de API do seu projeto Supabase.
              </div>

            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
                Entendi
            </button>
        </div>
      </div>
    </div>
  );
};