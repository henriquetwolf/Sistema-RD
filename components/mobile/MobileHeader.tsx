import React from 'react';
import { ArrowLeft, Bell, LogOut } from 'lucide-react';
import { platformService } from '../../services/platformService';
import clsx from 'clsx';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onLogout?: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
  logoUrl?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onLogout,
  notificationCount = 0,
  onNotificationPress,
  logoUrl,
}) => {
  return (
    <header
      className={clsx(
        'bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm',
        platformService.isIOS() && 'pt-[env(safe-area-inset-top)]'
      )}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
            >
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
          ) : logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[100px] object-contain shrink-0" />
          ) : null}

          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNotificationPress && (
            <button
              onClick={onNotificationPress}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200 transition-colors relative"
            >
              <Bell size={18} className="text-slate-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="text-slate-500" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
