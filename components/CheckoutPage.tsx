import React, { useState, useEffect, useRef } from 'react';
import { pagBankService } from '../services/pagBankService';
import { appBackend } from '../services/appBackend';
import type { OnlineCourse, PagBankCouponValidation } from '../types';
import { Loader2, CheckCircle, XCircle, ArrowLeft, ShieldCheck, Lock, AlertCircle, Tag, X, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface CheckoutPageProps {
  courseId: string;
  dealId?: string;
  studentName?: string;
  studentEmail?: string;
  studentCpf?: string;
  studentPhone?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type CheckoutStep = 'form' | 'processing' | 'redirecting' | 'success' | 'error';

export function CheckoutPage({ courseId, dealId, studentName, studentEmail, studentCpf, studentPhone, onClose, onSuccess }: CheckoutPageProps) {
  const [course, setCourse] = useState<OnlineCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>('form');
  const [error, setError] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const pollRef = useRef<number | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<PagBankCouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const couponDebounceRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    name: studentName || '',
    email: studentEmail || '',
    cpf: studentCpf || '',
    phone: studentPhone || '',
  });

  useEffect(() => {
    loadData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_status') === 'success' || params.get('checkout_return') === '1') {
      setStep('success');
      onSuccess?.();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const courses = await appBackend.getOnlineCourses();
      const found = courses.find((c: OnlineCourse) => c.id === courseId);
      if (!found) {
        setError('Curso não encontrado.');
        setStep('error');
        return;
      }
      setCourse(found);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatCpf = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) return clean.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return clean.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const effectivePrice = couponValidation?.valid && course
    ? couponValidation.final_amount / 100
    : course?.price ?? 0;

  const discountValue = couponValidation?.valid
    ? couponValidation.discount_amount / 100
    : 0;

  const handleCouponChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setCouponCode(cleaned);
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    if (!cleaned) { setCouponValidation(null); return; }
    couponDebounceRef.current = window.setTimeout(() => { validateCoupon(cleaned); }, 800);
  };

  const validateCoupon = async (code: string) => {
    if (!course || !code) return;
    setCouponLoading(true);
    try {
      const amountInCents = Math.round(course.price * 100);
      const result = await pagBankService.validateCoupon(code, amountInCents, courseId, dealId, form.email || undefined);
      setCouponValidation(result);
    } catch (e: any) {
      setCouponValidation({
        valid: false, discount_amount: 0,
        final_amount: Math.round((course?.price || 0) * 100),
        message: e.message || 'Erro ao validar cupom',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCouponCode(''); setCouponValidation(null); };

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.email || !form.cpf) {
      setError('Preencha nome, e-mail e CPF.');
      return;
    }
    if (!course) return;

    setStep('processing');

    try {
      const amountInCents = Math.round(course.price * 100);
      const appliedCoupon = couponValidation?.valid ? couponCode : undefined;
      const currentUrl = window.location.origin + window.location.pathname;
      const returnUrl = `${currentUrl}?checkout=${courseId}&checkout_return=1`;

      const response = await pagBankService.createCheckout({
        course_id: courseId,
        course_title: course.title,
        student_deal_id: dealId || `guest-${Date.now()}`,
        student_name: form.name,
        student_email: form.email,
        student_cpf: form.cpf.replace(/\D/g, ''),
        student_phone: form.phone.replace(/\D/g, ''),
        amount: amountInCents,
        coupon_code: appliedCoupon,
        return_url: returnUrl,
      });

      if (response.pay_url) {
        setPayUrl(response.pay_url);
        setReferenceId(response.reference_id);
        setStep('redirecting');
        startPaymentPolling(response.reference_id);
        window.open(response.pay_url, '_blank');
      } else {
        setError('Não foi possível gerar o link de pagamento. Tente novamente.');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao criar checkout');
      setStep('error');
    }
  };

  const startPaymentPolling = (refId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts++;
      if (attempts > 360) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const order = await pagBankService.checkOrderStatus(undefined, refId);
        if (order.status === 'PAID' || order.pagbank_payments?.[0]?.status === 'PAID') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('success');
          onSuccess?.();
        }
      } catch (_) {}
    }, 5000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Pagamento Confirmado!</h1>
          <p className="text-slate-500 mb-6">
            Seu acesso ao curso <strong>{course?.title}</strong> foi liberado automaticamente.
          </p>
          <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg">
            Acessar Meus Cursos
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="text-red-600" size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Pagamento não realizado</h1>
          <p className="text-slate-500 mb-6">{error || 'Ocorreu um erro ao processar o pagamento.'}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all">Voltar</button>
            <button onClick={() => { setStep('form'); setError(''); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all">Tentar Novamente</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={48} />
          <h1 className="text-xl font-black text-slate-800 mb-2">Gerando Checkout...</h1>
          <p className="text-slate-500">Estamos preparando sua página de pagamento segura.</p>
        </div>
      </div>
    );
  }

  if (step === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExternalLink className="text-indigo-600" size={36} />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">Finalize o pagamento no PagBank</h1>
          <p className="text-slate-500 mb-6">
            Uma nova aba foi aberta com a página de pagamento do PagBank. Complete o pagamento por lá.
          </p>
          <p className="text-xs text-slate-400 mb-6">Esta página atualizará automaticamente quando o pagamento for confirmado.</p>

          <div className="space-y-3">
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} /> Abrir Página de Pagamento
            </a>
            <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all text-sm">
              Voltar
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-400" size={14} />
            <p className="text-xs text-slate-400 font-medium">Aguardando confirmação de pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <button onClick={onClose} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-medium mb-4 relative z-10">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="relative z-10">
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Checkout Seguro</p>
            <h1 className="text-2xl font-black">{course?.title}</h1>
            <div className="mt-3 flex items-baseline gap-2">
              {discountValue > 0 ? (
                <>
                  <span className="text-indigo-300 line-through text-lg">{course ? formatCurrency(course.price) : ''}</span>
                  <span className="text-3xl font-black">{formatCurrency(effectivePrice)}</span>
                </>
              ) : (
                <span className="text-3xl font-black">{course ? formatCurrency(course.price) : ''}</span>
              )}
            </div>
            {discountValue > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/20 text-green-200 text-xs font-bold px-3 py-1 rounded-full">
                <Tag size={12} />
                Cupom {couponCode} aplicado: -{formatCurrency(discountValue)}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Seus Dados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Nome Completo *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">E-mail *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">CPF *</label>
                <input type="text" value={form.cpf} onChange={e => setForm(p => ({...p, cpf: formatCpf(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Telefone</label>
                <input type="text" value={form.phone} onChange={e => setForm(p => ({...p, phone: formatPhone(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="(11) 99999-9999" maxLength={15} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Cupom de Desconto</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text" value={couponCode}
                  onChange={e => handleCouponChange(e.target.value)}
                  disabled={couponValidation?.valid}
                  className={clsx(
                    'w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase',
                    couponValidation?.valid ? 'border-green-300 bg-green-50 text-green-700'
                      : couponValidation && !couponValidation.valid && couponCode ? 'border-red-300 bg-red-50'
                      : 'border-slate-200'
                  )}
                  placeholder="Digite o código do cupom"
                />
                {couponLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" size={16} />}
                {couponValidation?.valid && (
                  <button onClick={removeCoupon} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              {!couponValidation?.valid && couponCode && !couponLoading && (
                <button onClick={() => validateCoupon(couponCode)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-5 rounded-xl text-sm transition-all whitespace-nowrap">
                  Aplicar
                </button>
              )}
            </div>
            {couponValidation && couponCode && (
              <div className={clsx('mt-2 text-xs font-medium flex items-center gap-1.5 px-1', couponValidation.valid ? 'text-green-600' : 'text-red-500')}>
                {couponValidation.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {couponValidation.message}
              </div>
            )}
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
            <ShieldCheck className="text-indigo-600 mx-auto mb-2" size={32} />
            <p className="text-sm font-bold text-indigo-800">Pagamento Seguro via PagBank</p>
            <p className="text-xs text-indigo-600 mt-1">Você será redirecionado para a página segura do PagBank onde poderá escolher pagar com PIX, Cartão de Crédito, Débito ou Boleto.</p>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-base"
          >
            <Lock size={18} />
            Ir para Pagamento {formatCurrency(effectivePrice)}
          </button>

          <div className="flex items-center justify-center gap-2 text-slate-400">
            <ShieldCheck size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest">Pagamento processado pelo PagBank</p>
          </div>
        </div>
      </div>
    </div>
  );
}
