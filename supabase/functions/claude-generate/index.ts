import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { job_type, project_id, target_id, section_id, user_instruction } = body;

    // ── Validation-only flow ────────────────────────────────
    if (project_id === "validate-only") {
      const config = await getActiveConfig(supabase);
      if (!config) return json({ success: false, error: "Nenhum provider de IA configurado e ativo." });
      const testResult = await validateProvider(config);
      return json(testResult);
    }

    // ── Poll job status flow ────────────────────────────────
    if (job_type === "poll_status") {
      const jobId = target_id;
      const { data: jobData } = await supabase
        .from("lp_ads_generation_jobs")
        .select("id, status, error_message, finished_at, model_used, tokens_input, tokens_output, cost_estimate")
        .eq("id", jobId)
        .single();
      if (!jobData) return json({ success: false, error: "Job não encontrado" });
      return json({ success: true, job: jobData });
    }

    // ── Get active AI config ────────────────────────────────
    const config = await getActiveConfig(supabase);
    if (!config) {
      return json({ success: false, error: "Configure um provider de IA (Claude ou OpenRouter) antes de gerar." });
    }

    const { data: project } = await supabase
      .from("lp_ads_projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (!project) return json({ success: false, error: "Projeto não encontrado" });

    const { data: assets } = await supabase
      .from("lp_ads_source_assets")
      .select("*")
      .eq("project_id", project_id);

    // ── Build prompt (pre-flight) ───────────────────────────
    const productData = buildProductData(project);
    const referenceContent = buildReferenceContent(assets || []);

    let prompt = "";
    const defaultSystemPrompt = `Você é um copywriter sênior de vendas e web designer de classe mundial.
Você cria landing pages de alta conversão, visualmente impressionantes, com HTML completo usando Tailwind CSS.
Suas páginas são profissionais, modernas e geram milhões em vendas.
Você SEMPRE retorna JSON válido quando solicitado.
Nunca retorne apenas texto simples — sempre gere HTML completo e estilizado.`;
    let systemPrompt = config.system_prompt || defaultSystemPrompt;

    if (job_type === "generate_base_lp") {
      prompt = buildBaseLPPrompt(productData, referenceContent, project.tone_of_voice || "Profissional");
    } else if (job_type === "generate_ad") {
      const { data: campaign } = await supabase.from("lp_ads_campaigns").select("*").eq("id", target_id).single();
      if (!campaign) return json({ success: false, error: "Campanha não encontrada" });
      prompt = buildAdPrompt(productData, campaign);
    } else if (job_type === "generate_variant_lp") {
      const { data: campaign } = await supabase.from("lp_ads_campaigns").select("*").eq("id", target_id).single();
      const { data: baseLp } = await supabase.from("lp_ads_landing_pages").select("*").eq("project_id", project_id).eq("page_type", "base").maybeSingle();
      if (!campaign || !baseLp) return json({ success: false, error: "Campanha ou LP base não encontrada" });
      prompt = buildVariantLPPrompt(productData, baseLp, campaign);
    } else if (job_type === "regenerate_section") {
      const { data: lp } = await supabase.from("lp_ads_landing_pages").select("*").eq("id", target_id).single();
      if (!lp) return json({ success: false, error: "Landing page não encontrada" });
      prompt = buildRegenerateSectionPrompt(productData, lp, section_id || "", user_instruction || "Melhore esta seção");
    } else if (job_type === "rewrite_html") {
      const { data: lp } = await supabase.from("lp_ads_landing_pages").select("*").eq("id", target_id).single();
      if (!lp) return json({ success: false, error: "Landing page não encontrada" });
      prompt = `Reescreva o HTML da landing page seguindo estas instruções: ${user_instruction}

HTML ATUAL:
${lp.html_code}

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o HTML completo (<!DOCTYPE html> até </html>)
2. MANTENHA {{form}} e {{cta_link}} nos mesmos locais
3. INCLUA o CDN do Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
4. INCLUA Google Fonts: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
5. Use design moderno: gradientes, sombras, cards, espaçamento amplo, tipografia forte
6. A página deve ser visualmente impressionante e profissional
7. Responsivo com breakpoints md: e lg:

NÃO retorne JSON — retorne APENAS o HTML completo.`;
    } else {
      return json({ success: false, error: `Tipo de job desconhecido: ${job_type}` });
    }

    // ── Create job record ───────────────────────────────────
    const jobRecord = {
      project_id,
      target_id: target_id || null,
      target_type: getTargetType(job_type),
      job_type,
      status: "running",
      started_at: new Date().toISOString(),
    };
    const { data: job } = await supabase.from("lp_ads_generation_jobs").insert([jobRecord]).select().single();

    if (!job) return json({ success: false, error: "Falha ao criar job." });

    // ── Determine max_tokens based on job type ─────────────
    const lpJobTypes = ["generate_base_lp", "generate_variant_lp", "rewrite_html"];
    const effectiveMaxTokens = lpJobTypes.includes(job_type)
      ? Math.max(config.max_tokens || 4096, 16000)
      : config.max_tokens || 4096;

    // ── Process in background — respond immediately ─────────
    const processingPromise = processGeneration(
      supabase, config, systemPrompt, prompt, effectiveMaxTokens,
      job, job_type, project_id, project, target_id, section_id
    );

    // Use EdgeRuntime.waitUntil if available; otherwise fallback
    try {
      // @ts-ignore - EdgeRuntime is a Deno Deploy global
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(processingPromise);
      } else {
        processingPromise.catch((err: any) => console.error("Background processing error:", err));
      }
    } catch {
      processingPromise.catch((err: any) => console.error("Background processing error:", err));
    }

    return json({
      success: true,
      job_id: job.id,
      status: "processing",
      message: "Geração iniciada. Acompanhe pelo job_id.",
    });

  } catch (err: any) {
    console.error("claude-generate error:", err);
    return json({ success: false, error: err.message || "Erro interno" }, 500);
  }
});

