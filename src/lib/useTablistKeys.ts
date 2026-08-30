import { KeyboardEvent } from 'react';

/**
 * WAI-ARIA tab paterni için ok tuşu navigasyonu (Faz 9.4).
 * `role="tablist"` kapsayıcısının `onKeyDown`'una bağlanır; ←/→ (ve ↑/↓) ile
 * `[role="tab"]` çocukları arasında odak gezdirir, Home/End uçlara atlar.
 * Odaklanan sekmeyi `activate` ile seçtirir (roving tabindex + otomatik seçim).
 */
export function handleTablistKeys(
  e: KeyboardEvent<HTMLElement>,
  activate?: (el: HTMLElement) => void,
) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (!keys.includes(e.key)) return;

  const list = e.currentTarget;
  const tabs = Array.from(
    list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
  );
  if (tabs.length === 0) return;

  const current = document.activeElement as HTMLElement;
  const idx = tabs.indexOf(current);
  if (idx === -1 && e.key !== 'Home' && e.key !== 'End') return;

  e.preventDefault();
  let next = idx;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;

  const target = tabs[next];
  target.focus();
  activate?.(target);
}
