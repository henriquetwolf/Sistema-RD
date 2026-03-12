import React, { useEffect, useState, useRef, useMemo } from 'react';
import { appBackend } from '../../services/appBackend';
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

function buildTrackingScript(landingPage: LPAdsLandingPage): string {
  const supabaseUrl = (import.meta as any).env?.VITE_APP_SUPABASE_URL || '';
  const anonKey = (import.meta as any).env?.VITE_APP_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl) return '';

  return `
<script>
(function(){
  var visitorId = localStorage.getItem('lp_ads_visitor_id');
  if (!visitorId) { visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36); localStorage.setItem('lp_ads_visitor_id', visitorId); }
  var sessionId = sessionStorage.getItem('lp_ads_session_id');
  if (!sessionId) { sessionId = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36); sessionStorage.setItem('lp_ads_session_id', sessionId); }
  var params = new URLSearchParams(window.location.search);
  var pageStart = Date.now();
  var baseEvent = {
    landing_page_id: "${landingPage.id}",
    project_id: "${landingPage.project_id}",
    campaign_id: ${landingPage.campaign_id ? `"${landingPage.campaign_id}"` : 'null'},
    visitor_id: visitorId,
    session_id: sessionId,
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
    referrer: document.referrer || '',
    device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
  };
  function send(evt) {
    try {
      var payload = JSON.stringify(evt);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("${supabaseUrl}/functions/v1/lp-ads-track", new Blob([payload], {type: 'application/json'}));
      }
    } catch(e){}
  }
  send(Object.assign({}, baseEvent, {event_type: 'page_view'}));
  window.addEventListener('beforeunload', function() {
    send(Object.assign({}, baseEvent, {event_type: 'time_on_page', event_data: {seconds: Math.round((Date.now()-pageStart)/1000)}}));
  });
  document.addEventListener('click', function(e) {
    var link = e.target.closest ? e.target.closest('a, button') : null;
    if (link) {
      var href = link.getAttribute('href') || '';
      var text = link.textContent ? link.textContent.trim() : '';
      send(Object.assign({}, baseEvent, {event_type: 'cta_click', event_data: {href:href, label:text}}));
    }
  });
})();
</script>`;
}

function buildFormHtml(form: any): string {
  if (!form) return '';
  const fields = form.fields || [];
  const fieldHtml = fields.map((f: any) => {
    const required = f.required ? 'required' : '';
    const label = `<label class="block text-sm font-semibold text-gray-700 mb-1">${f.label || f.name}${f.required ? ' <span class="text-red-500">*</span>' : ''}</label>`;
    if (f.type === 'textarea') {
      return `<div class="mb-4">${label}<textarea name="${f.name}" ${required} rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="${f.placeholder || ''}"></textarea></div>`;
    }
    if (f.type === 'select' && f.options) {
      const opts = (f.options || []).map((o: any) => `<option value="${typeof o === 'string' ? o : o.value}">${typeof o === 'string' ? o : o.label}</option>`).join('');
      return `<div class="mb-4">${label}<select name="${f.name}" ${required} class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition">${opts}</select></div>`;
    }
    return `<div class="mb-4">${label}<input type="${f.type || 'text'}" name="${f.name}" ${required} class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="${f.placeholder || ''}" /></div>`;
  }).join('\n');

  return `
<div class="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 my-8">
  <h3 class="text-2xl font-bold text-gray-900 mb-2 text-center">${form.title || 'Preencha seus dados'}</h3>
  ${form.description ? `<p class="text-gray-500 text-center mb-6">${form.description}</p>` : '<div class="mb-6"></div>'}
  <form onsubmit="event.preventDefault(); alert('Formulário enviado com sucesso!'); return false;">
    ${fieldHtml}
    <button type="submit" class="w-full mt-4 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg">
      ${form.submit_text || 'Enviar'}
    </button>
  </form>
</div>`;
}

function ensureTailwindCDN(html: string): string {
  if (html.includes('cdn.tailwindcss.com')) return html;
  const tailwindTag = '<script src="https://cdn.tailwindcss.com"><\/script>';
  const fontTag = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">';
  if (html.includes('</head>')) {
    return html.replace('</head>', `${tailwindTag}\n${fontTag}\n</head>`);
  }
  if (html.includes('<body')) {
    return html.replace('<body', `${tailwindTag}\n${fontTag}\n<body`);
  }
  return `${tailwindTag}\n${fontTag}\n${html}`;
}

