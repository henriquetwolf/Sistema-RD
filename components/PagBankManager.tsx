import React, { useState, useEffect } from 'react';
import { pagBankService } from '../services/pagBankService';
import { stripeService } from '../services/stripeService';
import type { PagBankOrder, PagBankPlan, PagBankSubscription, PagBankWebhookLog, PagBankCoupon } from '../types';
import { Settings, ShoppingCart, CreditCard, RefreshCw, Loader2, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, Eye, Plus, Trash2, AlertCircle, QrCode, FileText, Activity, Save, ToggleLeft, ToggleRight, Search, ChevronDown, ChevronUp, Tag, Copy, Percent, Edit2, Zap } from 'lucide-react';
import clsx from 'clsx';

type ActiveTab = 'config' | 'orders' | 'plans' | 'subscriptions' | 'coupons' | 'webhooks' | 'stripe';

export function PagBankManager() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');
  const [isLoading, setIsLoading] = useState(true);

  const [configForm, setConfigForm] = useState({ api_token: '', public_key: '', sandbox_mode: true, webhook_secret: '', notification_url: '' });
  const [configSaved, setConfigSaved] = useState(false);

  const [stripeForm, setStripeForm] = useState({ publishable_key: '', secret_key: '', webhook_secret: '', is_active: true });
  const [stripeSaved, setStripeSaved] = useState(false);

  const [orders, setOrders] = useState<PagBankOrder[]>([]);
  const [plans, setPlans] = useState<PagBankPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PagBankSubscription[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<PagBankWebhookLog[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalPaid: 0, totalRevenue: 0, totalPending: 0, totalSubscriptions: 0, activeSubscriptions: 0 });

  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ course_id: '', name: '', description: '', amount: 0, interval_unit: 'MONTH', interval_length: 1, trial_days: 0 });
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const [coupons, setCoupons] = useState<PagBankCoupon[]>([]);
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PagBankCoupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '', description: '', discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0, min_amount: 0, max_discount: 0, course_id: '',
    valid_from: '', valid_until: '', max_uses: 0, is_active: true,
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [configData, ordersData, plansData, subsData, statsData, couponsData] = await Promise.all([
        pagBankService.getFullConfig(),
        pagBankService.getOrders(),
        pagBankService.getPlans(),
        pagBankService.getSubscriptions(),
        pagBankService.getStats(),
        pagBankService.getCoupons(),
      ]);
      if (configData) {
        setConfigForm({
          api_token: (configData as any).api_token || '',
          public_key: configData.public_key || '',
          sandbox_mode: configData.sandbox_mode ?? true,
          webhook_secret: (configData as any).webhook_secret || '',
          notification_url: configData.notification_url || '',
        });
      }
      setOrders(ordersData);
      setPlans(plansData);
      setSubscriptions(subsData);
      setStats(statsData);
      setCoupons(couponsData);

      try {
        const stripeData = await stripeService.getFullConfig();
        if (stripeData) {
          setStripeForm({
            publishable_key: stripeData.publishable_key || '',
            secret_key: stripeData.secret_key || '',
            webhook_secret: stripeData.webhook_secret || '',
            is_active: stripeData.is_active ?? true,
          });
        }
      } catch (_) {}
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await pagBankService.saveConfig(configForm);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    }
  };

  const handleSaveStripeConfig = async () => {
    try {
      await stripeService.saveConfig(stripeForm);
      setStripeSaved(true);
      setTimeout(() => setStripeSaved(false), 3000);
    } catch (e: any) {
      alert('Erro ao salvar Stripe: ' + e.message);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.amount || !newPlan.course_id) {
      alert('Preencha nome, valor e curso.');
      return;
    }
    try {
      await pagBankService.createPlan({ ...newPlan, amount: Math.round(newPlan.amount * 100) });
      setShowNewPlan(false);
      setNewPlan({ course_id: '', name: '', description: '', amount: 0, interval_unit: 'MONTH', interval_length: 1, trial_days: 0 });
      const updatedPlans = await pagBankService.getPlans();
      setPlans(updatedPlans);
    } catch (e: any) {
      alert('Erro ao criar plano: ' + e.message);
    }
  };

  const handleCancelSub = async (subId: string) => {
    if (!window.confirm('Cancelar esta assinatura?')) return;
    try {
      await pagBankService.cancelSubscription(subId);
      const updatedSubs = await pagBankService.getSubscriptions();
      setSubscriptions(updatedSubs);
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: '', description: '', discount_type: 'percentage', discount_value: 0,
      min_amount: 0, max_discount: 0, course_id: '', valid_from: '', valid_until: '',
      max_uses: 0, is_active: true,
    });
    setEditingCoupon(null);
    setShowNewCoupon(false);
  };

  const handleSaveCoupon = async () => {
    if (!couponForm.code || !couponForm.discount_value) {
      alert('Preencha código e valor do desconto.');
      return;
    }
    try {
      if (editingCoupon) {
        await pagBankService.updateCoupon(editingCoupon.id, {
          code: couponForm.code,
          description: couponForm.description || undefined,
          discount_type: couponForm.discount_type,
          discount_value: couponForm.discount_value,
          min_amount: couponForm.min_amount || 0,
          max_discount: couponForm.max_discount || null,
          course_id: couponForm.course_id || null,
          valid_from: couponForm.valid_from || null,
          valid_until: couponForm.valid_until || null,
          max_uses: couponForm.max_uses || 0,
          is_active: couponForm.is_active,
        });
      } else {
        await pagBankService.createCoupon({
          code: couponForm.code,
          description: couponForm.description || undefined,
          discount_type: couponForm.discount_type,
          discount_value: couponForm.discount_value,
          min_amount: couponForm.min_amount || 0,
          max_discount: couponForm.max_discount || undefined,
          course_id: couponForm.course_id || undefined,
          valid_from: couponForm.valid_from || undefined,
          valid_until: couponForm.valid_until || undefined,
          max_uses: couponForm.max_uses || 0,
          is_active: couponForm.is_active,
        });
      }
      resetCouponForm();
      const updated = await pagBankService.getCoupons();
      setCoupons(updated);
    } catch (e: any) {
      alert('Erro ao salvar cupom: ' + e.message);
    }
  };

  const handleEditCoupon = (coupon: PagBankCoupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: coupon.discount_value,
      min_amount: coupon.min_amount ? coupon.min_amount / 100 : 0,
      max_discount: coupon.max_discount ? coupon.max_discount / 100 : 0,
      course_id: coupon.course_id || '',
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      max_uses: coupon.max_uses || 0,
      is_active: coupon.is_active,
    });
    setShowNewCoupon(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Excluir este cupom?')) return;
    try {
      await pagBankService.deleteCoupon(id);
      setCoupons(c => c.filter(x => x.id !== id));
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const handleToggleCoupon = async (coupon: PagBankCoupon) => {
    try {
      await pagBankService.updateCoupon(coupon.id, { is_active: !coupon.is_active });
      setCoupons(c => c.map(x => x.id === coupon.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const loadWebhooks = async () => {
    const logs = await pagBankService.getWebhookLogs();
    setWebhookLogs(logs);
  };

  useEffect(() => {
    if (activeTab === 'webhooks') loadWebhooks();
  }, [activeTab]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);
  const formatDate = (d: string) => d ? new Date(d).toLocaleString('pt-BR') : '-';

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      PAID: { bg: 'bg-green-100', text: 'text-green-700' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      WAITING_PIX: { bg: 'bg-teal-100', text: 'text-teal-700' },
      WAITING_BOLETO: { bg: 'bg-orange-100', text: 'text-orange-700' },
      DECLINED: { bg: 'bg-red-100', text: 'text-red-700' },
      CANCELED: { bg: 'bg-slate-100', text: 'text-slate-500' },
      CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500' },
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
      IN_ANALYSIS: { bg: 'bg-blue-100', text: 'text-blue-700' },
      AUTHORIZED: { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const s = map[status] || { bg: 'bg-slate-100', text: 'text-slate-500' };
    return <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', s.bg, s.text)}>{status}</span>;
  };

  const methodIcon = (method: string) => {
    if (method === 'PIX') return <QrCode size={14} className="text-teal-600" />;
    if (method === 'CREDIT_CARD') return <CreditCard size={14} className="text-indigo-600" />;
    if (method === 'BOLETO') return <FileText size={14} className="text-orange-600" />;
    return null;
  };

  const filteredOrders = orders.filter(o =>
    !orderSearch ||
    o.student_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.student_email?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.course_title?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.reference_id?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  const tabs: { id: ActiveTab; label: string; icon: any }[] = [
    { id: 'config', label: 'PagBank', icon: Settings },
    { id: 'stripe', label: 'Stripe', icon: Zap },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'plans', label: 'Planos', icon: CreditCard },
    { id: 'subscriptions', label: 'Assinaturas', icon: RefreshCw },
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'webhooks', label: 'Webhooks', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">PagBank</h1>
          <p className="text-sm text-slate-500">Pagamentos de Cursos Online</p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={16} className="text-indigo-500" /><span className="text-xs font-bold text-slate-400 uppercase">Pedidos</span></div>
          <p className="text-2xl font-black text-slate-800">{stats.totalOrders}</p>
          <p className="text-[10px] text-slate-400 mt-1">{stats.totalPending} pendentes</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-500" /><span className="text-xs font-bold text-slate-400 uppercase">Pagos</span></div>
          <p className="text-2xl font-black text-green-600">{stats.totalPaid}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-emerald-500" /><span className="text-xs font-bold text-slate-400 uppercase">Faturamento</span></div>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-purple-500" /><span className="text-xs font-bold text-slate-400 uppercase">Assinaturas</span></div>
          <p className="text-2xl font-black text-purple-600">{stats.activeSubscriptions}</p>
          <p className="text-[10px] text-slate-400 mt-1">de {stats.totalSubscriptions} total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Credenciais PagBank</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Token da API *</label>
              <input type="password" value={configForm.api_token} onChange={e => setConfigForm(p => ({...p, api_token: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Token obtido no painel PagBank" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Chave Pública *</label>
              <input type="text" value={configForm.public_key} onChange={e => setConfigForm(p => ({...p, public_key: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Chave pública para criptografia de cartão" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">URL de Notificação (Webhook)</label>
              <input type="text" value={configForm.notification_url} onChange={e => setConfigForm(p => ({...p, notification_url: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://seu-projeto.supabase.co/functions/v1/pagbank-webhook" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Webhook Secret (opcional)</label>
              <input type="password" value={configForm.webhook_secret} onChange={e => setConfigForm(p => ({...p, webhook_secret: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Para validação de webhooks" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setConfigForm(p => ({...p, sandbox_mode: !p.sandbox_mode}))} className="flex items-center gap-2">
              {configForm.sandbox_mode ? <ToggleLeft size={28} className="text-amber-500" /> : <ToggleRight size={28} className="text-green-600" />}
            </button>
            <div>
              <p className="text-sm font-bold text-slate-700">{configForm.sandbox_mode ? 'Modo Sandbox (Teste)' : 'Modo Produção'}</p>
              <p className="text-xs text-slate-400">{configForm.sandbox_mode ? 'Pagamentos simulados, sem cobranças reais' : 'Pagamentos reais ativados'}</p>
            </div>
          </div>

          {configForm.sandbox_mode && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="text-sm text-amber-800 font-bold">Ambiente de Teste (Sandbox)</p>
                <p className="text-xs text-amber-700">Use as credenciais do <strong>ambiente de teste</strong> do PagBank (obtidas no painel sandbox). Nenhuma cobrança real será feita.</p>
                <p className="text-xs text-amber-600">Para ativar produção: desative o modo sandbox, insira as credenciais de produção e salve.</p>
              </div>
            </div>
          )}

          {!configForm.sandbox_mode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700 font-medium">Modo produção ativo. Todas as transações serão reais e cobradas efetivamente.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={handleSaveConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Save size={16} /> Salvar Configuração
            </button>
            {configSaved && <span className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircle size={14} /> Salvo!</span>}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Search size={16} className="text-slate-400" />
            <input type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Buscar por aluno, curso ou referência..." className="flex-1 text-sm outline-none" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Data</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Aluno</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Curso</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Método</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Valor</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th>
              </tr></thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">Nenhum pedido encontrado</td></tr>
                ) : filteredOrders.map(o => (
                  <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 text-xs">{o.student_name || '-'}</p>
                      <p className="text-[10px] text-slate-400">{o.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{o.course_title || o.course_id}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1.5">{methodIcon(o.payment_method)}<span className="text-xs">{o.payment_method}</span></div></td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatCurrency(o.amount)}</td>
                    <td className="px-4 py-3">{statusBadge(o.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowNewPlan(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2">
              <Plus size={16} /> Novo Plano
            </button>
          </div>

          {showNewPlan && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase">Criar Plano de Assinatura</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Plano *</label>
                  <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ID do Curso *</label>
                  <input type="text" value={newPlan.course_id} onChange={e => setNewPlan(p => ({...p, course_id: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valor Mensal (R$) *</label>
                  <input type="number" value={newPlan.amount || ''} onChange={e => setNewPlan(p => ({...p, amount: Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Intervalo</label>
                  <select value={newPlan.interval_unit} onChange={e => setNewPlan(p => ({...p, interval_unit: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="MONTH">Mensal</option>
                    <option value="YEAR">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Dias de Trial</label>
                  <input type="number" value={newPlan.trial_days || ''} onChange={e => setNewPlan(p => ({...p, trial_days: Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
                  <input type="text" value={newPlan.description} onChange={e => setNewPlan(p => ({...p, description: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreatePlan} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-sm">Criar Plano</button>
                <button onClick={() => setShowNewPlan(false)} className="text-slate-500 hover:text-slate-700 font-medium text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Nome</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Curso</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Valor</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Intervalo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th>
              </tr></thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Nenhum plano cadastrado</td></tr>
                ) : plans.map(p => (
                  <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.course_id}</td>
                    <td className="px-4 py-3 text-xs font-bold">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.interval_length}x {p.interval_unit === 'MONTH' ? 'Mês' : 'Ano'}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Aluno</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Plano</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Próxima Cobrança</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Ações</th>
            </tr></thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Nenhuma assinatura encontrada</td></tr>
              ) : subscriptions.map(s => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 text-xs">{s.student_name || '-'}</p>
                    <p className="text-[10px] text-slate-400">{s.student_email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.pagbank_plans?.name || s.plan_id}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.next_billing_date || '-'}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3">
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => handleCancelSub(s.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-700">Cupons de Desconto</h2>
                <p className="text-xs text-slate-400 mt-0.5">{coupons.filter(c => c.is_active).length} ativo(s) de {coupons.length} total</p>
              </div>
              <button
                onClick={() => { resetCouponForm(); setShowNewCoupon(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Novo Cupom
              </button>
            </div>

            {showNewCoupon && (
              <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200 space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Código *</label>
                    <input
                      type="text" value={couponForm.code}
                      onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                      placeholder="DESCONTO20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Desconto</label>
                    <select
                      value={couponForm.discount_type}
                      onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Valor do Desconto * {couponForm.discount_type === 'percentage' ? '(%)' : '(R$)'}
                    </label>
                    <input
                      type="number" step={couponForm.discount_type === 'percentage' ? '1' : '0.01'}
                      value={couponForm.discount_value || ''} min={0}
                      max={couponForm.discount_type === 'percentage' ? 100 : undefined}
                      onChange={e => setCouponForm(p => ({ ...p, discount_value: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={couponForm.discount_type === 'percentage' ? '20' : '50.00'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
                  <input
                    type="text" value={couponForm.description}
                    onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Desconto de boas-vindas"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Valor Mínimo do Pedido (R$)</label>
                    <input
                      type="number" step="0.01" value={couponForm.min_amount || ''} min={0}
                      onChange={e => setCouponForm(p => ({ ...p, min_amount: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0.00 (sem mínimo)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Desconto Máximo (R$)</label>
                    <input
                      type="number" step="0.01" value={couponForm.max_discount || ''} min={0}
                      onChange={e => setCouponForm(p => ({ ...p, max_discount: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0.00 (sem limite)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Limite de Usos</label>
                    <input
                      type="number" value={couponForm.max_uses || ''} min={0}
                      onChange={e => setCouponForm(p => ({ ...p, max_uses: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0 (ilimitado)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Válido De</label>
                    <input
                      type="datetime-local" value={couponForm.valid_from}
                      onChange={e => setCouponForm(p => ({ ...p, valid_from: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Válido Até</label>
                    <input
                      type="datetime-local" value={couponForm.valid_until}
                      onChange={e => setCouponForm(p => ({ ...p, valid_until: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Restrito ao Curso (ID)</label>
                    <input
                      type="text" value={couponForm.course_id}
                      onChange={e => setCouponForm(p => ({ ...p, course_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Deixe vazio para todos os cursos"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCouponForm(p => ({ ...p, is_active: !p.is_active }))} className="flex items-center gap-2">
                    {couponForm.is_active ? <ToggleRight size={28} className="text-green-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
                  </button>
                  <span className="text-sm font-medium text-slate-600">{couponForm.is_active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleSaveCoupon} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 transition-all">
                    <Save size={14} /> {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                  </button>
                  <button onClick={resetCouponForm} className="text-slate-500 hover:text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {coupons.length === 0 && !showNewCoupon ? (
              <div className="text-center py-12 text-slate-400">
                <Tag size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm italic">Nenhum cupom criado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map(coupon => (
                  <div key={coupon.id} className={clsx(
                    'rounded-xl border p-4 transition-all',
                    coupon.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          coupon.discount_type === 'percentage' ? 'bg-purple-100' : 'bg-emerald-100'
                        )}>
                          {coupon.discount_type === 'percentage'
                            ? <Percent size={18} className="text-purple-600" />
                            : <DollarSign size={18} className="text-emerald-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-800">{coupon.code}</span>
                            <button onClick={() => copyCouponCode(coupon.code)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                              <Copy size={12} />
                            </button>
                            {coupon.is_active
                              ? <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">ATIVO</span>
                              : <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">INATIVO</span>
                            }
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}% de desconto`
                              : `R$ ${coupon.discount_value.toFixed(2)} de desconto`}
                            {coupon.description ? ` — ${coupon.description}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <p className="text-xs font-bold text-slate-600">
                            {coupon.current_uses}{coupon.max_uses > 0 ? `/${coupon.max_uses}` : ''} usos
                          </p>
                          {coupon.valid_until && (
                            <p className="text-[10px] text-slate-400">
                              até {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleToggleCoupon(coupon)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          {coupon.is_active
                            ? <ToggleRight size={20} className="text-green-600" />
                            : <ToggleLeft size={20} className="text-slate-400" />}
                        </button>
                        <button onClick={() => handleEditCoupon(coupon)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-indigo-600">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {(coupon.course_id || coupon.min_amount > 0 || (coupon.max_discount && coupon.max_discount > 0)) && (
                      <div className="flex gap-3 mt-2 pt-2 border-t border-slate-100">
                        {coupon.course_id && (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            Curso: {coupon.course_id.slice(0, 8)}...
                          </span>
                        )}
                        {coupon.min_amount > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            Mín: R$ {(coupon.min_amount / 100).toFixed(2)}
                          </span>
                        )}
                        {coupon.max_discount && coupon.max_discount > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            Desc. máx: R$ {(coupon.max_discount / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stripe Tab */}
      {activeTab === 'stripe' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Credenciais Stripe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Chave Publicável (Publishable Key) *</label>
              <input type="text" value={stripeForm.publishable_key} onChange={e => setStripeForm(p => ({...p, publishable_key: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="pk_test_... ou pk_live_..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Chave Secreta (Secret Key) *</label>
              <input type="password" value={stripeForm.secret_key} onChange={e => setStripeForm(p => ({...p, secret_key: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="sk_test_... ou sk_live_..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Webhook Secret (opcional)</label>
              <input type="password" value={stripeForm.webhook_secret} onChange={e => setStripeForm(p => ({...p, webhook_secret: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="whsec_..." />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button onClick={() => setStripeForm(p => ({...p, is_active: !p.is_active}))} className="flex items-center gap-2">
                {stripeForm.is_active ? <ToggleRight size={28} className="text-green-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
                <span className={clsx('text-sm font-bold', stripeForm.is_active ? 'text-green-700' : 'text-slate-500')}>
                  {stripeForm.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-800 mb-1">URL do Webhook Stripe</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-indigo-600 bg-white px-3 py-2 rounded-lg border border-indigo-100 flex-1 break-all">
                {`${(import.meta as any).env?.VITE_APP_SUPABASE_URL || 'https://SEU-PROJETO.supabase.co'}/functions/v1/stripe-webhook`}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(`${(import.meta as any).env?.VITE_APP_SUPABASE_URL || ''}/functions/v1/stripe-webhook`); }} className="text-indigo-600 hover:text-indigo-800 p-2">
                <Copy size={14} />
              </button>
            </div>
            <p className="text-[10px] text-indigo-500 mt-2">Configure esta URL no Dashboard do Stripe em Developers &gt; Webhooks. Evento necessário: <strong>checkout.session.completed</strong></p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSaveStripeConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200">
              <Save size={16} /> Salvar Configuração Stripe
            </button>
            {stripeSaved && <span className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircle size={14} /> Salvo!</span>}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Últimos Webhooks Recebidos</span>
            <button onClick={loadWebhooks} className="text-xs text-indigo-600 font-bold flex items-center gap-1"><RefreshCw size={12} /> Atualizar</button>
          </div>
          <div className="divide-y divide-slate-50">
            {webhookLogs.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-400 italic">Nenhum webhook recebido ainda</div>
            ) : webhookLogs.map(log => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedWebhook(expandedWebhook === log.id ? null : log.id)}>
                  <div className="flex items-center gap-3">
                    {log.processed ? <CheckCircle size={14} className="text-green-500" /> : <Clock size={14} className="text-amber-500" />}
                    <span className="text-xs font-bold text-slate-700">{log.event_type || 'N/A'}</span>
                    <span className="text-[10px] text-slate-400">{log.pagbank_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">{formatDate(log.created_at)}</span>
                    {expandedWebhook === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
                {expandedWebhook === log.id && (
                  <pre className="mt-2 bg-slate-50 rounded-xl p-3 text-[10px] text-slate-600 overflow-auto max-h-48">{JSON.stringify(log.payload, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
