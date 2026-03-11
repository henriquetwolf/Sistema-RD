const APP_URL = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
const APP_KEY = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;

const PROXY_URL = APP_URL
  ? `${APP_URL}/functions/v1/evolution-proxy`
  : "https://wfrzsnwisypmgsbeccfj.supabase.co/functions/v1/evolution-proxy";

interface ProxyRequest {
  baseUrl: string;
  apiKey: string;
  endpoint: string;
  method?: "GET" | "POST";
  body?: any;
}

interface ProxyResult {
  data: any;
  ok: boolean;
  status: number;
}

async function callProxy(params: ProxyRequest): Promise<ProxyResult> {
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_KEY ? { "apikey": APP_KEY } : {}),
    },
    body: JSON.stringify(params),
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do proxy: ${text.substring(0, 150)}`);
  }

  return { data, ok: response.ok, status: response.status };
}

export const evolutionProxy = {
  checkConnectionState: async (baseUrl: string, apiKey: string, instanceName: string): Promise<string> => {
    try {
      const result = await callProxy({
        baseUrl,
        apiKey,
        endpoint: `/instance/connectionState/${instanceName}`,
      });
      return result.data?.instance?.state || result.data?.state || "closed";
    } catch {
      return "closed";
    }
  },

  connectQrCode: async (baseUrl: string, apiKey: string, instanceName: string): Promise<{ base64?: string; code?: string }> => {
    const result = await callProxy({
      baseUrl,
      apiKey,
      endpoint: `/instance/connect/${instanceName}`,
    });
    if (!result.ok) throw new Error(result.data?.message || `Erro ao gerar QR Code (HTTP ${result.status})`);
    return result.data;
  },

  connectPairingCode: async (baseUrl: string, apiKey: string, instanceName: string, number: string): Promise<string> => {
    const endpoints = [
      `/instance/connect/${instanceName}?number=${number}`,
      `/instance/connect/pairing-code/${instanceName}?number=${number}`,
      `/instance/connect/pairingCode/${instanceName}?number=${number}`,
    ];

    let lastError = "";
    for (const endpoint of endpoints) {
      try {
        const result = await callProxy({ baseUrl, apiKey, endpoint });
        if (result.status === 404) continue;
        if (!result.ok) {
          lastError = result.data?.message || `Erro HTTP ${result.status}`;
          continue;
        }
        const code = result.data?.code || result.data?.pairingCode;
        if (code) return code;
      } catch (e: any) {
        lastError = e.message;
      }
    }
    throw new Error(lastError || "Nenhum endpoint de pareamento respondeu. Verifique a URL e versão da API.");
  },

  sendTextMessage: async (baseUrl: string, apiKey: string, instanceName: string, number: string, text: string): Promise<any> => {
    const result = await callProxy({
      baseUrl,
      apiKey,
      endpoint: `/message/sendText/${instanceName}`,
      method: "POST",
      body: { number, options: { delay: 1200, presence: "composing" }, text },
    });
    if (!result.ok) throw new Error(result.data?.message || "Erro na Evolution API.");
    return result.data;
  },
};
