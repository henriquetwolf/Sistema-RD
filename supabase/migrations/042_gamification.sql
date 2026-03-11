-- ============================================================
-- Gamificação – Sistema completo de VOLLs
-- Moeda, níveis, badges, streaks, desafios, recompensas
-- ============================================================

-- 1. Configurações globais (chave-valor editável pelo admin)
CREATE TABLE IF NOT EXISTS gamification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '""',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_settings"  ON gamification_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_settings"   ON gamification_settings FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_settings (key, value) VALUES
    ('currency_name',               '"VOLLs"'),
    ('currency_symbol',             '"V"'),
    ('gamification_enabled',        'true'),
    ('leaderboard_enabled',         'true'),
    ('leaderboard_visible_count',   '20'),
    ('streaks_enabled',             'true'),
    ('challenges_enabled',          'true'),
    ('rewards_enabled',             'true'),
    ('daily_volls_cap',             '500'),
    ('show_volls_on_student_header','true')
ON CONFLICT (key) DO NOTHING;

-- 2. Níveis
CREATE TABLE IF NOT EXISTS gamification_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    min_volls INTEGER NOT NULL DEFAULT 0,
    max_volls INTEGER NOT NULL DEFAULT 0,
    icon_emoji TEXT DEFAULT '⭐',
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_levels"  ON gamification_levels FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_levels"   ON gamification_levels FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_levels (level_number, name, min_volls, max_volls, icon_emoji, color) VALUES
    (1,  'Iniciante',    0,      99,     '🌱', '#94A3B8'),
    (2,  'Estudante',    100,    299,    '📚', '#60A5FA'),
    (3,  'Praticante',   300,    599,    '💪', '#34D399'),
    (4,  'Dedicado',     600,    999,    '🔥', '#F59E0B'),
    (5,  'Avançado',     1000,   1499,   '🚀', '#8B5CF6'),
    (6,  'Expert',       1500,   2199,   '🎯', '#EC4899'),
    (7,  'Mestre',       2200,   2999,   '🏆', '#F97316'),
    (8,  'Guru',         3000,   3999,   '👑', '#EF4444'),
    (9,  'Lenda',        4000,   5499,   '⚡', '#6366F1'),
    (10, 'VOLL Master',  5500,   999999, '💎', '#FBBF24')
ON CONFLICT (level_number) DO NOTHING;

-- 3. Regras de pontuação
CREATE TABLE IF NOT EXISTS gamification_point_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL UNIQUE,
    volls INTEGER NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    max_per_day INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_point_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_rules"  ON gamification_point_rules FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_rules"   ON gamification_point_rules FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_point_rules (action_type, volls, description, max_per_day) VALUES
    ('lesson_completed',     10,  'Completar uma aula de curso online',        100),
    ('course_completed',     200, 'Completar um curso online inteiro',         NULL),
    ('apostila_page_read',   2,   'Ler uma página da apostila digital',        50),
    ('apostila_completed',   100, 'Completar toda a apostila digital',         NULL),
    ('attendance',           50,  'Presença registrada em turma presencial',   NULL),
    ('daily_login',          5,   'Login diário no portal',                    5),
    ('ai_chat',              3,   'Interação com o Tutor IA',                  30),
    ('event_registration',   30,  'Inscrição em evento',                       NULL),
    ('certificate_earned',   150, 'Obter um certificado',                      NULL),
    ('profile_completed',    50,  'Completar perfil de aprendizagem',          50)
ON CONFLICT (action_type) DO NOTHING;

