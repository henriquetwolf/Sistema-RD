-- Destino do botão CTA do pop-up: link externo ou outra URL (opcional)
ALTER TABLE marketing_popups
  ADD COLUMN IF NOT EXISTS cta_url TEXT DEFAULT NULL;

COMMENT ON COLUMN marketing_popups.cta_url IS 'URL de destino do botão CTA quando não for formulário (form_id). Se preenchido, o botão abre este link.';
