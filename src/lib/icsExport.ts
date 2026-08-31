/**
 * Çalışma takvimini iCalendar (.ics) dosyası olarak dışa aktarma.
 * Tüm etkinlikler "tüm gün" (VALUE=DATE) — saat dilimi karmaşası olmadan
 * Google/Apple/Outlook takvimlerine sorunsuz aktarılır.
 */

export interface IcsEvent {
  date: string; // YYYY-MM-DD
  summary: string;
  description?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD → YYYYMMDD */
function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/** YYYY-MM-DD + 1 gün → YYYYMMDD (all-day DTEND, hariç). */
function nextDayIcs(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** RFC 5545 metin kaçışı. */
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** 75 oktetlik satır katlama (basit). */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return parts.join('\r\n');
}

export function buildIcs(events: IcsEvent[], calendarName = 'Snaps Çalışma Takvimi'): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Snaps//Sinav Kocu//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(calendarName)}`),
  ];

  events.forEach((ev, i) => {
    if (!ev.date) return;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${toIcsDate(ev.date)}-${i}-${stamp}@snaps`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDayIcs(ev.date)}`);
    lines.push(fold(`SUMMARY:${esc(ev.summary)}`));
    if (ev.description) lines.push(fold(`DESCRIPTION:${esc(ev.description)}`));
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Tarayıcıda .ics dosyası indirtir (kullanıcı tetikler). */
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
