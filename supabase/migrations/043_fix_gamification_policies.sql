-- ============================================================
-- FIX: Adicionar policies para o role "authenticated" (Admin)
-- As policies originais sao TO anon (alunos/instrutores).
-- O Admin usa Supabase Auth (signInWithPassword) = role authenticated.
-- Sem policies TO authenticated, o Admin nao consegue ler nenhuma tabela.
-- ============================================================

-- gamification_settings
DROP POLICY IF EXISTS "auth_read_gam_settings" ON gamification_settings;
DROP POLICY IF EXISTS "auth_all_gam_settings" ON gamification_settings;
CREATE POLICY "auth_read_gam_settings"  ON gamification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_settings"   ON gamification_settings FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_levels
DROP POLICY IF EXISTS "auth_read_gam_levels" ON gamification_levels;
DROP POLICY IF EXISTS "auth_all_gam_levels" ON gamification_levels;
CREATE POLICY "auth_read_gam_levels"  ON gamification_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_levels"   ON gamification_levels FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_point_rules
DROP POLICY IF EXISTS "auth_read_gam_rules" ON gamification_point_rules;
DROP POLICY IF EXISTS "auth_all_gam_rules" ON gamification_point_rules;
CREATE POLICY "auth_read_gam_rules"  ON gamification_point_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_rules"   ON gamification_point_rules FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_student_points
DROP POLICY IF EXISTS "auth_read_gam_points" ON gamification_student_points;
DROP POLICY IF EXISTS "auth_all_gam_points" ON gamification_student_points;
CREATE POLICY "auth_read_gam_points"  ON gamification_student_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_points"   ON gamification_student_points FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_badges
DROP POLICY IF EXISTS "auth_read_gam_badges" ON gamification_badges;
DROP POLICY IF EXISTS "auth_all_gam_badges" ON gamification_badges;
CREATE POLICY "auth_read_gam_badges"  ON gamification_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_badges"   ON gamification_badges FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_student_badges
DROP POLICY IF EXISTS "auth_read_gam_sbadges" ON gamification_student_badges;
DROP POLICY IF EXISTS "auth_all_gam_sbadges" ON gamification_student_badges;
CREATE POLICY "auth_read_gam_sbadges"  ON gamification_student_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_sbadges"   ON gamification_student_badges FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_streaks
DROP POLICY IF EXISTS "auth_read_gam_streaks" ON gamification_streaks;
DROP POLICY IF EXISTS "auth_all_gam_streaks" ON gamification_streaks;
CREATE POLICY "auth_read_gam_streaks"  ON gamification_streaks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_streaks"   ON gamification_streaks FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_challenges
DROP POLICY IF EXISTS "auth_read_gam_challenges" ON gamification_challenges;
DROP POLICY IF EXISTS "auth_all_gam_challenges" ON gamification_challenges;
CREATE POLICY "auth_read_gam_challenges"  ON gamification_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_challenges"   ON gamification_challenges FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_challenge_progress
DROP POLICY IF EXISTS "auth_read_gam_cprogress" ON gamification_challenge_progress;
DROP POLICY IF EXISTS "auth_all_gam_cprogress" ON gamification_challenge_progress;
CREATE POLICY "auth_read_gam_cprogress"  ON gamification_challenge_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_cprogress"   ON gamification_challenge_progress FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_rewards
DROP POLICY IF EXISTS "auth_read_gam_rewards" ON gamification_rewards;
DROP POLICY IF EXISTS "auth_all_gam_rewards" ON gamification_rewards;
CREATE POLICY "auth_read_gam_rewards"  ON gamification_rewards FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_rewards"   ON gamification_rewards FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_reward_claims
DROP POLICY IF EXISTS "auth_read_gam_claims" ON gamification_reward_claims;
DROP POLICY IF EXISTS "auth_all_gam_claims" ON gamification_reward_claims;
CREATE POLICY "auth_read_gam_claims"  ON gamification_reward_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_claims"   ON gamification_reward_claims FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_content_unlocks
DROP POLICY IF EXISTS "auth_read_gam_unlocks" ON gamification_content_unlocks;
DROP POLICY IF EXISTS "auth_all_gam_unlocks" ON gamification_content_unlocks;
CREATE POLICY "auth_read_gam_unlocks"  ON gamification_content_unlocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_unlocks"   ON gamification_content_unlocks FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- gamification_notification_settings
DROP POLICY IF EXISTS "auth_read_gam_notif_settings" ON gamification_notification_settings;
DROP POLICY IF EXISTS "auth_all_gam_notif_settings" ON gamification_notification_settings;
CREATE POLICY "auth_read_gam_notif_settings"  ON gamification_notification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_gam_notif_settings"   ON gamification_notification_settings FOR ALL   TO authenticated USING (true) WITH CHECK (true);
