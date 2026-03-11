import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Flame, Star, Medal, Gift, ShoppingCart, ArrowUp, ArrowDown,
  Target, Sparkles, Crown, Lock, Check, ChevronRight, Filter, Download,
  Clock, Zap, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { appBackend } from '../services/appBackend';
import type {
  GamificationSummary, GamificationStudentPoints, GamificationBadge,
  GamificationStudentBadge, GamificationLeaderboardEntry,
  GamificationChallengeProgress, GamificationChallenge,
  GamificationReward, GamificationRewardClaim, GamificationClaimResult,
  BadgeCategory, BadgeRarity, ChallengeType, RewardType,
} from '../types';

type Tab = 'resumo' | 'extrato' | 'conquistas' | 'ranking' | 'desafios' | 'loja';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'resumo', label: 'Resumo', icon: <Sparkles size={16} /> },
  { key: 'extrato', label: 'Extrato', icon: <Download size={16} /> },
  { key: 'conquistas', label: 'Conquistas', icon: <Trophy size={16} /> },
  { key: 'ranking', label: 'Ranking', icon: <Medal size={16} /> },
  { key: 'desafios', label: 'Desafios', icon: <Target size={16} /> },
  { key: 'loja', label: 'Loja', icon: <ShoppingCart size={16} /> },
];

const RARITY_RING: Record<BadgeRarity, string> = {
  common: 'ring-slate-300',
  rare: 'ring-blue-400',
  epic: 'ring-purple-500',
  legendary: 'ring-amber-400',
};

const RARITY_BG: Record<BadgeRarity, string> = {
  common: 'bg-slate-100 text-slate-700',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
};

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

const BADGE_CATEGORY_LABEL: Record<BadgeCategory | 'all', string> = {
  all: 'Todos',
  learning: 'Aprendizado',
  attendance: 'Presença',
  social: 'Social',
  mastery: 'Maestria',
  special: 'Especial',
};

const CHALLENGE_TYPE_COLOR: Record<ChallengeType, string> = {
  daily: 'bg-sky-100 text-sky-700',
  weekly: 'bg-violet-100 text-violet-700',
  monthly: 'bg-rose-100 text-rose-700',
  special: 'bg-amber-100 text-amber-700',
};

const CHALLENGE_TYPE_LABEL: Record<ChallengeType | 'all', string> = {
  all: 'Todos',
  daily: 'Diários',
  weekly: 'Semanais',
  monthly: 'Mensais',
  special: 'Especiais',
};

const REWARD_TYPE_LABEL: Record<RewardType, string> = {
  discount: 'Desconto',
  content_unlock: 'Conteúdo',
  badge: 'Badge',
  certificate: 'Certificado',
  custom: 'Especial',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="animate-spin text-purple-500" size={32} />
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
      )}
    >
      {children}
    </button>
  );
}

interface Props {
  studentCpf: string;
}

