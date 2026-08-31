import React, { useMemo } from 'react';
import { Snowflake } from 'lucide-react';
import { HeatmapDay } from '../types';

interface StreakHeatmapProps {
  cells: HeatmapDay[];
  onSelectDay?: (date: string) => void;
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const ROW_LABELS = ['Pzt', '', 'Çar', '', 'Cum', '', 'Paz'];

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-surface-2/60',
  1: 'bg-emerald-900/50',
  2: 'bg-emerald-700/60',
  3: 'bg-emerald-500/70',
  4: 'bg-emerald-400',
};

/**
 * GitHub tarzı "zinciri kırma" ısı haritası. Sütun = hafta, satır = haftanın günü.
 * Telafi ("frozen") günleri buz mavisi kutucukla işaretlenir.
 */
export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({ cells, onSelectDay }) => {
  const { weeks, monthMarks } = useMemo(() => {
    if (cells.length === 0) return { weeks: [] as (HeatmapDay | null)[][], monthMarks: [] as { col: number; label: string }[] };

    // İlk günü haftanın gününe göre hizala (Pzt = 0).
    const first = new Date(`${cells[0].date}T00:00:00`);
    const lead = (first.getDay() + 6) % 7;
    const padded: (HeatmapDay | null)[] = [...Array(lead).fill(null), ...cells];
    while (padded.length % 7 !== 0) padded.push(null);

    const weeks: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

    const monthMarks: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((wk, col) => {
      const firstReal = wk.find((d) => d);
      if (!firstReal) return;
      const m = new Date(`${firstReal.date}T00:00:00`).getMonth();
      if (m !== lastMonth) {
        monthMarks.push({ col, label: MONTHS_TR[m] });
        lastMonth = m;
      }
    });

    return { weeks, monthMarks };
  }, [cells]);

  if (weeks.length === 0) return null;

  return (
    <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
      <div className="inline-block min-w-full">
        {/* Ay etiketleri */}
        <div className="flex gap-[3px] pl-8 mb-1">
          {weeks.map((_, col) => {
            const mark = monthMarks.find((m) => m.col === col);
            return (
              <div key={col} className="w-3 text-3xs text-slate-500 shrink-0">
                {mark ? mark.label : ''}
              </div>
            );
          })}
        </div>

        <div className="flex gap-[3px]">
          {/* Gün satırı etiketleri */}
          <div className="flex flex-col gap-[3px] pr-1 shrink-0">
            {ROW_LABELS.map((lbl, i) => (
              <div key={i} className="h-3 w-6 text-3xs text-slate-500 leading-3 text-right">
                {lbl}
              </div>
            ))}
          </div>

          {/* Haftalar */}
          {weeks.map((wk, col) => (
            <div key={col} className="flex flex-col gap-[3px] shrink-0">
              {wk.map((day, row) => {
                if (!day) return <div key={row} className="w-3 h-3" />;
                const base = day.frozen
                  ? 'bg-sky-500/70 ring-1 ring-sky-300/50'
                  : LEVEL_CLASS[day.level];
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => onSelectDay?.(day.date)}
                    title={`${day.date} · ${day.frozen ? 'Telafi günü (donduruldu)' : `${day.questionsSolved} soru · ${day.minutesStudied} dk`}`}
                    className={`w-3 h-3 rounded-[3px] transition-transform hover:scale-125 ${base} ${
                      day.isToday ? 'ring-1 ring-amber-400' : ''
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Açıklama */}
        <div className="flex items-center justify-between mt-2.5 pl-8 text-3xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-3 h-3 text-sky-400" />
            <span>Telafi günü</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Az</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className={`w-3 h-3 rounded-[3px] ${LEVEL_CLASS[l]}`} />
            ))}
            <span>Çok</span>
          </div>
        </div>
      </div>
    </div>
  );
};
