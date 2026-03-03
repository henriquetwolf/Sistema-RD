import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Phone, Mail, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { geolocationService, NearbyStudio } from '../../services/geolocationService';

export const NearbyStudios: React.FC = () => {
  const [studios, setStudios] = useState<NearbyStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudios();
  }, []);

  const loadStudios = async () => {
    setIsLoading(true);
    setError(null);

    const granted = await geolocationService.requestPermission();
    if (!granted) {
      setError('Permissão de localização negada. Ative nas configurações do dispositivo.');
      setIsLoading(false);
      return;
    }

    try {
      const nearby = await geolocationService.getNearbyStudios(100);
      setStudios(nearby);
      if (nearby.length === 0) {
        setError('Nenhum studio encontrado próximo a você.');
      }
    } catch (e) {
      setError('Erro ao buscar studios. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const openMaps = (studio: NearbyStudio) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Buscando studios próximos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Studios Próximos</h2>
          <p className="text-xs text-slate-500">{studios.length} encontrado(s)</p>
        </div>
        <button
          onClick={loadStudios}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200"
        >
          <RefreshCw size={18} className="text-slate-600" />
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {studios.map((studio) => (
          <div
            key={studio.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm">{studio.fantasyName}</h3>
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                {formatDistance(studio.distance)}
              </span>
            </div>

            {studio.address && (
              <p className="text-xs text-slate-500 flex items-start gap-1.5 mb-3">
                <MapPin size={14} className="shrink-0 mt-0.5" />
                {studio.address}{studio.city ? `, ${studio.city}` : ''}{studio.state ? ` - ${studio.state}` : ''}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => openMaps(studio)}
                className="flex-1 bg-teal-600 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:bg-teal-700"
              >
                <Navigation size={14} /> Como Chegar
              </button>

              {studio.phone && (
                <a
                  href={`tel:${studio.phone}`}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center active:bg-slate-200"
                >
                  <Phone size={16} className="text-slate-600" />
                </a>
              )}

              {studio.email && (
                <a
                  href={`mailto:${studio.email}`}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center active:bg-slate-200"
                >
                  <Mail size={16} className="text-slate-600" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
