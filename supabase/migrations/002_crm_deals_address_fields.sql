-- Adiciona campos de endereço completo à tabela crm_deals
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS address_state TEXT;
