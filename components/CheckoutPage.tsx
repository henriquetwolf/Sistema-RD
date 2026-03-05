import React, { useState, useEffect, useRef } from 'react';
import { pagBankService } from '../services/pagBankService';
import { appBackend } from '../services/appBackend';
import type { OnlineCourse, PagBankCreateOrderResponse, PagBankPaymentMethod, PagBankCouponValidation } from '../types';
import { CreditCard, QrCode, FileText, Loader2, CheckCircle, XCircle, Copy, ArrowLeft, ShieldCheck, Lock, Clock, AlertCircle, Tag, X } from 'lucide-react';
import clsx from 'clsx';

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (params: {
        publicKey: string;
        holder: string;
        number: string;
        expMonth: string;
        expYear: string;
        securityCode: string;
      }) => {
        encryptedCard: string;
        hasErrors: boolean;
        errors: { code: string; message: string }[];
      };
    };
  }
}

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

type CheckoutStep = 'form' | 'payment' | 'processing' | 'success' | 'error';

export function CheckoutPage({ courseId, dealId, studentName, studentEmail, studentCpf, studentPhone, onClose, onSuccess }: CheckoutPageProps) {
  const [course, setCourse] = useState<OnlineCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>('form');
  const [paymentMethod, setPaymentMethod] = useState<PagBankPaymentMethod>('PIX');
  const [publicKey, setPublicKey] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [error, setError] = useState('');
  const [orderResponse, setOrderResponse] = useState<PagBankCreateOrderResponse | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
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
    cardNumber: '',
    cardHolder: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvv: '',
    installments: 1,
  });

  useEffect(() => {
    loadData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const [courses, config] = await Promise.all([
        appBackend.getOnlineCourses(),
        pagBankService.getConfig(),
      ]);

      const found = courses.find((c: OnlineCourse) => c.id === courseId);
      if (!found) {
        setError('Curso não encontrado.');
        setStep('error');
        return;
      }
      setCourse(found);

      if (config.configured && config.public_key) {
        setPublicKey(config.public_key);
        setSandboxMode(config.sandbox_mode);
      }
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

  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
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

    if (!cleaned) {
      setCouponValidation(null);
      return;
    }

    couponDebounceRef.current = window.setTimeout(() => {
      validateCoupon(cleaned);
    }, 800);
  };

  const validateCoupon = async (code: string) => {
    if (!course || !code) return;
    setCouponLoading(true);
    try {
      const amountInCents = Math.round(course.price * 100);
      const result = await pagBankService.validateCoupon(
        code,
        amountInCents,
        courseId,
        dealId,
        form.email || undefined,
      );
      setCouponValidation(result);
    } catch (e: any) {
      setCouponValidation({
        valid: false,
        discount_amount: 0,
        final_amount: Math.round((course?.price || 0) * 100),
        message: e.message || 'Erro ao validar cupom',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponValidation(null);
  };

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
      let cardEncrypted: string | undefined;

      if (paymentMethod === 'CREDIT_CARD') {
        if (!form.cardNumber || !form.cardHolder || !form.cardExpMonth || !form.cardExpYear || !form.cardCvv) {
          setError('Preencha todos os dados do cartão.');
          setStep('payment');
          return;
        }

        if (!window.PagSeguro) {
          setError('SDK do PagBank não carregado. Recarregue a página.');
          setStep('payment');
          return;
        }

        const result = window.PagSeguro.encryptCard({
          publicKey,
          holder: form.cardHolder,
          number: form.cardNumber.replace(/\s/g, ''),
          expMonth: form.cardExpMonth.padStart(2, '0'),
          expYear: form.cardExpYear.length === 2 ? `20${form.cardExpYear}` : form.cardExpYear,
          securityCode: form.cardCvv,
        });

        if (result.hasErrors) {
          const msgs = result.errors.map(e => e.message).join(', ');
          setError(`Erro no cartão: ${msgs}`);
          setStep('payment');
          return;
        }

        cardEncrypted = result.encryptedCard;
      }

      const response = await pagBankService.createOrder({
        course_id: courseId,
        course_title: course.title,
        student_deal_id: dealId || `guest-${Date.now()}`,
        student_name: form.name,
        student_email: form.email,
        student_cpf: form.cpf.replace(/\D/g, ''),
        student_phone: form.phone.replace(/\D/g, ''),
        amount: amountInCents,
        payment_method: paymentMethod,
        card_encrypted: cardEncrypted,
        installments: paymentMethod === 'CREDIT_CARD' ? form.installments : 1,
        coupon_code: appliedCoupon,
      });

      setOrderResponse(response);

      if (response.payment.status === 'PAID') {
        setStep('success');
        onSuccess?.();
      } else if (paymentMethod === 'PIX') {
        setStep('payment');
        startPixPolling(response.reference_id);
      } else if (paymentMethod === 'BOLETO') {
        setStep('payment');
      } else {
        if (response.payment.status === 'DECLINED' || response.payment.status === 'CANCELED') {
          setError('Pagamento recusado. Verifique os dados do cartão e tente novamente.');
          setStep('error');
        } else {
          setStep('success');
          onSuccess?.();
        }
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao processar pagamento');
      setStep('error');
    }
  };

  const startPixPolling = (referenceId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const order = await pagBankService.checkOrderStatus(undefined, referenceId);
        if (order.status === 'PAID' || order.pagbank_payments?.[0]?.status === 'PAID') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('success');
          onSuccess?.();
        }
      } catch (_) {}
    }, 5000);
  };

  const copyPixCode = () => {
    if (orderResponse?.payment.pix_qrcode) {
      navigator.clipboard.writeText(orderResponse.payment.pix_qrcode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const maxInstallments = course ? Math.min(12, Math.max(1, Math.floor(effectivePrice / 10))) : 1;

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
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
          >
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
          <h1 className="text-xl font-black text-slate-800 mb-2">Processando Pagamento...</h1>
          <p className="text-slate-500">Aguarde enquanto processamos sua transação com segurança.</p>
        </div>
      </div>
    );
  }

  const showPixResult = orderResponse && paymentMethod === 'PIX' && orderResponse.payment.pix_qrcode;
  const showBoletoResult = orderResponse && paymentMethod === 'BOLETO' && orderResponse.payment.boleto_url;

  if (showPixResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-lg w-full">
          <button onClick={onClose} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium mb-6">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="text-teal-600" size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1">Pague com PIX</h2>
            <p className="text-slate-500 text-sm mb-6">Escaneie o QR Code ou copie o código abaixo</p>

            {orderResponse.payment.pix_qrcode_image && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 inline-block mb-6">
                <img src={orderResponse.payment.pix_qrcode_image} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Código PIX Copia e Cola</p>
              <p className="text-xs text-slate-600 break-all font-mono leading-relaxed">{orderResponse.payment.pix_qrcode}</p>
            </div>

            <button
              onClick={copyPixCode}
              className={clsx(
                'w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2',
                pixCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
            >
              {pixCopied ? <><CheckCircle size={18} /> Copiado!</> : <><Copy size={18} /> Copiar Código PIX</>}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-amber-600">
              <Clock size={14} />
              <p className="text-xs font-medium">Aguardando pagamento... A página atualiza automaticamente.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showBoletoResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-lg w-full text-center">
          <button onClick={onClose} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium mb-6">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-orange-600" size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-1">Boleto Gerado!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Seu boleto foi gerado com sucesso. O acesso será liberado após a confirmação do pagamento (1-3 dias úteis).
          </p>

          {orderResponse.payment.boleto_barcode && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Código de Barras</p>
              <p className="text-xs text-slate-600 break-all font-mono">{orderResponse.payment.boleto_barcode}</p>
            </div>
          )}

          <a
            href={orderResponse.payment.boleto_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <FileText size={18} /> Abrir Boleto em PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
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
              {paymentMethod === 'CREDIT_CARD' && form.installments > 1 && (
                <span className="text-indigo-200 text-sm">
                  ou {form.installments}x de {formatCurrency(effectivePrice / form.installments)}
                </span>
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

          {step === 'form' && (
            <>
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
                      type="text"
                      value={couponCode}
                      onChange={e => handleCouponChange(e.target.value)}
                      disabled={couponValidation?.valid}
                      className={clsx(
                        'w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase',
                        couponValidation?.valid
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : couponValidation && !couponValidation.valid && couponCode
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200'
                      )}
                      placeholder="Digite o código do cupom"
                    />
                    {couponLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" size={16} />
                    )}
                    {couponValidation?.valid && (
                      <button
                        onClick={removeCoupon}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {!couponValidation?.valid && couponCode && !couponLoading && (
                    <button
                      onClick={() => validateCoupon(couponCode)}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-5 rounded-xl text-sm transition-all whitespace-nowrap"
                    >
                      Aplicar
                    </button>
                  )}
                </div>
                {couponValidation && couponCode && (
                  <div className={clsx(
                    'mt-2 text-xs font-medium flex items-center gap-1.5 px-1',
                    couponValidation.valid ? 'text-green-600' : 'text-red-500'
                  )}>
                    {couponValidation.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {couponValidation.message}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Forma de Pagamento</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['PIX', 'CREDIT_CARD', 'BOLETO'] as PagBankPaymentMethod[]).map(method => (
                    <button
                      key={method}
                      onClick={() => { setPaymentMethod(method); setError(''); }}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm',
                        paymentMethod === method
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      {method === 'PIX' && <QrCode size={24} />}
                      {method === 'CREDIT_CARD' && <CreditCard size={24} />}
                      {method === 'BOLETO' && <FileText size={24} />}
                      <span className="text-xs font-bold">
                        {method === 'PIX' ? 'PIX' : method === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 bg-slate-50 rounded-2xl p-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Número do Cartão</label>
                    <input type="text" value={form.cardNumber} onChange={e => setForm(p => ({...p, cardNumber: formatCardNumber(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white" placeholder="0000 0000 0000 0000" maxLength={19} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Nome no Cartão</label>
                    <input type="text" value={form.cardHolder} onChange={e => setForm(p => ({...p, cardHolder: e.target.value.toUpperCase()}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white uppercase" placeholder="NOME COMO NO CARTÃO" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Mês</label>
                      <input type="text" value={form.cardExpMonth} onChange={e => setForm(p => ({...p, cardExpMonth: e.target.value.replace(/\D/g, '').slice(0, 2)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-center" placeholder="MM" maxLength={2} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Ano</label>
                      <input type="text" value={form.cardExpYear} onChange={e => setForm(p => ({...p, cardExpYear: e.target.value.replace(/\D/g, '').slice(0, 4)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-center" placeholder="AAAA" maxLength={4} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">CVV</label>
                      <input type="text" value={form.cardCvv} onChange={e => setForm(p => ({...p, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-center" placeholder="000" maxLength={4} />
                    </div>
                  </div>
                  {maxInstallments > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Parcelas</label>
                      <select value={form.installments} onChange={e => setForm(p => ({...p, installments: Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white">
                        {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>
                            {n}x de {formatCurrency(effectivePrice / n)} {n === 1 ? '(à vista)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'PIX' && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-center">
                  <QrCode className="text-teal-600 mx-auto mb-2" size={32} />
                  <p className="text-sm font-bold text-teal-800">Pagamento instantâneo via PIX</p>
                  <p className="text-xs text-teal-600 mt-1">Após confirmar, um QR Code será gerado para pagamento imediato.</p>
                </div>
              )}

              {paymentMethod === 'BOLETO' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
                  <FileText className="text-orange-600 mx-auto mb-2" size={32} />
                  <p className="text-sm font-bold text-orange-800">Pagamento via Boleto Bancário</p>
                  <p className="text-xs text-orange-600 mt-1">O boleto será gerado e o acesso liberado após compensação (1-3 dias úteis).</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-base"
              >
                <Lock size={18} />
                Pagar {formatCurrency(effectivePrice)}
              </button>

              <div className="flex items-center justify-center gap-2 text-slate-400">
                <ShieldCheck size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  {sandboxMode ? 'Ambiente de Testes' : 'Pagamento seguro via PagBank'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
