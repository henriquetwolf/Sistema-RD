import React from 'react';
import { platformService } from '../../services/platformService';
import clsx from 'clsx';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  activeId,
  onSelect,
}) => {
  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]',
        platformService.isIOS() && 'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors relative',
                isActive
                  ? 'text-teal-600'
                  : 'text-slate-400 active:text-slate-600'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-600 rounded-b-full" />
              )}

              <div className="relative">
                {isActive ? (item.activeIcon || item.icon) : item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={clsx(
                  'text-[10px] mt-1 leading-none',
                  isActive ? 'font-bold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
