import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, Search, Settings, Trophy, Star,
  Award, Gift, Bell, BarChart3, Zap, Target, X, Check, ChevronDown,
  Users, TrendingUp, Medal, Crown, Edit2, ToggleLeft, ToggleRight,
  RefreshCw, AlertCircle, CheckCircle, Minus
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import {
  GamificationSetting, GamificationLevel, GamificationPointRule,
  GamificationBadge, GamificationChallenge, GamificationReward,
  GamificationNotificationSetting, GamificationLeaderboardEntry,
  GamificationRewardClaim,
  BadgeCategory, BadgeRarity, BadgeCriteriaType,
  ChallengeType, RewardType
} from '../types';

interface GamificationAdminProps {
  onBack: () => void;
}

type TabKey = 'settings' | 'levels' | 'rules' | 'badges' | 'challenges' | 'rewards' | 'notifications' | 'dashboard';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'settings', label: 'Configurações Gerais', icon: <Settings size={16} /> },
  { key: 'levels', label: 'Níveis', icon: <TrendingUp size={16} /> },
  { key: 'rules', label: 'Regras de VOLLs', icon: <Zap size={16} /> },
  { key: 'badges', label: 'Badges/Conquistas', icon: <Award size={16} /> },
  { key: 'challenges', label: 'Desafios', icon: <Target size={16} /> },
  { key: 'rewards', label: 'Recompensas', icon: <Gift size={16} /> },
  { key: 'notifications', label: 'Notificações', icon: <Bell size={16} /> },
  { key: 'dashboard', label: 'Dashboard / Ranking', icon: <BarChart3 size={16} /> },
];

const BADGE_CATEGORIES: { value: BadgeCategory; label: string }[] = [
  { value: 'learning', label: 'Aprendizado' },
  { value: 'attendance', label: 'Presença' },
  { value: 'social', label: 'Social' },
  { value: 'mastery', label: 'Maestria' },
  { value: 'special', label: 'Especial' },
];

const BADGE_RARITIES: { value: BadgeRarity; label: string }[] = [
  { value: 'common', label: 'Comum' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Épico' },
  { value: 'legendary', label: 'Lendário' },
];

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'special', label: 'Especial' },
];

const REWARD_TYPES: { value: RewardType; label: string }[] = [
  { value: 'discount', label: 'Desconto' },
  { value: 'content_unlock', label: 'Desbloqueio de Conteúdo' },
  { value: 'badge', label: 'Badge' },
  { value: 'certificate', label: 'Certificado' },
  { value: 'custom', label: 'Personalizado' },
];

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-indigo-600' : 'bg-slate-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={clsx(
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        value ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={clsx(
      'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm',
      type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
    )}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  );
}

