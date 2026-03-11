-- ============================================================
-- RPC leve para buscar registros financeiros do Conta Azul
-- por documentos (CPF/CNPJ) e/ou nomes.
-- Normaliza CPF/CNPJ (remove formatação) de AMBOS os lados
-- antes de comparar, garantindo match independente do formato.
-- ============================================================

CREATE OR REPLACE FUNCTION lookup_financeiro_by_docs(
    p_docs TEXT[] DEFAULT NULL,
    p_names TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_docs TEXT[];
    v_receber JSONB;
    v_pagar JSONB;
BEGIN
    IF p_docs IS NOT NULL AND array_length(p_docs, 1) > 0 THEN
        SELECT array_agg(DISTINCT d)
        INTO v_clean_docs
        FROM (
            SELECT REGEXP_REPLACE(unnest(p_docs), '[^0-9]', '', 'g') AS d
        ) sub
        WHERE LENGTH(d) >= 11;
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(sub.*) ORDER BY sub.data_vencimento DESC NULLS LAST), '[]'::JSONB)
    INTO v_receber
    FROM (
        SELECT DISTINCT ON (id_conta_azul) *
        FROM conta_azul_contas_receber
        WHERE (
            v_clean_docs IS NOT NULL
            AND REGEXP_REPLACE(COALESCE(contato_cpf, ''), '[^0-9]', '', 'g') = ANY(v_clean_docs)
        ) OR (
            p_names IS NOT NULL
            AND array_length(p_names, 1) > 0
            AND contato_nome IS NOT NULL
            AND TRIM(contato_nome) <> ''
            AND EXISTS (
                SELECT 1 FROM unnest(p_names) AS n
                WHERE n IS NOT NULL AND TRIM(n) <> ''
                AND LOWER(TRIM(contato_nome)) = LOWER(TRIM(n))
            )
        )
        ORDER BY id_conta_azul, synced_at DESC NULLS LAST
    ) sub;

    SELECT COALESCE(jsonb_agg(row_to_json(sub.*) ORDER BY sub.data_vencimento DESC NULLS LAST), '[]'::JSONB)
    INTO v_pagar
    FROM (
        SELECT DISTINCT ON (id_conta_azul) *
        FROM conta_azul_contas_pagar
        WHERE (
            v_clean_docs IS NOT NULL
            AND REGEXP_REPLACE(COALESCE(contato_cpf, ''), '[^0-9]', '', 'g') = ANY(v_clean_docs)
        ) OR (
            p_names IS NOT NULL
            AND array_length(p_names, 1) > 0
            AND fornecedor_nome IS NOT NULL
            AND TRIM(fornecedor_nome) <> ''
            AND EXISTS (
                SELECT 1 FROM unnest(p_names) AS n
                WHERE n IS NOT NULL AND TRIM(n) <> ''
                AND LOWER(TRIM(fornecedor_nome)) = LOWER(TRIM(n))
            )
        )
        ORDER BY id_conta_azul, synced_at DESC NULLS LAST
    ) sub;

    RETURN jsonb_build_object('receber', v_receber, 'pagar', v_pagar);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acesso para anon e authenticated
GRANT EXECUTE ON FUNCTION lookup_financeiro_by_docs(TEXT[], TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION lookup_financeiro_by_docs(TEXT[], TEXT[]) TO authenticated;
