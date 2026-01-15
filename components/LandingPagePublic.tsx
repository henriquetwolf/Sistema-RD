
import React, { useEffect, useState } from 'react';
import { appBackend } from '../services/appBackend';
import { LandingPage } from '../types';
import { Loader2, PlayCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface LandingPagePublicProps {
  slug: string;
}

export const LandingPagePublic: React.FC<LandingPagePublicProps> = ({ slug }) => {
  const [lp, setLp] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await appBackend.getLandingPages();
        const found = all.find(p => p.slug === slug);
        if (found) {
          setLp(found);
          // Opcional: Incrementar contador de visitas
          await appBackend.saveLandingPage({ ...found, visits: (found.visits || 0) + 1 });
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;
  
  if (error || !lp) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <XCircle size={64} className="text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800">Página não encontrada</h1>
      <p className="text-slate-500 mt-2">O link acessado pode estar incorreto ou a página foi removida.</p>
    </div>
  );

  const sections = lp.content?.sections || [];

  return (
    <div className="min-h-screen bg-white font-sans">
      {sections.map((fold: any) => (
        <div 
          key={fold.id} 
          style={{ backgroundColor: fold.bgColor, padding: fold.padding }}
        >
          <div className="max-w-6xl mx-auto">
            {fold.elements.map((el: any) => (
              <div 
                key={el.id}
                style={{ textAlign: el.style.textAlign || el.style.align || 'left' }}
                className="mb-4 last:mb-0"
              >
                {el.type === 'heading' && (
                  <h1 style={{ fontSize: el.style.fontSize, color: el.style.color, fontWeight: el.style.fontWeight || 'bold' }}>
                    {el.content}
                  </h1>
                )}
                {el.type === 'text' && (
                  <p style={{ fontSize: el.style.fontSize, color: el.style.color, whiteSpace: 'pre-wrap' }}>
                    {el.content}
                  </p>
                )}
                {el.type === 'image' && (
                  <div className={clsx("flex", el.style.align === 'center' ? 'justify-center' : el.style.align === 'right' ? 'justify-end' : 'justify-start')}>
                    <img src={el.content} style={{ width: el.style.width || '100%', maxWidth: '100%' }} alt="Content" className="rounded-lg shadow-sm" />
                  </div>
                )}
                {el.type === 'button' && (
                  <div className={clsx("flex", el.style.align === 'center' ? 'justify-center' : el.style.align === 'right' ? 'justify-end' : 'justify-start')}>
                    <a 
                      href={el.style.link || '#'}
                      style={{ backgroundColor: el.style.bgColor, color: el.style.color, borderRadius: `${el.style.borderRadius}px`, padding: '14px 40px', fontWeight: 'bold' }}
                      className="inline-block transition-transform hover:scale-105"
                    >
                      {el.content}
                    </a>
                  </div>
                )}
                {el.type === 'video' && (
                  <div className="aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black">
                     <div dangerouslySetInnerHTML={{ __html: el.content }} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                  </div>
                )}
                {el.type === 'spacer' && <div style={{ height: el.style.fontSize || 40 }}></div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
