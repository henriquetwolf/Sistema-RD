-- Remove registros importados via XLSX (id_conta_azul comeca com 'imp-')
-- A API sync eh agora a unica fonte de verdade
DELETE FROM conta_azul_contas_receber WHERE id_conta_azul LIKE 'imp-%';
DELETE FROM conta_azul_contas_pagar WHERE id_conta_azul LIKE 'imp-%';