-- 4. Transações de VOLLs por aluno
CREATE TABLE IF NOT EXISTS gamification_student_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    rule_id UUID REFERENCES gamification_point_rules(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    volls INTEGER NOT NULL,
    reference_id TEXT,
    reference_type TEXT,
    description TEXT DEFAULT '',
    earned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gam_points_cpf ON gamification_student_points(student_cpf, earned_at DESC);
CREATE INDEX idx_gam_points_action ON gamification_student_points(student_cpf, action_type, earned_at);

ALTER TABLE gamification_student_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_points"  ON gamification_student_points FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_points"   ON gamification_student_points FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 5. Badges / Conquistas
CREATE TABLE IF NOT EXISTS gamification_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon_emoji TEXT DEFAULT '🏅',
    image_url TEXT,
    category TEXT NOT NULL DEFAULT 'learning' CHECK (category IN ('learning', 'attendance', 'social', 'mastery', 'special')),
    criteria_type TEXT NOT NULL DEFAULT 'auto' CHECK (criteria_type IN ('auto', 'manual')),
    criteria_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_badges"  ON gamification_badges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_badges"   ON gamification_badges FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_badges (name, description, icon_emoji, category, criteria_type, criteria_config, rarity, sort_order) VALUES
    ('Primeiro Passo',      'Complete sua primeira aula',                              '👣', 'learning',   'auto', '{"action":"lesson_completed","count":1}',         'common',    1),
    ('Estudioso',           'Complete 10 aulas',                                       '📖', 'learning',   'auto', '{"action":"lesson_completed","count":10}',        'common',    2),
    ('Maratonista',         'Complete 10 aulas em um único dia',                       '⚡', 'learning',   'auto', '{"action":"lesson_completed","count":10,"period":"day"}', 'rare', 3),
    ('Formado',             'Complete seu primeiro curso online',                      '🎓', 'mastery',    'auto', '{"action":"course_completed","count":1}',          'rare',      4),
    ('Múltiplo',            'Complete 3 cursos online',                                '🎯', 'mastery',    'auto', '{"action":"course_completed","count":3}',          'epic',      5),
    ('Acadêmico',           'Complete 5 cursos online',                                '🏛️', 'mastery',    'auto', '{"action":"course_completed","count":5}',          'legendary', 6),
    ('Leitor',              'Complete uma apostila digital inteira',                   '📚', 'learning',   'auto', '{"action":"apostila_completed","count":1}',        'rare',      7),
    ('Dedicado',            'Mantenha uma sequência de 7 dias',                       '🔥', 'attendance', 'auto', '{"action":"streak","count":7}',                    'common',    8),
    ('Imparável',           'Mantenha uma sequência de 30 dias',                      '💥', 'attendance', 'auto', '{"action":"streak","count":30}',                   'epic',      9),
    ('Lenda Viva',          'Mantenha uma sequência de 100 dias',                     '🌟', 'attendance', 'auto', '{"action":"streak","count":100}',                  'legendary', 10),
    ('Presença Perfeita',   '100% de presença em uma turma presencial',               '✅', 'attendance', 'auto', '{"action":"perfect_attendance","count":1}',        'epic',      11),
    ('Explorador IA',       'Envie 50 mensagens para o Tutor IA',                    '🤖', 'social',     'auto', '{"action":"ai_chat","count":50}',                  'rare',      12),
    ('Social',              'Inscreva-se em 3 eventos',                               '🎪', 'social',     'auto', '{"action":"event_registration","count":3}',        'common',    13),
    ('Colecionador',        'Obtenha 5 certificados',                                 '🏆', 'mastery',    'auto', '{"action":"certificate_earned","count":5}',        'epic',      14),
    ('Perfil Completo',     'Preencha seu perfil de aprendizagem',                    '👤', 'social',     'auto', '{"action":"profile_completed","count":1}',         'common',    15),
    ('Comprador Esperto',   'Resgate sua primeira recompensa na loja',                '🛒', 'special',    'auto', '{"action":"reward_claimed","count":1}',            'common',    16),
    ('Investidor',          'Acumule 1.000 VOLLs',                                    '💰', 'mastery',    'auto', '{"action":"total_volls","count":1000}',            'rare',      17),
    ('Magnata',             'Acumule 5.000 VOLLs',                                    '💎', 'mastery',    'auto', '{"action":"total_volls","count":5000}',            'legendary', 18)
ON CONFLICT DO NOTHING;

-- 6. Badges conquistados por aluno
CREATE TABLE IF NOT EXISTS gamification_student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    badge_id UUID NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_cpf, badge_id)
);

CREATE INDEX idx_gam_student_badges_cpf ON gamification_student_badges(student_cpf, earned_at DESC);

ALTER TABLE gamification_student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_sbadges"  ON gamification_student_badges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_sbadges"   ON gamification_student_badges FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 7. Streaks (sequências de estudo)
CREATE TABLE IF NOT EXISTS gamification_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_started_at DATE
);

CREATE INDEX idx_gam_streaks_cpf ON gamification_streaks(student_cpf);

