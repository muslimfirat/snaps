/**
 * Snaps marka işareti — yükselen "S" patikası + zirvede kıvılcım.
 * Uygulama ikonuyla aynı çizim. Boyut/renk çağrı yerinden (className, currentColor).
 */
export function SnapsMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.8 8.6C14.5 6.4 10.2 9.4 10.6 13.9c.4 4.5 9.8 3.3 9.8 7.5 0 4-5.2 5.4-10.2 2.8"
        stroke="currentColor"
        strokeWidth="4.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23.2 4.6l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1z" fill="currentColor" />
    </svg>
  );
}
