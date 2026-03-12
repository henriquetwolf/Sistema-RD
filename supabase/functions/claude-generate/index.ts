import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { job_type, project_id, target_id, section_id, user_instruction } = body;

    if (project_id === "validate-only") {
      const { data: config } = await supabase
        .from("ai_provider_configs")
        .select("*")
        .eq("provider", "claude")
        .eq("is_active", true)
        .maybeSingle();
      if (!config?.api_key_encrypted) {
        return json({ success: false, error: "Claude não configurado" });
      }
      const testResp = await fetch(ANTHROPIC_API_URL, {
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
      if (!testResp.ok) {
        return json({ success: false, error: "API key inválida ou sem créditos" });
      }
      return json({ success: true });
    }

    const { data: config } = await supabase
      .from("ai_provider_configs")
      .select("*")
      .eq("provider", "claude")
      .eq("is_active", true)
      .maybeSingle();

    if (!config?.api_key_encrypted) {
      return json({ success: false, error: "Configure a API do Claude antes de gerar." });
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

    const jobRecord = {
      project_id,
      target_id: target_id || null,
      target_type: getTargetType(job_type),
      job_type,
      status: "running",
      started_at: new Date().toISOString(),
    };
    const { data: job } = await supabase.from("lp_ads_generation_jobs").insert([jobRecord]).select().single();

    const productData = buildProductData(project);
    const referenceContent = buildReferenceContent(assets || []);

    let prompt = "";
    let systemPrompt = config.system_prompt || "Você é um assistente especialista em marketing digital e copywriting.";

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
      prompt = `Reescreva o HTML seguindo estas instruções: ${user_instruction}\n\nHTML ATUAL:\n${lp.html_code}\n\nRetorne APENAS o HTML completo atualizado. Mantenha {{form}} e {{cta_link}} intactos. Use Tailwind CSS.`;
    } else {
      return json({ success: false, error: `Tipo de job desconhecido: ${job_type}` });
    }

    const startTime = Date.now();
    const claudeResponse = await callClaude(config, systemPrompt, prompt);
    const duration = Date.now() - startTime;

    if (!claudeResponse.success) {
      await supabase.from("lp_ads_generation_jobs").update({
        status: "failed",
        error_message: claudeResponse.error,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      return json({ success: false, error: claudeResponse.error });
    }

    const result = parseClaudeResponse(claudeResponse.text, job_type);

    await supabase.from("lp_ads_generation_jobs").update({
      status: "completed",
      prompt_used: prompt.substring(0, 5000),
      model_used: config.model,
      tokens_input: claudeResponse.usage?.input_tokens || 0,
      tokens_output: claudeResponse.usage?.output_tokens || 0,
      cost_estimate: estimateCost(config.model, claudeResponse.usage),
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);

    if (job_type === "generate_base_lp") {
      const { data: existingBase } = await supabase.from("lp_ads_landing_pages").select("id, current_version").eq("project_id", project_id).eq("page_type", "base").maybeSingle();
      const version = (existingBase?.current_version || 0) + 1;
      const lpPayload: any = {
        project_id,
        page_type: "base",
        creation_mode: "ai_claude",
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
        tokens_input: claudeResponse.usage?.input_tokens || 0,
        tokens_output: claudeResponse.usage?.output_tokens || 0,
        generated_by: "claude",
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
        creation_mode: "ai_claude",
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
        tokens_input: claudeResponse.usage?.input_tokens || 0,
        tokens_output: claudeResponse.usage?.output_tokens || 0,
        generated_by: "claude",
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
          html_code: claudeResponse.text,
          current_version: newVersion,
        }).eq("id", target_id);
        await supabase.from("lp_ads_lp_versions").insert([{
          landing_page_id: target_id,
          version_number: newVersion,
          content: lp.content || {},
          html_code: claudeResponse.text,
          prompt_used: prompt.substring(0, 5000),
          model_used: config.model,
          tokens_input: claudeResponse.usage?.input_tokens || 0,
          tokens_output: claudeResponse.usage?.output_tokens || 0,
          generated_by: "claude",
        }]);
      }
    }

    return json({
      success: true,
      job_id: job.id,
      result,
      metadata: {
        model: config.model,
        tokens_input: claudeResponse.usage?.input_tokens || 0,
        tokens_output: claudeResponse.usage?.output_tokens || 0,
        cost_estimate_usd: estimateCost(config.model, claudeResponse.usage),
        duration_ms: duration,
      },
    });
  } catch (err: any) {
    console.error("claude-generate error:", err);
    return json({ success: false, error: err.message || "Erro interno" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getTargetType(jobType: string): string {
  if (jobType.includes("lp") || jobType.includes("html")) return "landing_page";
  if (jobType.includes("ad")) return "campaign";
  if (jobType.includes("section")) return "section";
  return "";
}

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
  return `Você é um copywriter sênior e web designer especialista em landing pages de alta conversão.

TAREFA: Gerar uma landing page completa em HTML com Tailwind CSS para o produto abaixo.

DADOS DO PRODUTO:
${productData}

${referenceContent ? `MATERIAL DE REFERÊNCIA:\n${referenceContent}` : ""}

REGRAS:
1. Retorne APENAS JSON válido com as chaves: html_code, sections, meta, theme
2. Copy em português brasileiro, persuasiva (técnicas PAS, AIDA)
3. NÃO invente dados não fornecidos. Use placeholders como "[Insira depoimento]" se necessário.
4. Tom de voz: ${tone}
5. Use {{form}} onde o formulário deve aparecer
6. Use {{cta_link}} nos links de CTA
7. HTML com Tailwind CSS inline, responsivo, design moderno
8. Seções: hero, pain, transformation, method, benefits, target, modules, testimonials, pricing, guarantee, faq, cta_final

Responda com JSON:
{
  "html_code": "<html completo>",
  "sections": [{"id":"hero","type":"hero","enabled":true,"headline":"...","body":"...","cta":"...","items":[]},...],
  "meta": {"title":"...","description":"...","keywords":["..."]},
  "theme": {"primary_color":"#...","text_color":"#1a202c","bg_color":"#ffffff","font_family":"Inter, sans-serif","tone":"${tone}"}
}`;
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
  const baseContent = JSON.stringify(baseLp.content || {}).substring(0, 8000);
  return `Crie uma LP derivada adaptando a página base para o ângulo do anúncio.

PRODUTO:
${productData}

LP BASE:
${baseContent}

${baseLp.html_code ? `HTML BASE (resumo):\n${baseLp.html_code.substring(0, 4000)}` : ""}

ANÚNCIO:
Foco: ${campaign.focus_angle}
Persona: ${campaign.persona}
Dor: ${campaign.specific_pain}
Promessa: ${campaign.specific_promise}
Tom: ${campaign.tone_of_voice}

REGRAS:
- MANTENHA a mesma oferta e produto
- ADAPTE headline, argumentos, benefícios, CTA e narrativa para "${campaign.focus_angle}"
- Mantenha {{form}} e {{cta_link}}
- Retorne JSON: {html_code, sections, meta, theme}`;
}

function buildRegenerateSectionPrompt(productData: string, lp: any, sectionId: string, instruction: string): string {
  const section = (lp.content?.sections || []).find((s: any) => s.id === sectionId);
  return `Regenere APENAS esta seção:

PRODUTO: ${productData.substring(0, 2000)}

SEÇÃO ATUAL: ${JSON.stringify(section || {})}

INSTRUÇÃO: ${instruction}

Retorne JSON da seção: {"id":"${sectionId}","type":"${section?.type || ""}","enabled":true,"headline":"...","body":"...","items":[...],"cta":"..."}`;
}

async function callClaude(config: any, systemPrompt: string, userPrompt: string, retries = 3): Promise<any> {
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
          max_tokens: config.max_tokens || 4096,
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
      return { success: true, text, usage: data.usage };
    } catch (err: any) {
      if (attempt === retries) return { success: false, error: err.message };
      await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
    }
  }
  return { success: false, error: "Falha após múltiplas tentativas" };
}

function parseClaudeResponse(text: string, jobType: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { html_code: text };
    return JSON.parse(jsonMatch[0]);
  } catch {
    if (jobType === "rewrite_html") return { html_code: text };
    return { html_code: text, sections: [] };
  }
}

function estimateCost(model: string, usage: any): number {
  if (!usage) return 0;
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  if (model.includes("haiku")) return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
  if (model.includes("sonnet")) return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
