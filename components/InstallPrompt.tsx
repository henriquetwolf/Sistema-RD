import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'voll_install_dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const dismissedAt = Number(val);
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
  return isMobile && !isStandalone && !isCapacitor;
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|Chrome/i.test(ua);
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!isMobileBrowser() || isDismissed()) return;

    if (isIOSSafari()) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
    setShowIOSModal(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="w-full mt-4 animate-in fade-in duration-500">
        <button
          onClick={handleInstall}
          className="w-full bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
        >
          <Download size={18} />
          Adicionar à Tela Inicial
        </button>
        <button
          onClick={handleDismiss}
          className="w-full mt-2 text-xs text-slate-400 hover:text-slate-500 py-1 transition-colors"
        >
          Agora não
        </button>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10 animate-slide-up safe-bottom">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-800">Adicionar à Tela Inicial</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Share size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">1. Toque em Compartilhar</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toque no ícone de compartilhamento na barra do Safari (quadrado com seta para cima)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <PlusSquare size={20} className="text-teal-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">2. Adicionar à Tela de Início</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Role para baixo e toque em "Adicionar à Tela de Início"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Download size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">3. Confirmar</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toque em "Adicionar" para confirmar. O ícone da VOLL aparecerá na sua tela inicial!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full mt-6 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl active:bg-slate-200 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