export default function GamificationPanel({ studentCpf }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [loading, setLoading] = useState(false);

  // ── Resumo ──
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [resumoChallenges, setResumoChallenges] = useState<(GamificationChallengeProgress & { gamification_challenges: GamificationChallenge })[]>([]);
  const [resumoRewards, setResumoRewards] = useState<GamificationReward[]>([]);

  // ── Extrato ──
  const [transactions, setTransactions] = useState<GamificationStudentPoints[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [txPeriod, setTxPeriod] = useState<string>('30d');
  const [txType, setTxType] = useState<string>('all');
  const [extratoLoading, setExtratoLoading] = useState(false);

  // ── Conquistas ──
  const [allBadges, setAllBadges] = useState<GamificationBadge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<GamificationStudentBadge[]>([]);
  const [badgeCatFilter, setBadgeCatFilter] = useState<BadgeCategory | 'all'>('all');
  const [conquistasLoading, setConquistasLoading] = useState(false);

  // ── Ranking ──
  const [leaderboard, setLeaderboard] = useState<GamificationLeaderboardEntry[]>([]);
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'all'>('monthly');
  const [rankingLoading, setRankingLoading] = useState(false);

  // ── Desafios ──
  const [challenges, setChallenges] = useState<(GamificationChallengeProgress & { gamification_challenges: GamificationChallenge })[]>([]);
  const [challengeFilter, setChallengeFilter] = useState<ChallengeType | 'all'>('all');
  const [desafiosLoading, setDesafiosLoading] = useState(false);

  // ── Loja ──
  const [catalog, setCatalog] = useState<GamificationReward[]>([]);
  const [myRewards, setMyRewards] = useState<GamificationRewardClaim[]>([]);
  const [shopCatFilter, setShopCatFilter] = useState<string>('all');
  const [showMyRewards, setShowMyRewards] = useState(false);
  const [confirmReward, setConfirmReward] = useState<GamificationReward | null>(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [lojaLoading, setLojaLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [s, ch, rw] = await Promise.all([
        appBackend.getStudentGamificationSummary(studentCpf),
        appBackend.getActiveChallenges(studentCpf),
        appBackend.getRewardsCatalog(),
      ]);
      setSummary(s);
      setResumoChallenges(ch as any);
      setResumoRewards(rw);
    } finally {
      setSummaryLoading(false);
    }
  }, [studentCpf]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const buildDateFilter = useCallback((period: string) => {
    const now = new Date();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (period === 'today') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === '7d') {
      dateFrom = new Date(now.getTime() - 7 * 86400000).toISOString();
    } else if (period === '30d') {
      dateFrom = new Date(now.getTime() - 30 * 86400000).toISOString();
    } else if (period === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
    return { dateFrom, dateTo };
  }, []);

  const loadExtrato = useCallback(async (reset = false) => {
    setExtratoLoading(true);
    try {
      const offset = reset ? 0 : txOffset;
      const { dateFrom, dateTo } = buildDateFilter(txPeriod);
      const actionFilter = txType === 'earned' ? 'earned' : txType === 'spent' ? 'spent' : txType;
      const result = await appBackend.getStudentVollsStatement(studentCpf, {
        limit: 20,
        offset,
        actionFilter: actionFilter === 'all' ? undefined : actionFilter,
        dateFrom,
        dateTo,
      });
      if (reset) {
        setTransactions(result.transactions);
        setTxOffset(20);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
        setTxOffset(prev => prev + 20);
      }
      setTxTotal(result.total);
    } finally {
      setExtratoLoading(false);
    }
  }, [studentCpf, txPeriod, txType, txOffset, buildDateFilter]);

  const loadConquistas = useCallback(async () => {
    setConquistasLoading(true);
    try {
      const [badges, earned] = await Promise.all([
        appBackend.getGamificationBadges(),
        appBackend.getStudentBadges(studentCpf),
      ]);
      setAllBadges(badges);
      setEarnedBadges(earned);
    } finally {
      setConquistasLoading(false);
    }
  }, [studentCpf]);

  const loadRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const lb = await appBackend.getLeaderboard(rankingPeriod, 50);
      setLeaderboard(lb);
    } finally {
      setRankingLoading(false);
    }
  }, [rankingPeriod]);

  const loadDesafios = useCallback(async () => {
    setDesafiosLoading(true);
    try {
      const ch = await appBackend.getActiveChallenges(studentCpf);
      setChallenges(ch as any);
    } finally {
      setDesafiosLoading(false);
    }
  }, [studentCpf]);

  const loadLoja = useCallback(async () => {
    setLojaLoading(true);
    try {
      const [cat, myR] = await Promise.all([
        appBackend.getRewardsCatalog(),
        appBackend.getStudentRewards(studentCpf),
      ]);
      setCatalog(cat);
      setMyRewards(myR);
    } finally {
      setLojaLoading(false);
    }
  }, [studentCpf]);

  useEffect(() => {
    if (activeTab === 'extrato') loadExtrato(true);
    if (activeTab === 'conquistas') loadConquistas();
    if (activeTab === 'ranking') loadRanking();
    if (activeTab === 'desafios') loadDesafios();
    if (activeTab === 'loja') loadLoja();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'extrato') loadExtrato(true);
  }, [txPeriod, txType]);

  useEffect(() => {
    if (activeTab === 'ranking') loadRanking();
  }, [rankingPeriod]);

  const handleClaimChallenge = async (challengeId: string) => {
    await appBackend.claimChallengeReward(studentCpf, challengeId);
    loadDesafios();
    loadSummary();
  };

  const handleClaimReward = async () => {
    if (!confirmReward) return;
    setClaimingReward(true);
    try {
      const result = await appBackend.claimReward(studentCpf, confirmReward.id);
      if (result.success) {
        setConfirmReward(null);
        loadLoja();
        loadSummary();
      }
    } finally {
      setClaimingReward(false);
    }
  };

  const balance = summary?.balance ?? 0;
  const currencyName = summary?.currency_name ?? 'VOLLs';

  const todayEarned = (() => {
    if (!summary) return 0;
    return summary.total_earned;
  })();

  const levelProgress = (() => {
    if (!summary?.level || !summary.next_level) return 0;
    const range = summary.next_level.min_volls - summary.level.min_volls;
    if (range <= 0) return 100;
    const progress = balance - summary.level.min_volls;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  })();

  const vollsToNextLevel = summary?.next_level ? Math.max(0, summary.next_level.min_volls - balance) : 0;

  const myPosition = leaderboard.find(e => e.student_cpf === studentCpf)?.position ?? 0;

  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));

  const cheapestReward = resumoRewards.length > 0
    ? resumoRewards.reduce((a, b) => (a.cost_volls < b.cost_volls ? a : b))
    : null;
  const cheapestProgress = cheapestReward ? Math.min(100, (balance / cheapestReward.cost_volls) * 100) : 0;

  // ── Render ──

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Navigation Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-300/40 scale-105'
                : 'bg-white/80 backdrop-blur-md text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/60',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: RESUMO                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'resumo' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {summaryLoading ? <Spinner /> : summary && (
            <>
              {/* Hero Card */}
              <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-purple-200 text-sm font-semibold uppercase tracking-widest mb-1">Saldo Atual</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-black">{balance.toLocaleString('pt-BR')}</span>
                        <span className="text-xl font-bold text-purple-200">{currencyName}</span>
                      </div>
                      <p className="text-emerald-300 text-sm font-semibold mt-1">
                        +{summary.total_earned.toLocaleString('pt-BR')} total acumulado
                      </p>
                    </div>
                    <div className="text-right">
                      {summary.level && (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{summary.level.icon_emoji}</span>
                          <span className="text-lg font-bold">{summary.level.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level Progress Bar */}
                  {summary.next_level && (
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-purple-200 mb-2">
                        <span>Nível {summary.level?.level_number ?? 1}</span>
                        <span>{vollsToNextLevel.toLocaleString('pt-BR')} {currencyName} para próximo nível</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
                          style={{ width: `${levelProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mini Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center">
                      <Flame className="mx-auto mb-1 text-orange-300" size={22} />
                      <p className="text-2xl font-black">{summary.streak?.current_streak ?? 0}</p>
                      <p className="text-xs text-purple-200 uppercase tracking-wider">Sequência</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center">
                      <Trophy className="mx-auto mb-1 text-amber-300" size={22} />
                      <p className="text-2xl font-black">{summary.recent_badges.length}</p>
                      <p className="text-xs text-purple-200 uppercase tracking-wider">Badges</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center">
                      <Medal className="mx-auto mb-1 text-sky-300" size={22} />
                      <p className="text-2xl font-black">{summary.active_challenges_count}</p>
                      <p className="text-xs text-purple-200 uppercase tracking-wider">Desafios</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Below hero: 2 columns + full-width */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Badges Recentes */}
                <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="text-amber-500" size={20} />
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Badges Recentes</h3>
                  </div>
                  {summary.recent_badges.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-6">Nenhum badge conquistado ainda</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {summary.recent_badges.slice(0, 4).map(sb => (
                        <div key={sb.id} className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <span className="text-3xl mb-1">{sb.gamification_badges?.icon_emoji ?? '🏅'}</span>
                          <p className="text-xs font-bold text-slate-700 line-clamp-1">{sb.gamification_badges?.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(sb.earned_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desafios Ativos */}
                <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="text-purple-500" size={20} />
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Desafios Ativos</h3>
                  </div>
                  {resumoChallenges.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-6">Nenhum desafio ativo</p>
                  ) : (
                    <div className="space-y-3">
                      {resumoChallenges.slice(0, 3).map(cp => {
                        const ch = cp.gamification_challenges;
                        const pct = cp.target_progress > 0 ? Math.min(100, (cp.current_progress / cp.target_progress) * 100) : 0;
                        return (
                          <div key={cp.id} className="p-3 rounded-2xl bg-slate-50">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{ch?.icon_emoji ?? '🎯'}</span>
                              <span className="text-sm font-bold text-slate-700 flex-1 line-clamp-1">{ch?.title}</span>
                              <span className="text-xs font-semibold text-purple-600">+{ch?.reward_volls}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{cp.current_progress}/{cp.target_progress}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Próxima Recompensa */}
              {cheapestReward && (
                <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <Gift className="text-pink-200" size={24} />
                      <h3 className="font-black uppercase tracking-widest text-sm">Próxima Recompensa</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{cheapestReward.icon_emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{cheapestReward.name}</p>
                        <p className="text-pink-200 text-sm">{cheapestReward.cost_volls.toLocaleString('pt-BR')} {currencyName}</p>
                        <div className="w-full bg-white/20 rounded-full h-2.5 mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white transition-all duration-700"
                            style={{ width: `${cheapestProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-pink-200 mt-1">
                          {balance >= cheapestReward.cost_volls
                            ? 'Você já pode resgatar!'
                            : `Faltam ${(cheapestReward.cost_volls - balance).toLocaleString('pt-BR')} ${currencyName}`}
                        </p>
                      </div>
                      <ChevronRight size={24} className="text-pink-200" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: EXTRATO                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'extrato' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-1">Saldo</p>
            <p className="text-4xl font-black mb-4">{balance.toLocaleString('pt-BR')} <span className="text-xl text-slate-400">{currencyName}</span></p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1"><ArrowUp size={14} /> Total Ganho</p>
                <p className="text-lg font-bold">+{(summary?.total_earned ?? 0).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-red-400 text-sm font-semibold flex items-center gap-1"><ArrowDown size={14} /> Total Gasto</p>
                <p className="text-lg font-bold">-{(summary?.total_spent ?? 0).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-white text-sm font-semibold flex items-center gap-1"><Zap size={14} /> Líquido</p>
                <p className="text-lg font-bold">{balance.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Period Filters */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Período</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'today', label: 'Hoje' },
                { key: '7d', label: '7 dias' },
                { key: '30d', label: '30 dias' },
                { key: 'month', label: 'Mês' },
              ].map(p => (
                <Pill key={p.key} active={txPeriod === p.key} onClick={() => setTxPeriod(p.key)}>{p.label}</Pill>
              ))}
            </div>
          </div>

          {/* Type Filters */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'earned', label: 'Ganhos' },
                { key: 'spent', label: 'Gastos' },
              ].map(t => (
                <Pill key={t.key} active={txType === t.key} onClick={() => setTxType(t.key)}>{t.label}</Pill>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          {extratoLoading && transactions.length === 0 ? <Spinner /> : (
            <div className="space-y-3">
              {transactions.map(tx => {
                const isEarned = tx.volls > 0;
                const isBonus = tx.action_type === 'bonus' || tx.action_type === 'admin_grant';
                const isAdjust = tx.action_type === 'adjustment' || tx.action_type === 'admin_deduct';

                let iconBg = 'bg-emerald-100 text-emerald-600';
                let Icon = ArrowUp;
                if (!isEarned) { iconBg = 'bg-red-100 text-red-600'; Icon = ArrowDown; }
                if (isBonus) { iconBg = 'bg-amber-100 text-amber-600'; Icon = Star; }
                if (isAdjust) { iconBg = 'bg-slate-100 text-slate-600'; Icon = Filter; }

                return (
                  <div key={tx.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', iconBg)}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{tx.description || tx.action_type}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(tx.earned_at)}</p>
                    </div>
                    <span className={clsx('text-sm font-black whitespace-nowrap', isEarned ? 'text-emerald-600' : 'text-red-500')}>
                      {isEarned ? '+' : ''}{tx.volls.toLocaleString('pt-BR')}
                    </span>
                  </div>
                );
              })}

              {transactions.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhuma transação encontrada</p>
              )}

              {transactions.length < txTotal && (
                <button
                  onClick={() => loadExtrato(false)}
                  disabled={extratoLoading}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  {extratoLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  Carregar mais
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: CONQUISTAS                                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'conquistas' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(BADGE_CATEGORY_LABEL) as (BadgeCategory | 'all')[]).map(cat => (
              <Pill key={cat} active={badgeCatFilter === cat} onClick={() => setBadgeCatFilter(cat)}>
                {BADGE_CATEGORY_LABEL[cat]}
              </Pill>
            ))}
          </div>

          {conquistasLoading ? <Spinner /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allBadges
                .filter(b => badgeCatFilter === 'all' || b.category === badgeCatFilter)
                .map(badge => {
                  const isEarned = earnedBadgeIds.has(badge.id);
                  const earnedEntry = isEarned ? earnedBadges.find(eb => eb.badge_id === badge.id) : null;

                  return (
                    <div
                      key={badge.id}
                      className={clsx(
                        'bg-white rounded-[2rem] shadow-lg p-6 text-center relative transition-all duration-300 hover:scale-[1.02]',
                        !isEarned && 'opacity-50 grayscale',
                      )}
                    >
                      {!isEarned && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="bg-slate-800/60 rounded-full p-3">
                            <Lock className="text-white" size={20} />
                          </div>
                        </div>
                      )}

                      <div className={clsx(
                        'w-20 h-20 mx-auto rounded-full flex items-center justify-center ring-4 mb-3',
                        RARITY_RING[badge.rarity],
                        badge.rarity === 'legendary' && isEarned && 'animate-pulse',
                      )}>
                        <span className="text-4xl">{badge.icon_emoji}</span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm mb-1">{badge.name}</p>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{badge.description}</p>

                      <span className={clsx(
                        'inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        RARITY_BG[badge.rarity],
                      )}>
                        {RARITY_LABEL[badge.rarity]}
                      </span>

                      {isEarned && earnedEntry && (
                        <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center justify-center gap-1">
                          <Check size={12} /> {formatDate(earnedEntry.earned_at)}
                        </p>
                      )}

                      {!isEarned && badge.criteria_config && (
                        <div className="mt-2">
                          <p className="text-[10px] text-slate-400">
                            {badge.criteria_config.description || 'Complete o critério para desbloquear'}
                          </p>
                          {badge.criteria_config.target && (
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-400 transition-all"
                                style={{ width: `${Math.min(100, ((badge.criteria_config.current ?? 0) / badge.criteria_config.target) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {!conquistasLoading && allBadges.filter(b => badgeCatFilter === 'all' || b.category === badgeCatFilter).length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum badge nesta categoria</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: RANKING                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'ranking' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* My Position Header */}
          {myPosition > 0 && (
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-center gap-6">
                <span className="text-5xl font-black">#{myPosition}</span>
                <div>
                  <p className="font-bold text-lg">Sua posição no ranking</p>
                  <p className="text-amber-100 text-sm">
                    {myPosition <= 3 ? 'Incrível! Você está no pódio! 🏆' :
                     myPosition <= 10 ? 'Excelente! Continue assim! 🔥' :
                     'Continue acumulando VOLLs para subir! 💪'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Period Filter */}
          <div className="flex gap-2">
            {([
              { key: 'weekly' as const, label: 'Semanal' },
              { key: 'monthly' as const, label: 'Mensal' },
              { key: 'all' as const, label: 'Geral' },
            ]).map(p => (
              <Pill key={p.key} active={rankingPeriod === p.key} onClick={() => setRankingPeriod(p.key)}>{p.label}</Pill>
            ))}
          </div>

          {rankingLoading ? <Spinner /> : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4">
                  {[1, 0, 2].map(idx => {
                    const entry = leaderboard[idx];
                    if (!entry) return null;
                    const pos = idx + 1;
                    const bgClass = pos === 1
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-200/50'
                      : pos === 2
                        ? 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-200/50'
                        : 'bg-gradient-to-br from-orange-300 to-orange-400 shadow-orange-200/50';

                    return (
                      <div
                        key={entry.student_cpf}
                        className={clsx(
                          'rounded-[2rem] p-5 text-center text-white shadow-xl relative',
                          bgClass,
                          pos === 1 && 'md:-mt-4',
                        )}
                      >
                        {pos === 1 && <Crown className="mx-auto mb-1 text-yellow-100" size={28} />}
                        {pos === 2 && <Medal className="mx-auto mb-1 text-slate-100" size={24} />}
                        {pos === 3 && <Medal className="mx-auto mb-1 text-orange-100" size={24} />}
                        <p className="text-3xl font-black">#{pos}</p>
                        <p className="font-bold text-sm mt-1 truncate">{entry.student_name}</p>
                        <p className="text-xs opacity-80">{entry.total_volls.toLocaleString('pt-BR')} {currencyName}</p>
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs opacity-70">
                          <Trophy size={10} /> {entry.badges_count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rest of Leaderboard */}
              <div className="space-y-2">
                {leaderboard.slice(3).map(entry => {
                  const isMe = entry.student_cpf === studentCpf;
                  return (
                    <div
                      key={entry.student_cpf}
                      className={clsx(
                        'flex items-center gap-4 p-4 rounded-2xl transition-all',
                        isMe
                          ? 'bg-purple-50 border-2 border-purple-300 shadow-md'
                          : 'bg-white border border-slate-100 hover:shadow-sm',
                      )}
                    >
                      <span className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center font-black text-sm',
                        isMe ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600',
                      )}>
                        {entry.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('font-bold text-sm truncate', isMe ? 'text-purple-800' : 'text-slate-700')}>
                          {entry.student_name} {isMe && '(Você)'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.level?.icon_emoji} {entry.level?.name ?? 'Sem nível'} · {entry.badges_count} badges
                        </p>
                      </div>
                      <span className="font-black text-sm text-slate-700">
                        {entry.total_volls.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {leaderboard.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhum participante no ranking ainda</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: DESAFIOS                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'desafios' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CHALLENGE_TYPE_LABEL) as (ChallengeType | 'all')[]).map(t => (
              <Pill key={t} active={challengeFilter === t} onClick={() => setChallengeFilter(t)}>
                {CHALLENGE_TYPE_LABEL[t]}
              </Pill>
            ))}
          </div>

          {desafiosLoading ? <Spinner /> : (
            <div className="space-y-4">
              {challenges
                .filter(cp => challengeFilter === 'all' || cp.gamification_challenges?.challenge_type === challengeFilter)
                .map(cp => {
                  const ch = cp.gamification_challenges;
                  if (!ch) return null;

                  const pct = cp.target_progress > 0 ? Math.min(100, (cp.current_progress / cp.target_progress) * 100) : 0;
                  const isComplete = cp.completed_at !== null;
                  const isClaimed = cp.claimed;

                  return (
                    <div
                      key={cp.id}
                      className={clsx(
                        'rounded-[2rem] border shadow-md p-6 transition-all duration-300',
                        isClaimed
                          ? 'bg-emerald-50 border-emerald-200'
                          : isComplete && !isClaimed
                            ? 'bg-white ring-2 ring-amber-400 border-amber-200'
                            : 'bg-white border-slate-100 hover:shadow-lg',
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl flex-shrink-0">{ch.icon_emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-bold text-slate-800">{ch.title}</h4>
                            <span className={clsx(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              CHALLENGE_TYPE_COLOR[ch.challenge_type],
                            )}>
                              {CHALLENGE_TYPE_LABEL[ch.challenge_type]}
                            </span>
                            {isClaimed && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <Check size={10} /> Concluído
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mb-3">{ch.description}</p>

                          {/* Progress Bar */}
                          {!isClaimed && (
                            <div className="mb-3">
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{cp.current_progress}/{cp.target_progress}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                <Zap size={12} /> +{ch.reward_volls} {currencyName}
                              </span>
                              {ch.end_date && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock size={12} /> {timeLeft(ch.end_date)}
                                </span>
                              )}
                            </div>

                            {isComplete && !isClaimed && (
                              <button
                                onClick={() => handleClaimChallenge(ch.id)}
                                className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200/50 animate-pulse hover:animate-none hover:scale-105 transition-transform"
                              >
                                Resgatar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {challenges.filter(cp => challengeFilter === 'all' || cp.gamification_challenges?.challenge_type === challengeFilter).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhum desafio nesta categoria</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: LOJA                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'loja' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-pink-200 text-sm font-semibold uppercase tracking-widest mb-1">Seu Saldo</p>
                <p className="text-3xl font-black">{balance.toLocaleString('pt-BR')} <span className="text-lg text-pink-200">{currencyName}</span></p>
              </div>
              <ShoppingCart className="text-pink-200" size={36} />
            </div>
          </div>

          {/* Toggle: Catalog / My Rewards */}
          <div className="flex gap-2">
            <Pill active={!showMyRewards} onClick={() => setShowMyRewards(false)}>Catálogo</Pill>
            <Pill active={showMyRewards} onClick={() => setShowMyRewards(true)}>Minhas Recompensas</Pill>
          </div>

          {!showMyRewards ? (
            <>
              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'discount', label: 'Descontos' },
                  { key: 'content_unlock', label: 'Conteúdos' },
                  { key: 'certificate', label: 'Certificados' },
                  { key: 'custom', label: 'Especiais' },
                ].map(c => (
                  <Pill key={c.key} active={shopCatFilter === c.key} onClick={() => setShopCatFilter(c.key)}>{c.label}</Pill>
                ))}
              </div>

              {lojaLoading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalog
                    .filter(r => shopCatFilter === 'all' || r.reward_type === shopCatFilter)
                    .map(reward => {
                      const canAfford = balance >= reward.cost_volls;
                      const outOfStock = reward.stock !== null && reward.stock <= 0;

                      return (
                        <div
                          key={reward.id}
                          className={clsx(
                            'bg-white rounded-[2rem] shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl',
                            outOfStock && 'opacity-50',
                            !canAfford && !outOfStock && 'opacity-80',
                          )}
                        >
                          {/* Header gradient */}
                          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-center relative">
                            {outOfStock && (
                              <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                ESGOTADO
                              </div>
                            )}
                            <span className="text-5xl block">{reward.icon_emoji}</span>
                          </div>

                          {/* Body */}
                          <div className="p-5">
                            <h4 className="font-bold text-slate-800 mb-1">{reward.name}</h4>
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{reward.description}</p>
                            <span className={clsx(
                              'inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4',
                              'bg-purple-100 text-purple-700',
                            )}>
                              {REWARD_TYPE_LABEL[reward.reward_type]}
                            </span>

                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-slate-800">
                                {reward.cost_volls.toLocaleString('pt-BR')} <span className="text-xs text-slate-400">{currencyName}</span>
                              </span>

                              {outOfStock ? (
                                <span className="text-xs font-bold text-red-400">Indisponível</span>
                              ) : canAfford ? (
                                <button
                                  onClick={() => setConfirmReward(reward)}
                                  className="px-5 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200/50 hover:scale-105 transition-transform"
                                >
                                  Trocar
                                </button>
                              ) : (
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 font-semibold mb-1">
                                    Faltam {(reward.cost_volls - balance).toLocaleString('pt-BR')} {currencyName}
                                  </p>
                                  <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-purple-400 transition-all"
                                      style={{ width: `${Math.min(100, (balance / reward.cost_volls) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {!lojaLoading && catalog.filter(r => shopCatFilter === 'all' || r.reward_type === shopCatFilter).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhuma recompensa nesta categoria</p>
              )}
            </>
          ) : (
            /* My Rewards */
            lojaLoading ? <Spinner /> : (
              <div className="space-y-3">
                {myRewards.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">Você ainda não resgatou nenhuma recompensa</p>
                ) : (
                  myRewards.map(claim => {
                    const reward = claim.gamification_rewards;
                    const statusColor = claim.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : claim.status === 'used'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-red-100 text-red-600';
                    const statusLabel = claim.status === 'active' ? 'Ativo' : claim.status === 'used' ? 'Usado' : 'Expirado';

                    return (
                      <div key={claim.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
                        <span className="text-3xl flex-shrink-0">{reward?.icon_emoji ?? '🎁'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{reward?.name ?? 'Recompensa'}</p>
                          <p className="text-xs text-slate-400">{formatDate(claim.claimed_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={clsx('inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', statusColor)}>
                            {statusLabel}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">-{claim.volls_spent.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL: Confirmação de Resgate de Recompensa               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {confirmReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <span className="text-6xl block mb-3">{confirmReward.icon_emoji}</span>
              <h3 className="text-xl font-black text-slate-800 mb-1">{confirmReward.name}</h3>
              <p className="text-sm text-slate-500">{confirmReward.description}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Saldo atual</span>
                <span className="font-bold text-slate-800">{balance.toLocaleString('pt-BR')} {currencyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custo</span>
                <span className="font-bold text-red-500">-{confirmReward.cost_volls.toLocaleString('pt-BR')} {currencyName}</span>
              </div>
              <hr className="border-slate-200" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Saldo restante</span>
                <span className="font-bold text-slate-800">{(balance - confirmReward.cost_volls).toLocaleString('pt-BR')} {currencyName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                disabled={claimingReward}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClaimReward}
                disabled={claimingReward}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-200/50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                {claimingReward ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
