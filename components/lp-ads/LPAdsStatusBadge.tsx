import React from 'react';
import { LP_ADS_STATUS_LABELS, LP_ADS_STATUS_COLORS, LPAdsProjectStatus } from './types';

interface Props {
  status: LPAdsProjectStatus;
  size?: 'sm' | 'md';
}

export const LPAdsStatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const label = LP_ADS_STATUS_LABELS[status] || status;
  const color = LP_ADS_STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span className={`inline-flex items-center font-bold rounded-full ${color} ${sizeClass}`}>
      {label}
    </span>
  );
};
