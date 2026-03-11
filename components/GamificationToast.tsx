import React, { useEffect, useState } from 'react';
import { Trophy, Star, Flame, ArrowUp, Gift, X } from 'lucide-react';
import clsx from 'clsx';
import type { GamificationAwardResult } from '../types';

interface GamificationToastItem {
  id: string;
  type: 'volls' | 'badge' | 'level_up' | 'streak';
  title: string;
  message: string;
  emoji?: string;
}

interface GamificationToastProps {
  items: GamificationToastItem[];
  onDismiss: (id: string) => void;
}

export const GamificationToast: React.FC<GamificationToastProps> = ({ items, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {items.map(item => (
        <SingleToast key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
};

const SingleToast: React.FC<{ item: GamificationToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const bgClass = item.type === 'level_up'
    ? 'from-violet-600 to-indigo-600'
    : item.type === 'badge'
    ? 'from-emerald-500 to-teal-600'
    : item.type === 'streak'
    ? 'from-orange-500 to-red-500'
    : 'from-amber-500 to-orange-500';

  const IconComp = item.type === 'level_up' ? ArrowUp
    : item.type === 'badge' ? Star
    : item.type === 'streak' ? Flame
    : Trophy;

  return (
    <div
      className={clsx(
        'pointer-events-auto w-80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className={clsx('bg-gradient-to-r p-4 text-white flex items-start gap-3', bgClass)}>
        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
          {item.emoji ? <span className="text-lg">{item.emoji}</span> : <IconComp size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-sm leading-tight">{item.title}</h4>
          <p className="text-xs text-white/80 mt-0.5 leading-snug">{item.message}</p>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export function useGamificationToasts() {
  const [toasts, setToasts] = useState<GamificationToastItem[]>([]);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const showAwardToast = (result: GamificationAwardResult, currencyName: string = 'VOLLs') => {
    if (!result.success) return;

    const vollsToast: GamificationToastItem = {
      id: crypto.randomUUID(),
      type: 'volls',
      title: `+${result.volls_gained} ${currencyName}!`,
      message: `Saldo: ${result.new_balance.toLocaleString('pt-BR')} ${currencyName}`,
      emoji: '🪙',
    };
    setToasts(prev => [...prev, vollsToast]);

    if (result.level_up) {
      setTimeout(() => {
        setToasts(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'level_up',
          title: `Nível ${result.level_up!.new_level.name}!`,
          message: `Parabéns! Você subiu do nível ${result.level_up!.old_level.name} para ${result.level_up!.new_level.name}!`,
          emoji: result.level_up!.new_level.icon_emoji,
        }]);
      }, 500);
    }

    if (result.new_badge) {
      setTimeout(() => {
        setToasts(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'badge',
          title: 'Conquista Desbloqueada!',
          message: result.new_badge!.name,
          emoji: result.new_badge!.icon_emoji,
        }]);
      }, result.level_up ? 1000 : 500);
    }
  };

  const showStreakToast = (days: number) => {
    setToasts(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'streak',
      title: `Sequência de ${days} dias!`,
      message: 'Continue assim, você está incrível!',
      emoji: '🔥',
    }]);
  };

  return { toasts, dismiss, showAwardToast, showStreakToast };
}
