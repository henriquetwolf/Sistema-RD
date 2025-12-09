import React from 'react';
import { AppStep } from '../types';
import { Database, Upload, FileText, RefreshCw, Check } from 'lucide-react';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.UPLOAD, label: 'Upload CSV', icon: Upload },
  { id: AppStep.CONFIG, label: 'Configuração', icon: Database },
  { id: AppStep.PREVIEW, label: 'Preview & SQL', icon: FileText },
  { id: AppStep.SYNC, label: 'Sincronizar', icon: RefreshCw },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded"></div>
        <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-indigo-600 -z-10 rounded transition-all duration-500"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep >= step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex flex-col items-center bg-slate-50 px-2">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                    : "bg-white border-slate-300 text-slate-400"
                )}
              >
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <span
                className={clsx(
                  "mt-2 text-xs font-medium transition-colors duration-300",
                  isActive ? "text-indigo-700" : "text-slate-400"
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