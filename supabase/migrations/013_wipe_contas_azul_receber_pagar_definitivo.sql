-- ============================================================
-- Limpeza definitiva: Contas a Receber e Contas a Pagar
-- Remove todos os registros para recomeçar a sincronização
-- por conta (cada conta Conta Azul separada por account_id).
-- ============================================================

-- 1. Apagar todos os registros de contas a receber e a pagar
TRUNCATE TABLE conta_azul_contas_receber CASCADE;
TRUNCATE TABLE conta_azul_contas_pagar CASCADE;

-- 2. Limpar histórico de sync de recebíveis/pagáveis (evita uso de datas antigas em lógica incremental)
DELETE FROM conta_azul_sync_log
WHERE tipo_sync IN (
  'receivables',
  'payables',
  'receivables-incremental',
  'payables-incremental'
);

-- 3. Garantir índice único por (account_id, id_conta_azul) para evitar duplicidade entre contas
DROP INDEX IF EXISTS uq_ca_receber_account;
DROP INDEX IF EXISTS uq_ca_pagar_account;
CREATE UNIQUE INDEX uq_ca_receber_account ON conta_azul_contas_receber(account_id, id_conta_azul);
CREATE UNIQUE INDEX uq_ca_pagar_account ON conta_azul_contas_pagar(account_id, id_conta_azul);
