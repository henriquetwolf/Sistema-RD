export const PROMPT_GENERATE_BASE_LP = `Você é um copywriter sênior e web designer especialista em landing pages de alta conversão.

TAREFA: Gerar uma landing page completa para o produto/serviço descrito abaixo.

DADOS DO PRODUTO:
{{product_data}}

MATERIAL DE REFERÊNCIA:
{{reference_content}}

REGRAS:
1. Retorne APENAS um JSON válido, sem markdown, sem texto antes ou depois.
2. A copy deve ser em português brasileiro, persuasiva, com técnicas de copywriting (PAS, AIDA, storytelling).
3. Cada seção deve ter headline impactante, body persuasivo e CTA claro.
4. NÃO invente dados que não foram fornecidos (preços, depoimentos fictícios, etc.).
5. Se faltarem informações, use placeholders descritivos como "[Insira depoimento real]".
6. O tom de voz deve seguir: {{tone_of_voice}}
7. Use o placeholder {{form}} onde o formulário de captura deve aparecer.
8. Use o placeholder {{cta_link}} nos links de CTA.

FORMATO DE RESPOSTA (JSON):
{
  "html_code": "<html completo com Tailwind CSS inline, design moderno e responsivo>",
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "cta": "...",
      "items": []
    },
    {
      "id": "pain",
      "type": "pain",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "items": ["dor 1", "dor 2", "dor 3"]
    },
    {
      "id": "transformation",
      "type": "transformation",
      "enabled": true,
      "headline": "...",
      "body": "..."
    },
    {
      "id": "method",
      "type": "method",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "items": ["diferencial 1", "diferencial 2"]
    },
    {
      "id": "benefits",
      "type": "benefits",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "items": ["benefício 1", "benefício 2", "benefício 3"]
    },
    {
      "id": "target",
      "type": "target",
      "enabled": true,
      "headline": "Para quem é...",
      "body": "...",
      "items": ["perfil 1", "perfil 2"]
    },
    {
      "id": "modules",
      "type": "modules",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "items": ["módulo 1", "módulo 2"]
    },
    {
      "id": "testimonials",
      "type": "testimonials",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "items": ["depoimento 1", "depoimento 2"]
    },
    {
      "id": "pricing",
      "type": "pricing",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "cta": "..."
    },
    {
      "id": "guarantee",
      "type": "guarantee",
      "enabled": true,
      "headline": "...",
      "body": "..."
    },
    {
      "id": "faq",
      "type": "faq",
      "enabled": true,
      "headline": "Perguntas Frequentes",
      "body": "",
      "items": ["P: ...? R: ...", "P: ...? R: ..."]
    },
    {
      "id": "cta_final",
      "type": "cta_final",
      "enabled": true,
      "headline": "...",
      "body": "...",
      "cta": "..."
    }
  ],
  "meta": {
    "title": "...",
    "description": "...",
    "keywords": ["...", "..."]
  },
  "theme": {
    "primary_color": "#...",
    "text_color": "#1a202c",
    "bg_color": "#ffffff",
    "font_family": "Inter, sans-serif",
    "tone": "{{tone_of_voice}}"
  }
}

O HTML deve:
- Usar Tailwind CSS (classes utilitárias inline)
- Ser totalmente responsivo (mobile-first)
- Ter design moderno, limpo e profissional
- Incluir seções: hero com headline impactante, problema/dor, transformação, benefícios, como funciona, prova social, oferta, garantia, FAQ, CTA final
- Usar cores consistentes com a identidade visual fornecida
- Incluir {{form}} no local apropriado para formulário
- Incluir {{cta_link}} nos botões de CTA`;