// ── Background Processing ───────────────────────────────────

async function processGeneration(
  supabase: any,
  config: any,
  systemPrompt: string,
  prompt: string,
  maxTokens: number,
  job: any,
  job_type: string,
  project_id: string,
  project: any,
  target_id: string | null,
  section_id: string | null,
): Promise<void> {
  try {
    const startTime = Date.now();
    const aiResponse = await callAI(config, systemPrompt, prompt, maxTokens);
    const duration = Date.now() - startTime;

    if (!aiResponse.success) {
      await supabase.from("lp_ads_generation_jobs").update({
        status: "failed",
        error_message: aiResponse.error,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      return;
    }

    const result = parseAIResponse(aiResponse.text, job_type);
    const providerLabel = config.provider === "openrouter" ? `openrouter/${config.model}` : config.provider;
    const creationMode = config.provider === "openrouter" ? "ai_openrouter" : "ai_claude";

    await supabase.from("lp_ads_generation_jobs").update({
      status: "completed",
      prompt_used: prompt.substring(0, 5000),
      model_used: config.model,
      tokens_input: aiResponse.usage?.input_tokens || 0,
      tokens_output: aiResponse.usage?.output_tokens || 0,
      cost_estimate: estimateCost(config.provider, config.model, aiResponse.usage),
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);

    if (job_type === "generate_base_lp") {
      const { data: existingBase } = await supabase.from("lp_ads_landing_pages").select("id, current_version").eq("project_id", project_id).eq("page_type", "base").maybeSingle();
      const version = (existingBase?.current_version || 0) + 1;
      const lpPayload: any = {
        project_id,
        page_type: "base",
        creation_mode: creationMode,
        title: `${project.name} - Landing Page Base`,
        content: result.sections ? { sections: result.sections, meta: result.meta, theme: result.theme } : {},
        html_code: result.html_code || "",
        status: "generated",
        current_version: version,
      };
      let lpId: string;
      if (existingBase) {
        await supabase.from("lp_ads_landing_pages").update(lpPayload).eq("id", existingBase.id);
        lpId = existingBase.id;
      } else {
        const { data: newLp } = await supabase.from("lp_ads_landing_pages").insert([lpPayload]).select().single();
        lpId = newLp.id;
      }
      await supabase.from("lp_ads_lp_versions").insert([{
        landing_page_id: lpId,
        version_number: version,
        content: lpPayload.content,
        html_code: lpPayload.html_code,
        prompt_used: prompt.substring(0, 5000),
        model_used: config.model,
        tokens_input: aiResponse.usage?.input_tokens || 0,
        tokens_output: aiResponse.usage?.output_tokens || 0,
        generated_by: providerLabel,
      }]);
      await supabase.from("lp_ads_projects").update({ status: "generated" }).eq("id", project_id);
    } else if (job_type === "generate_ad") {
      await supabase.from("lp_ads_campaigns").update({
        ad_creatives: result.ad_creatives || [],
        status: "generated",
        current_version: 1,
      }).eq("id", target_id);
    } else if (job_type === "generate_variant_lp") {
      const { data: existingVariant } = await supabase.from("lp_ads_landing_pages").select("id, current_version").eq("campaign_id", target_id).eq("page_type", "variant").maybeSingle();
      const version = (existingVariant?.current_version || 0) + 1;
      const { data: campaign } = await supabase.from("lp_ads_campaigns").select("name, focus_angle").eq("id", target_id).single();
      const lpPayload: any = {
        project_id,
        campaign_id: target_id,
        page_type: "variant",
        creation_mode: creationMode,
        title: `${project.name} - ${campaign?.focus_angle || campaign?.name || "Variante"}`,
        content: result.sections ? { sections: result.sections, meta: result.meta, theme: result.theme } : {},
        html_code: result.html_code || "",
        status: "generated",
        current_version: version,
      };
      let lpId: string;
      if (existingVariant) {
        await supabase.from("lp_ads_landing_pages").update(lpPayload).eq("id", existingVariant.id);
        lpId = existingVariant.id;
      } else {
        const { data: newLp } = await supabase.from("lp_ads_landing_pages").insert([lpPayload]).select().single();
        lpId = newLp.id;
      }
      await supabase.from("lp_ads_lp_versions").insert([{
        landing_page_id: lpId,
        version_number: version,
        content: lpPayload.content,
        html_code: lpPayload.html_code,
        prompt_used: prompt.substring(0, 5000),
        model_used: config.model,
        tokens_input: aiResponse.usage?.input_tokens || 0,
        tokens_output: aiResponse.usage?.output_tokens || 0,
        generated_by: providerLabel,
      }]);
    } else if (job_type === "regenerate_section" && target_id) {
      const { data: lp } = await supabase.from("lp_ads_landing_pages").select("*").eq("id", target_id).single();
      if (lp) {
        const sections = (lp.content?.sections || []).map((s: any) => s.id === section_id ? { ...s, ...result } : s);
        await supabase.from("lp_ads_landing_pages").update({
          content: { ...lp.content, sections },
          current_version: (lp.current_version || 0) + 1,
        }).eq("id", target_id);
      }
    } else if (job_type === "rewrite_html" && target_id) {
      const { data: lp } = await supabase.from("lp_ads_landing_pages").select("*").eq("id", target_id).single();
      if (lp) {
        const newVersion = (lp.current_version || 0) + 1;
        await supabase.from("lp_ads_landing_pages").update({
          html_code: aiResponse.text,
          current_version: newVersion,
        }).eq("id", target_id);
        await supabase.from("lp_ads_lp_versions").insert([{
          landing_page_id: target_id,
          version_number: newVersion,
          content: lp.content || {},
          html_code: aiResponse.text,
          prompt_used: prompt.substring(0, 5000),
          model_used: config.model,
          tokens_input: aiResponse.usage?.input_tokens || 0,
          tokens_output: aiResponse.usage?.output_tokens || 0,
          generated_by: providerLabel,
        }]);
      }
    }
  } catch (err: any) {
    console.error("processGeneration error:", err);
    await supabase.from("lp_ads_generation_jobs").update({
      status: "failed",
      error_message: err.message || "Erro no processamento",
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);
  }
}

// ── Helpers ──────────────────────────────────────────────────

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getActiveConfig(supabase: any): Promise<any | null> {
  const { data } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function validateProvider(config: any): Promise<{ success: boolean; error?: string }> {
  if (!config.api_key_encrypted) {
    return { success: false, error: `${config.provider} não configurado` };
  }

  try {
    if (config.provider === "openrouter") {
      const resp = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.api_key_encrypted}`,
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "https://voll.app",
        },
        body: JSON.stringify({
          model: config.model || "anthropic/claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
        }),
      });
      if (!resp.ok) return { success: false, error: "API key OpenRouter inválida ou sem créditos" };
      return { success: true };
    }

    // Claude (direto)
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.api_key_encrypted,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Responda apenas: OK" }],
      }),
    });
    if (!resp.ok) return { success: false, error: "API key Claude inválida ou sem créditos" };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function getTargetType(jobType: string): string {
  if (jobType.includes("lp") || jobType.includes("html")) return "landing_page";
  if (jobType.includes("ad")) return "campaign";
  if (jobType.includes("section")) return "section";
  return "";
}

// ── AI Call Router ──────────────────────────────────────────

async function callAI(config: any, systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<any> {
  const tokens = maxTokens || config.max_tokens || 4096;
  if (config.provider === "openrouter") {
    return callOpenRouter(config, systemPrompt, userPrompt, tokens);
  }
  return callClaude(config, systemPrompt, userPrompt, tokens);
}

async function callClaude(config: any, systemPrompt: string, userPrompt: string, maxTokens: number, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.api_key_encrypted,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model || "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          temperature: config.temperature ?? 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        if (attempt === retries) return { success: false, error: `Claude API: ${resp.status} - ${err}` };
        await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
        continue;
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || "";
      return {
        success: true,
        text,
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
        },
      };
    } catch (err: any) {
      if (attempt === retries) return { success: false, error: err.message };
      await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
    }
  }
  return { success: false, error: "Claude: falha após múltiplas tentativas" };
}

async function callOpenRouter(config: any, systemPrompt: string, userPrompt: string, maxTokens: number, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: userPrompt });

      const resp = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.api_key_encrypted}`,
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "https://voll.app",
          "X-Title": "VOLL LP+Ads Generator",
        },
        body: JSON.stringify({
          model: config.model || "anthropic/claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          temperature: config.temperature ?? 0.7,
          messages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        if (attempt === retries) return { success: false, error: `OpenRouter API: ${resp.status} - ${err}` };
        await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
        continue;
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        text,
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (err: any) {
      if (attempt === retries) return { success: false, error: err.message };
      await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
    }
  }
  return { success: false, error: "OpenRouter: falha após múltiplas tentativas" };
}

// ── Prompt Builders ─────────────────────────────────────────

function buildProductData(project: any): string {
  const fields = [
    ["Nome", project.name],
    ["Descrição", project.description],
    ["Oferta", project.offer],
    ["Público-alvo", project.target_audience],
    ["Objetivo", project.campaign_objective],
    ["Promessa principal", project.main_promise],
    ["Mecanismo único", project.unique_mechanism],
    ["Principais dores", project.main_pains],
    ["Principais benefícios", project.main_benefits],
    ["Objeções", project.objections],
    ["Depoimentos", project.testimonials],
    ["Diferenciais", project.differentials],
    ["Tom de voz", project.tone_of_voice],
    ["Preço/Condição", project.price_condition],
    ["FAQ", project.faq],
    ["CTA principal", project.cta_principal],
    ["Identidade visual", project.visual_identity],
    ["Notas", project.free_notes],
  ];
  return fields.filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
}

function buildReferenceContent(assets: any[]): string {
  return assets.map(a => {
    if (a.extracted_text) return `[${a.asset_type.toUpperCase()}] ${a.original_name}:\n${a.extracted_text}`;
    if (a.file_url) return `[${a.asset_type.toUpperCase()}] ${a.original_name}: ${a.file_url}`;
    return "";
  }).filter(Boolean).join("\n\n---\n\n");
}

function buildBaseLPPrompt(productData: string, referenceContent: string, tone: string): string {
  return `Você é um copywriter sênior de vendas e um web designer de classe mundial. Sua especialidade é criar landing pages de alta conversão que vendem milhões.

TAREFA: Criar uma landing page de vendas COMPLETA, PROFISSIONAL e VISUALMENTE IMPRESSIONANTE.

DADOS DO PRODUTO:
${productData}

${referenceContent ? `MATERIAL DE REFERÊNCIA:\n${referenceContent}` : ""}

REGRAS OBRIGATÓRIAS DE RESPOSTA:
- Retorne APENAS um JSON válido. Sem texto antes ou depois.
- O campo "html_code" DEVE conter uma página HTML COMPLETA e AUTO-CONTIDA.
- O JSON DEVE ter exatamente estas chaves: html_code, sections, meta, theme

REGRAS DE DESIGN DO HTML (CRÍTICO):
O html_code DEVE ser uma página HTML completa com:
1. Tag <!DOCTYPE html> e <html lang="pt-BR">
2. <head> com meta charset, viewport, title, e OBRIGATORIAMENTE o CDN do Tailwind CSS:
   <script src="https://cdn.tailwindcss.com"></script>
   E também Google Fonts (Inter):
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
3. <body> com font-family Inter aplicado

REGRAS DE DESIGN VISUAL (CRÍTICO - a página DEVE ser bonita):
- Use gradientes vibrantes no hero (ex: bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800)
- Texto branco sobre fundos escuros no hero, com headline GRANDE (text-4xl md:text-6xl font-black)
- Seções alternando fundo branco e fundo cinza claro (bg-gray-50)
- Cards com sombras (shadow-xl rounded-2xl), bordas suaves, padding generoso
- Ícones usando emojis relevantes (✅ ⚡ 🎯 💡 🏆 etc.) em listas de benefícios
- Botões de CTA grandes, vibrantes, com hover effects (px-8 py-4 bg-gradient-to-r rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all)
- Espaçamento amplo entre seções (py-16 md:py-24)
- Responsivo: mobile-first, usar md: e lg: breakpoints
- Tipografia forte: headlines em font-black ou font-extrabold, subtítulos em font-bold
- Use max-w-6xl mx-auto para container
- Badges e destaques coloridos para palavras-chave
- Seção de preço com destaque visual (border, shadow, badge "Mais Popular")
- FAQ com estilo accordion visual (mesmo sem JS, usar <details>/<summary>)
- Footer escuro (bg-gray-900 text-gray-400)

SEÇÕES OBRIGATÓRIAS (nesta ordem):
1. HERO - Headline impactante (text-4xl md:text-6xl), subheadline, CTA grande, fundo com gradiente escuro
2. PROBLEMA/DOR - Descreva as dores do público, use ícones/emojis, fundo branco
3. TRANSFORMAÇÃO - Mostre o antes/depois, o que muda na vida da pessoa
4. COMO FUNCIONA - 3-4 passos com cards numerados e ícones
5. BENEFÍCIOS - Lista com emojis ✅, cards ou grid de 2-3 colunas
6. PARA QUEM É - Lista do público ideal com checkmarks
7. O QUE ESTÁ INCLUSO - Módulos/entregáveis em cards
8. PROVA SOCIAL - Depoimentos em cards com aspas, nome e foto placeholder
9. OFERTA/PREÇO - Card de preço destacado com lista de tudo que inclui e CTA
10. GARANTIA - Badge/card com ícone de escudo, texto persuasivo
11. FAQ - Perguntas frequentes com <details>/<summary> estilizados
12. CTA FINAL - Última chamada urgente com fundo gradiente e botão grande

REGRAS DE COPY:
- Português brasileiro, copy persuasiva e profissional
- Use técnicas: PAS (Problem-Agitation-Solution), AIDA, urgência, escassez
- Tom de voz: ${tone}
- NÃO invente dados (preços, números) que não foram fornecidos. Use "[Insira aqui]" como placeholder.
- Headline do hero deve ser magnética, provocativa e focada no benefício principal

PLACEHOLDERS OBRIGATÓRIOS:
- Use {{form}} no HTML onde o formulário de captura de leads deve aparecer
- Use {{cta_link}} como href de todos os botões de CTA (ex: <a href="{{cta_link}}")

FORMATO JSON:
{
  "html_code": "<!DOCTYPE html>\\n<html lang=\\"pt-BR\\">\\n<head>...PÁGINA COMPLETA...</html>",
  "sections": [
    {"id":"hero","type":"hero","enabled":true,"headline":"...","body":"...","cta":"...","items":[]},
    {"id":"pain","type":"pain","enabled":true,"headline":"...","body":"...","items":["dor 1","dor 2"]},
    ...demais seções...
  ],
  "meta": {"title":"...","description":"...","keywords":["..."]},
  "theme": {"primary_color":"#4F46E5","text_color":"#1a202c","bg_color":"#ffffff","font_family":"Inter, sans-serif","tone":"${tone}"}
}

IMPORTANTE: O html_code deve ser LONGO e DETALHADO — uma página de venda completa com pelo menos 12 seções visuais. NÃO gere HTML curto ou minimalista.`;
}

function buildAdPrompt(productData: string, campaign: any): string {
  return `Gere criativos de anúncio para ${campaign.platform || "digital"}.

PRODUTO:
${productData}

ANÚNCIO:
Nome: ${campaign.name}
Foco: ${campaign.focus_angle}
Persona: ${campaign.persona}
Dor: ${campaign.specific_pain}
Promessa: ${campaign.specific_promise}
CTA: ${campaign.cta}
Tom: ${campaign.tone_of_voice}

Retorne JSON: {"ad_creatives":[{"id":"h1","type":"headline","content":"..."},{"id":"d1","type":"description","content":"..."},{"id":"pt1","type":"primary_text","content":"..."},{"id":"vs1","type":"visual_suggestion","content":"..."}]}
Crie pelo menos 3 headlines, 2 descriptions, 2 primary_texts e 1 visual_suggestion. Copy em português BR. NÃO invente ofertas.`;
}

function buildVariantLPPrompt(productData: string, baseLp: any, campaign: any): string {
  const baseHtml = baseLp.html_code || "";
  return `Você é um copywriter sênior e web designer de classe mundial. Crie uma VARIANTE da landing page base, adaptada ao ângulo específico do anúncio abaixo.

DADOS DO PRODUTO:
${productData}

HTML DA LP BASE (use como referência de design e estrutura):
${baseHtml.substring(0, 12000)}

ANÚNCIO - ÂNGULO ESPECÍFICO:
- Foco: ${campaign.focus_angle}
- Persona alvo: ${campaign.persona}
- Dor específica: ${campaign.specific_pain}
- Promessa específica: ${campaign.specific_promise}
- Tom de voz: ${campaign.tone_of_voice}

REGRAS OBRIGATÓRIAS:
1. MANTENHA a mesma oferta, produto e preço da LP base
2. ADAPTE completamente: headline, argumentos, benefícios listados, narrativa, CTA texts — tudo focado no ângulo "${campaign.focus_angle}"
3. MANTENHA o mesmo nível de qualidade visual da LP base (gradientes, cards, sombras, Tailwind CSS)
4. O html_code DEVE ser uma página HTML COMPLETA com <!DOCTYPE html>, <head> com Tailwind CDN, Google Fonts, etc.
5. Use {{form}} onde o formulário deve aparecer
6. Use {{cta_link}} como href de todos os botões de CTA
7. A headline do hero DEVE falar diretamente com a persona "${campaign.persona}" e endereçar a dor "${campaign.specific_pain}"
8. O HTML deve incluir:
   <script src="https://cdn.tailwindcss.com"></script>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

REGRAS DE DESIGN VISUAL:
- Gradientes vibrantes no hero
- Cards com sombras (shadow-xl rounded-2xl)
- Botões de CTA grandes e vibrantes
- Seções bem espaçadas (py-16 md:py-24)
- Responsivo com breakpoints md: e lg:
- Tipografia forte com font-black e font-extrabold
- Emojis relevantes em listas de benefícios
- FAQ com <details>/<summary>
- Footer escuro

FORMATO DE RESPOSTA (JSON):
{
  "html_code": "<!DOCTYPE html>\\n<html lang=\\"pt-BR\\">...PÁGINA COMPLETA...</html>",
  "sections": [{"id":"hero","type":"hero","enabled":true,"headline":"...","body":"...","cta":"...","items":[]},...],
  "meta": {"title":"...","description":"...","keywords":["..."]},
  "theme": {"primary_color":"#...","text_color":"#1a202c","bg_color":"#ffffff","font_family":"Inter, sans-serif","tone":"${campaign.tone_of_voice}"}
}

IMPORTANTE: Retorne APENAS JSON válido. O html_code deve ser uma página COMPLETA e LONGA com pelo menos 10 seções visuais.`;
}

function buildRegenerateSectionPrompt(productData: string, lp: any, sectionId: string, instruction: string): string {
  const section = (lp.content?.sections || []).find((s: any) => s.id === sectionId);
  return `Regenere APENAS esta seção:

PRODUTO: ${productData.substring(0, 2000)}

SEÇÃO ATUAL: ${JSON.stringify(section || {})}

INSTRUÇÃO: ${instruction}

Retorne JSON da seção: {"id":"${sectionId}","type":"${section?.type || ""}","enabled":true,"headline":"...","body":"...","items":[...],"cta":"..."}`;
}

// ── Response Parser ─────────────────────────────────────────

function parseAIResponse(text: string, jobType: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { html_code: text };
    return JSON.parse(jsonMatch[0]);
  } catch {
    if (jobType === "rewrite_html") return { html_code: text };
    return { html_code: text, sections: [] };
  }
}

// ── Cost Estimation ─────────────────────────────────────────

function estimateCost(provider: string, model: string, usage: any): number {
  if (!usage) return 0;
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;

  if (provider === "openrouter") {
    // OpenRouter pricing varies per model — use approximate known rates
    if (model.includes("haiku")) return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
    if (model.includes("gpt-4o-mini") || model.includes("gemini-flash")) return (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000;
    if (model.includes("gpt-4o")) return (inputTokens * 2.5 + outputTokens * 10) / 1_000_000;
    if (model.includes("llama")) return (inputTokens * 0.8 + outputTokens * 0.8) / 1_000_000;
    if (model.includes("deepseek")) return (inputTokens * 0.14 + outputTokens * 0.28) / 1_000_000;
    if (model.includes("sonnet")) return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
    if (model.includes("gemini-pro")) return (inputTokens * 1.25 + outputTokens * 5) / 1_000_000;
    // Fallback: moderate cost assumption
    return (inputTokens * 1 + outputTokens * 3) / 1_000_000;
  }

  // Claude direct pricing
  if (model.includes("haiku")) return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
  if (model.includes("sonnet")) return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
