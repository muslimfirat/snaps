/**
 * Snaps marka işareti — uygulama ikonunun kendisi (assets/snaps-icon-1024.png
 * kaynağından üretilen public/icon-mark.png). Boyut/köşe çağrı yerinden gelir.
 */
export function SnapsMark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/icon-mark.png"
      alt="Snaps"
      width={192}
      height={192}
      className={className}
      draggable={false}
    />
  );
}
