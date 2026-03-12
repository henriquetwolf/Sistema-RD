import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Wifi, Copy, Link2 } from 'lucide-react';
import { appBackend } from '../../services/appBackend';
import { evolutionProxy } from '../../services/evolutionProxy';
import clsx from 'clsx';

interface WAConfigState {
  mode: 'evolution' | 'twilio';
  evolutionMethod: 'qr' | 'code';
  instanceUrl: string;
  instanceName: string;
  apiKey: string;
  pairingNumber: string;
  isConnected: boolean;
}

const WEBHOOK_URL = 'https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/rapid-service';

export const WhatsAppConfig: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [waConfig, setWaConfig] = useState<WAConfigState>({
    mode: 'evolution',
    evolutionMethod: 'qr',
    instanceUrl: '',
    instanceName: '',
    apiKey: '',
    pairingNumber: '',
    isConnected: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCodeValue, setPairingCodeValue] = useState<string | null>(null);
  const [connLogs, setConnLogs] = useState<string[]>([]);

  useEffect(() => {
    appBackend.getWhatsAppConfig().then((c) => {
      if (c) setWaConfig((prev) => ({ ...prev, ...c }));
    });
  }, []);

  const checkStatus = async (target?: WAConfigState) => {
    const t = target || waConfig;
    if (!t.instanceUrl || !t.instanceName) return;
    try {
      let baseUrl = t.instanceUrl.trim();
      if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
      baseUrl = baseUrl.replace(/\/$/, '');
      const state = await evolutionProxy.checkConnectionState(baseUrl, t.apiKey.trim(), t.instanceName.trim());
      setWaConfig((prev) => ({ ...prev, isConnected: state === 'open' }));
    } catch {
      setWaConfig((prev) => ({ ...prev, isConnected: false }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sanitized = {
        ...waConfig,
        instanceUrl: waConfig.instanceUrl.trim().replace(/\/$/, ''),
        instanceName: waConfig.instanceName.trim(),
        apiKey: waConfig.apiKey.trim(),
      };
      await appBackend.saveWhatsAppConfig(sanitized);
      setWaConfig(sanitized);
      alert('Configurações do WhatsApp salvas!');
      checkStatus(sanitized);
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!waConfig.instanceUrl || !waConfig.instanceName) {
      alert('Preencha URL da API e Nome da Instância.');
      return;
    }
    setIsConnecting(true);
    setQrCodeUrl(null);
    setPairingCodeValue(null);
    setConnLogs(['Iniciando tentativa de conexão via proxy...']);
    try {
      let baseUrl = waConfig.instanceUrl.trim();
      if (!baseUrl.includes('://')) baseUrl = `https://${baseUrl}`;
      baseUrl = baseUrl.replace(/\/$/, '');
      const instanceName = waConfig.instanceName.trim();
      const apiKey = waConfig.apiKey.trim();

      if (waConfig.evolutionMethod === 'code') {
        const cleanNumber = (waConfig.pairingNumber || '').replace(/\D/g, '');
        if (!cleanNumber) throw new Error('Número de pareamento é obrigatório.');
        setConnLogs((prev) => ['Solicitando código de pareamento...', ...prev]);
        const code = await evolutionProxy.connectPairingCode(baseUrl, apiKey, instanceName, cleanNumber);
        if (code === 'ALREADY_CONNECTED') {
          setWaConfig((prev) => ({ ...prev, isConnected: true }));
          setConnLogs((prev) => ['WhatsApp já está conectado!', ...prev]);
          return;
        }
        setPairingCodeValue(code);
      } else {
        setConnLogs((prev) => ['Gerando QR Code...', ...prev]);
        const data = await evolutionProxy.connectQrCode(baseUrl, apiKey, instanceName);
        if (data.alreadyConnected) {
          setWaConfig((prev) => ({ ...prev, isConnected: true }));
          setConnLogs((prev) => ['WhatsApp já está conectado!', ...prev]);
          return;
        }
        const token = data.base64 || data.code;
        if (!token) throw new Error('A API não retornou QR Code.');
        setQrCodeUrl(
          token.startsWith('data:image')
            ? token
            : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`
        );
      }
      setConnLogs((prev) => ['Conexão solicitada com sucesso!', ...prev]);
    } catch (err: any) {
      setConnLogs((prev) => [`[ERRO] ${err.message}`, ...prev]);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium">
          ← Voltar
        </button>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Settings className="text-green-600" size={24} />
          <div>
            <h3 className="text-lg font-black text-slate-800">Configurar WhatsApp (Evolution API)</h3>
            <p className="text-xs text-slate-500">Usada para automações, fluxos e campanhas de WhatsApp</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL da API</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                value={waConfig.instanceUrl}
                onChange={(e) => setWaConfig({ ...waConfig, instanceUrl: e.target.value })}
                placeholder="https://api.voll.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da instância</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                value={waConfig.instanceName}
                onChange={(e) => setWaConfig({ ...waConfig, instanceName: e.target.value })}
                placeholder="Instancia_VOLL"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key Global</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                value={waConfig.apiKey}
                onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-indigo-700 uppercase flex items-center gap-2">
              <Link2 size={12} /> URL de Webhook para Evolution API
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-indigo-900"
                value={WEBHOOK_URL}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(WEBHOOK_URL);
                  alert('Link do Webhook copiado!');
                }}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                title="Copiar URL"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 bg-green-50 rounded-xl border border-green-100 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-green-800 uppercase">Conectar novo aparelho</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setWaConfig({ ...waConfig, evolutionMethod: 'qr' })}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold uppercase',
                    waConfig.evolutionMethod === 'qr' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border'
                  )}
                >
                  QR Code
                </button>
                <button
                  onClick={() => setWaConfig({ ...waConfig, evolutionMethod: 'code' })}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold uppercase',
                    waConfig.evolutionMethod === 'code' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border'
                  )}
                >
                  Código
                </button>
              </div>
            </div>
            {waConfig.evolutionMethod === 'code' && (
              <div>
                <label className="block text-xs font-bold text-green-700 uppercase mb-1">Celular (DDI+DDD)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-green-200 rounded-xl text-sm"
                  placeholder="5551999999999"
                  value={waConfig.pairingNumber}
                  onChange={(e) => setWaConfig({ ...waConfig, pairingNumber: e.target.value })}
                />
              </div>
            )}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
              Iniciar pareamento
            </button>
            {qrCodeUrl && (
              <div className="flex flex-col items-center pt-4">
                <div className="p-4 bg-white rounded-2xl shadow border-2 border-green-100">
                  <img src={qrCodeUrl} className="w-48 h-48" alt="QR Code" />
                </div>
                <p className="text-xs text-green-600 font-bold mt-4">Escaneie com seu celular</p>
              </div>
            )}
            {pairingCodeValue && (
              <div className="text-center pt-4">
                <div className="inline-block px-8 py-4 bg-white rounded-2xl shadow border-2 border-green-200 text-2xl font-black tracking-widest text-green-600">
                  {pairingCodeValue}
                </div>
                <p className="text-xs text-green-600 font-bold mt-4 uppercase">Digite no seu WhatsApp</p>
              </div>
            )}
            <div className="space-y-1">
              {connLogs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-green-600">
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar configurações
          </button>
        </div>
      </div>
    </div>
  );
};
