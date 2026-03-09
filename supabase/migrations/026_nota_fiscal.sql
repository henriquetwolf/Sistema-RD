-- ============================================================
-- Migration 026: Nota Fiscal (NF-e / NFS-e) Issuance Control
-- Supports two providers: eNotas and Conta Azul
-- Supports split sales (divided: product + service)
-- ============================================================

-- 1. Configuration table (single row per setup)
CREATE TABLE IF NOT EXISTS nf_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_provider TEXT NOT NULL DEFAULT 'enotas' CHECK (default_provider IN ('enotas', 'conta_azul')),
    enotas_api_key TEXT,
    enotas_empresa_id TEXT,
    enotas_ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (enotas_ambiente IN ('producao', 'homologacao')),
    conta_azul_account_id UUID REFERENCES conta_azul_accounts(id),
    min_attendance_pct NUMERIC NOT NULL DEFAULT 70,
    auto_emit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE nf_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nf_config_select_auth" ON nf_config;
CREATE POLICY "nf_config_select_auth" ON nf_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "nf_config_all_service" ON nf_config;
CREATE POLICY "nf_config_all_service" ON nf_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "nf_config_insert_auth" ON nf_config;
CREATE POLICY "nf_config_insert_auth" ON nf_config FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "nf_config_update_auth" ON nf_config;
CREATE POLICY "nf_config_update_auth" ON nf_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Invoices table
CREATE TABLE IF NOT EXISTS nf_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_azul_receivable_id UUID NOT NULL REFERENCES conta_azul_contas_receber(id),
    deal_id TEXT,
    parent_invoice_id UUID REFERENCES nf_invoices(id),
    split_part TEXT CHECK (split_part IS NULL OR split_part IN ('service', 'product')),
    provider TEXT NOT NULL CHECK (provider IN ('enotas', 'conta_azul')),
    type TEXT NOT NULL CHECK (type IN ('nfse', 'nfe')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'issued', 'cancelled', 'error')),
    external_id TEXT,
    numero_nf TEXT,
    serie TEXT,
    codigo_verificacao TEXT,
    pdf_url TEXT,
    xml_url TEXT,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    descricao TEXT,
    tomador_nome TEXT,
    tomador_cpf_cnpj TEXT,
    error_message TEXT,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nf_invoices_no_duplicate
    ON nf_invoices (conta_azul_receivable_id, type, COALESCE(split_part, '__none__'))
    WHERE status NOT IN ('cancelled', 'error');

CREATE INDEX IF NOT EXISTS idx_nf_invoices_receivable ON nf_invoices(conta_azul_receivable_id);
CREATE INDEX IF NOT EXISTS idx_nf_invoices_status ON nf_invoices(status);
CREATE INDEX IF NOT EXISTS idx_nf_invoices_deal ON nf_invoices(deal_id) WHERE deal_id IS NOT NULL;

ALTER TABLE nf_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nf_invoices_select_auth" ON nf_invoices;
CREATE POLICY "nf_invoices_select_auth" ON nf_invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "nf_invoices_all_service" ON nf_invoices;
CREATE POLICY "nf_invoices_all_service" ON nf_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "nf_invoices_insert_auth" ON nf_invoices;
CREATE POLICY "nf_invoices_insert_auth" ON nf_invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "nf_invoices_update_auth" ON nf_invoices;
CREATE POLICY "nf_invoices_update_auth" ON nf_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trg_nf_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf_config_updated ON nf_config;
CREATE TRIGGER trg_nf_config_updated BEFORE UPDATE ON nf_config
    FOR EACH ROW EXECUTE FUNCTION trg_nf_set_updated_at();

DROP TRIGGER IF EXISTS trg_nf_invoices_updated ON nf_invoices;
CREATE TRIGGER trg_nf_invoices_updated BEFORE UPDATE ON nf_invoices
    FOR EACH ROW EXECUTE FUNCTION trg_nf_set_updated_at();

