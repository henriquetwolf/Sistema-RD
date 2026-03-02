-- ============================================================
-- Conta Azul Integration Tables
-- ============================================================

-- OAuth tokens storage (single active row)
CREATE TABLE IF NOT EXISTS conta_azul_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contas a Receber (mirror)
CREATE TABLE IF NOT EXISTS conta_azul_contas_receber (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta_azul TEXT UNIQUE NOT NULL,
    id_evento TEXT,
    descricao TEXT,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    valor_pago NUMERIC(15,2) DEFAULT 0,
    data_vencimento DATE,
    data_competencia DATE,
    data_pagamento DATE,
    data_alteracao TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDENTE',
    categoria_id TEXT,
    categoria_nome TEXT,
    centro_custo_id TEXT,
    centro_custo_nome TEXT,
    conta_financeira_id TEXT,
    conta_financeira_nome TEXT,
    parcela_numero INT,
    total_parcelas INT,
    contato_nome TEXT,
    contato_id TEXT,
    observacoes TEXT,
    numero_documento TEXT,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_receber_status ON conta_azul_contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_ca_receber_vencimento ON conta_azul_contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_ca_receber_contato ON conta_azul_contas_receber(contato_nome);

-- Contas a Pagar (mirror)
CREATE TABLE IF NOT EXISTS conta_azul_contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta_azul TEXT UNIQUE NOT NULL,
    id_evento TEXT,
    descricao TEXT,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    valor_pago NUMERIC(15,2) DEFAULT 0,
    data_vencimento DATE,
    data_competencia DATE,
    data_pagamento DATE,
    data_alteracao TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDENTE',
    categoria_id TEXT,
    categoria_nome TEXT,
    centro_custo_id TEXT,
    centro_custo_nome TEXT,
    conta_financeira_id TEXT,
    conta_financeira_nome TEXT,
    parcela_numero INT,
    total_parcelas INT,
    fornecedor_nome TEXT,
    fornecedor_id TEXT,
    observacoes TEXT,
    numero_documento TEXT,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_pagar_status ON conta_azul_contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_ca_pagar_vencimento ON conta_azul_contas_pagar(data_vencimento);

-- Categorias
CREATE TABLE IF NOT EXISTS conta_azul_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta_azul TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('RECEITA', 'DESPESA', 'AMBOS')),
    ativo BOOLEAN DEFAULT true,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- Centros de Custo
CREATE TABLE IF NOT EXISTS conta_azul_centros_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta_azul TEXT UNIQUE NOT NULL,
    codigo TEXT,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- Contas Financeiras
CREATE TABLE IF NOT EXISTS conta_azul_contas_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta_azul TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT,
    saldo_atual NUMERIC(15,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- Sync Log
CREATE TABLE IF NOT EXISTS conta_azul_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_sync TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    registros_sincronizados INT DEFAULT 0,
    erro TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ca_sync_log_tipo ON conta_azul_sync_log(tipo_sync);
CREATE INDEX IF NOT EXISTS idx_ca_sync_log_started ON conta_azul_sync_log(started_at DESC);

-- RLS Policies (allow authenticated users to read)
ALTER TABLE conta_azul_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_azul_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read tokens" ON conta_azul_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write tokens" ON conta_azul_tokens FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read receber" ON conta_azul_contas_receber FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write receber" ON conta_azul_contas_receber FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read pagar" ON conta_azul_contas_pagar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write pagar" ON conta_azul_contas_pagar FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read categorias" ON conta_azul_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write categorias" ON conta_azul_categorias FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read centros_custo" ON conta_azul_centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write centros_custo" ON conta_azul_centros_custo FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read contas_fin" ON conta_azul_contas_financeiras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write contas_fin" ON conta_azul_contas_financeiras FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated read sync_log" ON conta_azul_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write sync_log" ON conta_azul_sync_log FOR ALL TO service_role USING (true);