ALTER TABLE gamification_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_streaks"  ON gamification_streaks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_streaks"   ON gamification_streaks FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 8. Desafios / Missões
CREATE TABLE IF NOT EXISTS gamification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon_emoji TEXT DEFAULT '🎯',
    challenge_type TEXT NOT NULL DEFAULT 'daily' CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'special')),
    criteria_config JSONB NOT NULL DEFAULT '{}',
    reward_volls INTEGER NOT NULL DEFAULT 0,
    reward_badge_id UUID REFERENCES gamification_badges(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_challenges"  ON gamification_challenges FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_challenges"   ON gamification_challenges FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_challenges (title, description, icon_emoji, challenge_type, criteria_config, reward_volls) VALUES
    ('Estudante do Dia',     'Complete 3 aulas hoje',                   '📖', 'daily',   '{"action":"lesson_completed","count":3}',       15),
    ('Leitor Diário',        'Leia 10 páginas da apostila hoje',        '📄', 'daily',   '{"action":"apostila_page_read","count":10}',     10),
    ('Semana Dedicada',      'Estude em 5 dias diferentes esta semana', '📅', 'weekly',  '{"action":"daily_login","count":5}',             50),
    ('Curso do Mês',         'Complete 1 curso este mês',               '🎓', 'monthly', '{"action":"course_completed","count":1}',        300),
    ('Explorador Semanal',   'Converse com o Tutor IA 10 vezes',       '🤖', 'weekly',  '{"action":"ai_chat","count":10}',                25)
ON CONFLICT DO NOTHING;

-- 9. Progresso em desafios
CREATE TABLE IF NOT EXISTS gamification_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    challenge_id UUID NOT NULL REFERENCES gamification_challenges(id) ON DELETE CASCADE,
    current_progress INTEGER NOT NULL DEFAULT 0,
    target_progress INTEGER NOT NULL DEFAULT 1,
    completed_at TIMESTAMPTZ,
    claimed BOOLEAN DEFAULT false,
    UNIQUE (student_cpf, challenge_id)
);

CREATE INDEX idx_gam_challenge_prog_cpf ON gamification_challenge_progress(student_cpf);

ALTER TABLE gamification_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_cprogress"  ON gamification_challenge_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_cprogress"   ON gamification_challenge_progress FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 10. Catálogo de recompensas
CREATE TABLE IF NOT EXISTS gamification_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon_emoji TEXT DEFAULT '🎁',
    image_url TEXT,
    reward_type TEXT NOT NULL DEFAULT 'custom' CHECK (reward_type IN ('discount', 'content_unlock', 'badge', 'certificate', 'custom')),
    reward_config JSONB DEFAULT '{}',
    cost_volls INTEGER NOT NULL DEFAULT 0,
    stock INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_rewards"  ON gamification_rewards FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_rewards"   ON gamification_rewards FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_rewards (name, description, icon_emoji, reward_type, reward_config, cost_volls, sort_order) VALUES
    ('Desconto 5%',             'Desconto de 5% em qualquer curso online',            '🏷️', 'discount',       '{"discount_percent":5,"applicable_to":"online_courses"}',  500,  1),
    ('Desconto 10%',            'Desconto de 10% em qualquer curso online',           '🏷️', 'discount',       '{"discount_percent":10,"applicable_to":"online_courses"}', 900,  2),
    ('Conteúdo Studio Digital', 'Acesso a conteúdo exclusivo do Studio Digital',       '🎬', 'content_unlock', '{"content_type":"studio_digital_premium"}',                300,  3),
    ('Aluno Destaque',          'Certificado especial de Aluno Destaque VOLL',         '🏆', 'certificate',    '{"certificate_title":"Aluno Destaque VOLL"}',              1500, 4),
    ('Badge Exclusivo VIP',     'Badge exclusivo disponível apenas na loja',           '💎', 'badge',          '{"badge_name":"VIP VOLL"}',                                2000, 5)
ON CONFLICT DO NOTHING;

-- 11. Recompensas resgatadas
CREATE TABLE IF NOT EXISTS gamification_reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    reward_id UUID NOT NULL REFERENCES gamification_rewards(id) ON DELETE CASCADE,
    volls_spent INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    expires_at TIMESTAMPTZ,
    benefit_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_gam_claims_cpf ON gamification_reward_claims(student_cpf, claimed_at DESC);