-- 3. RPC: get receivables eligible for NF issuance
CREATE OR REPLACE FUNCTION get_receivables_for_nf(
    p_account_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_status_filter TEXT DEFAULT 'pending',
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    receivable_id UUID,
    receivable_id_conta_azul TEXT,
    receivable_descricao TEXT,
    receivable_valor NUMERIC,
    receivable_status TEXT,
    receivable_data_vencimento DATE,
    receivable_data_competencia DATE,
    receivable_contato_nome TEXT,
    receivable_contato_cpf TEXT,
    receivable_account_id UUID,
    deal_id TEXT,
    deal_product_type TEXT,
    deal_product_name TEXT,
    deal_contact_name TEXT,
    deal_class_mod1 TEXT,
    deal_class_mod2 TEXT,
    class_id TEXT,
    class_date_mod2 TEXT,
    class_status TEXT,
    split_mode TEXT,
    service_pct NUMERIC,
    product_pct NUMERIC,
    attendance_pct NUMERIC,
    is_eligible BOOLEAN,
    eligibility_reason TEXT,
    nf_status TEXT,
    existing_nf_count INT
) AS $$
BEGIN
    RETURN QUERY
    WITH receivable_deals AS (
        SELECT
            cr.id AS r_id,
            cr.id_conta_azul AS r_id_ca,
            cr.descricao AS r_desc,
            cr.valor AS r_valor,
            cr.status AS r_status,
            cr.data_vencimento AS r_venc,
            cr.data_competencia AS r_comp,
            cr.contato_nome AS r_nome,
            cr.contato_cpf AS r_cpf,
            cr.account_id AS r_account,
            d.id AS d_id,
            d.product_type AS d_ptype,
            d.product AS d_pname,
            d.contact_name AS d_contact,
            d.class_mod_1 AS d_mod1,
            d.class_mod_2 AS d_mod2
        FROM conta_azul_contas_receber cr
        LEFT JOIN crm_deals d ON (
            REGEXP_REPLACE(COALESCE(cr.contato_cpf, ''), '[^0-9]', '', 'g') =
            REGEXP_REPLACE(COALESCE(d.cpf, ''), '[^0-9]', '', 'g')
            AND REGEXP_REPLACE(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') <> ''
            AND d.stage = 'closed'
        )
        WHERE (p_account_id IS NULL OR cr.account_id = p_account_id)
          AND cr.status NOT ILIKE '%Perdido%'
          AND cr.status NOT ILIKE '%Renegociado%'
          AND (p_search IS NULL OR p_search = '' OR
               cr.contato_nome ILIKE '%' || p_search || '%' OR
               cr.descricao ILIKE '%' || p_search || '%' OR
               cr.contato_cpf ILIKE '%' || p_search || '%')
    ),
    with_class AS (
        SELECT rd.*,
            cl.id AS c_id,
            cl.date_mod_2 AS c_date_mod2,
            cl.status AS c_status
        FROM receivable_deals rd
        LEFT JOIN crm_classes cl ON (
            rd.d_mod1 IS NOT NULL AND (
                cl.mod_1_code = rd.d_mod1 OR cl.mod_2_code = rd.d_mod2
            )
        )
    ),
    with_mapping AS (
        SELECT wc.*,
            COALESCE(m.split_mode, 'all_service') AS m_split,
            COALESCE(m.service_percentage, 100) AS m_svc_pct,
            COALESCE(m.product_percentage, 0) AS m_prod_pct
        FROM with_class wc
        LEFT JOIN crm_conta_azul_product_mapping m ON (
            LOWER(TRIM(m.item_name)) = LOWER(TRIM(wc.d_pname))
        )
    ),
    with_attendance AS (
        SELECT wm.*,
            CASE
                WHEN wm.c_id IS NOT NULL AND wm.d_id IS NOT NULL THEN (
                    SELECT ROUND(
                        COUNT(*) FILTER (WHERE a.present = true)::NUMERIC /
                        NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
                    )
                    FROM crm_attendance a
                    WHERE a.class_id::TEXT = wm.c_id
                      AND a.student_id = wm.d_id
                )
                ELSE NULL
            END AS att_pct
        FROM with_mapping wm
    ),
    with_nf AS (
        SELECT wa.*,
            COUNT(nfi.id) FILTER (WHERE nfi.status NOT IN ('cancelled', 'error')) AS nf_count,
            CASE
                WHEN wa.m_split = 'divided' THEN 2
                ELSE 1
            END AS nf_expected
        FROM with_attendance wa
        LEFT JOIN nf_invoices nfi ON nfi.conta_azul_receivable_id = wa.r_id
            AND nfi.status NOT IN ('cancelled', 'error')
        GROUP BY wa.r_id, wa.r_id_ca, wa.r_desc, wa.r_valor, wa.r_status,
                 wa.r_venc, wa.r_comp, wa.r_nome, wa.r_cpf, wa.r_account,
                 wa.d_id, wa.d_ptype, wa.d_pname, wa.d_contact, wa.d_mod1, wa.d_mod2,
                 wa.c_id, wa.c_date_mod2, wa.c_status,
                 wa.m_split, wa.m_svc_pct, wa.m_prod_pct, wa.att_pct
    ),
    final AS (
        SELECT wn.*,
            CASE
                WHEN wn.nf_count >= wn.nf_expected THEN 'complete'
                WHEN wn.nf_count > 0 THEN 'partial'
                ELSE NULL
            END AS computed_nf_status,
            CASE
                WHEN wn.d_ptype = 'Presencial' THEN (
                    wn.c_date_mod2 IS NOT NULL
                    AND (wn.c_date_mod2::DATE + INTERVAL '1 day') < CURRENT_DATE
                    AND COALESCE(wn.att_pct, 0) >= 70
                )
                ELSE (
                    wn.r_status ILIKE '%Liquidado%' OR wn.r_status ILIKE '%Quitado%'
                )
            END AS computed_eligible,
            CASE
                WHEN wn.d_id IS NULL THEN 'Sem vínculo com deal'
                WHEN wn.d_ptype = 'Presencial' AND wn.c_date_mod2 IS NULL THEN 'Turma sem data Mod 2'
                WHEN wn.d_ptype = 'Presencial' AND NOT ((wn.c_date_mod2::DATE + INTERVAL '1 day') < CURRENT_DATE) THEN 'Curso ainda não concluído'
                WHEN wn.d_ptype = 'Presencial' AND COALESCE(wn.att_pct, 0) < 70 THEN 'Presença abaixo de 70% (' || COALESCE(wn.att_pct::TEXT, '0') || '%)'
                WHEN wn.d_ptype IS DISTINCT FROM 'Presencial' AND NOT (wn.r_status ILIKE '%Liquidado%' OR wn.r_status ILIKE '%Quitado%') THEN 'Pagamento não confirmado'
                ELSE 'Apto para emissão'
            END AS computed_reason
    )
    SELECT
        f.r_id,
        f.r_id_ca,
        f.r_desc,
        f.r_valor,
        f.r_status,
        f.r_venc,
        f.r_comp,
        f.r_nome,
        f.r_cpf,
        f.r_account,
        f.d_id,
        f.d_ptype,
        f.d_pname,
        f.d_contact,
        f.d_mod1,
        f.d_mod2,
        f.c_id,
        f.c_date_mod2,
        f.c_status,
        f.m_split,
        f.m_svc_pct,
        f.m_prod_pct,
        f.att_pct,
        f.computed_eligible,
        f.computed_reason,
        f.computed_nf_status,
        f.nf_count::INT
    FROM final f
    WHERE (
        p_status_filter = 'all'
        OR (p_status_filter = 'pending' AND f.computed_nf_status IS NULL)
        OR (p_status_filter = 'partial' AND f.computed_nf_status = 'partial')
        OR (p_status_filter = 'complete' AND f.computed_nf_status = 'complete')
        OR (p_status_filter = 'eligible' AND f.computed_eligible = true AND f.computed_nf_status IS NULL)
    )
    ORDER BY f.r_venc DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
