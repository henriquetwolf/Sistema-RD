import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LPAdsProjectList } from './LPAdsProjectList';
import { LPAdsProjectDetail } from './LPAdsProjectDetail';

interface Props {
  onBack: () => void;
}

export const LPAdsManager: React.FC<Props> = ({ onBack }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (selectedProjectId) {
    return (
      <LPAdsProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <LPAdsProjectList
      onSelectProject={(id) => setSelectedProjectId(id)}
      onBack={onBack}
    />
  );
};
