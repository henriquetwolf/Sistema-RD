import React, { useRef, useState, useEffect } from 'react';
import { Contract } from '../types';
import { appBackend } from '../services/appBackend';
import { PenTool, CheckCircle, Loader2, Eraser, Calendar, User } from 'lucide-react';
import clsx from 'clsx';

interface ContractSigningProps {
  contract: Contract;
}

export const ContractSigning: React.FC<ContractSigningProps> = ({ contract }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigned, setIsSigned] = useState(!!contract.signedAt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Canvas Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !isSigned) {
      // Set canvas size to match parent
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 200; // Fixed height
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [isSigned]);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    if (isSigned) return;
    setIsDrawing(true);
    const { x, y } = getPos(e.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || isSigned) return;
    e.preventDefault(); // Prevent scrolling on touch
    const { x, y } = getPos(e.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasSignature) setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasSignature) {
        alert("Por favor, assine no campo indicado.");
        return;
    }
    
    setIsSubmitting(true);
    const signatureData = canvasRef.current?.toDataURL() || '';
    
    try {
        await appBackend.signContract(contract.id, signatureData);
        setIsSigned(true);
    } catch (e) {
        alert("Erro ao salvar assinatura. Tente novamente.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex flex-col items-center">
      <div className="bg-white max-w-3xl w-full rounded-xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
            <p className="text-slate-400 text-sm">
                Documento emitido em {new Date(contract.createdAt).toLocaleDateString()}
            </p>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-8">
            {/* Contract Text */}
            <div className="prose prose-slate max-w-none text-slate-700 bg-slate-50 p-6 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                {contract.content}
            </div>

            <div className="border-t border-slate-200 pt-8">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PenTool className="text-teal-600" /> 
                    {isSigned ? 'Assinatura Digital Realizada' : 'Assine Abaixo'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assinado por</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{contract.signerName}</p>
                                <p className="text-xs text-slate-500">{contract.signerEmail}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data da Assinatura</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200 h-[66px]">
                            <Calendar className="text-slate-400 ml-2" size={20} />
                            <p className="font-medium text-slate-700">
                                {isSigned && contract.signedAt 
                                    ? new Date(contract.signedAt).toLocaleString() 
                                    : new Date().toLocaleDateString() + " (Pendente)"
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Signature Area */}
                <div className="mt-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        {isSigned ? 'Assinatura Registrada' : 'Desenhe sua assinatura aqui'}
                    </label>
                    
                    <div className={clsx("relative border-2 border-dashed rounded-xl overflow-hidden bg-white", isSigned ? "border-green-200 bg-green-50/30" : "border-slate-300")}>
                        {isSigned ? (
                            <div className="h-[200px] flex items-center justify-center relative">
                                <img src={contract.signatureData} alt="Assinatura" className="max-h-[180px] z-10" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                    <CheckCircle size={100} className="text-green-600" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="touch-none cursor-crosshair w-full block"
                                />
                                <div className="absolute bottom-2 right-2">
                                    <button 
                                        onClick={clearSignature}
                                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm border border-slate-200"
                                    >
                                        <Eraser size={12} /> Limpar
                                    </button>
                                </div>
                                <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-200 pointer-events-none -z-0"></div>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {!isSigned && (
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasSignature}
                            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <PenTool size={20} />}
                            Confirmar Assinatura
                        </button>
                    </div>
                )}

                {isSigned && (
                    <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-center gap-2 text-green-800 font-medium">
                        <CheckCircle size={20} />
                        Este contrato foi assinado digitalmente com sucesso.
                    </div>
                )}
            </div>
        </div>
        
        <div className="mt-8 text-center text-slate-400 text-xs">
            <p>Sistema VOLL Pilates Group &copy; {new Date().getFullYear()}</p>
            <p>Autenticação digital segura</p>
        </div>
      </div>
    </div>
  );
};