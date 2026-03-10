import React, { useState } from 'react';
import {
  X, Loader2, Upload, CheckCircle, DollarSign,
  User, Phone, MapPin, Calendar, ChevronDown, FileText, Building2
} from 'lucide-react';
import { appBackend } from '../services/appBackend';
import { PartnerStudioSession } from '../types';
import clsx from 'clsx';

interface CourseRentalFormProps {
  studio: PartnerStudioSession;
  classData: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const RENTAL_TYPES = [
  { value: 'aluguel_intervalo', label: 'Aluguel + Intervalo' },
  { value: 'aluguel', label: 'Apenas Aluguel' },
  { value: 'intervalo', label: 'Apenas Intervalo' },
];

export const CourseRentalForm: React.FC<CourseRentalFormProps> = ({ studio, classData, onClose, onSuccess }) => {
  const [responsibleName, setResponsibleName] = useState(studio.responsibleName || '');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [legalName, setLegalName] = useState(studio.fantasyName || '');
  const [cnpj, setCnpj] = useState(studio.cnpj || '');
  const [rentalType, setRentalType] = useState('aluguel_intervalo');
  const [rentalValue, setRentalValue] = useState('');
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const updateFile = (idx: number, file: File | null) => {
    setFiles(prev => prev.map((f, i) => i === idx ? file : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!responsibleName.trim()) { setErrorMsg('Preencha o nome completo.'); return; }
    if (!rentalValue.trim()) { setErrorMsg('Preencha o valor do aluguel.'); return; }

    const validFiles = files.filter((f): f is File => f !== null);
    if (validFiles.length === 0) { setErrorMsg('Anexe pelo menos um cupom fiscal ou NF.'); return; }

    setIsSubmitting(true);
    try {
      const receiptUrls = await Promise.all(
        validFiles.map(f => appBackend.uploadRentalReceipt(f))
      );

      const rentalData = {
        studio_id: studio.id,
        studio_name: studio.fantasyName,
        responsible_name: responsibleName,
        cpf,
        phone,
        legal_name: legalName,
        cnpj,
        class_id: classData.id || '',
        class_code: classData.class_code || '',
        course_name: classData.course || '',
        city: classData.city || '',
        rental_type: rentalType as any,
        rental_value: parseFloat(rentalValue.replace(/\./g, '').replace(',', '.')) || 0,
        status: 'pendente' as const,
        admin_notes: '',
      };

      await appBackend.submitCourseRental(rentalData, receiptUrls);
      setIsSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido ao enviar solicitação.';
      setErrorMsg(msg);
      alert(`Erro ao enviar aluguel de curso:\n\n${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-10 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-teal-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Enviado com Sucesso!</h2>
          <p className="text-slate-500 text-sm mb-8">
            Sua solicitação de aluguel foi enviada para análise da administração.
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
        <div className="px-8 py-6 border-b bg-gradient-to-r from-teal-600 to-cyan-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white">Aluguel de Curso</h2>
            <p className="text-teal-200 text-xs font-medium mt-1">{classData.course} — #{classData.class_code}</p>
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

          {/* Dados para NF */}
          <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="text-xs font-black text-blue-700 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
              <FileText size={14} className="text-blue-600" /> Dados para Emissão de Nota Fiscal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-blue-900">
              <p><span className="font-black text-[10px] uppercase text-blue-500">Razão Social:</span> <span className="font-bold">Caeffis Com e Serv de Pilates Ltda</span></p>
              <p><span className="font-black text-[10px] uppercase text-blue-500">CNPJ:</span> <span className="font-bold">14.204.979/0001-24</span></p>
              <p><span className="font-black text-[10px] uppercase text-blue-500">IE:</span> <span className="font-bold">151.197.967.116</span></p>
              <p><span className="font-black text-[10px] uppercase text-blue-500">CEP:</span> <span className="font-bold">13023-191</span></p>
              <p className="md:col-span-2"><span className="font-black text-[10px] uppercase text-blue-500">Endereço:</span> <span className="font-bold">Rua Tiradentes, 777 - Vila Itapura, Campinas/SP</span></p>
            </div>
          </section>

          {/* Dados do Studio */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <User size={14} className="text-teal-600" /> Dados do Solicitante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nome Completo</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={responsibleName}
                    onChange={e => setResponsibleName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Celular com DDD</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Razão Social</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Turma</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={`${classData.city || ''} - ${classData.class_code || ''} - ${classData.course || ''}`}
                    readOnly
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Tipo e Valor */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-600" /> Detalhes do Aluguel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">O envio se refere a</label>
                <div className="relative">
                  <select
                    value={rentalType}
                    onChange={e => setRentalType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium appearance-none bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                  >
                    {RENTAL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Valor de Aluguel Acordado (R$)</label>
                <input
                  type="text"
                  value={rentalValue}
                  onChange={e => setRentalValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                  required
                />
              </div>
            </div>
          </section>

          {/* Anexos NF */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <Upload size={14} className="text-purple-600" /> Anexar Cupom Fiscal ou NF
            </h3>
            <div className="space-y-3">
              {[0, 1, 2].map(idx => (
                <label key={idx} className={clsx(
                  "flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                  files[idx] ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/50"
                )}>
                  <Upload size={16} className={files[idx] ? "text-teal-600" : "text-slate-400"} />
                  <span className={clsx("text-xs font-medium truncate flex-1", files[idx] ? "text-teal-700" : "text-slate-500")}>
                    {files[idx] ? files[idx]!.name : `Comprovante ${idx + 1} — Clique para selecionar`}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={e => updateFile(idx, e.target.files?.[0] || null)}
                  />
                </label>
              ))}
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
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
