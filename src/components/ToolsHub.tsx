import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface ToolsHubItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface ToolsHubProps {
  title: string;
  items: ToolsHubItem[];
  onSelect: (id: string) => void;
}

/**
 * Kategori giriş ekranı: alt modülleri yatay kaydırmalı bir şeride sıkıştırmak
 * yerine tek bakışta görünen bir kart ızgarası olarak sunar.
 */
export const ToolsHub: React.FC<ToolsHubProps> = ({ title, items, onSelect }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 id="sub-tab-tools" className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">{title}</h2>
          <p className="text-2xs sm:text-xs text-slate-400 mt-0.5">
            Bir araç seç — dilediğin zaman buraya dönebilirsin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`tools-hub-${item.id}`}
              onClick={() => {
                haptics.selection();
                onSelect(item.id);
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-surface-1 hover:bg-surface-2 border border-border hover:border-indigo-500/40 text-left transition-all group flex flex-col gap-2.5 cursor-pointer shadow-sm h-full"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight">
                  {item.label}
                </h3>
                {item.description && (
                  <p className="text-2xs text-slate-400 mt-1 leading-snug">
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
