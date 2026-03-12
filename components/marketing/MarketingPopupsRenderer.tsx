import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { appBackend } from '../../services/appBackend';

interface PopupPayload {
  id: string;
  name: string;
  popup_type: 'scroll' | 'exit_intent';
  title: string;
  description: string;
  cta_text: string;
  image_url?: string;
  form_id?: string | null;
  target_pages: string[];
  display_frequency: 'once' | 'every_visit' | 'every_session';
  is_active: boolean;
  views?: number;
  conversions?: number;
}

const STORAGE_KEY_ONCE = 'mkt_popup_seen_';
const STORAGE_KEY_VISIT = 'mkt_popup_visit_seen_';

/** Verifica se a URL atual corresponde a pelo menos um padrão de target_pages */
function currentPageMatches(targetPages: string[]): boolean {
  if (!targetPages?.length) return false;
  const href = window.location.href;
  const pathname = window.location.pathname;
  const search = window.location.search;

  for (const target of targetPages) {
    const t = (target || '').trim();
    if (!t) continue;
    // Padrão de path (ex: /pilates/* ou /landing-page)
    if (t.startsWith('/')) {
      const pattern = t.endsWith('*') ? t.slice(0, -1) : t;
      if (pathname === pattern || pathname.startsWith(pattern)) return true;
    }
    // URL completa ou substring (ex: landingPageId=xxx ou https://...)
    if (href.includes(t) || (search && search.includes(t))) return true;
    // Normalizar barras duplas para comparar (ex: .../landingPageId=id vs .../?landingPageId=id)
    const normT = t.replace(/\/+/g, '/');
    if (href.replace(/\/+/g, '/').includes(normT) || (search && search.includes(normT))) return true;
    // Se o alvo contém landingPageId=, considerar match se o id está na URL atual
    if (t.includes('landingPageId=')) {
      const idPart = t.split('landingPageId=')[1]?.split('&')[0]?.split('#')[0]?.trim();
      if (idPart && (href.includes(idPart) || search.includes(idPart))) return true;
    }
  }
  return false;
}

/** Verifica se já exibimos este pop-up conforme a frequência */
function shouldShowByFrequency(popup: PopupPayload, seenThisSession: Set<string>): boolean {
  if (popup.display_frequency === 'every_session') {
    return !seenThisSession.has(popup.id);
  }
  if (popup.display_frequency === 'every_visit') {
    try {
      return !sessionStorage.getItem(STORAGE_KEY_VISIT + popup.id);
    } catch {
      return true;
    }
  }
  // once
  try {
    return !localStorage.getItem(STORAGE_KEY_ONCE + popup.id);
  } catch {
    return true;
  }
}

function markAsShown(popup: PopupPayload): void {
  try {
    if (popup.display_frequency === 'once') {
      localStorage.setItem(STORAGE_KEY_ONCE + popup.id, '1');
    } else if (popup.display_frequency === 'every_visit') {
      sessionStorage.setItem(STORAGE_KEY_VISIT + popup.id, '1');
    }
  } catch (_) {}
}

interface MarketingPopupsRendererProps {
  /** URL ou path atual (opcional; se não passar, usa window.location) */
  currentUrl?: string;
}

export const MarketingPopupsRenderer: React.FC<MarketingPopupsRendererProps> = () => {
  const [popups, setPopups] = useState<PopupPayload[]>([]);
  const [visiblePopup, setVisiblePopup] = useState<PopupPayload | null>(null);
  const [scrollTriggered, setScrollTriggered] = useState(false);
  const [exitTriggered, setExitTriggered] = useState(false);
  const seenThisSession = useRef<Set<string>>(new Set());

  const matchingPopups = popups.filter(
    (p) => p.is_active && currentPageMatches(p.target_pages || [])
  );

  const showPopup = useCallback((popup: PopupPayload) => {
    if (!shouldShowByFrequency(popup, seenThisSession.current)) return;
    seenThisSession.current.add(popup.id);
    markAsShown(popup);
    setVisiblePopup(popup);
  }, []);

  // Carregar pop-ups ativos
  useEffect(() => {
    let cancelled = false;
    appBackend.getMarketingPopups().then((data) => {
      if (!cancelled && Array.isArray(data)) {
        setPopups(data as PopupPayload[]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Scroll 50% — dispara o primeiro pop-up do tipo "scroll" que ainda não foi mostrado
  useEffect(() => {
    if (matchingPopups.length === 0 || scrollTriggered) return;

    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const pct = (window.scrollY / scrollHeight) * 100;
      if (pct >= 50) {
        const scrollPopup = matchingPopups.find(
          (p) => p.popup_type === 'scroll' && shouldShowByFrequency(p, seenThisSession.current)
        );
        if (scrollPopup) {
          setScrollTriggered(true);
          showPopup(scrollPopup);
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [matchingPopups, scrollTriggered, showPopup]);

  // Exit intent — dispara o primeiro pop-up do tipo "exit_intent" que ainda não foi mostrado
  useEffect(() => {
    if (matchingPopups.length === 0 || exitTriggered) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        const exitPopup = matchingPopups.find(
          (p) => p.popup_type === 'exit_intent' && shouldShowByFrequency(p, seenThisSession.current)
        );
        if (exitPopup) {
          setExitTriggered(true);
          showPopup(exitPopup);
        }
      }
    };

    document.addEventListener('mouseout', onMouseLeave);
    return () => document.removeEventListener('mouseout', onMouseLeave);
  }, [matchingPopups, exitTriggered, showPopup]);

  const handleClose = useCallback(() => {
    setVisiblePopup(null);
  }, []);

  if (!visiblePopup) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        {visiblePopup.image_url && (
          <img
            src={visiblePopup.image_url}
            alt=""
            className="w-full h-40 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {visiblePopup.title || 'Oferta especial'}
          </h3>
          <p className="text-sm text-slate-600 mb-5 whitespace-pre-wrap">
            {visiblePopup.description || ''}
          </p>
          <a
            href="#oferta"
            className="inline-block bg-purple-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            {visiblePopup.cta_text || 'Quero saber mais'}
          </a>
        </div>
      </div>
    </div>
  );
};
