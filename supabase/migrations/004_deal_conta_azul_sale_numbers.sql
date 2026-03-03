-- Adiciona colunas para armazenar os números de venda do Conta Azul no lead
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS conta_azul_sale_number_service TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS conta_azul_sale_number_product TEXT;
