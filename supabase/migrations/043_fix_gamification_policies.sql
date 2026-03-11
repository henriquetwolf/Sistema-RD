-- ============================================================
-- FIX: Recriar todas as RLS policies de gamificacao
-- Garante que as policies existem mesmo se a 042 executou parcialmente
-- ============================================================

-- gamification_settings
ALTER TABLE gamification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_settings" ON gamification_settings;
DROP POLICY IF EXISTS "anon_all_gam_settings" ON gamification_settings;
CREATE POLICY "anon_read_gam_settings"  ON gamification_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_settings"   ON gamification_settings FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_levels
ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_levels" ON gamification_levels;
DROP POLICY IF EXISTS "anon_all_gam_levels" ON gamification_levels;
CREATE POLICY "anon_read_gam_levels"  ON gamification_levels FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_levels"   ON gamification_levels FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_point_rules
ALTER TABLE gamification_point_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_rules" ON gamification_point_rules;
DROP POLICY IF EXISTS "anon_all_gam_rules" ON gamification_point_rules;
CREATE POLICY "anon_read_gam_rules"  ON gamification_point_rules FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_rules"   ON gamification_point_rules FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_student_points
ALTER TABLE gamification_student_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_points" ON gamification_student_points;
DROP POLICY IF EXISTS "anon_all_gam_points" ON gamification_student_points;
CREATE POLICY "anon_read_gam_points"  ON gamification_student_points FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_points"   ON gamification_student_points FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_badges
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_badges" ON gamification_badges;
DROP POLICY IF EXISTS "anon_all_gam_badges" ON gamification_badges;
CREATE POLICY "anon_read_gam_badges"  ON gamification_badges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_badges"   ON gamification_badges FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_student_badges
ALTER TABLE gamification_student_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_sbadges" ON gamification_student_badges;
DROP POLICY IF EXISTS "anon_all_gam_sbadges" ON gamification_student_badges;
CREATE POLICY "anon_read_gam_sbadges"  ON gamification_student_badges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_sbadges"   ON gamification_student_badges FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_streaks
ALTER TABLE gamification_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_streaks" ON gamification_streaks;
DROP POLICY IF EXISTS "anon_all_gam_streaks" ON gamification_streaks;
CREATE POLICY "anon_read_gam_streaks"  ON gamification_streaks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_streaks"   ON gamification_streaks FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_challenges
ALTER TABLE gamification_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_challenges" ON gamification_challenges;
DROP POLICY IF EXISTS "anon_all_gam_challenges" ON gamification_challenges;
CREATE POLICY "anon_read_gam_challenges"  ON gamification_challenges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_challenges"   ON gamification_challenges FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_challenge_progress
ALTER TABLE gamification_challenge_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_cprogress" ON gamification_challenge_progress;
DROP POLICY IF EXISTS "anon_all_gam_cprogress" ON gamification_challenge_progress;
CREATE POLICY "anon_read_gam_cprogress"  ON gamification_challenge_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_cprogress"   ON gamification_challenge_progress FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_rewards
ALTER TABLE gamification_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_rewards" ON gamification_rewards;
DROP POLICY IF EXISTS "anon_all_gam_rewards" ON gamification_rewards;
CREATE POLICY "anon_read_gam_rewards"  ON gamification_rewards FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_rewards"   ON gamification_rewards FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_reward_claims
ALTER TABLE gamification_reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_claims" ON gamification_reward_claims;
DROP POLICY IF EXISTS "anon_all_gam_claims" ON gamification_reward_claims;
CREATE POLICY "anon_read_gam_claims"  ON gamification_reward_claims FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_claims"   ON gamification_reward_claims FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_content_unlocks
ALTER TABLE gamification_content_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_unlocks" ON gamification_content_unlocks;
DROP POLICY IF EXISTS "anon_all_gam_unlocks" ON gamification_content_unlocks;
CREATE POLICY "anon_read_gam_unlocks"  ON gamification_content_unlocks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_unlocks"   ON gamification_content_unlocks FOR ALL   TO anon USING (true) WITH CHECK (true);

-- gamification_notification_settings
ALTER TABLE gamification_notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_gam_notif_settings" ON gamification_notification_settings;
DROP POLICY IF EXISTS "anon_all_gam_notif_settings" ON gamification_notification_settings;
CREATE POLICY "anon_read_gam_notif_settings"  ON gamification_notification_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_notif_settings"   ON gamification_notification_settings FOR ALL   TO anon USING (true) WITH CHECK (true);

-- Recriar indices (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_gam_points_cpf ON gamification_student_points(student_cpf, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gam_points_action ON gamification_student_points(student_cpf, action_type, earned_at);
CREATE INDEX IF NOT EXISTS idx_gam_student_badges_cpf ON gamification_student_badges(student_cpf, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gam_streaks_cpf ON gamification_streaks(student_cpf);
CREATE INDEX IF NOT EXISTS idx_gam_challenge_prog_cpf ON gamification_challenge_progress(student_cpf);
CREATE INDEX IF NOT EXISTS idx_gam_claims_cpf ON gamification_reward_claims(student_cpf, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gam_unlocks_cpf ON gamification_content_unlocks(student_cpf);
