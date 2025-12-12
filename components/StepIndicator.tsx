import React from 'react';
import { AppStep } from '../types';
import { Database, Upload, FileText, Check } from 'lucide-react';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.UPLOAD, label: 'Upload Arquivos', icon: Upload },
  { id: AppStep.CONFIG, label: 'Conexão', icon: Database },
  { id: AppStep.PREVIEW, label: 'Validação', icon: FileText },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  if (currentStep === AppStep.DASHBOARD) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded"></div>
        <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-teal-600 -z-10 rounded transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep >= step.id;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex flex-col items-center bg-slate-50 px-4">
              <div
                className={clsx(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive
                    ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/20"
                    : "bg-white border-slate-300 text-slate-400",
                  isCurrent && "ring-4 ring-teal-100"
                )}
              >
                {isCompleted ? <Check size={24} /> : <Icon size={24} />}
              </div>
              <span
                className={clsx(
                  "mt-3 text-sm font-bold transition-colors duration-300",
                  isActive ? "text-teal-700" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};