export const GamificationAdmin: React.FC<GamificationAdminProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('settings');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Settings state ──
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});

  // ── Levels state ──
  const [levels, setLevels] = useState<GamificationLevel[]>([]);
  const [editingLevel, setEditingLevel] = useState<Partial<GamificationLevel> | null>(null);

  // ── Rules state ──
  const [rules, setRules] = useState<GamificationPointRule[]>([]);
  const [editingRule, setEditingRule] = useState<Partial<GamificationPointRule> | null>(null);

  // ── Badges state ──
  const [badges, setBadges] = useState<GamificationBadge[]>([]);
  const [badgeModal, setBadgeModal] = useState<Partial<GamificationBadge> | null>(null);
  const [grantBadgeModal, setGrantBadgeModal] = useState<{ badgeId: string; cpf: string } | null>(null);

  // ── Challenges state ──
  const [challenges, setChallenges] = useState<GamificationChallenge[]>([]);
  const [challengeModal, setChallengeModal] = useState<Partial<GamificationChallenge> | null>(null);
  const [challengeFilter, setChallengeFilter] = useState<string>('all');

  // ── Rewards state ──
  const [rewards, setRewards] = useState<GamificationReward[]>([]);
  const [rewardModal, setRewardModal] = useState<Partial<GamificationReward> | null>(null);
  const [rewardClaims, setRewardClaims] = useState<GamificationRewardClaim[]>([]);

  // ── Notifications state ──
  const [notifSettings, setNotifSettings] = useState<GamificationNotificationSetting[]>([]);

  // ── Dashboard state ──
  const [dashStats, setDashStats] = useState<Record<string, any>>({});
  const [leaderboard, setLeaderboard] = useState<GamificationLeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all'>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [adjustCpf, setAdjustCpf] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // ── Data loading per tab ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'settings': {
            const data = await appBackend.getGamificationSettings();
            const map: Record<string, any> = {};
            for (const s of data) {
              try { map[s.key] = JSON.parse(s.value); } catch { map[s.key] = s.value; }
            }
            setSettingsMap(map);
            break;
          }
          case 'levels': {
            setLevels(await appBackend.getGamificationLevels());
            break;
          }
          case 'rules': {
            setRules(await appBackend.getGamificationPointRules());
            break;
          }
          case 'badges': {
            setBadges(await appBackend.getGamificationBadges());
            break;
          }
          case 'challenges': {
            setChallenges(await appBackend.getGamificationChallenges());
            break;
          }
          case 'rewards': {
            const [rw, cl] = await Promise.all([
              appBackend.getGamificationRewards(),
              appBackend.getStudentRewards(''),
            ]);
            setRewards(rw);
            setRewardClaims(cl);
            break;
          }
          case 'notifications': {
            setNotifSettings(await appBackend.getGamificationNotificationSettings());
            break;
          }
          case 'dashboard': {
            const [stats, lb] = await Promise.all([
              appBackend.getGamificationDashboard(),
              appBackend.getLeaderboard(leaderboardPeriod, 50),
            ]);
            setDashStats(stats);
            setLeaderboard(lb);
            break;
          }
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao carregar dados', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  // ── Settings tab ──
  const saveSetting = async (key: string, value: any) => {
    try {
      await appBackend.saveGamificationSetting(key, value);
      setSettingsMap(prev => ({ ...prev, [key]: value }));
      showToast('Configuração salva');
    } catch { showToast('Erro ao salvar', 'error'); }
  };

  const renderSettings = () => {
    const boolSettings = [
      { key: 'gamification_enabled', label: 'Gamificação Ativa' },
      { key: 'leaderboard_enabled', label: 'Ranking Ativado' },
      { key: 'streaks_enabled', label: 'Streaks Ativados' },
      { key: 'challenges_enabled', label: 'Desafios Ativados' },
      { key: 'rewards_enabled', label: 'Recompensas Ativadas' },
      { key: 'show_on_header', label: 'Exibir no Header' },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-800">Configurações Gerais</h3>

          {boolSettings.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">{label}</span>
              <Toggle value={!!settingsMap[key]} onChange={v => saveSetting(key, v)} />
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Moeda</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={settingsMap.currency_name || ''}
                onChange={e => setSettingsMap(p => ({ ...p, currency_name: e.target.value }))}
                onBlur={() => saveSetting('currency_name', settingsMap.currency_name || 'VOLLs')}
                placeholder="VOLLs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Símbolo da Moeda</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={settingsMap.currency_symbol || ''}
                onChange={e => setSettingsMap(p => ({ ...p, currency_symbol: e.target.value }))}
                onBlur={() => saveSetting('currency_symbol', settingsMap.currency_symbol || '⚡')}
                placeholder="⚡"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cap Diário de VOLLs</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={settingsMap.daily_volls_cap ?? ''}
                onChange={e => setSettingsMap(p => ({ ...p, daily_volls_cap: parseInt(e.target.value) || 0 }))}
                onBlur={() => saveSetting('daily_volls_cap', settingsMap.daily_volls_cap || 0)}
                placeholder="0 = sem limite"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Levels tab ──
  const saveLevel = async (level: Partial<GamificationLevel>) => {
    try {
      await appBackend.saveGamificationLevel(level);
      setLevels(await appBackend.getGamificationLevels());
      setEditingLevel(null);
      showToast('Nível salvo');
    } catch { showToast('Erro ao salvar nível', 'error'); }
  };

  const deleteLevel = async (id: string) => {
    if (!confirm('Excluir este nível?')) return;
    try {
      await appBackend.deleteGamificationLevel(id);
      setLevels(prev => prev.filter(l => l.id !== id));
      showToast('Nível excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const renderLevels = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Níveis</h3>
        <button
          onClick={() => setEditingLevel({ level_number: levels.length + 1, name: '', min_volls: 0, max_volls: 0, icon_emoji: '⭐', color: '#6366f1' })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Novo Nível
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ícone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Mín VOLLs</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Máx VOLLs</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cor</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {levels.map(lv => (
              <tr key={lv.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono">{lv.level_number}</td>
                <td className="px-4 py-3 text-xl">{lv.icon_emoji}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{lv.name}</td>
                <td className="px-4 py-3">{lv.min_volls.toLocaleString()}</td>
                <td className="px-4 py-3">{lv.max_volls.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="inline-block w-6 h-6 rounded-full border border-slate-200" style={{ backgroundColor: lv.color }} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditingLevel({ ...lv })} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Editar">
                      <Edit2 size={15} className="text-slate-500" />
                    </button>
                    <button onClick={() => deleteLevel(lv.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition" title="Excluir">
                      <Trash2 size={15} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {levels.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum nível cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingLevel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{editingLevel.id ? 'Editar Nível' : 'Novo Nível'}</h3>
              <button onClick={() => setEditingLevel(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nº do Nível</label>
                <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingLevel.level_number || ''} onChange={e => setEditingLevel(p => ({ ...p!, level_number: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ícone (Emoji)</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingLevel.icon_emoji || ''} onChange={e => setEditingLevel(p => ({ ...p!, icon_emoji: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingLevel.name || ''} onChange={e => setEditingLevel(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mín VOLLs</label>
                <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingLevel.min_volls ?? ''} onChange={e => setEditingLevel(p => ({ ...p!, min_volls: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Máx VOLLs</label>
                <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingLevel.max_volls ?? ''} onChange={e => setEditingLevel(p => ({ ...p!, max_volls: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-9 w-12 border border-slate-300 rounded cursor-pointer" value={editingLevel.color || '#6366f1'} onChange={e => setEditingLevel(p => ({ ...p!, color: e.target.value }))} />
                  <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" value={editingLevel.color || ''} onChange={e => setEditingLevel(p => ({ ...p!, color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingLevel(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => saveLevel(editingLevel)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Rules tab ──
  const saveRule = async (rule: Partial<GamificationPointRule>) => {
    try {
      await appBackend.saveGamificationPointRule(rule);
      setRules(await appBackend.getGamificationPointRules());
      setEditingRule(null);
      showToast('Regra salva');
    } catch { showToast('Erro ao salvar regra', 'error'); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    try {
      await appBackend.deleteGamificationPointRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      showToast('Regra excluída');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const toggleRuleActive = async (rule: GamificationPointRule) => {
    try {
      await appBackend.saveGamificationPointRule({ id: rule.id, is_active: !rule.is_active });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    } catch { showToast('Erro ao atualizar', 'error'); }
  };

  const renderRules = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Regras de VOLLs</h3>
        <button
          onClick={() => setEditingRule({ action_type: '', volls: 0, description: '', is_active: true, max_per_day: null })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Nova Regra
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ativo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ação</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">VOLLs</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Máx/Dia</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3"><Toggle value={r.is_active} onChange={() => toggleRuleActive(r)} /></td>
                <td className="px-4 py-3 font-mono text-xs bg-slate-50 rounded">{r.action_type}</td>
                <td className="px-4 py-3 text-slate-700">{r.description}</td>
                <td className="px-4 py-3 font-semibold text-indigo-600">{r.volls}</td>
                <td className="px-4 py-3 text-slate-500">{r.max_per_day ?? '∞'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditingRule({ ...r })} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><Edit2 size={15} className="text-slate-500" /></button>
                    <button onClick={() => deleteRule(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} className="text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma regra cadastrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{editingRule.id ? 'Editar Regra' : 'Nova Regra'}</h3>
              <button onClick={() => setEditingRule(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Ação</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingRule.action_type || ''} onChange={e => setEditingRule(p => ({ ...p!, action_type: e.target.value }))} placeholder="ex: course_completed" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingRule.description || ''} onChange={e => setEditingRule(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">VOLLs</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingRule.volls ?? ''} onChange={e => setEditingRule(p => ({ ...p!, volls: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Máx por Dia</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={editingRule.max_per_day ?? ''} onChange={e => setEditingRule(p => ({ ...p!, max_per_day: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Vazio = sem limite" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Ativo</span>
                <Toggle value={!!editingRule.is_active} onChange={v => setEditingRule(p => ({ ...p!, is_active: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingRule(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => saveRule(editingRule)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Badges tab ──
  const saveBadge = async (badge: Partial<GamificationBadge>) => {
    try {
      const toSave = { ...badge };
      if (typeof toSave.criteria_config === 'string') {
        try { toSave.criteria_config = JSON.parse(toSave.criteria_config as any); } catch { /* keep as-is */ }
      }
      await appBackend.saveGamificationBadge(toSave);
      setBadges(await appBackend.getGamificationBadges());
      setBadgeModal(null);
      showToast('Badge salvo');
    } catch { showToast('Erro ao salvar badge', 'error'); }
  };

  const deleteBadge = async (id: string) => {
    if (!confirm('Excluir este badge?')) return;
    try {
      await appBackend.deleteGamificationBadge(id);
      setBadges(prev => prev.filter(b => b.id !== id));
      showToast('Badge excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const grantBadge = async () => {
    if (!grantBadgeModal?.cpf || !grantBadgeModal.badgeId) return;
    try {
      await appBackend.grantBadgeManually(grantBadgeModal.cpf.replace(/\D/g, ''), grantBadgeModal.badgeId);
      showToast('Badge concedido com sucesso');
      setGrantBadgeModal(null);
    } catch { showToast('Erro ao conceder badge', 'error'); }
  };

  const renderBadges = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Badges / Conquistas</h3>
        <button
          onClick={() => setBadgeModal({ name: '', description: '', icon_emoji: '🏆', category: 'learning', rarity: 'common', criteria_type: 'manual', criteria_config: {}, is_active: true, sort_order: badges.length })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Novo Badge
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{b.icon_emoji}</span>
                <div>
                  <h4 className="font-semibold text-slate-800">{b.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>
                </div>
              </div>
              <div className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', {
                'bg-slate-100 text-slate-600': b.rarity === 'common',
                'bg-blue-100 text-blue-700': b.rarity === 'rare',
                'bg-purple-100 text-purple-700': b.rarity === 'epic',
                'bg-amber-100 text-amber-700': b.rarity === 'legendary',
              })}>{BADGE_RARITIES.find(r => r.value === b.rarity)?.label}</div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{BADGE_CATEGORIES.find(c => c.value === b.category)?.label}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{b.criteria_type === 'auto' ? 'Automático' : 'Manual'}</span>
              <span className={clsx('px-2 py-0.5 rounded', b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                {b.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => setBadgeModal({ ...b, criteria_config: b.criteria_config })} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Editar"><Edit2 size={14} className="text-slate-500" /></button>
              <button onClick={() => setGrantBadgeModal({ badgeId: b.id, cpf: '' })} className="p-1.5 hover:bg-indigo-50 rounded-lg transition text-xs text-indigo-600 font-medium flex items-center gap-1"><Award size={14} /> Conceder</button>
              <button onClick={() => deleteBadge(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition ml-auto" title="Excluir"><Trash2 size={14} className="text-red-500" /></button>
            </div>
          </div>
        ))}
        {badges.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhum badge cadastrado</div>
        )}
      </div>

      {badgeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{badgeModal.id ? 'Editar Badge' : 'Novo Badge'}</h3>
              <button onClick={() => setBadgeModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={badgeModal.name || ''} onChange={e => setBadgeModal(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ícone</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center text-xl" value={badgeModal.icon_emoji || ''} onChange={e => setBadgeModal(p => ({ ...p!, icon_emoji: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} value={badgeModal.description || ''} onChange={e => setBadgeModal(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={badgeModal.category || 'learning'} onChange={e => setBadgeModal(p => ({ ...p!, category: e.target.value as BadgeCategory }))}>
                    {BADGE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Raridade</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={badgeModal.rarity || 'common'} onChange={e => setBadgeModal(p => ({ ...p!, rarity: e.target.value as BadgeRarity }))}>
                    {BADGE_RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Critério</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={badgeModal.criteria_type || 'manual'} onChange={e => setBadgeModal(p => ({ ...p!, criteria_type: e.target.value as BadgeCriteriaType }))}>
                    <option value="auto">Automático</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ordem</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={badgeModal.sort_order ?? 0} onChange={e => setBadgeModal(p => ({ ...p!, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Configuração de Critério (JSON)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  rows={3}
                  value={typeof badgeModal.criteria_config === 'string' ? badgeModal.criteria_config : JSON.stringify(badgeModal.criteria_config || {}, null, 2)}
                  onChange={e => setBadgeModal(p => ({ ...p!, criteria_config: e.target.value as any }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Ativo</span>
                <Toggle value={!!badgeModal.is_active} onChange={v => setBadgeModal(p => ({ ...p!, is_active: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBadgeModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => saveBadge(badgeModal)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {grantBadgeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Conceder Badge Manualmente</h3>
              <button onClick={() => setGrantBadgeModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CPF do Aluno</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="000.000.000-00" value={grantBadgeModal.cpf} onChange={e => setGrantBadgeModal(p => ({ ...p!, cpf: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGrantBadgeModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={grantBadge} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"><Award size={15} /> Conceder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Challenges tab ──
  const saveChallenge = async (ch: Partial<GamificationChallenge>) => {
    try {
      const toSave = { ...ch };
      if (typeof toSave.criteria_config === 'string') {
        try { toSave.criteria_config = JSON.parse(toSave.criteria_config as any); } catch { /* keep */ }
      }
      await appBackend.saveGamificationChallenge(toSave);
      setChallenges(await appBackend.getGamificationChallenges());
      setChallengeModal(null);
      showToast('Desafio salvo');
    } catch { showToast('Erro ao salvar desafio', 'error'); }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm('Excluir este desafio?')) return;
    try {
      await appBackend.deleteGamificationChallenge(id);
      setChallenges(prev => prev.filter(c => c.id !== id));
      showToast('Desafio excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const filteredChallenges = challengeFilter === 'all' ? challenges : challenges.filter(c => c.challenge_type === challengeFilter);

  const renderChallenges = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-slate-800">Desafios</h3>
        <div className="flex items-center gap-2">
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={challengeFilter}
            onChange={e => setChallengeFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            {CHALLENGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button
            onClick={() => setChallengeModal({ title: '', description: '', icon_emoji: '🎯', challenge_type: 'daily', criteria_config: {}, reward_volls: 0, start_date: null, end_date: null, is_active: true, sort_order: challenges.length })}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            <Plus size={16} /> Novo Desafio
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredChallenges.map(ch => (
          <div key={ch.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ch.icon_emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800">{ch.title}</h4>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', {
                      'bg-blue-100 text-blue-700': ch.challenge_type === 'daily',
                      'bg-green-100 text-green-700': ch.challenge_type === 'weekly',
                      'bg-purple-100 text-purple-700': ch.challenge_type === 'monthly',
                      'bg-amber-100 text-amber-700': ch.challenge_type === 'special',
                    })}>{CHALLENGE_TYPES.find(t => t.value === ch.challenge_type)?.label}</span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs', ch.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                      {ch.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{ch.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="font-medium text-indigo-600">+{ch.reward_volls} VOLLs</span>
                    {ch.start_date && <span>Início: {new Date(ch.start_date).toLocaleDateString('pt-BR')}</span>}
                    {ch.end_date && <span>Fim: {new Date(ch.end_date).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setChallengeModal({ ...ch })} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><Edit2 size={15} className="text-slate-500" /></button>
                <button onClick={() => deleteChallenge(ch.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} className="text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
        {filteredChallenges.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">Nenhum desafio encontrado</div>
        )}
      </div>

      {challengeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{challengeModal.id ? 'Editar Desafio' : 'Novo Desafio'}</h3>
              <button onClick={() => setChallengeModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={challengeModal.title || ''} onChange={e => setChallengeModal(p => ({ ...p!, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ícone</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center text-xl" value={challengeModal.icon_emoji || ''} onChange={e => setChallengeModal(p => ({ ...p!, icon_emoji: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} value={challengeModal.description || ''} onChange={e => setChallengeModal(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={challengeModal.challenge_type || 'daily'} onChange={e => setChallengeModal(p => ({ ...p!, challenge_type: e.target.value as ChallengeType }))}>
                    {CHALLENGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Recompensa (VOLLs)</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={challengeModal.reward_volls ?? 0} onChange={e => setChallengeModal(p => ({ ...p!, reward_volls: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Início</label>
                  <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={challengeModal.start_date?.split('T')[0] || ''} onChange={e => setChallengeModal(p => ({ ...p!, start_date: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim</label>
                  <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={challengeModal.end_date?.split('T')[0] || ''} onChange={e => setChallengeModal(p => ({ ...p!, end_date: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Configuração de Critério (JSON)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  rows={3}
                  value={typeof challengeModal.criteria_config === 'string' ? challengeModal.criteria_config : JSON.stringify(challengeModal.criteria_config || {}, null, 2)}
                  onChange={e => setChallengeModal(p => ({ ...p!, criteria_config: e.target.value as any }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Ativo</span>
                <Toggle value={!!challengeModal.is_active} onChange={v => setChallengeModal(p => ({ ...p!, is_active: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setChallengeModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => saveChallenge(challengeModal)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Rewards tab ──
  const saveReward = async (reward: Partial<GamificationReward>) => {
    try {
      const toSave = { ...reward };
      if (typeof toSave.reward_config === 'string') {
        try { toSave.reward_config = JSON.parse(toSave.reward_config as any); } catch { /* keep */ }
      }
      await appBackend.saveGamificationReward(toSave);
      setRewards(await appBackend.getGamificationRewards());
      setRewardModal(null);
      showToast('Recompensa salva');
    } catch { showToast('Erro ao salvar recompensa', 'error'); }
  };

  const deleteReward = async (id: string) => {
    if (!confirm('Excluir esta recompensa?')) return;
    try {
      await appBackend.deleteGamificationReward(id);
      setRewards(prev => prev.filter(r => r.id !== id));
      showToast('Recompensa excluída');
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  const renderRewards = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Recompensas</h3>
        <button
          onClick={() => setRewardModal({ name: '', description: '', icon_emoji: '🎁', reward_type: 'discount', reward_config: {}, cost_volls: 0, stock: null, is_active: true, sort_order: rewards.length })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Nova Recompensa
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map(rw => (
          <div key={rw.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{rw.icon_emoji}</span>
                <div>
                  <h4 className="font-semibold text-slate-800">{rw.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{rw.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">{rw.cost_volls} VOLLs</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{REWARD_TYPES.find(t => t.value === rw.reward_type)?.label}</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Estoque: {rw.stock ?? '∞'}</span>
              <span className={clsx('px-2 py-0.5 rounded', rw.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                {rw.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => setRewardModal({ ...rw })} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><Edit2 size={14} className="text-slate-500" /></button>
              <button onClick={() => deleteReward(rw.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition ml-auto"><Trash2 size={14} className="text-red-500" /></button>
            </div>
          </div>
        ))}
        {rewards.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">Nenhuma recompensa cadastrada</div>
        )}
      </div>

      {rewardClaims.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-800 mb-3">Resgates Recentes</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">CPF</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Recompensa</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">VOLLs</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewardClaims.slice(0, 20).map(cl => (
                  <tr key={cl.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{cl.student_cpf}</td>
                    <td className="px-3 py-2">{cl.gamification_rewards?.name || cl.reward_id}</td>
                    <td className="px-3 py-2 text-indigo-600 font-medium">{cl.volls_spent}</td>
                    <td className="px-3 py-2">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs', {
                        'bg-emerald-100 text-emerald-700': cl.status === 'active',
                        'bg-slate-100 text-slate-600': cl.status === 'used',
                        'bg-red-100 text-red-600': cl.status === 'expired',
                      })}>{cl.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(cl.claimed_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rewardModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{rewardModal.id ? 'Editar Recompensa' : 'Nova Recompensa'}</h3>
              <button onClick={() => setRewardModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={rewardModal.name || ''} onChange={e => setRewardModal(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ícone</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center text-xl" value={rewardModal.icon_emoji || ''} onChange={e => setRewardModal(p => ({ ...p!, icon_emoji: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} value={rewardModal.description || ''} onChange={e => setRewardModal(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={rewardModal.reward_type || 'discount'} onChange={e => setRewardModal(p => ({ ...p!, reward_type: e.target.value as RewardType }))}>
                    {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Custo (VOLLs)</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={rewardModal.cost_volls ?? 0} onChange={e => setRewardModal(p => ({ ...p!, cost_volls: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estoque</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={rewardModal.stock ?? ''} onChange={e => setRewardModal(p => ({ ...p!, stock: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Vazio = ilimitado" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Configuração da Recompensa (JSON)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  rows={3}
                  value={typeof rewardModal.reward_config === 'string' ? rewardModal.reward_config : JSON.stringify(rewardModal.reward_config || {}, null, 2)}
                  onChange={e => setRewardModal(p => ({ ...p!, reward_config: e.target.value as any }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ordem</label>
                  <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={rewardModal.sort_order ?? 0} onChange={e => setRewardModal(p => ({ ...p!, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center justify-between pt-5">
                  <span className="text-sm text-slate-700">Ativo</span>
                  <Toggle value={!!rewardModal.is_active} onChange={v => setRewardModal(p => ({ ...p!, is_active: v }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRewardModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => saveReward(rewardModal)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Notifications tab ──
  const saveNotifSetting = async (setting: GamificationNotificationSetting) => {
    try {
      await appBackend.saveGamificationNotificationSetting(setting);
      showToast('Notificação salva');
    } catch { showToast('Erro ao salvar', 'error'); }
  };

  const updateNotifLocal = (id: string, field: keyof GamificationNotificationSetting, value: any) => {
    setNotifSettings(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const renderNotifications = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Configurações de Notificações</h3>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Toast</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Push</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Persistente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Template da Mensagem</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notifSettings.map(ns => (
              <tr key={ns.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ns.icon_emoji}</span>
                    <span className="font-medium text-slate-700">{ns.notification_type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle value={ns.toast_enabled} onChange={v => { updateNotifLocal(ns.id, 'toast_enabled', v); saveNotifSetting({ ...ns, toast_enabled: v }); }} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle value={ns.push_enabled} onChange={v => { updateNotifLocal(ns.id, 'push_enabled', v); saveNotifSetting({ ...ns, push_enabled: v }); }} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle value={ns.persistent_enabled} onChange={v => { updateNotifLocal(ns.id, 'persistent_enabled', v); saveNotifSetting({ ...ns, persistent_enabled: v }); }} />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={ns.message_template}
                    onChange={e => updateNotifLocal(ns.id, 'message_template', e.target.value)}
                    onBlur={() => saveNotifSetting(ns)}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => saveNotifSetting(ns)} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Salvar"><Save size={15} className="text-indigo-600" /></button>
                </td>
              </tr>
            ))}
            {notifSettings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma configuração de notificação</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Dashboard tab ──
  const loadLeaderboard = async (period: 'weekly' | 'monthly' | 'all') => {
    setLeaderboardPeriod(period);
    try {
      setLeaderboard(await appBackend.getLeaderboard(period, 50));
    } catch { showToast('Erro ao carregar ranking', 'error'); }
  };

  const handleAdjust = async () => {
    const cpf = adjustCpf.replace(/\D/g, '');
    if (!cpf || !adjustAmount || !adjustDesc) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    try {
      const volls = adjustType === 'credit' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
      await appBackend.adjustStudentVolls(cpf, volls, adjustDesc);
      showToast(`${adjustType === 'credit' ? 'Crédito' : 'Débito'} realizado com sucesso`);
      setAdjustCpf('');
      setAdjustAmount(0);
      setAdjustDesc('');
      const [stats, lb] = await Promise.all([
        appBackend.getGamificationDashboard(),
        appBackend.getLeaderboard(leaderboardPeriod, 50),
      ]);
      setDashStats(stats);
      setLeaderboard(lb);
    } catch { showToast('Erro ao ajustar VOLLs', 'error'); }
  };

  const filteredLeaderboard = leaderboardSearch
    ? leaderboard.filter(e => e.student_name.toLowerCase().includes(leaderboardSearch.toLowerCase()) || e.student_cpf.includes(leaderboardSearch))
    : leaderboard;

  const renderDashboard = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Dashboard / Ranking</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'VOLLs Distribuídos', value: (dashStats.total_volls_distributed || 0).toLocaleString(), icon: <Zap size={20} className="text-amber-500" />, color: 'bg-amber-50 border-amber-200' },
          { label: 'Alunos Ativos', value: dashStats.total_students || 0, icon: <Users size={20} className="text-blue-500" />, color: 'bg-blue-50 border-blue-200' },
          { label: 'Badges Conquistados', value: dashStats.total_badges_earned || 0, icon: <Award size={20} className="text-purple-500" />, color: 'bg-purple-50 border-purple-200' },
          { label: 'Recompensas Resgatadas', value: dashStats.total_rewards_claimed || 0, icon: <Gift size={20} className="text-emerald-500" />, color: 'bg-emerald-50 border-emerald-200' },
        ].map((card, i) => (
          <div key={i} className={clsx('rounded-xl border p-4', card.color)}>
            <div className="flex items-center gap-2 mb-2">{card.icon}<span className="text-xs font-medium text-slate-600">{card.label}</span></div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h4 className="font-semibold text-slate-800">Ranking</h4>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm w-52"
                placeholder="Buscar aluno..."
                value={leaderboardSearch}
                onChange={e => setLeaderboardSearch(e.target.value)}
              />
            </div>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {(['weekly', 'monthly', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => loadLeaderboard(p)}
                  className={clsx('px-3 py-1.5 text-xs font-medium transition', leaderboardPeriod === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                >
                  {p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensal' : 'Geral'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-12">#</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Aluno</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Nível</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">VOLLs</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaderboard.map(entry => (
                <tr key={entry.student_cpf} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-2">
                    {entry.position <= 3 ? (
                      <span className={clsx('inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold', {
                        'bg-amber-100 text-amber-700': entry.position === 1,
                        'bg-slate-200 text-slate-700': entry.position === 2,
                        'bg-orange-100 text-orange-700': entry.position === 3,
                      })}>{entry.position}</span>
                    ) : (
                      <span className="text-slate-500 pl-1.5">{entry.position}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{entry.student_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{entry.student_cpf}</div>
                  </td>
                  <td className="px-3 py-2">
                    {entry.level ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span>{entry.level.icon_emoji}</span>
                        <span className="font-medium" style={{ color: entry.level.color }}>{entry.level.name}</span>
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2 font-semibold text-indigo-600">{entry.total_volls.toLocaleString()}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.badges_count}</td>
                </tr>
              ))}
              {filteredLeaderboard.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Nenhum resultado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h4 className="font-semibold text-slate-800">Ajuste Manual de VOLLs</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CPF do Aluno</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="000.000.000-00" value={adjustCpf} onChange={e => setAdjustCpf(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                onClick={() => setAdjustType('credit')}
                className={clsx('flex-1 px-3 py-2 text-sm font-medium transition', adjustType === 'credit' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600')}
              >Crédito</button>
              <button
                onClick={() => setAdjustType('debit')}
                className={clsx('flex-1 px-3 py-2 text-sm font-medium transition', adjustType === 'debit' ? 'bg-red-600 text-white' : 'bg-white text-slate-600')}
              >Débito</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
            <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" min={1} value={adjustAmount || ''} onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} placeholder="Motivo do ajuste" />
          </div>
          <div>
            <button onClick={handleAdjust} className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
              <Check size={16} /> Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab renderer ──
  const renderTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
          <span className="ml-3 text-slate-500">Carregando...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'settings': return renderSettings();
      case 'levels': return renderLevels();
      case 'rules': return renderRules();
      case 'badges': return renderBadges();
      case 'challenges': return renderChallenges();
      case 'rewards': return renderRewards();
      case 'notifications': return renderNotifications();
      case 'dashboard': return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition" title="Voltar">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy size={22} className="text-indigo-600" />
              Gamificação — Admin
            </h1>
            <p className="text-xs text-slate-500">Gerencie configurações, níveis, regras, badges, desafios e recompensas</p>
          </div>
        </div>
      </div>

      <div className="sticky top-[65px] z-20 bg-white border-b border-slate-200 px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {renderTab()}
      </div>
    </div>
  );
};