ALTER TABLE gamification_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_claims"  ON gamification_reward_claims FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_claims"   ON gamification_reward_claims FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 12. Conteúdos desbloqueados via resgate
CREATE TABLE IF NOT EXISTS gamification_content_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    reward_claim_id UUID REFERENCES gamification_reward_claims(id) ON DELETE SET NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_cpf, content_type, content_id)
);

CREATE INDEX idx_gam_unlocks_cpf ON gamification_content_unlocks(student_cpf);

ALTER TABLE gamification_content_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_unlocks"  ON gamification_content_unlocks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_unlocks"   ON gamification_content_unlocks FOR ALL   TO anon USING (true) WITH CHECK (true);

-- 13. Configurações de notificações de gamificação
CREATE TABLE IF NOT EXISTS gamification_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL UNIQUE,
    toast_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    persistent_enabled BOOLEAN DEFAULT true,
    title_template TEXT DEFAULT '',
    message_template TEXT DEFAULT '',
    icon_emoji TEXT DEFAULT '🔔',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gamification_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_gam_notif_settings"  ON gamification_notification_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all_gam_notif_settings"   ON gamification_notification_settings FOR ALL   TO anon USING (true) WITH CHECK (true);

INSERT INTO gamification_notification_settings (notification_type, toast_enabled, push_enabled, persistent_enabled, title_template, message_template, icon_emoji) VALUES
    ('volls_earned',             true,  false, false, '+{volls} {currency_name}!',                              '{description}',                                                                              '🪙'),
    ('badge_unlocked',           true,  true,  true,  'Conquista Desbloqueada!',                                 'Você conquistou o badge ''{badge_name}''! Confira na aba Conquistas.',                        '🏅'),
    ('level_up',                 true,  true,  true,  'Parabéns! Nível {level_name}!',                          'Você subiu para o nível {level_name}! Continue acumulando {currency_name}.',                   '🆙'),
    ('streak_milestone',         true,  true,  true,  'Sequência de {streak_days} dias!',                       'Você está em uma sequência incrível de {streak_days} dias! Continue assim!',                  '🔥'),
    ('challenge_completed',      true,  false, true,  'Desafio Concluído!',                                     'Você completou o desafio ''{challenge_name}''! Resgate sua recompensa.',                       '✅'),
    ('reward_claimed',           true,  false, true,  'Recompensa Resgatada!',                                  'Você resgatou ''{reward_name}''!',                                                            '🎁'),
    ('daily_login_bonus',        true,  false, false, 'Bônus Diário!',                                         'Bônus diário: +{volls} {currency_name}! Sequência: {streak_days} dias.',                      '☀️'),
    ('challenge_new',            false, true,  true,  'Novo Desafio!',                                          'Novo desafio disponível: ''{challenge_name}''! Complete e ganhe {reward_volls} {currency_name}.','🎯'),
    ('challenge_expiring',       false, true,  true,  'Desafio Expirando!',                                     'O desafio ''{challenge_name}'' expira em breve! Progresso: {progress}%.',                      '⏰'),
    ('streak_risk',              false, true,  true,  'Sequência em Risco!',                                    'Sua sequência de {streak_days} dias está em risco! Acesse agora para manter.',                '⚠️'),
    ('streak_lost',              false, false, true,  'Sequência Perdida',                                      'Sua sequência de {streak_days} dias foi perdida. Comece uma nova hoje!',                      '💔'),
    ('reward_expiring',          false, true,  true,  'Recompensa Expirando!',                                  'Sua recompensa ''{reward_name}'' expira em {days} dias! Use antes que expire.',                '⏳'),
    ('leaderboard_change',       false, false, true,  'Ranking Atualizado!',                                    'Você subiu para a posição #{position} no ranking!',                                          '📊'),
    ('weekly_summary',           false, true,  true,  'Resumo da Semana!',                                      'Semana incrível! Você ganhou {volls} {currency_name} e {badges} badges.',                     '📈'),
    ('push_daily_reminder',      false, true,  false, 'Hora de Estudar!',                                       'Não esqueça de estudar hoje! Sua sequência de {streak_days} dias depende de você.',            '📚'),
    ('gamification_reward_available', false, false, true, 'Nova Recompensa Disponível!',                        'Você já tem {currency_name} suficientes para trocar por ''{reward_name}''!',                   '🛒')
ON CONFLICT (notification_type) DO NOTHING;