export const PROMPT_GENERATE_AD = `Você é um especialista em anúncios digitais e copywriting de performance.

TAREFA: Gerar criativos de anúncio para a campanha descrita abaixo.

DADOS DO PRODUTO:
{{product_data}}

DADOS DO ANÚNCIO:
{{campaign_data}}

PLATAFORMA: {{platform}}

REGRAS:
1. Retorne APENAS JSON válido.
2. Os criativos devem ser em português brasileiro.
3. Adapte a copy para o foco/ângulo específico: {{focus_angle}}
4. Mantenha coerência com o produto original — NÃO invente ofertas.
5. Crie variações para teste A/B.
6. Respeite os limites de caracteres da plataforma.

FORMATO DE RESPOSTA (JSON):
{
  "ad_creatives": [
    { "id": "h1", "type": "headline", "content": "..." },
    { "id": "h2", "type": "headline", "content": "..." },
    { "id": "h3", "type": "headline", "content": "..." },
    { "id": "d1", "type": "description", "content": "..." },
    { "id": "d2", "type": "description", "content": "..." },
    { "id": "pt1", "type": "primary_text", "content": "..." },
    { "id": "pt2", "type": "primary_text", "content": "..." },
    { "id": "vs1", "type": "visual_suggestion", "content": "Descrição da imagem/vídeo sugerido..." }
  ]
}`;

export const PROMPT_GENERATE_VARIANT_LP = `Você é um copywriter sênior especialista em personalização de landing pages para campanhas de anúncios.

TAREFA: Gerar uma landing page DERIVADA, adaptando a página base para o ângulo específico de um anúncio.

LANDING PAGE BASE (JSON/HTML):
{{base_lp_content}}

DADOS DO PRODUTO:
{{product_data}}

DADOS DO ANÚNCIO (ângulo de adaptação):
{{campaign_data}}

FOCO DO ANÚNCIO: {{focus_angle}}

REGRAS CRÍTICAS:
1. A LP derivada DEVE manter a mesma oferta e produto da LP base.
2. NÃO invente preços, bônus ou condições diferentes do original.
3. ADAPTE: headline, subheadline, argumentos, benefícios destacados, CTA, narrativa, provas sociais.
4. O FOCO da adaptação é: {{focus_angle}}
5. A dor específica a atacar é: {{specific_pain}}
6. A promessa específica é: {{specific_promise}}
7. O tom deve ser: {{tone_of_voice}}
8. Mantenha {{form}} e {{cta_link}} nos mesmos locais.
9. Retorne APENAS JSON válido.

FORMATO DE RESPOSTA: mesmo formato da LP base (JSON com html_code e sections).`;

export const PROMPT_REGENERATE_SECTION = `Você é um copywriter sênior.

TAREFA: Regenerar APENAS a seção indicada de uma landing page.

CONTEXTO DO PRODUTO:
{{product_data}}

SEÇÃO ATUAL:
{{current_section}}

TIPO DA SEÇÃO: {{section_type}}

INSTRUÇÃO DO USUÁRIO: {{user_instruction}}

REGRAS:
1. Retorne APENAS o JSON da seção regenerada.
2. Mantenha o mesmo formato (id, type, enabled, headline, body, items, cta).
3. Melhore a copy seguindo a instrução.
4. NÃO mude o tipo da seção.

FORMATO:
{
  "id": "{{section_id}}",
  "type": "{{section_type}}",
  "enabled": true,
  "headline": "...",
  "body": "...",
  "items": [...],
  "cta": "..."
}`;

export const PROMPT_REWRITE_HTML = `Você é um web designer e copywriter sênior.

TAREFA: Reescrever o HTML de uma landing page seguindo as instruções do usuário.

HTML ATUAL:
{{current_html}}

INSTRUÇÃO:
{{user_instruction}}

REGRAS:
1. Retorne APENAS o HTML completo atualizado (sem JSON wrapper, sem markdown).
2. Mantenha {{form}} e {{cta_link}} intactos.
3. Use Tailwind CSS.
4. Mantenha responsividade.
5. NÃO remova seções a menos que instruído.`;

export function buildPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}
