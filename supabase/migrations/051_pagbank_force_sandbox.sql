-- Force PagBank to sandbox mode for safe testing
-- To switch to production later: toggle "Modo Produção" in the PagBank config panel

UPDATE pagbank_config SET sandbox_mode = true WHERE sandbox_mode = false;
