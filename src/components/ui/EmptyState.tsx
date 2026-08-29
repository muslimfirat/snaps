import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 transition-colors duration-150 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#222533] border border-[#2D3245] text-indigo-300 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-colors duration-150 shadow-sm"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-5 py-2.5 rounded-xl bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