function isFullHtmlDocument(html: string): boolean {
  const trimmed = html.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

export const LPAdsPublicRenderer: React.FC<Props> = ({ landingPage }) => {
  const [form, setForm] = useState<any>(null);
  const [iframeHeight, setIframeHeight] = useState('100vh');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (landingPage.selected_form_id) {
      appBackend.getForms().then(forms => {
        const found = forms.find((f: any) => f.id === landingPage.selected_form_id);
        if (found) setForm(found);
      });
    }
  }, [landingPage.selected_form_id]);

  const htmlCode = landingPage.html_code || '';
  const content = landingPage.content;

  const finalHtml = useMemo(() => {
    if (!htmlCode) return '';

    let processed = htmlCode
      .replace(/\{\{cta_link\}\}/g, landingPage.cta_link || '#');

    if (form && processed.includes('{{form}}')) {
      processed = processed.replace(/\{\{form\}\}/g, buildFormHtml(form));
    } else if (processed.includes('{{form}}')) {
      processed = processed.replace(/\{\{form\}\}/g, '<div id="form-placeholder" class="py-12 text-center text-gray-400">Formulário será carregado aqui</div>');
    }

    processed = ensureTailwindCDN(processed);

    const trackingScript = buildTrackingScript(landingPage);
    if (trackingScript) {
      if (processed.includes('</body>')) {
        processed = processed.replace('</body>', `${trackingScript}\n</body>`);
      } else {
        processed += trackingScript;
      }
    }

    const resizeScript = `
<script>
  window.addEventListener('load', function() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({type:'lp-ads-resize', height: h}, '*');
  });
  new MutationObserver(function() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({type:'lp-ads-resize', height: h}, '*');
  }).observe(document.body, {childList:true, subtree:true, attributes:true});
</script>`;
    if (processed.includes('</body>')) {
      processed = processed.replace('</body>', `${resizeScript}\n</body>`);
    } else {
      processed += resizeScript;
    }

    return processed;
  }, [htmlCode, form, landingPage]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'lp-ads-resize' && typeof e.data.height === 'number') {
        setIframeHeight(`${e.data.height}px`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!htmlCode && (!content?.sections || content.sections.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="text-amber-500 mb-4" size={48} />
        <h1 className="text-xl font-bold text-slate-800">Página sem conteúdo</h1>
        <p className="text-slate-500">Esta landing page ainda não foi configurada.</p>
      </div>
    );
  }

  if (htmlCode && isFullHtmlDocument(htmlCode)) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#fff' }}>
        <iframe
          ref={iframeRef}
          srcDoc={finalHtml}
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Landing Page"
        />
        {landingPage.show_popups && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990 }}>
            <div style={{ pointerEvents: 'auto' }}>
              <MarketingPopupsRenderer />
            </div>
          </div>
        )}
        {landingPage.show_wa_button && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9991 }}>
            <MarketingWAButtonRenderer />
          </div>
        )}
      </div>
    );
  }

  if (htmlCode) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#fff' }}>
        <iframe
          ref={iframeRef}
          srcDoc={finalHtml}
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Landing Page"
        />
        {landingPage.show_popups && <MarketingPopupsRenderer />}
        {landingPage.show_wa_button && <MarketingWAButtonRenderer />}
      </div>
    );
  }

  const sections = (content?.sections || []).filter((s: any) => s.enabled !== false);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      {sections.map((section: any, idx: number) => (
        <SectionRenderer key={section.id || idx} section={section} ctaLink={landingPage.cta_link || '#'} isFirst={idx === 0} />
      ))}
      {landingPage.show_popups && <MarketingPopupsRenderer />}
      {landingPage.show_wa_button && <MarketingWAButtonRenderer />}
    </div>
  );
};

const SectionRenderer: React.FC<{ section: any; ctaLink: string; isFirst: boolean }> = ({ section, ctaLink, isFirst }) => {
  const type = section.type || 'generic';

  if (type === 'hero' || isFirst) {
    return (
      <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-20 md:py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {section.headline && (
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">{section.headline}</h1>
          )}
          {section.body && (
            <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto mb-8 leading-relaxed">{section.body}</p>
          )}
          {section.cta && (
            <a
              href={ctaLink}
              data-cta="true"
              className="inline-block px-10 py-5 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 font-bold rounded-xl text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
            >
              {section.cta}
            </a>
          )}
        </div>
      </section>
    );
  }

  const bgClass = type === 'pricing' || type === 'cta_final' || type === 'guarantee'
    ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white'
    : section.id && parseInt(section.id, 36) % 2 === 0 ? 'bg-gray-50' : 'bg-white';

  return (
    <section className={`py-16 md:py-24 px-6 ${bgClass}`}>
      <div className="max-w-5xl mx-auto">
        {section.headline && (
          <h2 className={`text-3xl md:text-4xl font-extrabold mb-6 text-center ${bgClass.includes('text-white') ? '' : 'text-gray-900'}`}>
            {section.headline}
          </h2>
        )}
        {section.body && (
          <p className={`text-lg leading-relaxed mb-8 text-center max-w-3xl mx-auto ${bgClass.includes('text-white') ? 'text-indigo-100' : 'text-gray-600'}`}>
            {section.body}
          </p>
        )}
        {section.items && section.items.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {section.items.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-md">
                <span className="text-green-500 text-xl flex-shrink-0">✅</span>
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        )}
        {section.cta && (
          <div className="text-center mt-10">
            <a
              href={ctaLink}
              data-cta="true"
              className="inline-block px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              {section.cta}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
