-- Allow anon role to read conta_azul financial tables
-- Needed because instructors, students, and other portal users
-- log in via table queries (not Supabase Auth), so they use the anon role.

CREATE POLICY "Anon read receber" ON conta_azul_contas_receber FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read pagar" ON conta_azul_contas_pagar FOR SELECT TO anon USING (true);
