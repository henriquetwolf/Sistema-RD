import React, { useState } from 'react';
import {
  X, Loader2, Plus, Trash2, Upload, CheckCircle, DollarSign,
  User, Mail, Phone, MapPin, Calendar, Landmark, ChevronDown
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { Teacher } from './TeachersManager';
import clsx from 'clsx';

interface CourseClosingFormProps {
  instructor: Teacher;
  classData: any;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExpenseItem {
  category: string;
  amount: string;
  file: File | null;
  receiptUrl: string;
  observation: string;
}

const EXPENSE_CATEGORIES = [
  'Nota fiscal',
  'Transporte',
  'Estacionamento',
  'Pedágio',
  'Outros',
];

export const CourseClosingForm: React.FC<CourseClosingFormProps> = ({ instructor, classData, onClose, onSuccess }) => {
  const [instructorName, setInstructorName] = useState(instructor.fullName || '');
  const [instructorEmail, setInstructorEmail] = useState(instructor.email || '');
  const [instructorPhone, setInstructorPhone] = useState(instructor.phone || '');
  const [cityAndClass, setCityAndClass] = useState(
    `${classData.city || ''}${classData.class_code ? ` - Turma ${classData.class_code}` : ''}`
  );
  const [dateStart, setDateStart] = useState(classData.date_mod_1 || '');
  const [dateEnd, setDateEnd] = useState(classData.date_mod_2 || '');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { category: '', amount: '', file: null, receiptUrl: '', observation: '' },
  ]);

  const [pixKey, setPixKey] = useState(instructor.pixKeyPj || instructor.pixKeyPf || '');
  const [bank, setBank] = useState(instructor.bank || '');
  const [agency, setAgency] = useState(instructor.agency || '');
  const [account, setAccount] = useState(
    `${instructor.accountNumber || ''}${instructor.accountDigit ? '-' + instructor.accountDigit : ''}`
  );
  const [accountHolder, setAccountHolder] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addExpense = () => {
    setExpenses(prev => [...prev, { category: '', amount: '', file: null, receiptUrl: '', observation: '' }]);
  };

  const removeExpense = (idx: number) => {
    if (expenses.length <= 1) return;
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExpense = (idx: number, field: keyof ExpenseItem, value: any) => {
    setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!instructorName.trim()) { setErrorMsg('Preencha o nome do instrutor.'); return; }
    if (!dateStart) { setErrorMsg('Preencha a data de início.'); return; }
    if (!dateEnd) { setErrorMsg('Preencha a data de término.'); return; }

    const validExpenses = expenses.filter(ex => ex.category && ex.amount);

    setIsSubmitting(true);
    try {
      const uploadedExpenses = await Promise.all(
        validExpenses.map(async (ex) => {
          let receiptUrl = '';
          if (ex.file) {
            receiptUrl = await appBackend.uploadClosingReceipt(ex.file);
          }
          return {
            category: ex.category,
            amount: parseFloat(ex.amount.replace(/\./g, '').replace(',', '.')) || 0,
            receipt_url: receiptUrl,
            observation: ex.observation,
          };
        })
      );

      await appBackend.submitCourseClosing(
        {
          instructor_id: instructor.id,
          instructor_name: instructorName,
          instructor_email: instructorEmail,
          instructor_phone: instructorPhone,
          class_id: classData.id,
          class_code: classData.class_code || '',
          course_name: classData.course || '',
          city: classData.city || '',
          class_number: classData.class_code || '',
          date_start: dateStart,
          date_end: dateEnd,
          pix_key: pixKey,
          bank,
          agency,
          account,
          account_holder: accountHolder,
          status: 'pendente',
          admin_notes: '',
        },
        uploadedExpenses
      );

      setIsSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar fechamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-10 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Enviado com Sucesso!</h2>
          <p className="text-slate-500 text-sm mb-8">
            Seu fechamento de curso foi enviado para análise da administração.
          </p>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl my-8 animate-in zoom-in-95 overflow-hidden">
        <div className="px-8 py-6 border-b bg-gradient-to-r from-purple-600 to-indigo-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white">Fechamento de Curso</h2>
            <p className="text-purple-200 text-xs font-medium mt-1">{classData.course} — #{classData.class_code}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Dados do Instrutor */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <User size={14} className="text-purple-600" /> Dados do Instrutor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nome Completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={instructorName}
                    onChange={e => setInstructorName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    value={instructorEmail}
                    onChange={e => setInstructorEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Celular</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={instructorPhone}
                    onChange={e => setInstructorPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Cidade e Turma</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={cityAndClass}
                    onChange={e => setCityAndClass(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Data Início do Curso</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="date"
                    value={dateStart}
                    onChange={e => setDateStart(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Data Término do Curso</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={e => setDateEnd(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Despesas */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <DollarSign size={14} className="text-emerald-600" /> Custos Referentes ao Curso
              </h3>
              <button
                type="button"
                onClick={addExpense}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Adicionar Despesa
              </button>
            </div>

            <div className="space-y-4">
              {expenses.map((expense, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 relative">
                  {expenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExpense(idx)}
                      className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Remover despesa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <p className="text-[10px] font-black text-slate-400 uppercase">Despesa {idx + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Categoria</label>
                      <div className="relative">
                        <select
                          value={expense.category}
                          onChange={e => updateExpense(idx, 'category', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium appearance-none bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                        >
                          <option value="">Selecione...</option>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Valor Gasto (R$)</label>
                      <input
                        type="text"
                        value={expense.amount}
                        onChange={e => updateExpense(idx, 'amount', e.target.value)}
                        placeholder="0,00"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Anexar NF ou Comprovante</label>
                    <label className={clsx(
                      "flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                      expense.file ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/50"
                    )}>
                      <Upload size={16} className={expense.file ? "text-emerald-600" : "text-slate-400"} />
                      <span className={clsx("text-xs font-medium truncate", expense.file ? "text-emerald-700" : "text-slate-500")}>
                        {expense.file ? expense.file.name : 'Clique para selecionar arquivo'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          updateExpense(idx, 'file', f);
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Observação</label>
                    <textarea
                      value={expense.observation}
                      onChange={e => updateExpense(idx, 'observation', e.target.value)}
                      rows={2}
                      placeholder="Observação sobre o comprovante..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dados Bancários */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <Landmark size={14} className="text-blue-600" /> Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Banco</label>
                <input
                  type="text"
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Agência</label>
                <input
                  type="text"
                  value={agency}
                  onChange={e => setAgency(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Conta</label>
                <input
                  type="text"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Titular (se conta conjunta)</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  placeholder="Preencha se a conta for conjunta"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {isSubmitting ? 'Enviando...' : 'Enviar Fechamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
