-- ============================================================
-- Apresentação da Franquia VOLL Studios
-- Tabela para conteúdo da apresentação + seed do funil Franquia
-- ============================================================

-- 1. Tabela de seções da apresentação (base de conhecimento)
CREATE TABLE IF NOT EXISTS crm_franchise_presentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_franchise_presentation_order ON crm_franchise_presentation (order_index);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_crm_franchise_presentation_updated_at ON crm_franchise_presentation;
CREATE TRIGGER trg_crm_franchise_presentation_updated_at
    BEFORE UPDATE ON crm_franchise_presentation
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS
ALTER TABLE crm_franchise_presentation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_franchise_presentation_all" ON crm_franchise_presentation;
CREATE POLICY "crm_franchise_presentation_all" ON crm_franchise_presentation FOR ALL USING (true) WITH CHECK (true);

-- 2. Garantir que a tabela crm_pipelines existe (compatibilidade)
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stages JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 3. Inserir funil Franquia se não existir
INSERT INTO crm_pipelines (id, name, stages)
SELECT 
    gen_random_uuid(),
    'Franquia',
    '[
        {"id": "novo_lead", "title": "Novo Lead", "color": "border-slate-300"},
        {"id": "contato_realizado", "title": "Contato Realizado", "color": "border-blue-300"},
        {"id": "proposta_enviada", "title": "Proposta Enviada", "color": "border-amber-300"},
        {"id": "negociacao", "title": "Negociação", "color": "border-purple-300"},
        {"id": "fechado", "title": "Fechado", "color": "border-green-500"}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM crm_pipelines WHERE name = 'Franquia');

-- 4. Seed inicial das seções da apresentação (baseado em franquiadepilates.com.br)
INSERT INTO crm_franchise_presentation (section_key, title, content, order_index)
VALUES 
    ('investimento', 'Investimento e Formas de Pagamento', 'Investimento inicial baixo e facilitado, incluindo todos os equipamentos necessários para começar o negócio e faturar. Formas de pagamento facilitadas para equipamentos e acessórios.', 1),
    ('equipamentos', 'Equipamentos Inclusos', 'Kit completo de aparelhos para abrir seu Studio de Pilates com qualidade VOLL: Cadillac, Reformer, Step Chair e Ladder Barrel, além de acessórios exclusivos.', 2),
    ('beneficios', 'Benefícios e Diferenciais', '• Kit completo de equipamentos profissionais\n• Projeto arquitetônico padronizado para seu Studio com identidade VOLL\n• Treinamento técnico e capacitação contínua\n• Marketing agressivo e suporte estratégico\n• Acesso à Plataforma Exclusiva de Franqueados\n• Bolsa 100% em Formação em Pilates\n• Direito de uso da marca VOLL Studios\n• Página exclusiva no site oficial\n• Afiliação ao VOLL Pilates Group: revenda de cursos e produtos com comissão de 20%', 3),
    ('payback', 'Payback e Breakeven', '**Payback** (retorno do investimento): estimado 8 a 12 meses.\n\n**Breakeven** (momento em que o Studio começa a dar lucro): 2 a 4 meses.', 4),
    ('royalties', 'Royalties', 'R$ 990,00 mensais fixo (para unidades polo de curso). Não cobramos fundo de propaganda. Conversão média de 50% de cliente em sua unidade.', 5),
    ('para_quem', 'Para Quem é a Franquia', 'A franquia VOLL Studios é para quem deseja empreender em um dos mercados que mais crescem no Brasil: saúde, bem-estar e qualidade de vida. Você não precisa ser formado em fisioterapia, educação física ou enfermagem. O que importa é ter espírito empreendedor e desejo de construir um negócio sólido.', 6),
    ('numeros', 'Números da VOLL', '• 15 anos de experiência\n• 100.000 alunos que passam em nossas unidades todos os meses\n• 229 unidades presentes em todos os estados brasileiros\n• +200 colaboradores e parceiros\n• 80 mil instrutores formados\n• Maior evento de Pilates da América Latina\n• Associados à ABF', 7),
    ('historias', 'Histórias de Sucesso', 'Franqueados em todo o Brasil já transformaram seu sonho em realidade com a VOLL Pilates Studios. Unidades em Teresina, Vilhena, Holambra, Rio Branco e diversas outras cidades comprovam o sucesso do modelo.', 8)
ON CONFLICT (section_key) DO NOTHING;
