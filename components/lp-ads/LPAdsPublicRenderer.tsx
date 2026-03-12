import React, { useEffect, useState } from 'react';
import { appBackend } from '../../services/appBackend';
import { FormViewer } from '../FormViewer';
import { MarketingPopupsRenderer } from '../marketing/MarketingPopupsRenderer';
import { MarketingWAButtonRenderer } from '../marketing/MarketingWAButtonRenderer';
import { LPAdsLandingPage } from './types';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  landingPage: LPAdsLandingPage;
}

function generateVisitorId(): string {
  const stored = localStorage.getItem('lp_ads_visitor_id');
  if (stored) return stored;
  const id = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  localStorage.setItem('lp_ads_visitor_id', id);
  return id;
}

function generateSessionId(): string {
  const stored = sessionStorage.getItem('lp_ads_session_id');
  if (stored) return stored;
  const id = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem('lp_ads_session_id', id);
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  };
}

function sendTrackEvent(event: Record<string, any>) {
  try {
    const payload = JSON.stringify(event);
    if (navigator.sendBeacon) {
      const supabaseUrl = (import.meta as any).env?.VITE_APP_SUPABASE_URL;
      const anonKey = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY;
      if (supabaseUrl && anonKey) {
        navigator.sendBeacon(
          `${supabaseUrl}/functions/v1/lp-ads-track`,
          new Blob([payload], { type: 'application/json' })
        );
        return;
      }
    }
    appBackend.client.functions.invoke('lp-ads-track', { body: event });
  } catch { /* silent tracking failure */ }
}

export const LPAdsPublicRenderer: React.FC<Props> = ({ landingPage }) => {
  const [form, setForm] = useState<any>(null);
  const pageStartTime = React.useRef(Date.now());

  useEffect(() => {
    if (landingPage.selected_form_id) {
      appBackend.getForms().then(forms => {
        const found = forms.find((f: any) => f.id === landingPage.selected_form_id);
        if (found) setForm(found);
      });
    }
  }, [landingPage.selected_form_id]);

  useEffect(() => {
    const visitorId = generateVisitorId();
    const sessionId = generateSessionId();
    const utm = getUTMParams();
    const baseEvent = {
      landing_page_id: landingPage.id,
      project_id: landingPage.project_id,
      campaign_id: landingPage.campaign_id || null,
      visitor_id: visitorId,
      session_id: sessionId,
      ...utm,
      referrer: document.referrer || '',
      device_type: getDeviceType(),
    };

    sendTrackEvent({ ...baseEvent, event_type: 'page_view' });

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      sendTrackEvent({ ...baseEvent, event_type: 'time_on_page', event_data: { seconds: timeOnPage } });
    };

    const handleCTAClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a, button');
      if (link) {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || '';
        if (href.includes('{{cta_link}}') || href === landingPage.cta_link || link.getAttribute('data-cta')) {
          sendTrackEvent({ ...baseEvent, event_type: 'cta_click', event_data: { href, label: text } });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleCTAClick);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleCTAClick);
    };
  }, [landingPage]);

  const content = landingPage.content;
  const htmlCode = landingPage.html_code || '';

  if (!htmlCode && (!content?.sections || content.sections.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="text-amber-500 mb-4" size={48} />
        <h1 className="text-xl font-bold text-slate-800">Página sem conteúdo</h1>
        <p className="text-slate-500">Esta landing page ainda não foi configurada.</p>
      </div>
    );
  }

  const processedHtml = htmlCode
    .replace(/\{\{cta_link\}\}/g, landingPage.cta_link || '#')
    ;

  if (htmlCode) {
    const renderWithForm = () => {
      if (!form) return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
      const placeholder = '{{form}}';
      if (processedHtml.includes(placeholder)) {
        const parts = processedHtml.split(placeholder);
        return (
          <>
            <div dangerouslySetInnerHTML={{ __html: parts[0] }} />
            <div className="max-w-4xl mx-auto py-12 px-6">
              <FormViewer form={form} isPublic={true} />
            </div>
            <div dangerouslySetInnerHTML={{ __html: parts[1] }} />
          </>
        );
      }
      return (
        <>
          <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
          <div className="max-w-4xl mx-auto py-20 px-6">
            <FormViewer form={form} isPublic={true} />
          </div>
        </>
      );
    };

    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        {renderWithForm()}
        {landingPage.show_popups && <MarketingPopupsRenderer />}
        {landingPage.show_wa_button && <MarketingWAButtonRenderer />}
      </div>
    );
  }

  const sections = (content?.sections || []).filter((s: any) => s.enabled !== false);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {sections.map((section: any, idx: number) => (
        <div key={section.id || idx} className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            {section.headline && (
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{section.headline}</h2>
            )}
            {section.body && (
              <p className="text-lg text-slate-600 leading-relaxed mb-6">{section.body}</p>
            )}
            {section.items && section.items.length > 0 && (
              <ul className="space-y-2">
                {section.items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.cta && (
              <a
                href={landingPage.cta_link || '#'}
                data-cta="true"
                className="inline-block mt-6 px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-lg"
              >
                {section.cta}
              </a>
            )}
          </div>
        </div>
      ))}

      {form && (
        <div className="max-w-4xl mx-auto py-16 px-6">
          <FormViewer form={form} isPublic={true} />
        </div>
      )}

      {landingPage.show_popups && <MarketingPopupsRenderer />}
      {landingPage.show_wa_button && <MarketingWAButtonRenderer />}
    </div>
  );
};
